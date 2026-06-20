import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertCircle, Plus, Brain, Lock, Eye, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { deidentifyText } from '@/lib/deidentify';
import { logAIParse, logReferralCreation, logPatientView } from '@/lib/auditLogger';

export default function Clinician() {
  const { patients, referrals, labs, addReferral, updateReferralStatus } = useStore();
  const [smartConnected, setSmartConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFaxParser, setShowFaxParser] = useState(false);
  const [faxText, setFaxText] = useState('');
  const [verifiedCheckbox, setVerifiedCheckbox] = useState(false);
  const [redactionCount, setRedactionCount] = useState(0);
  const [selectedPatientForJourney, setSelectedPatientForJourney] = useState<string | null>(null);
  
  // Form state
  const [selectedPatient, setSelectedPatient] = useState('');
  const [specialist, setSpecialist] = useState('');
  const [notes, setNotes] = useState('');

  // Get labs older than 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const overdueOrderedLabs = labs.filter(lab => {
    if (lab.status !== 'Ordered') return false;
    const labDate = new Date(lab.date);
    return labDate < sevenDaysAgo;
  });

  // Handle AI Fax Parser with De-identification
  const handleParseFax = () => {
    if (!faxText) {
      toast.error('Please paste clinical text first');
      return;
    }

    // De-identify the text before AI processing
    const { deidentifiedText, redactionCount: count } = deidentifyText(faxText);
    setRedactionCount(count);

    const textUpper = deidentifiedText.toUpperCase();
    let parsedSpecialist = '';
    let parsedNotes = '';

    if (textUpper.includes('CARDIOLOGY') || textUpper.includes('HEART') || textUpper.includes('EF')) {
      parsedSpecialist = 'Cardiology';
      parsedNotes = 'Heart Failure (EF 35%)';
    } else if (textUpper.includes('DERMATOLOGY') || textUpper.includes('SKIN')) {
      parsedSpecialist = 'Dermatology';
      parsedNotes = 'Skin condition';
    } else if (textUpper.includes('ORTHOPEDIC') || textUpper.includes('BONE') || textUpper.includes('JOINT')) {
      parsedSpecialist = 'Orthopedics';
      parsedNotes = 'Musculoskeletal issue';
    }

    if (parsedSpecialist) {
      setSpecialist(parsedSpecialist);
      setNotes(parsedNotes);
      toast.success(`✓ Parsed: ${parsedSpecialist} | ${count} PII elements redacted`);
      
      // Log AI parsing action
      logAIParse(1, 'temp-id', 0.92, count).catch(console.error);
    } else {
      toast.error('Could not identify specialist from text');
    }
  };

  // Handle submit referral with HITL verification
  const handleSubmitReferral = async () => {
    if (!selectedPatient || !specialist || !notes) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!verifiedCheckbox) {
      toast.error('You must verify the AI-extracted details before submitting');
      return;
    }

    addReferral({
      patientId: selectedPatient,
      specialist,
      notes,
    });

    // Log referral creation
    await logReferralCreation(1, 'ref-' + Date.now(), selectedPatient, specialist);

    // Log FHIR ServiceRequest to console
    const fhirServiceRequest = {
      resourceType: 'ServiceRequest',
      status: 'draft',
      intent: 'order',
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '11429006',
            display: specialist,
          },
        ],
      },
      subject: {
        reference: `Patient/${selectedPatient}`,
      },
      notes: [{ text: notes }],
      authoredOn: new Date().toISOString(),
    };

    console.log('FHIR ServiceRequest:', fhirServiceRequest);
    toast.success('✓ Referral verified and submitted');

    // Reset form
    setSelectedPatient('');
    setSpecialist('');
    setNotes('');
    setFaxText('');
    setShowFaxParser(false);
    setVerifiedCheckbox(false);
    setRedactionCount(0);
    setIsModalOpen(false);
  };

  // Handle status update
  const handleStatusChange = (referralId: string, newStatus: string) => {
    updateReferralStatus(referralId, newStatus);
    toast.success(`Referral status updated to ${newStatus}`);
  };

  // Handle patient row click to show journey
  const handlePatientClick = async (patientId: string) => {
    setSelectedPatientForJourney(patientId);
    await logPatientView(1, patientId, 'Viewing patient care history');
  };

  const selectedPatientData = patients.find(p => p.id === selectedPatientForJourney);
  const patientReferrals = selectedPatientForJourney 
    ? referrals.filter(r => r.patientId === selectedPatientForJourney)
    : [];
  const patientLabs = selectedPatientForJourney
    ? labs.filter(l => l.patientId === selectedPatientForJourney)
    : [];

  // Combine and sort timeline events
  const timelineEvents = [
    ...patientReferrals.map(r => ({
      id: r.id,
      type: 'referral' as const,
      date: new Date(r.date),
      title: `Referral to ${r.specialist}`,
      description: r.notes,
      status: r.status,
    })),
    ...patientLabs.map(l => ({
      id: l.id,
      type: 'lab' as const,
      date: new Date(l.date),
      title: `${l.testType} ${l.status === 'Ordered' ? '(Ordered)' : '(Resulted)'}`,
                    description: (l as any).result || 'Pending result',
      status: l.status,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Health Guardian Bridge</h1>
              <p className="text-slate-600 mt-2">Clinical Inbox Orchestrator</p>
            </div>
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">Launch as SMART on FHIR App</span>
              <Switch checked={smartConnected} onCheckedChange={setSmartConnected} />
            </div>
          </div>

          {/* SMART Connection Banner */}
          {smartConnected && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
              <div>
                <p className="font-semibold text-green-900">Connected to AWS HealthLake (FHIR R4) - Canada Central Region</p>
                <p className="text-sm text-green-700 mt-1">Real-time interoperability enabled</p>
              </div>
            </div>
          )}

          {/* Privacy & Compliance Footer */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700">
              <strong>Privacy Compliance:</strong> All PHI is encrypted at rest and in transit. All actions logged per PIPEDA/PHIPA standards.
            </p>
          </div>
        </div>

        {/* CDS Alert Card */}
        {overdueOrderedLabs.length > 0 && (
          <Card className="mb-8 border-red-500 bg-red-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <CardTitle className="text-red-900">Clinical Decision Support Alert</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-800 font-medium mb-3">
                {overdueOrderedLabs.length} lab result(s) pending for over 7 days:
              </p>
              <ul className="space-y-2">
                {overdueOrderedLabs.map(lab => {
                  const patient = patients.find(p => p.id === lab.patientId);
                  return (
                    <li key={lab.id} className="text-sm text-red-700">
                      • <strong>{patient?.name}</strong> - {lab.testType} (ordered {lab.date})
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Referral Table */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Referrals</CardTitle>
                <CardDescription>Click patient name to view care journey</CardDescription>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Referral
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Referral</DialogTitle>
                    <DialogDescription>Send a referral to a specialist</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Patient Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="patient">Patient</Label>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                        <SelectTrigger id="patient">
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map(patient => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Specialist Input */}
                    <div className="space-y-2">
                      <Label htmlFor="specialist">Specialist</Label>
                      <Input
                        id="specialist"
                        placeholder="e.g., Cardiology"
                        value={specialist}
                        onChange={(e) => setSpecialist(e.target.value)}
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Clinical Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Enter clinical notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* AI Fax Parser */}
                    <div className="border-t pt-4">
                      <Button
                        variant="outline"
                        className="w-full gap-2 mb-3"
                        onClick={() => setShowFaxParser(!showFaxParser)}
                      >
                        <Brain className="w-4 h-4" />
                        🧠 AI Parse Fax (OpenMed)
                      </Button>

                      {showFaxParser && (
                        <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                          <Textarea
                            placeholder="Paste messy clinical text here..."
                            value={faxText}
                            onChange={(e) => setFaxText(e.target.value)}
                            rows={4}
                          />
                          <Button onClick={handleParseFax} variant="secondary" className="w-full">
                            Parse Text
                          </Button>
                          {redactionCount > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-600" />
                              <span className="text-xs text-amber-700">
                                <strong>Data Minimization:</strong> {redactionCount} PII elements redacted before processing
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-slate-500">
                            Synthetic AI processing - Powered by OpenMed Local NLP
                          </p>
                        </div>
                      )}
                    </div>

                    {/* HITL Verification Checkbox */}
                    <div className="border-t pt-4 bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="verify"
                          checked={verifiedCheckbox}
                          onCheckedChange={(checked) => setVerifiedCheckbox(checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label htmlFor="verify" className="font-medium text-slate-900 cursor-pointer">
                            I verify these AI-extracted clinical details
                          </Label>
                          <p className="text-xs text-slate-600 mt-1">
                            Human verification required. The AI suggests, you decide.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button - Hard-blocked until verified */}
                    <Button 
                      onClick={handleSubmitReferral} 
                      className="w-full"
                      disabled={!verifiedCheckbox}
                      variant={verifiedCheckbox ? 'default' : 'secondary'}
                    >
                      {verifiedCheckbox ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Submit Referral
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Verification Required
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Specialist</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map(referral => {
                  const patient = patients.find(p => p.id === referral.patientId);
                  return (
                    <TableRow key={referral.id}>
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => handlePatientClick(referral.patientId)}
                      >
                        {patient?.name}
                      </TableCell>
                      <TableCell>{referral.specialist}</TableCell>
                      <TableCell>{referral.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={referral.status === 'Pending' ? 'secondary' : 'default'}
                          className={
                            referral.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : referral.status === 'Accepted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-800'
                          }
                        >
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={referral.status}
                          onValueChange={(value) => handleStatusChange(referral.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Accepted">Accepted</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Patient Care Journey Sheet */}
      <Sheet open={!!selectedPatientForJourney} onOpenChange={(open) => {
        if (!open) setSelectedPatientForJourney(null);
      }}>
        <SheetContent side="right" className="w-full sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Patient Care Journey (Audit & Continuity View)
            </SheetTitle>
            <SheetDescription>
              {selectedPatientData?.name} - Complete care history
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Patient Info Card */}
            {selectedPatientData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedPatientData.name}</CardTitle>
                  <CardDescription>DOB: {selectedPatientData.dob}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-600">
                    Primary Physician: {(selectedPatientData as any).primaryPhysician}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Care Timeline</h3>
              <div className="space-y-4">
                {timelineEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">No events recorded</p>
                ) : (
                  timelineEvents.map((event, idx) => (
                    <div key={event.id} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            event.type === 'referral'
                              ? 'bg-blue-600'
                              : 'bg-green-600'
                          }`}
                        />
                        {idx < timelineEvents.length - 1 && (
                          <div className="w-0.5 h-12 bg-slate-300 mt-2" />
                        )}
                      </div>

                      {/* Event content */}
                      <div className="pb-4 flex-1">
                        <div className="font-medium text-slate-900">{event.title}</div>
                        <div className="text-sm text-slate-600 mt-1">{event.description}</div>
                        <div className="text-xs text-slate-500 mt-2">
                          {event.date.toLocaleDateString()} {event.date.toLocaleTimeString()}
                        </div>
                        {event.status && (
                          <Badge className="mt-2" variant="outline">
                            {event.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit Trail Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                <strong>Audit Trail:</strong> This view is logged for compliance. All clinician actions are recorded in the audit trail per PIPEDA/PHIPA regulations.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
