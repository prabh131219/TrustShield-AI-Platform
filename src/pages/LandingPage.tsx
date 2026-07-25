import { ShieldCheck, ScanLine, AlertTriangle, Lock, Fingerprint, ArrowRight, Play, Github } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LandingPageProps {
  onStart: () => void;
  onDemo: () => void;
}

export function LandingPage({ onStart, onDemo }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">TrustShield AI</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm text-slate-400 sm:flex">
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#disclaimer" className="hover:text-white transition-colors">Disclaimer</a>
        </nav>
        <Button size="sm" variant="secondary" onClick={onStart}>
          Sign in
        </Button>
      </header>

      {/* hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-24 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-cyan-300 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse-soft" />
            Simulated fraud-prevention prototype
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl animate-fade-up">
            Verify identity before money is lost.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg animate-fade-up" style={{ animationDelay: '80ms' }}>
            TrustShield AI analyses QR codes, UPI details, suspicious messages and receiver identity
            before you complete a payment — and returns one clear decision:{' '}
            <span className="font-semibold text-emerald-400">TRUST</span>,{' '}
            <span className="font-semibold text-amber-400">VERIFY</span>, or{' '}
            <span className="font-semibold text-red-400">STOP</span>.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: '160ms' }}>
            <Button size="lg" onClick={onStart} className="w-full sm:w-auto">
              <ScanLine className="h-5 w-5" />
              Start Safety Scan
            </Button>
            <Button size="lg" variant="secondary" onClick={onDemo} className="w-full sm:w-auto">
              <Play className="h-4 w-4" />
              View Demo
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-500 animate-fade-in" style={{ animationDelay: '240ms' }}>
            No real payments are processed. All actions are clearly labelled as simulated.
          </p>
        </div>

        {/* hold → challenge visual */}
        <section id="how" className="mx-auto mt-20 max-w-5xl animate-fade-up" style={{ animationDelay: '320ms' }}>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: ScanLine,
                title: 'Scan',
                desc: 'Scan a QR, paste a message or enter a UPI ID. TrustShield extracts the signals locally.',
                color: 'text-cyan-400',
              },
              {
                icon: Lock,
                title: 'Hold',
                desc: 'When risk is detected, the simulated payment is paused — never auto-completed.',
                color: 'text-amber-400',
              },
              {
                icon: Fingerprint,
                title: 'Challenge',
                desc: 'A trusted contact from your Trust Graph is used to verify the receiver via callback or OTP.',
                color: 'text-emerald-400',
              },
            ].map((step, i) => (
              <div key={step.title} className="glass rounded-2xl p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ${step.color} ring-1 ring-white/10`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-slate-500">0{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto mt-20 max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">A transparent fusion of risk signals</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-400">
            Every signal and its score contribution is shown. No black box — just clear, auditable rules.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ScanLine, title: 'QR & UPI parsing', desc: 'Scan via camera, upload an image, or enter a UPI ID manually.' },
              { icon: AlertTriangle, title: 'Fusion Risk Engine', desc: 'Rule-based scoring across urgency, URL patterns, Trust Graph and more.' },
              { icon: Fingerprint, title: 'Trust Graph', desc: 'Build a graph of verified family, vendors and accounts you trust.' },
              { icon: Lock, title: 'Hold → Challenge', desc: 'Pause and verify through a trusted callback or OTP before continuing.' },
              { icon: ShieldCheck, title: 'Decision Passport', desc: 'A signed, hash-verified report for every scan. Tamper-evident.' },
              { icon: ArrowRight, title: 'Clear next step', desc: 'One decision: TRUST, VERIFY or STOP — with the reasoning shown.' },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 transition-colors hover:bg-white/[0.05]">
                <f.icon className="h-5 w-5 text-cyan-400" />
                <h3 className="mt-3 text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* disclaimer */}
        <section id="disclaimer" className="mx-auto mt-20 max-w-3xl">
          <div className="glass rounded-2xl border-amber-500/20 bg-amber-500/[0.03] p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <h3 className="text-sm font-semibold text-amber-200">Hackathon prototype — not a real fraud detector</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  TrustShield AI is a simulated prototype built for demonstration purposes. It does not connect to
                  real banks, NPCI, UPI payment processing or KYC systems. It does not perform real voice-deepfake
                  detection and is not a trained AI. The Fusion Engine is a transparent ruleset, not a perfect
                  fraud detector. Never rely on it for real financial decisions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-500" />
            <span>TrustShield AI — hackathon prototype</span>
          </div>
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            <span>Simulated · No real payments</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
