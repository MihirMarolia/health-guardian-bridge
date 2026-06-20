import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  Lock,
  Zap,
  Wifi,
  WifiOff,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock3,
  UserCircle2,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { logAction, logReferralCreation } from '@/lib/auditLogger';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  borderColor: string;
  priority: 'high' | 'urgent' | 'medium' | 'info';
  matchedText: string[];
  requiresReview: boolean;
  patientName: string;
}

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
    body: 'System detected Heart Failure (EF 35%) from discharge fax. Automating pre‑fill.',
    confidence: 95,
    borderColor: '#0A5C79',
    priority: 'high',
    matchedText: ['LVEF 35%', 'URGENT: Pls f/u with Cardiology'],
    requiresReview: false,
    patientName: 'Jane Smith',
  },
  {
    id: '2',
    title: 'Alert: Overdue Lab Tracking',
    body: 'HbA1c ordered 8 days ago. Pending results. Follow-up indicated.',
    confidence: 100,
    borderColor: '#FF0000',
    priority: 'urgent',
    matchedText: ['HbA1c', '8 days'],
    requiresReview: false,
    patientName: 'Michael Brown',
  },
  {
    id: '3',
    title: 'AI Triage: Low Confidence eConsult',
    body: 'Polypharmacy detected (6 medications). Suggesting Pharmacist eConsult.',
    confidence: 62,
    borderColor: '#F59E0B',
    priority: 'medium',
    matchedText: ['6 medications', 'polypharmacy'],
    requiresReview: true,
    patientName: 'Sarah Wilson',
  },
];

const PRIORITY_LABELS: Record<ActionCard['priority'], { label: string; classes: string }> = {
  high: { label: 'High Priority', classes: 'bg-blue-100 text-blue-800' },
  urgent: { label: 'Urgent', classes: 'bg-red-100 text-red-800' },
  medium: { label: 'Medium', classes: 'bg-amber-100 text-amber-800' },
  info: { label: 'Info', classes: 'bg-slate-100 text-slate-800' },
};

const redactSourceText = (text: string) => {
  let redacted = text;

  redacted = redacted.replace(/\b(?:HC|healthCard|MRN)\s*[:#-]?\s*\d{4}[- ]?\d{3}[- ]?\d{3}\b/gi, '[REDACTED HEALTHCARD]');
  redacted = redacted.replace(/\b(?:Patient|PT)\s*[: ]+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, 'Patient: [REDACTED NAME]');
  redacted = redacted.replace(/\b([A-Z][a-z]+)\s*,\s*([A-Z][a-z]+)\b/g, '[REDACTED NAME]');
  redacted = redacted.replace(/\b(?:Dr\.?|Doctor)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[REDACTED NAME]');
  redacted = redacted.replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{2,3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]');

  return redacted;
};

const renderRedactedSource = (text: string) => {
  const redactedText = redactSourceText(text);
  const terms = [
    'LVEF 35%',
    'EF 35%',
    'SOB',
    'Orthopnea',
    'Cardiology',
    'Lasix',
    'IV',
    'PO',
    'HPI',
    'A/P',
    'MR',
    'ED',
    'eConsult',
  ];
  const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = redactedText.split(pattern);

  return parts.map((part, index) => {
    if (index % 2 === 1 && part.match(pattern)) {
      return (
        <span key={`${part}-${index}`} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

const highlightClinicalTerms = (text: string) => {
  const terms = [
    'LVEF 35%',
    'EF 35%',
    'SOB',
    'Orthopnea',
    'Cardiology',
    'Lasix',
    'IV',
    'PO',
    'HPI',
    'A/P',
    'MR',
    'ED',
    'eConsult',
  ];
  const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (index % 2 === 1 && part.match(pattern)) {
      return (
        <span key={`${part}-${index}`} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

export default function Clinician() {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(MOCK_ACTIONS[0]?.id ?? null);
  const [selectedDocument, setSelectedDocument] = useState<InboxDocument | null>(null);
  const [dispatchChannel, setDispatchChannel] = useState('OceanMD eReferral');
  const [verifiedCheckbox, setVerifiedCheckbox] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete'>('idle');
  const [showTour, setShowTour] = useState(false);

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('✅ Connection restored. Syncing changes...');
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('⚠️ Offline Mode. Changes saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const savedQueue = localStorage.getItem('offline_queue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) {
      setSyncStatus('complete');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }

    setSyncStatus('syncing');
    try {
      for (const action of offlineQueue) {
        await logReferralCreation(1, `REF-${Date.now()}`, action.patientId, action.specialist);
      }
      setOfflineQueue([]);
      localStorage.removeItem('offline_queue');
      setSyncStatus('complete');
      toast.success('✅ Sync Complete. All audit logs saved.');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed. Will retry when connection is stable.');
      setSyncStatus('idle');
    }
  };

  const handleExecuteReferral = async (action: ActionCard) => {
    if (!verifiedCheckbox) {
      toast.error('Please verify the AI-extracted details');
      return;
    }

    const auditId = `REF-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const actionRecord = {
      auditId,
      patientId: 'patient-1',
      specialist: action.title.includes('Cardiology') ? 'Cardiology' : 'Consultation',
      timestamp: new Date().toISOString(),
    };

    if (!isOnline) {
      const newQueue = [...offlineQueue, actionRecord];
      setOfflineQueue(newQueue);
      localStorage.setItem('offline_queue', JSON.stringify(newQueue));
      toast.success(`⚠️ Offline Mode. Saved locally. Will sync when online.`);
    } else {
      await logReferralCreation(1, auditId, 'patient-1', actionRecord.specialist);
      await logAction({
        actorId: 1,
        action: 'CREATE_REFERRAL',
        resourceType: 'referral',
        resourceId: auditId,
        details: {
          patientId: 'patient-1',
          specialistDomain: actionRecord.specialist,
          dispatchChannel,
          timestamp: new Date().toISOString(),
        },
      });
      toast.success(`✅ Referral submitted via ${dispatchChannel}. Audit Log #${auditId} recorded.`);
    }

    setVerifiedCheckbox(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedActionId((prev) => (prev === id ? null : id));
    setVerifiedCheckbox(false);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 font-inter">
      {/* STATS BAR */}
      <div className="flex-none p-6 border-b bg-white shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs bg-blue-50">
              <Zap className="w-3 h-3 mr-1" />
              Referrals: 12
            </Badge>
            <Badge variant="outline" className="text-xs bg-green-50">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Labs: 8
            </Badge>
            <Badge variant="outline" className="text-xs bg-amber-50">
              ⏱️ Time Saved: 3.2 hrs
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  🟢 Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  🔴 Offline
                </>
              )}
            </Badge>
            {syncStatus === 'syncing' && (
              <Badge variant="outline" className="text-xs bg-blue-50 animate-pulse">
                🔄 Syncing...
              </Badge>
            )}
            {syncStatus === 'complete' && (
              <Badge variant="outline" className="text-xs bg-green-50">
                ✅ Synced
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Shield className="w-4 h-4" />
              🛡️ Audit Active
            </div>
            <button
              onClick={() => setShowTour(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Responsible AI Tour"
              aria-label="Start Responsible AI Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ACTION CARDS CONTAINER (Allow internal scrolling only) */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar pt-6">
        {MOCK_ACTIONS.map((action) => {
          const document = MOCK_INBOX_DOCUMENTS.find((d) => d.patientName === action.patientName);
          const isExpanded = expandedActionId === action.id;
          const priority = PRIORITY_LABELS[action.priority];

          return (
            <Card
              key={action.id}
              className="bg-white rounded-2xl shadow-md border-l-4 p-5 transition-all hover:shadow-xl"
              style={{ borderLeftColor: action.borderColor }}
            >
              {/* Card Header (clickable) */}
              <div
                className="cursor-pointer"
                onClick={() => toggleExpand(action.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(action.id);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={`text-xs ${priority.classes}`}>{priority.label}</Badge>
                      {action.requiresReview && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Review Required
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocument(document ?? null);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        {action.patientName}
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-slate-600">{action.body}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge
                      className={
                        action.confidence >= 90
                          ? 'bg-green-100 text-green-800'
                          : action.confidence >= 70
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                      }
                    >
                      ✅ {action.confidence}%
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail View */}
              {isExpanded && document && (
                <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Extracted Specialist
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{document.specialist}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagnosis</p>
                      <p className="text-sm text-slate-900 mt-1">{document.diagnosis}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDocument(document)}
                    className="w-full rounded-full"
                  >
                    Open Review & Execute Panel
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
          {selectedDocument && (
            <div className="space-y-6 py-2">
              <SheetHeader>
                <SheetTitle className="text-2xl">{selectedDocument.patientName}</SheetTitle>
                <SheetDescription>
                  {selectedDocument.documentType} • {selectedDocument.timestamp}
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <UserCircle2 className="w-4 h-4" />
                    Care Team
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-semibold">Dr. Robert Lee</p>
                        <p className="text-xs text-slate-500">Primary Care</p>
                      </div>
                      <Stethoscope className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-semibold">Cardiology Consult</p>
                        <p className="text-xs text-slate-500">Recommended Specialist</p>
                      </div>
                      <Shield className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <Clock3 className="w-4 h-4" />
                    Timeline Snapshot
                  </div>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <span>Hospital discharge summary received 2 hours ago</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <span>Lab review flagged for cardiology follow-up</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-2" />
                      <span>Referral pending clinician verification</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original Source</p>
                    <Badge variant="outline" className="bg-slate-50">
                      [REDACTED] PHI Protected
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words bg-white rounded-lg border border-slate-200 p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {renderRedactedSource(selectedDocument.rawText)}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Extraction</p>
                    <Badge className="bg-green-100 text-green-800">{selectedDocument.confidence ?? 0}% confidence</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white border p-3">
                      <p className="text-xs font-semibold text-slate-500">Diagnosis</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{selectedDocument.diagnosis}</p>
                    </div>
                    <div className="rounded-lg bg-white border p-3">
                      <p className="text-xs font-semibold text-slate-500">Specialist</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{selectedDocument.specialist}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border p-3">
                    <p className="text-xs font-semibold text-slate-500">Highlighted Source Terms</p>
                    <p className="text-sm text-slate-700 mt-2 leading-6">
                      {highlightClinicalTerms(selectedDocument.rawText)}
                    </p>
                  </div>
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`verify-sheet-${selectedDocument.id}`}
                        checked={verifiedCheckbox}
                        onCheckedChange={(checked) => setVerifiedCheckbox(checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`verify-sheet-${selectedDocument.id}`} className="text-sm font-semibold cursor-pointer">
                          I verify these AI-extracted clinical details
                        </Label>
                        <p className="text-xs text-slate-600 mt-1">Human verification required before dispatch.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dispatch-channel" className="text-sm font-semibold">Dispatch Channel</Label>
                    <Select value={dispatchChannel} onValueChange={setDispatchChannel}>
                      <SelectTrigger id="dispatch-channel" className="w-full">
                        <SelectValue placeholder="Select dispatch channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OceanMD eReferral">OceanMD eReferral</SelectItem>
                        <SelectItem value="Print/Send Fax">Print/Send Fax</SelectItem>
                        <SelectItem value="Internal Outbox">Internal Outbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleExecuteReferral({
                      id: selectedDocument.id,
                      title: selectedDocument.documentType,
                      body: selectedDocument.diagnosis ?? '',
                      confidence: selectedDocument.confidence ?? 0,
                      borderColor: '#0A5C79',
                      priority: 'high',
                      matchedText: [],
                      requiresReview: false,
                      patientName: selectedDocument.patientName,
                    })}
                    className="w-full rounded-full font-semibold py-5"
                    style={{
                      backgroundColor: verifiedCheckbox ? '#0A5C79' : '#cbd5e1',
                      opacity: verifiedCheckbox ? 1 : 0.5,
                      cursor: verifiedCheckbox ? 'pointer' : 'not-allowed',
                      pointerEvents: verifiedCheckbox ? 'auto' : 'none',
                    }}
                  >
                    Submit Referral
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ONBOARDING TOUR MODAL */}
      {showTour && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-8">
          <Card className="max-w-lg w-full p-8 bg-white shadow-2xl">
            <h2 className="text-xl font-bold text-[#0A5C79] mb-4">Responsible AI Tour</h2>
            <div className="space-y-4 text-sm">
              <p>
                <strong>Step 1:</strong> Action Cards proactively surface tasks.
              </p>
              <p>
                <strong>Step 2:</strong> De-identification pipeline strips PHI before the AI sees text.
              </p>
              <p>
                <strong>Step 3:</strong> Human-in-the-Loop checkbox ensures the doctor verifies the AI's work.
              </p>
              <p>
                <strong>Step 4:</strong> Every action logs to the immutable Audit Trail.
              </p>
            </div>
            <Button className="w-full mt-6" onClick={() => setShowTour(false)}>
              Got it
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}