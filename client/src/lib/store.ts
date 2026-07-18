import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trpcVanilla } from './trpc';

interface Patient {
  id: string;
  name: string;
  dob: string;
  healthCard: string;
  familyMD: string;
}

interface Referral {
  id: string;
  patientId: string;
  specialist: string;
  status: string;
  date: string;
  notes: string;
}

interface Lab {
  id: string;
  patientId: string;
  testType: string;
  status: string;
  date: string;
  value: string;
}

interface TimelineEvent {
  id: string;
  patientId: string;
  type: string;
  description: string;
  timestamp: string;
}

interface StoreState {
  patients: Patient[];
  referrals: Referral[];
  labs: Lab[];
  timeline: TimelineEvent[];

  // Synchronous helpers
  addReferral: (referralData: Omit<Referral, 'id' | 'status' | 'date'>) => void;
  updateReferralStatus: (id: string, newStatus: string) => void;
  syncOfflineQueue: () => Promise<void>;

  // Async clinical actions – optimistic local update + tRPC DB persistence
  approveSignOff: (referralId: string) => Promise<void>;
  captureBilling: (referralId: string, notes: string) => Promise<void>;
  inboxAction: (id: string, patientId: string, specialistDomain: string, notes: string) => Promise<void>;

  // Hydrates store from the database on page load
  initializeWorkspace: (patientId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Seed data – used when the database is unavailable or a patient has no records
// ---------------------------------------------------------------------------

const initialPatients: Patient[] = [
  { id: 'p1', name: 'Jane Smith',     dob: '1985-03-12', healthCard: '1234-567-890', familyMD: 'Dr. Emily Chen' },
  { id: 'p2', name: 'Michael Brown',  dob: '1972-09-25', healthCard: '9876-543-210', familyMD: 'Dr. Emily Chen' },
  { id: 'p3', name: 'Sarah Wilson',   dob: '1990-11-02', healthCard: '4567-890-123', familyMD: 'Dr. Alan Ward'  },
  { id: 'p4', name: 'David Lee',      dob: '1988-07-15', healthCard: '5678-901-234', familyMD: 'Dr. Emily Chen' },
  { id: 'p5', name: 'Emily Davis',    dob: '1995-01-30', healthCard: '6789-012-345', familyMD: 'Dr. Alan Ward'  },
];

const initialReferrals: Referral[] = [
  { id: 'r1', patientId: 'p1', specialist: 'Cardiology',   status: 'Pending',  date: '2026-06-15', notes: 'SOB, EF 35%' },
  { id: 'r2', patientId: 'p2', specialist: 'Dermatology',  status: 'Accepted', date: '2026-06-10', notes: 'Suspected Melanoma' },
  { id: 'r3', patientId: 'p3', specialist: 'Orthopedics',  status: 'Pending',  date: '2026-06-01', notes: 'Knee pain' },
];

const initialLabs: Lab[] = [
  { id: 'l1', patientId: 'p1', testType: 'HbA1c',      status: 'Resulted', date: '2026-06-12', value: '7.8%'    },
  { id: 'l2', patientId: 'p2', testType: 'CBC',        status: 'Ordered',  date: '2026-06-10', value: 'Pending' },
  { id: 'l3', patientId: 'p3', testType: 'Lipid Panel',status: 'Ordered',  date: '2026-06-01', value: 'Pending' },
];

const initialTimeline: TimelineEvent[] = [
  { id: 't1', patientId: 'p1', type: 'lab_resulted',  description: 'HbA1c resulted: 7.8%',              timestamp: '2026-06-12T10:00:00Z' },
  { id: 't2', patientId: 'p2', type: 'referral_sent', description: 'Referral sent to Dermatology',      timestamp: '2026-06-10T14:30:00Z' },
  { id: 't3', patientId: 'p1', type: 'referral_sent', description: 'Referral sent to Cardiology',       timestamp: '2026-06-15T09:15:00Z' },
  { id: 't4', patientId: 'p3', type: 'referral_sent', description: 'Referral sent to Orthopedics',      timestamp: '2026-06-01T11:00:00Z' },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      patients: initialPatients,
      referrals: initialReferrals,
      labs: initialLabs,
      timeline: initialTimeline,

      // ------------------------------------------------------------------
      // Synchronous helpers (local-only, no DB write)
      // ------------------------------------------------------------------

      addReferral: (referralData: Omit<Referral, 'id' | 'status' | 'date'>) =>
        set((state: StoreState) => {
          const newReferral: Referral = {
            id: `r${state.referrals.length + 1}`,
            ...referralData,
            status: 'Pending',
            date: new Date().toISOString().split('T')[0],
          };
          const newTimelineEvent: TimelineEvent = {
            id: `t${state.timeline.length + 1}`,
            patientId: referralData.patientId,
            type: 'referral_sent',
            description: `Referral sent to ${referralData.specialist}`,
            timestamp: new Date().toISOString(),
          };
          return {
            referrals: [...state.referrals, newReferral],
            timeline: [...state.timeline, newTimelineEvent],
          };
        }),

      updateReferralStatus: (id: string, newStatus: string) =>
        set((state: StoreState) => {
          const referral = state.referrals.find((r: Referral) => r.id === id);
          if (!referral) return state;
          const updatedReferrals = state.referrals.map((r: Referral) =>
            r.id === id ? { ...r, status: newStatus } : r
          );
          const newTimelineEvent: TimelineEvent = {
            id: `t${state.timeline.length + 1}`,
            patientId: referral.patientId,
            type: 'status_change',
            description: `Referral to ${referral.specialist} updated to ${newStatus}`,
            timestamp: new Date().toISOString(),
          };
          return {
            referrals: updatedReferrals,
            timeline: [...state.timeline, newTimelineEvent],
          };
        }),

      /** Drains the localStorage offline queue and replays against Supabase. */
      syncOfflineQueue: async () => {
        const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
        if (queue.length === 0) return;
        for (const action of queue) {
          if (action.type === 'addReferral') {
            const { supabase } = await import('./supabaseClient');
            await supabase.from('service_requests').insert(action.payload);
          }
        }
        localStorage.removeItem('offline_queue');
      },

      // ------------------------------------------------------------------
      // Async clinical actions – optimistic local update + tRPC persistence
      // ------------------------------------------------------------------

      /**
       * Clinician signs off on a referral.
       * Optimistically marks it "Verified" in local state, then persists to the
       * database via clinical.executeReferral. On DB failure the local update is
       * preserved so the UI stays responsive.
       */
      approveSignOff: async (referralId: string) => {
        const referral = get().referrals.find(r => r.id === referralId);
        if (!referral) return;

        // Optimistic update
        set(state => ({
          referrals: state.referrals.map(r =>
            r.id === referralId ? { ...r, status: 'Verified' } : r
          ),
          timeline: [
            ...state.timeline,
            {
              id: `t_${Date.now()}`,
              patientId: referral.patientId,
              type: 'sign_off',
              description: `Sign-off approved for referral to ${referral.specialist}`,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        // Persist to DB
        try {
          const result = await trpcVanilla.clinical.executeReferral.mutate({
            id: referralId,
            patientId: referral.patientId,
            specialistDomain: referral.specialist,
            notes: referral.notes,
          });
          console.log('[store.approveSignOff] Persisted to database:', result);
        } catch (error) {
          console.error('[store.approveSignOff] Database write failed (local state preserved):', error);
        }
      },

      /**
       * Clinician captures billing for a referral.
       * Optimistically marks it "Billed" in local state, then persists via
       * clinical.executeReferral so the audit trail records the action.
       */
      captureBilling: async (referralId: string, notes: string) => {
        const referral = get().referrals.find(r => r.id === referralId);
        if (!referral) return;

        const updatedNotes = notes || referral.notes;

        // Optimistic update
        set(state => ({
          referrals: state.referrals.map(r =>
            r.id === referralId ? { ...r, status: 'Billed', notes: updatedNotes } : r
          ),
          timeline: [
            ...state.timeline,
            {
              id: `t_${Date.now()}`,
              patientId: referral.patientId,
              type: 'billing_captured',
              description: `Billing captured for referral to ${referral.specialist}`,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        // Persist to DB
        try {
          const result = await trpcVanilla.clinical.executeReferral.mutate({
            id: referralId,
            patientId: referral.patientId,
            specialistDomain: referral.specialist,
            notes: updatedNotes,
          });
          console.log('[store.captureBilling] Persisted to database:', result);
        } catch (error) {
          console.error('[store.captureBilling] Database write failed (local state preserved):', error);
        }
      },

      /**
       * General-purpose clinician inbox action – executes an arbitrary referral
       * by ID. Optimistically reflects in local state and writes to DB.
       */
      inboxAction: async (
        id: string,
        patientId: string,
        specialistDomain: string,
        notes: string
      ) => {
        // Optimistic update
        set(state => ({
          referrals: state.referrals.map(r =>
            r.id === id ? { ...r, status: 'Pending', notes } : r
          ),
          timeline: [
            ...state.timeline,
            {
              id: `t_${Date.now()}`,
              patientId,
              type: 'inbox_action',
              description: `Referral executed: ${specialistDomain}`,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        // Persist to DB
        try {
          const result = await trpcVanilla.clinical.executeReferral.mutate({
            id,
            patientId,
            specialistDomain,
            notes,
          });
          console.log('[store.inboxAction] Persisted to database:', result);
        } catch (error) {
          console.error('[store.inboxAction] Database write failed (local state preserved):', error);
        }
      },

      /**
       * Hydrates the store from the database on page load for a given patient.
       * Falls back to existing seed data silently if the DB is unavailable or
       * returns no records.
       */
      initializeWorkspace: async (patientId: string) => {
        try {
          const workspace = await trpcVanilla.clinical.getPatientWorkspace.query({ patientId });

          if (!workspace.serviceRequests.length && !workspace.timeline.length) {
            console.log('[store.initializeWorkspace] No DB records found – retaining seed data');
            return;
          }

          // Map DB ServiceRequest → store Referral
          const referrals: Referral[] = workspace.serviceRequests.map(sr => ({
            id: sr.id,
            patientId: sr.patientId,
            specialist: sr.specialistDomain,
            status: sr.status.charAt(0).toUpperCase() + sr.status.slice(1),
            date: sr.createdAt instanceof Date
              ? sr.createdAt.toISOString().split('T')[0]
              : String(sr.createdAt).split('T')[0],
            notes: sr.encryptedClinicalNotes,
          }));

          // Map DB TimelineEvent → store TimelineEvent
          const timeline: TimelineEvent[] = workspace.timeline.map(te => ({
            id: te.id,
            patientId: te.patientId,
            type: te.type,
            description: te.description,
            timestamp: te.timestamp instanceof Date
              ? te.timestamp.toISOString()
              : String(te.timestamp),
          }));

          set({ referrals, timeline });
          console.log('[store.initializeWorkspace] Hydrated from database:', {
            referrals: referrals.length,
            timeline: timeline.length,
          });
        } catch (error) {
          console.error('[store.initializeWorkspace] DB fetch failed – using seed data:', error);
        }
      },
    }),
    { name: 'health-guardian-storage' }
  )
);
