import { ShieldCheck, LayoutDashboard, ScanLine, Network, LogOut, Menu, X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export type AppView = 'dashboard' | 'scan' | 'graph';

interface AppShellProps {
  view: AppView;
  onNavigate: (v: AppView) => void;
  children: React.ReactNode;
}

const navItems: { id: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scan', label: 'Scan & Analyse', icon: ScanLine },
  { id: 'graph', label: 'Trust Graph', icon: Network },
];

export function AppShell({ view, onNavigate, children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">TrustShield AI</span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  view === item.id
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:block max-w-[140px] truncate">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={signOut} className="hidden md:inline-flex">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
            <button
              onClick={() => setOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-white/5 px-4 py-3 md:hidden">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                    view === item.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="no-print bg-amber-500/[0.06] border-b border-amber-500/20 px-4 py-2 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-amber-300/90">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Hackathon prototype — no real payment, bank, SMS, call or NPCI processing.
        </p>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
