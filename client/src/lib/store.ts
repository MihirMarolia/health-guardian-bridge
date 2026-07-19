import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tri-State AI Extraction Model
export type FieldStatus = 'filled' | 'review' | 'missing';

export interface ExtractedField {
  value: string | null;
  confidence: number;
  evidence: string;
  status: FieldStatus;
}

export interface AuditEvent {
  timestamp: string;
  actor: string;
  action: string;
  details: Record<string, unknown>;
}

export interface ExtractionResult {
  specialist: ExtractedField;
  diagnosis: ExtractedField;
  urgency: ExtractedField;
  followUpDays: ExtractedField;
  clinicalNotes: ExtractedField;
}

export interface ReferralState {
  // Extracted data with tri-state support
  extractedData: ExtractionResult;
  
  // Immutable audit trail
  auditEvents: AuditEvent[];
  
  // Sign-off state
  signOffStatus: 'pending' | 'approved';
  
  // Billing state
  isBilled: boolean;
  
  // Actions
  setExtractedData: (data: ExtractionResult) => void;
  approveSignOff: () => void;
  captureBilling: () => void;
  logAuditEvent: (action: string, details: Record<string, unknown>) => void;
  reset: () => void;
}

const DEFAULT_EXTRACTION: ExtractionResult = {
  specialist: {
    value: 'Cardiology',
    confidence: 95,
    evidence: 'URGENT: Pls f/u with Cardiology outpatient clinic',
    status: 'filled',
  },
  diagnosis: {
    value: 'Acute Systolic Heart Failure, EF 35%',
    confidence: 92,
    evidence: 'ECHO: LVEF 35%, moderate MR. Acute decompensated heart failure.',
    status: 'filled',
  },
  urgency: {
    value: 'Urgent',
    confidence: 98,
    evidence: '*** URGENT: Pls f/u with Cardiology outpatient clinic w/in 7-14 days. ***',
    status: 'filled',
  },
  followUpDays: {
    value: '7-14',
    confidence: 88,
    evidence: 'w/in 7-14 days',
    status: 'filled',
  },
  clinicalNotes: {
    value: 'Diuresed w/ IV Lasix. Suspected new onset non-ischemic cardiomyopathy.',
    confidence: 78,
    evidence: 'Diuresed w/ IV Lasix. Suspected new onset non-ischemic cardiomyopathy.',
    status: 'review',
  },
};

export const useReferralStore = create<ReferralState>()(
  persist(
    (set) => ({
      extractedData: DEFAULT_EXTRACTION,
      auditEvents: [],
      signOffStatus: 'pending',
      isBilled: false,

      setExtractedData: (data: ExtractionResult) =>
        set((state) => ({
          extractedData: data,
          auditEvents: [
            ...state.auditEvents,
            {
              timestamp: new Date().toISOString(),
              actor: 'system',
              action: 'EXTRACTION_UPDATED',
              details: { data },
            },
          ],
        })),

      approveSignOff: () =>
        set((state) => ({
          signOffStatus: 'approved',
          isBilled: true,
          auditEvents: [
            ...state.auditEvents,
            {
              timestamp: new Date().toISOString(),
              actor: 'clinician',
              action: 'SIGN_OFF_APPROVED',
              details: {
                extractedData: state.extractedData,
                timestamp: new Date().toISOString(),
              },
            },
            {
              timestamp: new Date().toISOString(),
              actor: 'system',
              action: 'OHIP_FEE_CODE_K030_CAPTURED',
              details: {
                feeCode: 'K030',
                description: 'Diabetes Assessment',
                amount: 39.25,
              },
            },
          ],
        })),

      captureBilling: () =>
        set((state) => ({
          isBilled: true,
          auditEvents: [
            ...state.auditEvents,
            {
              timestamp: new Date().toISOString(),
              actor: 'system',
              action: 'OHIP_FEE_CODE_K030_CAPTURED',
              details: {
                feeCode: 'K030',
                description: 'Diabetes Assessment',
                amount: 39.25,
              },
            },
          ],
        })),

      logAuditEvent: (action: string, details: Record<string, unknown>) =>
        set((state) => ({
          auditEvents: [
            ...state.auditEvents,
            {
              timestamp: new Date().toISOString(),
              actor: 'clinician',
              action,
              details,
            },
          ],
        })),

      reset: () =>
        set({
          extractedData: DEFAULT_EXTRACTION,
          auditEvents: [],
          signOffStatus: 'pending',
          isBilled: false,
        }),
    }),
    { name: 'health-guardian-referral-store' }
  )
);
