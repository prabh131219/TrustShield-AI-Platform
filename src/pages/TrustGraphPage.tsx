import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Graph from 'react-force-graph-2d';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Network, Plus, ShieldCheck, AlertTriangle, X, Trash2, UserCheck, Phone, Mail, Building2, Landmark, Hash, Users, RotateCcw } from 'lucide-react';
import type { TrustedIdentity, IdentityType } from '@/types';
import { Button } from '@/components/ui/Button';

const identityTypes: { value: IdentityType; label: string; icon: typeof Users }[] = [
  { value: 'family', label: 'Family contact', icon: Users },
  { value: 'vendor', label: 'Vendor', icon: Building2 },
  { value: 'company', label: 'Company', icon: Landmark },
  { value: 'bank_account', label: 'Bank account', icon: Landmark },
  { value: 'upi_id', label: 'UPI ID', icon: Hash },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
];

const verificationMethods = ['In-person', 'Video call', 'OTP callback', 'Document check', 'Manual trust'];

interface GraphNode {
  id: string;
  name: string;
  type: string;
  verified: boolean;
  active: boolean;
  isRoot?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
}

export function TrustGraphPage() {
  const { user } = useAuth();
  const [identities, setIdentities] = useState<TrustedIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<TrustedIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 600, height: 380 });

  // Stable dedupe key so repeated "Seed demo" clicks never create duplicates.
  const seedKey = (s: { identity_type: string; display_name: string }) =>
    `${s.identity_type}:${s.display_name.toLowerCase()}`;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trusted_identities')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    setIdentities((data ?? []) as TrustedIdentity[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDims({ width: e.contentRect.width, height: 380 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const rootId = 'root';
    const nodes: GraphNode[] = [{ id: rootId, name: 'You', type: 'root', verified: true, active: true, isRoot: true }];
    const links: GraphLink[] = [];
    for (const id of identities) {
      nodes.push({
        id: id.id,
        name: id.display_name,
        type: id.identity_type,
        verified: id.verification_status === 'verified',
        active: id.active,
      });
      links.push({ source: rootId, target: id.id });
    }
    return { nodes, links };
  }, [identities]);

  const nodeColor = (n: GraphNode) => {
    if (n.isRoot) return '#22d3ee';
    if (!n.active) return '#475569';
    return n.verified ? '#10b981' : '#f59e0b';
  };

  const seedDemo = async () => {
    setError(null);
    if (!user) return;
    if (seeding) return;
    setSeeding(true);
    try {
      const seeds: Omit<TrustedIdentity, 'id' | 'user_id' | 'created_at'>[] = [
        {
          display_name: 'Mother',
          identity_type: 'family',
          phone: '+91 90000 11111',
          email: 'mother@family.in',
          upi_id: 'mother@okhdfcbank',
          account_reference: null,
          verification_method: 'In-person',
          verification_status: 'verified',
          verified_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          active: true,
        },
        {
          display_name: 'Sharma Traders (Vendor)',
          identity_type: 'vendor',
          phone: '+91 90000 22222',
          email: 'accounts@sharmatraders.in',
          upi_id: 'sharmatraders@upi',
          account_reference: null,
          verification_method: 'Document check',
          verification_status: 'verified',
          verified_at: new Date(Date.now() - 86400000 * 15).toISOString(),
          active: true,
        },
        {
          display_name: 'Sharma Traders — HDFC A/c',
          identity_type: 'bank_account',
          phone: null,
          email: null,
          upi_id: null,
          account_reference: 'HDFC0001234-5678',
          verification_method: 'Document check',
          verification_status: 'verified',
          verified_at: new Date(Date.now() - 86400000 * 15).toISOString(),
          active: true,
        },
        {
          display_name: 'Unknown Receiver (demo)',
          identity_type: 'upi_id',
          phone: null,
          email: null,
          upi_id: 'reward-centre@xyz',
          account_reference: null,
          verification_method: null,
          verification_status: 'unverified',
          verified_at: null,
          active: true,
        },
      ];
      // Idempotent: re-fetch fresh state, dedupe by stable key, insert only missing.
      const { data: fresh } = await supabase
        .from('trusted_identities')
        .select('identity_type,display_name');
      const existing = new Set((fresh ?? []).map((i) => seedKey(i as { identity_type: string; display_name: string })));
      const toInsert = seeds.filter((s) => !existing.has(seedKey(s)));
      if (toInsert.length === 0) {
        setError('Demo identities already seeded — no duplicates created.');
        return;
      }
      const { error } = await supabase.from('trusted_identities').insert(toInsert);
      if (error) {
        setError(error.message);
      } else {
        await load();
      }
    } finally {
      setSeeding(false);
    }
  };

  const resetDemoData = async () => {
    setError(null);
    if (resetting) return;
    setResetting(true);
    try {
      // Delete all demo data for this user across the four tables.
      // Order respects foreign keys: challenges/passports reference scans+identities.
      const { data: scans } = await supabase
        .from('safety_scans')
        .select('id');
      const scanIds = (scans ?? []).map((s) => (s as { id: string }).id);
      if (scanIds.length > 0) {
        await supabase.from('verification_challenges').delete().in('scan_id', scanIds);
        await supabase.from('decision_passports').delete().in('scan_id', scanIds);
      }
      await supabase.from('safety_scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('trusted_identities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await load();
      setResetOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset demo data.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Trust Graph</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your verified relationships — family, vendors, companies, accounts and identifiers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={seedDemo} loading={seeding} disabled={loading}>
            <Plus className="h-4 w-4" />
            Seed demo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)} disabled={loading}>
            <RotateCcw className="h-4 w-4" />
            Reset demo data
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add identity
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* graph */}
        <div className="glass overflow-hidden rounded-2xl lg:col-span-2">
          <div ref={containerRef} className="relative h-[380px] w-full">
            {identities.length === 0 && !loading ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Network className="h-10 w-10 text-slate-600" />
                <p className="mt-3 text-sm text-slate-400">No identities yet</p>
                <p className="mt-1 text-xs text-slate-500">Add a trusted identity or seed the demo.</p>
              </div>
            ) : (
              <Graph
                graphData={graphData}
                width={dims.width}
                height={dims.height}
                nodeColor={(n) => nodeColor(n as GraphNode)}
                nodeRelSize={6}
                nodeVal={(n) => ((n as GraphNode).isRoot ? 9 : 6)}
                nodeLabel={(n) => `${(n as GraphNode).name}`}
                linkColor={() => 'rgba(255,255,255,0.12)'}
                linkDirectionalParticles={0}
                cooldownTicks={80}
                onNodeClick={(n) => {
                  const node = n as GraphNode;
                  if (node.isRoot) return;
                  const id = identities.find((i) => i.id === node.id);
                  if (id) setSelected(id);
                }}
                backgroundColor="rgba(0,0,0,0)"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-white/5 px-4 py-3 text-xs">
            <Legend color="#22d3ee" label="You" />
            <Legend color="#10b981" label="Verified" />
            <Legend color="#f59e0b" label="Unverified" />
            <Legend color="#475569" label="Inactive" />
          </div>
        </div>

        {/* identity list */}
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Identities ({identities.length})</h2>
          <div className="space-y-2">
            {identities.map((id) => (
              <button
                key={id.id}
                onClick={() => setSelected(id)}
                className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{id.display_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{id.identity_type.replace('_', ' ')}</p>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-medium ${id.verification_status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {id.verification_status === 'verified' ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {id.verification_status}
                </span>
              </button>
            ))}
            {identities.length === 0 && !loading && (
              <p className="text-xs text-slate-500">No identities yet.</p>
            )}
            {loading && <p className="text-xs text-slate-500">Loading…</p>}
          </div>
        </div>
      </div>

      {showForm && (
        <AddIdentityModal
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await load();
          }}
        />
      )}

      {selected && (
        <IdentityDetailModal
          identity={selected}
          onClose={() => setSelected(null)}
          onChanged={async () => {
            await load();
          }}
        />
      )}

      {resetOpen && (
        <Modal title="Reset demo data" onClose={() => setResetOpen(false)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">This will delete all scans, challenges, passports and trusted identities for your account.</p>
                <p className="mt-1 text-xs text-red-200/80">Use this to restart the hackathon demo from a clean state. This cannot be undone.</p>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={() => setResetOpen(false)} className="flex-1" disabled={resetting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={resetDemoData} loading={resetting} className="flex-1">
                <Trash2 className="h-4 w-4" />
                Delete everything
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-400">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function AddIdentityModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [identityType, setIdentityType] = useState<IdentityType>('family');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountRef, setAccountRef] = useState('');
  const [verificationMethod, setVerificationMethod] = useState(verificationMethods[0]);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!phone && !email && !upiId && !accountRef) {
      setError('Add at least one identifier (phone, email, UPI ID or account reference).');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('trusted_identities').insert({
      display_name: displayName.trim(),
      identity_type: identityType,
      phone: phone || null,
      email: email || null,
      upi_id: upiId || null,
      account_reference: accountRef || null,
      verification_method: verificationMethod,
      verification_status: verified ? 'verified' : 'unverified',
      verified_at: verified ? new Date().toISOString() : null,
      active: true,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      onSaved();
    }
  };

  return (
    <Modal title="Add trusted identity" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Display name *</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Mother, Sharma Traders" className={inputCls} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Identity type</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {identityTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setIdentityType(t.value)}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                  identityType === t.value ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@…" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">UPI ID</label>
            <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Account reference</label>
            <input value={accountRef} onChange={(e) => setAccountRef(e.target.value)} placeholder="IFSC-A/c no." className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Verification method</label>
          <select value={verificationMethod} onChange={(e) => setVerificationMethod(e.target.value)} className={inputCls}>
            {verificationMethods.map((m) => (
              <option key={m} value={m} className="bg-ink-900">
                {m}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/10 accent-cyan-500" />
          Mark as verified now
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} className="flex-1">
            <Plus className="h-4 w-4" />
            Add identity
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function IdentityDetailModal({
  identity,
  onClose,
  onChanged,
}: {
  identity: TrustedIdentity;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleActive = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from('trusted_identities')
      .update({ active: !identity.active })
      .eq('id', identity.id);
    setBusy(false);
    if (error) setError(error.message);
    else onChanged();
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from('trusted_identities')
      .update({ verification_status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', identity.id);
    setBusy(false);
    if (error) setError(error.message);
    else onChanged();
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('trusted_identities').delete().eq('id', identity.id);
    setBusy(false);
    if (error) setError(error.message);
    else {
      onChanged();
      onClose();
    }
  };

  return (
    <Modal title={identity.display_name} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <DetailRow label="Type" value={identity.identity_type.replace('_', ' ')} />
          <DetailRow label="Status" value={identity.verification_status} />
          <DetailRow label="Phone" value={identity.phone || '—'} />
          <DetailRow label="Email" value={identity.email || '—'} />
          <DetailRow label="UPI ID" value={identity.upi_id || '—'} />
          <DetailRow label="Account ref" value={identity.account_reference || '—'} />
          <DetailRow label="Verification method" value={identity.verification_method || '—'} />
          <DetailRow label="Verified at" value={identity.verified_at ? new Date(identity.verified_at).toLocaleString() : '—'} />
          <DetailRow label="Active" value={identity.active ? 'Yes' : 'No'} />
          <DetailRow label="Added" value={new Date(identity.created_at).toLocaleString()} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {identity.verification_status !== 'verified' && (
            <Button size="sm" variant="success" onClick={verify} loading={busy}>
              <UserCheck className="h-4 w-4" />
              Mark verified
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={toggleActive} loading={busy}>
            {identity.active ? 'Deactivate' : 'Reactivate'}
          </Button>
          <Button size="sm" variant="danger" onClick={remove} loading={busy} className="ml-auto">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-white">{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="glass-strong w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/50 focus:bg-white/10';
