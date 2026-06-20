import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">Health Guardian Bridge</h1>
          <p className="text-xl text-teal-100">
            Actionable Clinical Inbox & Referral Orchestrator
          </p>
          <p className="text-teal-200 mt-3 max-w-2xl mx-auto">
            Seamless coordination between clinicians and patients. Manage referrals, track care events, and ensure nothing falls through the cracks.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Clinician Card */}
          <Card className="border-2 border-teal-200 hover:border-teal-400 transition-colors shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-teal-100 p-4 rounded-full">
                  <Stethoscope className="w-8 h-8 text-teal-700" />
                </div>
              </div>
              <CardTitle className="text-2xl">I am a Clinician</CardTitle>
              <CardDescription className="text-base mt-2">
                Manage referrals, track lab results, and coordinate care
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  Clinical Decision Support Alerts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  Referral Management Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  AI-Powered Fax Parser
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span>
                  FHIR Interoperability
                </li>
              </ul>
              <Link href="/clinician">
                <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white">
                  Access Clinical Hub
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Patient Card */}
          <Card className="border-2 border-emerald-200 hover:border-emerald-400 transition-colors shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-emerald-100 p-4 rounded-full">
                  <Users className="w-8 h-8 text-emerald-700" />
                </div>
              </div>
              <CardTitle className="text-2xl">I am a Patient</CardTitle>
              <CardDescription className="text-base mt-2">
                View your care team and track your health journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Care Team Overview
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Real-Time Timeline Updates
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Referral Status Tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  Lab Results History
                </li>
              </ul>
              <Link href="/patient/p1">
                <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">
                  View Your Care Journey
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Why Health Guardian Bridge?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-3">24/7</div>
              <h3 className="font-semibold text-slate-900 mb-2">Real-Time Monitoring</h3>
              <p className="text-slate-600 text-sm">
                Instant notifications and live updates keep everyone informed
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-3">100%</div>
              <h3 className="font-semibold text-slate-900 mb-2">FHIR Compliant</h3>
              <p className="text-slate-600 text-sm">
                Full interoperability with healthcare systems and EHRs
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-3">AI</div>
              <h3 className="font-semibold text-slate-900 mb-2">Smart Parsing</h3>
              <p className="text-slate-600 text-sm">
                Intelligent document processing saves time and reduces errors
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-slate-400 py-8 px-6 mt-16">
        <div className="max-w-4xl mx-auto text-center text-sm">
          <p>Health Guardian Bridge © 2026 | Powered by FHIR R4 & AWS HealthLake</p>
        </div>
      </div>
    </div>
  );
}
