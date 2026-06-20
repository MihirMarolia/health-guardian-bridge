import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const patients = useStore(state => state.patients);
  const referrals = useStore(state => state.referrals);
  const timeline = useStore(state => state.timeline);
  const [patient, setPatient] = useState<any>(null);
  const [activeReferrals, setActiveReferrals] = useState<any[]>([]);
  const [patientTimeline, setPatientTimeline] = useState<any[]>([]);

  // Subscribe to store changes
  useEffect(() => {
    const updateData = () => {
      const foundPatient = patients.find(p => p.id === id);
      setPatient(foundPatient);

      // Get active referrals
      const active = referrals.filter(
        r => r.patientId === id && r.status !== 'Completed'
      );
      setActiveReferrals(active);

      // Get timeline for this patient, sorted in reverse chronological order
      const patientEvents = timeline
        .filter(t => t.patientId === id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPatientTimeline(patientEvents);
    };

    updateData();

    // Subscribe to store updates
    const unsubscribe = useStore.subscribe(
      () => updateData()
    );

    return unsubscribe;
  }, [id]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Patient not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">{patient.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-teal-100 text-sm">Date of Birth</p>
              <p className="text-xl font-semibold">{patient.dob}</p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Health Card</p>
              <p className="text-xl font-semibold">{patient.healthCard}</p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Family Physician</p>
              <p className="text-xl font-semibold">{patient.familyMD}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Care Team Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Care Team</CardTitle>
              <CardDescription>Active care providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="pb-4 border-b">
                <p className="text-sm text-slate-600">Family Physician</p>
                <p className="font-semibold text-slate-900">{patient.familyMD}</p>
              </div>
              {activeReferrals.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-3">Active Specialists</p>
                  <div className="space-y-2">
                    {activeReferrals.map(ref => (
                      <div key={ref.id} className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{ref.specialist}</span>
                        <Badge
                          variant="secondary"
                          className={
                            ref.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }
                        >
                          {ref.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeReferrals.length === 0 && (
                <p className="text-sm text-slate-500">No active specialist referrals</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>The Guardian Timeline</CardTitle>
              <CardDescription>Care events and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {patientTimeline.length === 0 ? (
                <p className="text-slate-500 text-sm">No timeline events yet</p>
              ) : (
                <div className="space-y-6">
                  {patientTimeline.map((event, index) => {
                    const isLabResult = event.type === 'lab_resulted';
                    const dotColor = isLabResult ? '#2E9A6E' : '#0A5C79';
                    const borderColor = isLabResult ? '#d1fae5' : '#cffafe';
                    const bgColor = isLabResult ? '#f0fdf4' : '#f0f9ff';

                    return (
                      <div key={event.id} className="flex gap-4">
                        {/* Timeline Line and Dot */}
                        <div className="flex flex-col items-center">
                          <div
                            className="w-3 h-3 rounded-full border-2"
                            style={{
                              backgroundColor: dotColor,
                              borderColor: dotColor,
                            }}
                          />
                          {index < patientTimeline.length - 1 && (
                            <div
                              className="w-0.5 h-12 mt-2"
                              style={{ backgroundColor: borderColor }}
                            />
                          )}
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 pb-4">
                          <div
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: bgColor }}
                          >
                            <div className="flex items-start gap-2">
                              {isLabResult ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              ) : event.type === 'status_change' ? (
                                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{event.description}</p>
                                <p className="text-xs text-slate-600 mt-1">
                                  {new Date(event.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
