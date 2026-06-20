import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Shield, Eye, Lock, Zap, Wifi, WifiOff, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { deidentifyText } from '@/lib/deidentify';
import { logAIParse, logReferralCreation } from '@/lib/auditLogger';

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

export default function Clinician() {
  const [selectedDocument, setSelectedDocument] = useState<InboxDocument | null>(MOCK_INBOX_DOCUMENTS[0]);
  const [selectedAction, setSelectedAction] = useState<ActionCard | null>(MOCK_ACTIONS[0]);
  const [verifiedCheckbox, setVerifiedCheckbox] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete'>('idle');
  const [formData, setFormData] = useState({
    specialist: selectedAction?.title.includes('Cardiology') ? 'Cardiology' : 'Consultation',
    notes: selectedAction?.body || '',
  });

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

  const handleExecuteReferral = async () => {
    if (!verifiedCheckbox) {
      toast.error('Please verify the AI-extracted details');
      return;
    }

    const auditId = `REF-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const action = {
      auditId,
      patientId: 'patient-1',
      specialist: formData.specialist,
      timestamp: new Date().toISOString(),
    };

    if (!isOnline) {
      const newQueue = [...offlineQueue, action];
      setOfflineQueue(newQueue);
      localStorage.setItem('offline_queue', JSON.stringify(newQueue));
      toast.success(`⚠️ Offline Mode. Saved locally. Will sync when online.`);
    } else {
      await logReferralCreation(1, auditId, 'patient-1', formData.specialist);
      toast.success(`✅ Secure FHIR ServiceRequest Generated.`);
    }

    setVerifiedCheckbox(false);
  };

  const handleSelectDocument = (doc: InboxDocument) => {
    setSelectedDocument(doc);
    const matchingAction = MOCK_ACTIONS.find((a) => a.patientName === doc.patientName);
    if (matchingAction) {
      setSelectedAction(matchingAction);
      setFormData({
        specialist: doc.specialist || 'Consultation',
        notes: doc.diagnosis || doc.rawText,
      });
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden font-inter">
      {/* TOP HEADER - Compact Metrics */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Shield className="w-4 h-4" />
          🛡️ Audit Active
        </div>
      </div>

      {/* MAIN LAYOUT - Left Pane + Right Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE - Clinical Inbox */}
        <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <h2 className="text-sm font-semibold text-slate-900">Clinical Inbox</h2>
            <p className="text-xs text-slate-500 mt-1">{MOCK_INBOX_DOCUMENTS.length} documents</p>
          </div>

          {/* Scrollable Inbox List */}
          <div className="flex-1 overflow-y-auto">
            {MOCK_INBOX_DOCUMENTS.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelectDocument(doc)}
                className={`px-4 py-3 border-b border-slate-200 cursor-pointer transition-colors ${
                  selectedDocument?.id === doc.id
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.patientName}</p>
                    <p className="text-xs text-slate-500 truncate">{doc.documentType}</p>
                    <p className="text-xs text-slate-400 mt-1">{doc.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE - Active Workspace */}
        <div className="w-2/3 flex flex-col overflow-hidden">
          {/* TOP HALF - Raw Document Viewer */}
          <div className="h-1/2 p-6 bg-white border-b border-slate-200 overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Raw Document Viewer</h3>
            {selectedDocument ? (
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-full overflow-y-auto">
                {selectedDocument.rawText}
              </pre>
            ) : (
              <p className="text-sm text-slate-500">Select a document to view</p>
            )}
          </div>

          {/* BOTTOM HALF - OpenMed AI Orchestrator */}
          <div className="h-1/2 p-6 bg-[#E8F4F8] overflow-y-auto flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">OpenMed AI Orchestrator</h3>

            {selectedAction ? (
              <div className="space-y-4 flex-1">
                {/* AI Analysis Card */}
                <Card className="p-4 bg-white border border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Extracted Specialist</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{selectedDocument?.specialist}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      ✅ {selectedAction.confidence}%
                    </Badge>
                  </div>
                </Card>

                {/* Diagnosis Card */}
                <Card className="p-4 bg-white border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagnosis</p>
                  <p className="text-sm text-slate-900 mt-2">{selectedDocument?.diagnosis}</p>
                </Card>

                {/* PII Protection Badge */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-slate-900">Data Minimization</p>
                  </div>
                  <div className="space-y-3">
                    <Badge variant="outline" className="bg-slate-50">
                      [REDACTED] PHI Protected
                    </Badge>
                    <div className="bg-slate-50 rounded p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Source Text Highlights:</p>
                      <p className="text-xs text-slate-600 font-mono">
                        {selectedAction?.matchedText.map((t) => `\"${t}\"`).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* HITL Verification */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="verify"
                      checked={verifiedCheckbox}
                      onCheckedChange={(checked) => setVerifiedCheckbox(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="verify" className="text-sm font-semibold text-slate-900 cursor-pointer">
                        I verify these AI-extracted clinical details and take responsibility for this referral.
                      </Label>
                      <p className="text-xs text-slate-600 mt-1">
                        Human verification required. The AI suggests, you decide.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Execute Button */}
                <Button
                  onClick={handleExecuteReferral}
                  disabled={!verifiedCheckbox}
                  className={`w-full rounded-full font-semibold py-5 mt-4 transition-all duration-200 ${
                    verifiedCheckbox
                      ? 'bg-[#0A5C79] text-white hover:bg-[#084563] shadow-md hover:shadow-lg'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  Execute Referral
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a document to view AI analysis</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
