import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  HelpCircle,
  Lock,
  Shield,
  Stethoscope,
  UserCircle2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { logAction, logReferralCreation } from '@/lib/auditLogger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface InboxDocument {
  id: string;
  patientName: string;
  documentType: string;
  timestamp: string;
  rawText: string;
  specialist?: string;
  confidence?: number;
  diagnosis?: string;
}

interface ActionCard {
  id: string;
  title: string;
  body: string;
  confidence: number;
  priority: 'high' | 'urgent' | 'medium' | 'info';
  matchedText: string[];
  requiresReview: boolean;
  patientName: string;
}

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const MOCK_INBOX_DOCUMENTS: InboxDocument[] = [
  {
    id: '1',
    patientName: 'Jane Smith',
    documentType: 'Discharge Summary',
    timestamp: '2 hours ago',
    rawText: `RCVD: 2026-06-20 14:32 EST // SENDER: TOH DISCHARGE
PT: SMITH, JANE // DOB: 1985-03-12 // HC: 1234-567-890
--------------------------------------------------
HPI: 41yo F presented to ED w/ worsening SOB x 3 days. Orthopnea (+). 
ECHO: LVEF 35%, moderate MR. 
A/P: 
1. Acute decompensated heart failure. Diuresed w/ IV Lasix. 
2. Suspected new onset non-ischemic cardiomyopathy.
PLAN: D/C home on PO Lasix 40mg daily. 
*** URGENT: Pls f/u with Cardiology outpatient clinic w/in 7-14 days. ***`,
    specialist: 'Cardiology',
    confidence: 95,
    diagnosis: 'Acute Systolic Heart Failure, EF 35%',
  },
  {
    id: '2',
    patientName: 'Michael Brown',
    documentType: 'Lab Order',
    timestamp: '8 days ago',
    rawText: `LAB ORDER FORM
Patient: Michael Brown
MRN: 456789
DOB: 07/22/1958

ORDERED TESTS:
- HbA1c (Hemoglobin A1c)
- Fasting Glucose
- Lipid Panel
- Comprehensive Metabolic Panel

CLINICAL INDICATION:
Diabetes management, annual physical

Status: PENDING RESULTS
Expected: 2026-06-22

Ordering Physician: Dr. Sarah Chen, MD`,
    specialist: 'Internal Medicine',
    confidence: 100,
    diagnosis: 'Diabetes follow-up',
  },
  {
    id: '3',
    patientName: 'Sarah Wilson',
    documentType: 'Clinical Notes',
    timestamp: '1 day ago',
    rawText: `CLINICAL PROGRESS NOTE
Patient: Sarah Wilson
Date: 2026-06-19

MEDICATIONS REVIEWED:
1. Lisinopril 10mg daily
2. Metformin 1000mg BID
3. Atorvastatin 20mg daily
4. Aspirin 81mg daily
5. Omeprazole 20mg daily
6. Sertraline 50mg daily

ASSESSMENT:
Polypharmacy noted. Patient on 6 concurrent medications.
Recommend pharmacist consultation for medication optimization.

PLAN:
- Schedule eConsult with Pharmacy
- Reduce medication burden if possible

Clinician: Dr. Robert Lee, MD`,
    specialist: 'Pharmacy',
    confidence: 62,
    diagnosis: 'Polypharmacy review',
  },
];

const MOCK_ACTIONS: ActionCard[] = [
  {
    id: '1',
    title: 'AI Verdict: Cardiology Referral',
    body: 'Heart failure (EF 35%) detected from discharge fax.',
    confidence: 95,
    priority: 'high',
    matchedText: ['LVEF 35%', 'URGENT: Pls f/u with Cardiology'],
    requiresReview: false,
    patientName: 'Jane Smith',
  },
  {
    id: '2',
    title: 'Alert: Overdue Lab Tracking',
    body: 'HbA1c ordered 8 days ago. Pending results.',
    confidence: 100,
    priority: 'urgent',
    matchedText: ['HbA1c', '8 days'],
    requiresReview: false,
    patientName: 'Michael Brown',
  },
  {
    id: '3',
    title: 'AI Triage: Low Confidence eConsult',
    body: 'Polypharmacy detected (6 medications). Suggesting eConsult.',
    confidence: 62,
    priority: 'medium',
    matchedText: ['6 medications', 'polypharmacy', 'eConsult'],
    requiresReview: true,
    patientName: 'Sarah Wilson',
  },
];

const PRIORITY_CONFIG: Record<ActionCard['priority'], { label: string; cls: string }> = {
  high:   { label: 'High Priority', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/25' },
  urgent: { label: 'Urgent',        cls: 'bg-red-500/15 text-red-400 border border-red-500/25' },
  medium: { label: 'Medium',        cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  info:   { label: 'Info',          cls: 'bg-muted text-muted-foreground border border-white/5' },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Tri-State badge style: Green ≥90% | Yellow ≥70% | Red <70% */
function confidenceBadgeStyle(conf: number) {
  if (conf >= 90) return { cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25', icon: '✓' };
  if (conf >= 70) return { cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',   icon: '~' };
  return              { cls: 'bg-red-500/15 text-red-400 border border-red-500/25',             icon: '!' };
}

const redactSourceText = (text: string) => {
  let r = text;
  r = r.replace(/\b(?:HC|healthCard|MRN)\s*[:#-]?\s*\d{4}[- ]?\d{3}[- ]?\d{3}\b/gi, '[REDACTED HEALTHCARD]');
  r = r.replace(/\b(?:Patient|PT)\s*[: ]+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, 'Patient: [REDACTED NAME]');
  r = r.replace(/\b([A-Z][a-z]+)\s*,\s*([A-Z][a-z]+)\b/g, '[REDACTED NAME]');
  r = r.replace(/\b(?:Dr\.?|Doctor)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[REDACTED CLINICIAN]');
  r = r.replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{2,3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]');
  return r;
};

const CLINICAL_TERMS = ['LVEF 35%','EF 35%','SOB','Orthopnea','Cardiology','Lasix','IV','PO','HPI','A/P','MR','ED','eConsult','HbA1c','polypharmacy'];
const TERM_PATTERN   = new RegExp(`(${CLINICAL_TERMS.join('|')})`, 'gi');

const renderRedactedSource = (text: string) =>
  redactSourceText(text).split(TERM_PATTERN).map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="bg-amber-500/20 text-amber-300 rounded px-0.5">{part}</span>
      : <span key={i}>{part}</span>
  );

const highlightClinicalTerms = (text: string) =>
  text.split(TERM_PATTERN).map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="bg-primary/20 text-primary rounded px-0.5">{part}</span>
      : <span key={i}>{part}</span>
  );

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function Clinician() {
  const [selectedDocument, setSelectedDocument] = useState<InboxDocument | null>(MOCK_INBOX_DOCUMENTS[0]);
  const [dispatchChannel, setDispatchChannel] = useState('OceanMD eReferral');
  const [verifiedCheckbox, setVerifiedCheckbox] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete'>('idle');
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored. Syncing changes…');
      runSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Offline Mode — changes saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runSync = async () => {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    if (queue.length === 0) { setSyncStatus('complete'); setTimeout(() => setSyncStatus('idle'), 3000); return; }
    setSyncStatus('syncing');
    try {
      for (const action of queue) {
        await logReferralCreation(1, `REF-${Date.now()}`, action.patientId, action.specialist);
      }
      localStorage.removeItem('offline_queue');
      setSyncStatus('complete');
      toast.success('Sync complete. All audit logs saved.');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch {
      toast.error('Sync failed. Will retry when connection is stable.');
      setSyncStatus('idle');
    }
  };

  const handleExecuteReferral = async () => {
    if (!verifiedCheckbox || !selectedDocument) {
      toast.error('Please verify the AI-extracted details first.');
      return;
    }
    const auditId   = `REF-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const specialist = selectedDocument.specialist ?? 'Consultation';

    if (!isOnline) {
      const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
      queue.push({ auditId, patientId: 'patient-1', specialist, timestamp: new Date().toISOString() });
      localStorage.setItem('offline_queue', JSON.stringify(queue));
      toast.success('Offline Mode — saved locally. Will sync when online.');
    } else {
      await logReferralCreation(1, auditId, 'patient-1', specialist);
      await logAction({
        actorId: 1,
        action: 'CREATE_REFERRAL',
        resourceType: 'referral',
        resourceId: auditId,
        details: { patientId: 'patient-1', specialistDomain: specialist, dispatchChannel, timestamp: new Date().toISOString() },
      });
      toast.success(`Referral submitted via ${dispatchChannel}. Audit Log #${auditId} recorded.`);
    }
    setVerifiedCheckbox(false);
  };

  const selectedAction = MOCK_ACTIONS.find(a => selectedDocument && a.patientName === selectedDocument.patientName);
  const priority       = selectedAction ? PRIORITY_CONFIG[selectedAction.priority] : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">

      {/* ══════════════════════════════════════════════════════
          SLIM HEADER
      ══════════════════════════════════════════════════════ */}
      <header className="flex-none h-[52px] flex items-center justify-between px-5 border-b border-white/5 bg-card/60 backdrop-blur-sm">
        {/* Left: branding + status pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Health Guardian</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Badge className="h-5 px-2 text-[10px] gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">
                <Wifi className="w-2.5 h-2.5" /> Online
              </Badge>
            ) : (
              <Badge className="h-5 px-2 text-[10px] gap-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/15">
                <WifiOff className="w-2.5 h-2.5" /> Offline
              </Badge>
            )}
            <Badge className="h-5 px-2 text-[10px] gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
              <Zap className="w-2.5 h-2.5" /> 12 Referrals
            </Badge>
            <Badge className="h-5 px-2 text-[10px] gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">
              <CheckCircle2 className="w-2.5 h-2.5" /> 8 Labs
            </Badge>
            {syncStatus === 'syncing' && (
              <Badge className="h-5 px-2 text-[10px] rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse hover:bg-primary/10">
                Syncing…
              </Badge>
            )}
            {syncStatus === 'complete' && (
              <Badge className="h-5 px-2 text-[10px] rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">
                Synced
              </Badge>
            )}
          </div>
        </div>
        {/* Right: audit status + help */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Audit Active</span>
          </div>
          <button
            onClick={() => setShowTour(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            aria-label="Open Responsible AI Tour"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          BENTO GRID
      ══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 p-4 grid grid-cols-12 gap-4">

        {/* ────────────── LEFT: INBOX (span-4) ────────────── */}
        <div className="col-span-4 flex flex-col min-h-0 bg-card rounded-3xl border border-white/5 overflow-hidden">
          {/* Inbox header */}
          <div className="flex-none px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {MOCK_INBOX_DOCUMENTS.length}
            </span>
          </div>

          {/* Inbox items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {MOCK_INBOX_DOCUMENTS.map(doc => {
              const action  = MOCK_ACTIONS.find(a => a.patientName === doc.patientName);
              const conf    = action?.confidence ?? doc.confidence ?? 0;
              const badge   = confidenceBadgeStyle(conf);
              const isActive = selectedDocument?.id === doc.id;

              return (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDocument(doc); setVerifiedCheckbox(false); }}
                  className={`w-full text-left rounded-2xl transition-all relative overflow-hidden ${
                    isActive
                      ? 'bg-primary/10 border border-primary/25'
                      : 'bg-background/30 border border-white/5 hover:bg-muted/50 hover:border-white/10'
                  }`}
                >
                  {/* Active teal left-border accent */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-l-2xl" />
                  )}
                  <div className="p-4 pl-5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className={`text-sm font-semibold leading-none ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                        {doc.patientName}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${badge.cls}`}>
                        {badge.icon} {conf}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-none">{doc.documentType}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">{doc.timestamp}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ────────────── RIGHT: AI ORCHESTRATOR (span-8) ────────────── */}
        <div className="col-span-8 overflow-y-auto custom-scrollbar">
          {selectedDocument ? (
            <div className="space-y-4 pb-2">

              {/* ── PATIENT HEADER ── */}
              <div className="bg-card rounded-3xl border border-white/5 p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-2">
                    Patient Workspace
                  </p>
                  <h2 className="text-2xl font-bold text-foreground">{selectedDocument.patientName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedDocument.documentType} · {selectedDocument.timestamp}
                  </p>
                </div>
                {priority && selectedAction && (
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border ${priority.cls}`}>
                    {selectedAction.priority === 'urgent'
                      ? <AlertCircle className="w-4 h-4" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }
                    {priority.label}
                    {selectedAction.requiresReview && (
                      <Lock className="w-3.5 h-3.5 opacity-70" />
                    )}
                  </div>
                )}
              </div>

              {/* ── EXTRACTED FIELDS BENTO ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Diagnosis */}
                <div className="bg-card rounded-3xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Diagnosis
                    </p>
                    {(() => {
                      const b = confidenceBadgeStyle(selectedDocument.confidence ?? 0);
                      return (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${b.cls}`}>
                          {b.icon} {selectedDocument.confidence}% confidence
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-snug">
                    {selectedDocument.diagnosis ?? '—'}
                  </p>
                </div>

                {/* Recommended Specialist */}
                <div className="bg-card rounded-3xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Recommended Specialist
                    </p>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
                      AI Matched
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedDocument.specialist ?? '—'}
                  </p>
                </div>
              </div>

              {/* ── EVIDENCE GRID ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Original source (PHI-redacted) */}
                <div className="bg-card rounded-3xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Original Source
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-white/5">
                      PHI Redacted
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words bg-background/60 rounded-2xl border border-white/5 p-3 max-h-52 overflow-y-auto custom-scrollbar leading-5">
                    {renderRedactedSource(selectedDocument.rawText)}
                  </div>
                </div>

                {/* AI evidence trail */}
                <div className="bg-card rounded-3xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      AI Evidence Trail
                    </p>
                    {selectedAction && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {selectedAction.matchedText.length} signals
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-5 bg-background/60 rounded-2xl border border-white/5 p-3 max-h-36 overflow-y-auto custom-scrollbar">
                    {highlightClinicalTerms(selectedDocument.rawText)}
                  </div>
                  {selectedAction && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedAction.matchedText.map((term, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── CARE TEAM + TIMELINE ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Care team */}
                <div className="bg-card rounded-3xl border border-white/5 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Care Team
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-background/40 border border-white/5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Dr. Robert Lee</p>
                        <p className="text-xs text-muted-foreground">Primary Care</p>
                      </div>
                      <Stethoscope className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-background/40 border border-white/5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedDocument.specialist ?? 'Specialist'} Consult
                        </p>
                        <p className="text-xs text-muted-foreground">Recommended Specialist</p>
                      </div>
                      <Shield className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </div>

                {/* Timeline snapshot */}
                <div className="bg-card rounded-3xl border border-white/5 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock3 className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Timeline Snapshot
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { color: 'bg-primary',       text: `Document received ${selectedDocument.timestamp}` },
                      { color: 'bg-emerald-400',   text: 'PHI de-identified by AI pipeline' },
                      { color: 'bg-amber-400',     text: 'Pending clinician verification' },
                    ].map(({ color, text }, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full ${color} mt-1.5 shrink-0`} />
                        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── HITL SIGN-OFF ── */}
              <div className={`rounded-3xl border p-5 transition-all duration-300 ${
                verifiedCheckbox
                  ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/5'
                  : 'bg-card border-white/5'
              }`}>
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  {/* Checkbox + description */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                      id="verify-hitl"
                      checked={verifiedCheckbox}
                      onCheckedChange={(checked) => setVerifiedCheckbox(checked as boolean)}
                      className="mt-0.5 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div>
                      <Label
                        htmlFor="verify-hitl"
                        className="text-sm font-semibold text-foreground cursor-pointer"
                      >
                        I verify these AI-extracted clinical details are accurate
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Human verification required before dispatch. This action is immutably audit-logged.
                      </p>
                    </div>
                  </div>

                  {/* Dispatch + submit */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Select value={dispatchChannel} onValueChange={setDispatchChannel}>
                      <SelectTrigger className="w-44 h-9 text-xs bg-background/60 border-white/10 rounded-xl">
                        <SelectValue placeholder="Dispatch channel" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10">
                        <SelectItem value="OceanMD eReferral">OceanMD eReferral</SelectItem>
                        <SelectItem value="Print/Send Fax">Print / Send Fax</SelectItem>
                        <SelectItem value="Internal Outbox">Internal Outbox</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleExecuteReferral}
                      disabled={!verifiedCheckbox}
                      className={`h-9 px-5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        verifiedCheckbox
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                          : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                      }`}
                    >
                      Submit Referral
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Empty state */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select an inbox item to begin review</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          ONBOARDING TOUR MODAL
      ══════════════════════════════════════════════════════ */}
      {showTour && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-card border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Responsible AI Tour</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              How Health Guardian keeps clinicians in control at every step.
            </p>
            <div className="space-y-4">
              {[
                { n: '01', text: 'Action Cards proactively surface triage tasks from incoming documents.' },
                { n: '02', text: 'De-identification pipeline strips PHI before the AI processes any text.' },
                { n: '03', text: 'Human-in-the-Loop checkbox ensures the clinician reviews AI outputs before dispatch.' },
                { n: '04', text: 'Every action is logged to the immutable Audit Trail for PIPEDA/PHIPA compliance.' },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-primary/50 mt-0.5 w-5 shrink-0">{n}</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            <Button
              className="w-full mt-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setShowTour(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
