import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Workflow } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Main Content - Centered */}
      <div className="text-center max-w-2xl">
        {/* Bridge Icon */}
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-white rounded-2xl shadow-lg border border-slate-100">
            <Workflow className="w-24 h-24 text-blue-600" strokeWidth={1.5} />
          </div>
        </div>

        {/* Tagline */}
        <h1 className="text-5xl font-bold text-slate-900 mb-4 leading-tight">
          The Guardian Between Clinical Data and Proactive Care
        </h1>

        {/* Subtext */}
        <p className="text-lg text-slate-600 mb-12 leading-relaxed">
          Intelligent referral orchestration. Real-time clinical decision support. 
          <br />
          Audit-first security. Built for clinicians who demand precision.
        </p>

        {/* CTA Button */}
        <Link href="/clinician">
          <Button 
            className="px-12 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: '#0A5C79' }}
          >
            Enter Clinician Inbox
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          100% PIPEDA Compliant • Powered by OpenMed Local NLP • Audit Active
        </p>
      </div>
    </div>
  );
}
