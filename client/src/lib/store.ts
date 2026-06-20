import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addReferral: (referralData: Omit<Referral, 'id' | 'status' | 'date'>) => void;
  updateReferralStatus: (id: string, newStatus: string) => void;
  syncOfflineQueue: () => Promise<void>;
}

const initialPatients: Patient[] = [
  { id: 'p1', name: 'Jane Smith', dob: '1985-03-12', healthCard: '1234-567-890', familyMD: 'Dr. Emily Chen' },
  { id: 'p2', name: 'Michael Brown', dob: '1972-09-25', healthCard: '9876-543-210', familyMD: 'Dr. Emily Chen' },
  { id: 'p3', name: 'Sarah Wilson', dob: '1990-11-02', healthCard: '4567-890-123', familyMD: 'Dr. Alan Ward' },
  { id: 'p4', name: 'David Lee', dob: '1988-07-15', healthCard: '5678-901-234', familyMD: 'Dr. Emily Chen' },
  { id: 'p5', name: 'Emily Davis', dob: '1995-01-30', healthCard: '6789-012-345', familyMD: 'Dr. Alan Ward' },
];

const initialReferrals: Referral[] = [
  { id: 'r1', patientId: 'p1', specialist: 'Cardiology', status: 'Pending', date: '2026-06-15', notes: 'SOB, EF 35%' },
  { id: 'r2', patientId: 'p2', specialist: 'Dermatology', status: 'Accepted', date: '2026-06-10', notes: 'Suspected Melanoma' },
  { id: 'r3', patientId: 'p3', specialist: 'Orthopedics', status: 'Pending', date: '2026-06-01', notes: 'Knee pain' },
];

const initialLabs: Lab[] = [
  { id: 'l1', patientId: 'p1', testType: 'HbA1c', status: 'Resulted', date: '2026-06-12', value: '7.8%' },
  { id: 'l2', patientId: 'p2', testType: 'CBC', status: 'Ordered', date: '2026-06-10', value: 'Pending' },
  { id: 'l3', patientId: 'p3', testType: 'Lipid Panel', status: 'Ordered', date: '2026-06-01', value: 'Pending' },
];

const initialTimeline: TimelineEvent[] = [
  { id: 't1', patientId: 'p1', type: 'lab_resulted', description: 'HbA1c resulted: 7.8%', timestamp: '2026-06-12T10:00:00Z' },
  { id: 't2', patientId: 'p2', type: 'referral_sent', description: 'Referral sent to Dermatology', timestamp: '2026-06-10T14:30:00Z' },
  { id: 't3', patientId: 'p1', type: 'referral_sent', description: 'Referral sent to Cardiology', timestamp: '2026-06-15T09:15:00Z' },
  { id: 't4', patientId: 'p3', type: 'referral_sent', description: 'Referral sent to Orthopedics', timestamp: '2026-06-01T11:00:00Z' },
];

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      patients: initialPatients,
      referrals: initialReferrals,
      labs: initialLabs,
      timeline: initialTimeline,

      addReferral: (referralData: Omit<Referral, 'id' | 'status' | 'date'>) => set((state: StoreState) => {
        const newReferral: Referral = { 
          id: `r${state.referrals.length + 1}`, 
          ...referralData, 
          status: 'Pending', 
          date: new Date().toISOString().split('T')[0] 
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
          timeline: [...state.timeline, newTimelineEvent] 
        };
      }),

      updateReferralStatus: (id: string, newStatus: string) => set((state: StoreState) => {
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
          timeline: [...state.timeline, newTimelineEvent] 
        };
      }),

      // OFFLINE SYNC LOGIC
      // Drains the localStorage offline queue and replays each action against Supabase.
      syncOfflineQueue: async () => {
        const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
        if (queue.length === 0) return;
        for (const action of queue) {
          if (action.type === 'addReferral') {
            // Insert into Supabase service_requests table
            const { supabase } = await import('./supabaseClient');
            await supabase.from('service_requests').insert(action.payload);
          }
        }
        localStorage.removeItem('offline_queue');
      },
    }),
    { name: 'health-guardian-storage' }
  )
);
