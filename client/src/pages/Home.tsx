import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center px-4 overflow-hidden relative">
      {/* Ambient teal glow behind the icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <div className="w-[700px] h-[700px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative text-center max-w-2xl">
        {/* Icon card */}
        <div className="mb-10 flex justify-center">
          <div className="p-7 bg-card rounded-3xl border border-white/5 shadow-2xl shadow-black/50">
            <Activity className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-5xl font-bold text-foreground mb-5 leading-tight">
          The Guardian Between<br />Clinical Data and Proactive Care
        </h1>

        <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
          Intelligent referral orchestration. Real-time clinical decision support.
          <br />
          Audit-first security. Built for clinicians who demand precision.
        </p>

        <Link href="/clinician">
          <Button
            size="lg"
            className="px-10 py-6 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.02]"
          >
            Enter Clinician Inbox
          </Button>
        </Link>

        <p className="text-xs text-muted-foreground/40 mt-10 tracking-wide">
          100% PIPEDA Compliant · Powered by OpenMed Local NLP · Audit Active
        </p>
      </div>
    </div>
  );
}
