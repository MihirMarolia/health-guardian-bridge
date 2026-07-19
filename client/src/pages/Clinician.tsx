'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useReferralStore } from '@/lib/store';
import { toast } from 'sonner';

const MOCK_FAXES = [
  {
    id: '1',
    patientName: 'Jane Smith',
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
  },
];

export default function Clinician() {
  const [selectedFaxId, setSelectedFaxId] = useState<string>('1');
  const [verificationChecked, setVerificationChecked] = useState(false);
  
  const { extractedData, signOffStatus, isBilled, approveSignOff, logAuditEvent } = useReferralStore();
  
  const selectedFax = MOCK_FAXES.find((f) => f.id === selectedFaxId);

  const handleExecuteReferral = () => {
    if (!verificationChecked) {
      toast.error('Please verify the AI-extracted clinical details');
      return;
    }

    approveSignOff();
    logAuditEvent('REFERRAL_EXECUTED', {
      faxId: selectedFaxId,
      extractedData,
      timestamp: new Date().toISOString(),
    });

    toast.success('✅ Secure FHIR ServiceRequest Generated.');
    setVerificationChecked(false);
  };

  const getFieldBadgeColor = (status: string, confidence: number) => {
    if (status === 'filled' && confidence > 85) {
      return 'bg-green-100 text-green-800';
    } else if (status === 'review' || confidence < 85) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden font-inter">
      {/* LEFT PANE - Inbox */}
      <div className="w-1/3 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-900">Clinical Inbox</h2>
          <p className="text-xs text-slate-500">{MOCK_FAXES.length} faxes</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_FAXES.map((fax) => (
            <div
              key={fax.id}
              onClick={() => setSelectedFaxId(fax.id)}
              className={`p-4 border-b border-slate-200 cursor-pointer transition-colors ${
                selectedFaxId === fax.id ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{fax.patientName}</p>
              <p className="text-xs text-slate-500">{fax.timestamp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANE - Split Horizontally */}
      <div className="w-2/3 flex flex-col overflow-hidden">
        {/* TOP HALF - Raw Document Viewer */}
        <div className="h-1/2 border-b border-slate-200 bg-white p-6 overflow-y-auto flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Raw Document Viewer</h3>
          {selectedFax ? (
            <pre className="flex-1 bg-slate-100 p-4 rounded-lg text-xs font-mono text-slate-800 overflow-auto border border-slate-300 whitespace-pre-wrap break-words">
              {selectedFax.rawText}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">Select a fax to view</p>
          )}
        </div>

        {/* BOTTOM HALF - AI Orchestrator */}
        <div className="h-1/2 bg-[#E8F4F8] p-6 overflow-y-auto flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">OpenMed AI Orchestrator</h3>

          {selectedFax ? (
            <div className="space-y-4 flex-1">
              {/* Specialist */}
              <Card className="bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Specialist</p>
                    <p className="text-sm text-slate-900 mt-2 font-semibold">{extractedData.specialist.value}</p>
                    <p className="text-xs text-slate-600 mt-1">Evidence: {extractedData.specialist.evidence}</p>
                  </div>
                  <Badge className={`text-xs ${getFieldBadgeColor(extractedData.specialist.status, extractedData.specialist.confidence)}`}>
                    {extractedData.specialist.confidence}%
                  </Badge>
                </div>
              </Card>

              {/* Diagnosis */}
              <Card className="bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagnosis</p>
                    <p className="text-sm text-slate-900 mt-2">{extractedData.diagnosis.value}</p>
                    <p className="text-xs text-slate-600 mt-1">Evidence: {extractedData.diagnosis.evidence}</p>
                  </div>
                  <Badge className={`text-xs ${getFieldBadgeColor(extractedData.diagnosis.status, extractedData.diagnosis.confidence)}`}>
                    {extractedData.diagnosis.confidence}%
                  </Badge>
                </div>
              </Card>

              {/* Urgency */}
              <Card className="bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Urgency</p>
                    <p className="text-sm text-slate-900 mt-2">{extractedData.urgency.value}</p>
                  </div>
                  <Badge className={`text-xs ${getFieldBadgeColor(extractedData.urgency.status, extractedData.urgency.confidence)}`}>
                    {extractedData.urgency.confidence}%
                  </Badge>
                </div>
              </Card>

              {/* Follow-up Days */}
              <Card className="bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Follow-up (Days)</p>
                    <p className="text-sm text-slate-900 mt-2">{extractedData.followUpDays.value}</p>
                  </div>
                  <Badge className={`text-xs ${getFieldBadgeColor(extractedData.followUpDays.status, extractedData.followUpDays.confidence)}`}>
                    {extractedData.followUpDays.confidence}%
                  </Badge>
                </div>
              </Card>

              {/* Clinical Notes */}
              <Card className="bg-white border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Clinical Notes</p>
                    <p className="text-sm text-slate-900 mt-2">{extractedData.clinicalNotes.value}</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${getFieldBadgeColor(extractedData.clinicalNotes.status, extractedData.clinicalNotes.confidence)}`}>
                    {extractedData.clinicalNotes.confidence}%
                  </Badge>
                </div>
              </Card>

              {/* OHIP Billing - This Visit */}
              <Card className="bg-white border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">OHIP Billing - This Visit</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">K030 - Diabetes Assessment</p>
                  </div>
                  <Badge className={`text-xs font-semibold ${
                    isBilled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isBilled ? '✓ Captured: $39.25' : 'Pending Sign-off'}
                  </Badge>
                </div>
              </Card>

              {/* Gatekeeper Verification */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="verify"
                    checked={verificationChecked}
                    onCheckedChange={(checked) => setVerificationChecked(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="verify" className="text-sm font-semibold text-slate-900 cursor-pointer">
                    I verify these AI-extracted clinical details.
                  </label>
                </div>
              </div>

              {/* Execute Button */}
              <Button
                onClick={handleExecuteReferral}
                disabled={!verificationChecked}
                className={`w-full rounded-full font-semibold py-5 mt-4 transition-all ${
                  verificationChecked
                    ? 'bg-[#0A5C79] text-white hover:bg-[#084563]'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Execute Referral
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a fax to view AI analysis</p>
          )}
        </div>
      </div>
    </div>
  );
}
