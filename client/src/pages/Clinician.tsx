import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Shield, Eye, Lock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { deidentifyText } from '@/lib/deidentify';
import { logAIParse, logReferralCreation } from '@/lib/auditLogger';

interface ActionCard {
  id: string;
  title: string;
  body: string;
  confidence: number;
  borderColor: string;
  priority: 'high' | 'urgent' | 'medium';
  matchedText: string[];
  requiresReview: boolean;
}

const MOCK_ACTIONS: ActionCard[] = [
  {
    id: '1',
    title: 'AI Verdict: Cardiology Referral',
    body: 'System detected Heart Failure (EF 35%) from discharge fax. Automating pre‑fill.',
    confidence: 95,
    borderColor: '#0A5C79',
    priority: 'high',
    matchedText: ['EF 35%', 'SOB'],
    requiresReview: false,
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
  },
  {
    id: '3',
    title: 'AI Triage: eConsult Recommendation',
    body: 'Polypharmacy detected (6 medications). Suggesting Pharmacist eConsult.',
    confidence: 68,
    borderColor: '#F59E0B',
    priority: 'medium',
    matchedText: ['6 medications', 'polypharmacy'],
    requiresReview: true,
  },
];

export default function Clinician() {
  const [selectedAction, setSelectedAction] = useState<ActionCard | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [verifiedCheckbox, setVerifiedCheckbox] = useState(false);
  const [formData, setFormData] = useState({
    specialist: '',
    notes: '',
  });

  const handleActionClick = (action: ActionCard) => {
    setSelectedAction(action);
    setFormData({
      specialist: action.title.includes('Cardiology') ? 'Cardiology' : 'Consultation',
      notes: action.body,
    });
    setVerifiedCheckbox(false);
    setIsSheetOpen(true);
  };

  const handleExecuteReferral = async () => {
    if (!verifiedCheckbox) {
      toast.error('Please verify the AI-extracted details');
      return;
    }

    const auditId = `REF-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    await logReferralCreation(1, auditId, 'patient-1', formData.specialist);
    
    toast.success(`✅ eReferral Generated. Audit Log #${auditId} recorded to PostgreSQL.`);
    
    setIsSheetOpen(false);
    setVerifiedCheckbox(false);
    setSelectedAction(null);
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-blue-100 text-blue-800';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: '#0A5C79' }}>
          Health Guardian Bridge
        </h1>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Shield className="w-4 h-4" />
          🛡️ Audit Session Active
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex gap-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Referrals Orchestrated</p>
            <p className="text-lg font-bold text-slate-900">12</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Labs Monitored</p>
            <p className="text-lg font-bold text-slate-900">8</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">⏱️ Clinical Time Saved</p>
            <p className="text-lg font-bold" style={{ color: '#F59E0B' }}>3.2 Hours</p>
          </div>
        </div>
      </div>

      {/* Action Triage Queue - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4 max-w-4xl">
          {MOCK_ACTIONS.map((action) => (
            <Card
              key={action.id}
              className="p-5 rounded-xl border-l-4 hover:shadow-md transition-all cursor-pointer bg-white"
              style={{ borderLeftColor: action.borderColor }}
              onClick={() => handleActionClick(action)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-base">{action.title}</h3>
                <Badge
                  className={`${
                    action.priority === 'urgent'
                      ? 'bg-red-100 text-red-800'
                      : action.priority === 'high'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                </Badge>
              </div>

              <p className="text-slate-600 text-sm mb-4">{action.body}</p>

              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="bg-slate-50">
                  🛡️ PII Protected
                </Badge>
                <Badge variant="outline" className={getConfidenceBadgeColor(action.confidence)}>
                  ✅ Confidence {action.confidence}%
                </Badge>
                {action.requiresReview && (
                  <Badge variant="outline" className="bg-amber-50">
                    ⚖️ Human Review Required
                  </Badge>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Matched text: {action.matchedText.map((t) => `"${t}"`).join(', ')}
              </div>

              <Button
                className="mt-4 w-full rounded-lg border-2"
                variant="outline"
                style={{ borderColor: action.borderColor, color: action.borderColor }}
              >
                Review & Execute
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Calibrated Trust Slide-out */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" style={{ color: '#0A5C79' }} />
              Calibrated Trust: AI Transparency & Reasoning
            </SheetTitle>
            <SheetDescription>
              Review AI-extracted clinical details before execution
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Glass Box - AI Transparency */}
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">AI Transparency & Reasoning</h4>
                  <p className="text-sm text-slate-600 mb-4">
                    The AI examined the de‑identified clinical text. No patient PII was exposed to the model.
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="bg-slate-100">
                      [REDACTED]
                    </Badge>
                    <span className="text-xs text-slate-500">PHI Redacted Before Processing</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs font-mono text-slate-600">
                      <strong>Source Text Highlights:</strong>
                      <br />
                      {selectedAction?.matchedText.map((t) => `"${t}"`).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="specialist" className="font-semibold text-slate-900">
                  Specialist
                </Label>
                <Input
                  id="specialist"
                  value={formData.specialist}
                  onChange={(e) => setFormData({ ...formData, specialist: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="font-semibold text-slate-900">
                  Clinical Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>

            {/* HITL Verification */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="verify"
                  checked={verifiedCheckbox}
                  onCheckedChange={(checked) => setVerifiedCheckbox(checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="verify" className="font-semibold text-slate-900 cursor-pointer">
                    I verify these AI-extracted clinical details
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
              className="w-full rounded-lg font-semibold py-6"
              style={{
                backgroundColor: verifiedCheckbox ? '#0A5C79' : '#cbd5e1',
                opacity: verifiedCheckbox ? 1 : 0.5,
                pointerEvents: verifiedCheckbox ? 'auto' : 'none',
              }}
            >
              Execute Referral
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
