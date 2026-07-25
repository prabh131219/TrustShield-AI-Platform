import { useEffect, useState } from 'react';
import { ScanLine, ShieldCheck, AlertTriangle, Ban, Network, ArrowRight, Activity, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SafetyScan, TrustedIdentity } from '@/types';
import { Button } from '@/components/ui/Button';
import type { AppView } from '@/components/AppShell';

interface DashboardProps {
  onNavigate: (v: AppView) => void;
  onOpenScan: (scanId: string) => void;
}

interface Stats {
  total: number;
  trust: number;
  verify: number;
  stop: number;
  identities: number;
  verified: number;
}

export function Dashboard({ onNavigate, onOpenScan }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({ total: 0, trust: 0, verify: 0, stop: 0, identities: 0, verified: 0 });
  const [recent, setRecent] = useState<SafetyScan[]>([]);
  const [identities, setIdentities] = useState<TrustedIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [scansRes, idRes] = await Promise.all([
        supabase.from('safety_scans').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('trusted_identities').select('*').order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      const scans = (scansRes.data ?? []) as SafetyScan[];
      const ids = (idRes.data ?? []) as TrustedIdentity[];
      setRecent(scans);
      setIdentities(ids);
      setStats({
        total: scans.length,
        trust: scans.filter((s) => s.final_decision === 'TRUST').length,
        verify: scans.filter((s) => s.final_decision === 'VERIFY').length,
        stop: scans.filter((s) => s.final_decision === 'STOP').length,
        identities: ids.length,
        verified: ids.filter((i) => i.verification_status === 'verified' && i.active).length,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { label: 'Total scans', value: stats.total, icon: Activity, color: 'text-cyan-400', ring: 'ring-cyan-500/20' },
    { label: 'Trusted', value: stats.trust, icon: ShieldCheck, color: 'text-emerald-400', ring: 'ring-emerald-500/20' },
    { label: 'Verifications', value: stats.verify, icon: AlertTriangle, color: 'text-amber-400', ring: 'ring-amber-500/20' },
    { label: 'Stopped', value: stats.stop, icon: Ban, color: 'text-red-400', ring: 'ring-red-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Your fraud-prevention activity at a glance.</p>
        </div>
        <Button onClick={() => onNavigate('scan')}>
          <ScanLine className="h-4 w-4" />
          Start new scan
        </Button>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`glass rounded-2xl p-4 ring-1 ${c.ring} sm:p-5`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* recent decisions */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent decisions</h2>
            <button onClick={() => onNavigate('scan')} className="text-xs text-cyan-400 hover:text-cyan-300">
              New scan →
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No scans yet"
              desc="Run your first safety scan to see decisions here."
              action={
                <Button size="sm" onClick={() => onNavigate('scan')} className="mt-3">
                  Start scan
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 8).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onOpenScan(s.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {s.receiver_reference || s.extracted_upi_id || 'Unknown receiver'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleString()} · Score {s.risk_score}
                    </p>
                  </div>
                  <DecisionBadge decision={s.final_decision} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* trust graph summary */}
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Trust Graph</h2>
            <button onClick={() => onNavigate('graph')} className="text-xs text-cyan-400 hover:text-cyan-300">
              Manage →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-slate-400">Identities</p>
              <p className="mt-1 text-2xl font-semibold text-white">{loading ? '—' : stats.identities}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-slate-400">Verified</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">{loading ? '—' : stats.verified}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {identities.slice(0, 4).map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Network className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <span className="truncate text-xs text-slate-300">{i.display_name}</span>
                </div>
                <span className={`text-[10px] font-medium ${i.verification_status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {i.verification_status}
                </span>
              </div>
            ))}
            {identities.length === 0 && !loading && (
              <p className="text-xs text-slate-500">No identities yet.</p>
            )}
          </div>
          <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => onNavigate('graph')}>
            <Network className="h-4 w-4" />
            Open Trust Graph
          </Button>
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, string> = {
    TRUST: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    VERIFY: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    STOP: 'bg-red-500/15 text-red-400 ring-red-500/30',
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${map[decision] ?? 'bg-white/10 text-slate-400'}`}>
      {decision}
    </span>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: { icon: typeof Inbox; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
      {action}
    </div>
  );
}

export { DecisionBadge };
