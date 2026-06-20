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
import { AlertCircle, Plus, Brain } from 'lucide-react';
import { toast } from 'sonner';

export default function Clinician() {
  const { patients, referrals, labs, addReferral, updateReferralStatus } = useStore();
  const [smartConnected, setSmartConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFaxParser, setShowFaxParser] = useState(false);
  const [faxText, setFaxText] = useState('');
  
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

  // Handle AI Fax Parser
  const handleParseFax = () => {
    if (!faxText) {
      toast.error('Please paste clinical text first');
      return;
    }

    const textUpper = faxText.toUpperCase();
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
      toast.success(`Parsed: ${parsedSpecialist} referral`);
    } else {
      toast.error('Could not identify specialist from text');
    }
  };

  // Handle submit referral
  const handleSubmitReferral = () => {
    if (!selectedPatient || !specialist || !notes) {
      toast.error('Please fill in all fields');
      return;
    }

    addReferral({
      patientId: selectedPatient,
      specialist,
      notes,
    });

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
    toast.success('Referral submitted and FHIR request logged to console');

    // Reset form
    setSelectedPatient('');
    setSpecialist('');
    setNotes('');
    setFaxText('');
    setShowFaxParser(false);
    setIsModalOpen(false);
  };

  // Handle status update
  const handleStatusChange = (referralId: string, newStatus: string) => {
    updateReferralStatus(referralId, newStatus);
    toast.success(`Referral status updated to ${newStatus}`);
  };

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
                <CardDescription>Manage and track specialist referrals</CardDescription>
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
                          <p className="text-xs text-slate-500">
                            Synthetic AI processing - Powered by OpenMed Local NLP
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button onClick={handleSubmitReferral} className="w-full">
                      Submit Referral
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
                      <TableCell className="font-medium">{patient?.name}</TableCell>
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
    </div>
  );
}
