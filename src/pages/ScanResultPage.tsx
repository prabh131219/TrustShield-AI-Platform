import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { sha256Hex, signData, verifySignature, generateChallengeCode, shortId } from '@/lib/crypto';
import { recalculateDecision } from '@/lib/fusion';
import type { SafetyScan, TrustedIdentity, VerificationChallenge, RiskSignal, Decision, ChallengeMethod, ChallengeResult, DecisionPassport } from '@/types';
import { Button } from '@/components/ui/Button';
import { DecisionBadge } from '@/pages/Dashboard';
import {
  ArrowLeft, ShieldCheck, AlertTriangle, Ban, Phone, KeyRound, CheckCircle2, XCircle,
  RefreshCw, FileText, Download, Printer, Hash, PenTool, ShieldAlert, Lock, Info, Clock, Beaker,
} from 'lucide-react';

interface ScanResultPageProps {
  scanId: string;
  onBack: () => void;
  onNavigateGraph: () => void;
}

export function ScanResultPage({ scanId, onBack, onNavigateGraph }: ScanResultPageProps) {
  const { user } = useAuth();
  const [scan, setScan] = useState<SafetyScan | null>(null);
  const [identities, setIdentities] = useState<TrustedIdentity[]>([]);
  const [challenges, setChallenges] = useState<VerificationChallenge[]>([]);
  const [passport, setPassport] = useState<DecisionPassport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [scanRes, idRes, chRes, passRes] = await Promise.all([
      supabase.from('safety_scans').select('*').eq('id', scanId).maybeSingle(),
      supabase.from('trusted_identities').select('*').order('created_at', { ascending: false }),
      supabase.from('verification_challenges').select('*').eq('scan_id', scanId).order('created_at', { ascending: false }),
      supabase.from('decision_passports').select('*').eq('scan_id', scanId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (scanRes.error) setError(scanRes.error.message);
    setScan((scanRes.data as SafetyScan) ?? null);
    setIdentities((idRes.data ?? []) as TrustedIdentity[]);
    setChallenges((chRes.data ?? []) as VerificationChallenge[]);
    setPassport((passRes.data as DecisionPassport) ?? null);
    setLoading(false);
  }, [scanId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="glass rounded-2xl p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <p className="mt-3 text-sm text-slate-300">{error || 'Scan not found.'}</p>
        </div>
      </div>
    );
  }

  const lastChallenge = challenges[0] ?? null;
  const needsChallenge = scan.final_decision !== 'TRUST';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Button>
        <span className="font-mono text-xs text-slate-500">Scan {scan.id.slice(0, 8)}</span>
      </div>

      {/* decision banner */}
      <DecisionBanner scan={scan} />

      {/* risk engine */}
      <RiskEnginePanel scan={scan} />

      {/* hold -> challenge */}
      {needsChallenge && (
        <HoldChallengePanel
          scan={scan}
          identities={identities}
          lastChallenge={lastChallenge}
          onUpdated={loadAll}
          onNavigateGraph={onNavigateGraph}
        />
      )}

      {/* simulated payment action */}
      <SimulatedPaymentPanel scan={scan} lastChallenge={lastChallenge} />

      {/* decision passport */}
      <PassportPanel
        scan={scan}
        passport={passport}
        lastChallenge={lastChallenge}
        onUpdated={loadAll}
        userEmail={user?.email ?? 'unknown'}
      />
    </div>
  );
}

function DecisionBanner({ scan }: { scan: SafetyScan }) {
  const map: Record<Decision, { bg: string; icon: typeof ShieldCheck; label: string }> = {
    TRUST: { bg: 'from-emerald-500/20 to-emerald-500/5 ring-emerald-500/30', icon: ShieldCheck, label: 'Trust' },
    VERIFY: { bg: 'from-amber-500/20 to-amber-500/5 ring-amber-500/30', icon: AlertTriangle, label: 'Verify' },
    STOP: { bg: 'from-red-500/20 to-red-500/5 ring-red-500/30', icon: Ban, label: 'Stop' },
  };
  const cfg = map[scan.final_decision];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.bg} p-6 ring-1`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
            <cfg.icon className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Final decision</p>
            <h2 className="text-3xl font-semibold text-white">{cfg.label}</h2>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <p className="text-xs text-slate-400">Risk score</p>
          <p className="text-4xl font-semibold text-white">{scan.risk_score}</p>
          <p className="text-xs text-slate-400">
            Original: <span className="font-mono">{scan.original_decision}</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="rounded-full bg-white/5 px-3 py-1">Receiver: {scan.receiver_reference || '—'}</span>
        <span className="rounded-full bg-white/5 px-3 py-1">UPI: {scan.extracted_upi_id || '—'}</span>
        {scan.payment_amount != null && <span className="rounded-full bg-white/5 px-3 py-1">Amount: ₹{Number(scan.payment_amount).toLocaleString('en-IN')}</span>}
        <span className="rounded-full bg-white/5 px-3 py-1">{new Date(scan.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

function RiskEnginePanel({ scan }: { scan: SafetyScan }) {
  const signals = (scan.risk_signals ?? []) as RiskSignal[];
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Fusion Risk Engine — detected signals</h2>
        </div>
        <FeatureLabel kind="real" />
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Transparent rule-based scoring. Not a trained AI, not a perfect fraud detector.
      </p>
      {signals.length === 0 ? (
        <p className="text-sm text-slate-500">No risk signals detected.</p>
      ) : (
        <div className="space-y-2">
          {signals.map((s) => {
            const positive = s.score > 0;
            return (
              <div key={s.key} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium text-white">{s.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.detail}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-2.5 py-1 font-mono text-sm font-semibold ${positive ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {positive ? '+' : ''}
                  {s.score}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm font-medium text-white">Total score</span>
            <span className="font-mono text-lg font-semibold text-white">{scan.risk_score}</span>
          </div>
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Threshold label="TRUST" range="0–29" active={scan.final_decision === 'TRUST'} color="emerald" />
        <Threshold label="VERIFY" range="30–59" active={scan.final_decision === 'VERIFY'} color="amber" />
        <Threshold label="STOP" range="60+" active={scan.final_decision === 'STOP'} color="red" />
      </div>
    </div>
  );
}

function Threshold({ label, range, active, color }: { label: string; range: string; active: boolean; color: 'emerald' | 'amber' | 'red' }) {
  const colors = {
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    red: 'border-red-500/40 bg-red-500/10 text-red-300',
  };
  return (
    <div className={`rounded-xl border px-2 py-2 ${active ? colors[color] : 'border-white/10 bg-white/5 text-slate-500'}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-[10px]">{range}</p>
    </div>
  );
}

function HoldChallengePanel({
  scan,
  identities,
  lastChallenge,
  onUpdated,
  onNavigateGraph,
}: {
  scan: SafetyScan;
  identities: TrustedIdentity[];
  lastChallenge: VerificationChallenge | null;
  onUpdated: () => void;
  onNavigateGraph: () => void;
}) {
  const verifiedIdentities = identities.filter((i) => i.active && i.verification_status === 'verified');
  const [selectedId, setSelectedId] = useState<string>('');
  const [method, setMethod] = useState<ChallengeMethod>('callback');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!selectedId && verifiedIdentities.length > 0) {
      setSelectedId(verifiedIdentities[0].id);
    }
  }, [verifiedIdentities, selectedId]);

  const startChallenge = async () => {
    setError(null);
    if (!selectedId) {
      setError('Select a trusted identity to challenge with. Do not use contact details from the suspicious message.');
      return;
    }
    setCreating(true);
    const code = generateChallengeCode();
    const { error } = await supabase.from('verification_challenges').insert({
      scan_id: scan.id,
      trusted_identity_id: selectedId,
      challenge_method: method,
      challenge_code: code,
      result: 'pending',
    });
    setCreating(false);
    if (error) setError(error.message);
    else onUpdated();
  };

  const completeChallenge = async (result: ChallengeResult) => {
    if (!lastChallenge) return;
    if (result === 'success' && lastChallenge.challenge_code !== enteredCode.trim()) {
      setError('Entered code does not match the challenge code. Try again or mark as failed.');
      return;
    }
    setVerifying(true);
    setError(null);
    const { error } = await supabase
      .from('verification_challenges')
      .update({ result, completed_at: new Date().toISOString() })
      .eq('id', lastChallenge.id);
    if (error) {
      setError(error.message);
      setVerifying(false);
      return;
    }
    // Recalculate final decision
    const success = result === 'success';
    const { finalDecision } = recalculateDecision(scan.risk_score, success);
    await supabase.from('safety_scans').update({ final_decision: finalDecision }).eq('id', scan.id);
    setVerifying(false);
    setEnteredCode('');
    onUpdated();
  };

  const chosenIdentity = identities.find((i) => i.id === (lastChallenge?.trusted_identity_id ?? selectedId));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Hold → Challenge</h2>
        </div>
        <FeatureLabel kind="simulated" />
      </div>

      <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-amber-200">
        The simulated payment is paused. Do not use any contact details contained in the suspicious message.
        Verify through a previously stored trusted contact from your Trust Graph.
      </div>

      {lastChallenge && lastChallenge.result === 'pending' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Challenging via</p>
            <p className="mt-1 text-sm font-medium text-white">
              {chosenIdentity?.display_name ?? 'Trusted contact'} · {lastChallenge.challenge_method === 'callback' ? 'Callback' : 'OTP'}
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-ink-950/60 px-3 py-2.5">
              <KeyRound className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-lg tracking-[0.3em] text-cyan-300">{lastChallenge.challenge_code}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Simulated: share this code with the trusted contact out-of-band, then enter it back to confirm.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Enter the code received from the trusted contact</label>
            <input
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-center text-lg tracking-[0.3em] text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button variant="success" size="sm" onClick={() => completeChallenge('success')} loading={verifying}>
              <CheckCircle2 className="h-4 w-4" />
              Success
            </Button>
            <Button variant="danger" size="sm" onClick={() => completeChallenge('failure')} loading={verifying}>
              <XCircle className="h-4 w-4" />
              Failed
            </Button>
            <Button variant="secondary" size="sm" onClick={() => completeChallenge('cancelled')} loading={verifying}>
              Cancel
            </Button>
          </div>
        </div>
      ) : lastChallenge ? (
        <div className="space-y-3">
          <ChallengeResultBadge challenge={lastChallenge} identityName={chosenIdentity?.display_name} />
          <Button variant="secondary" size="sm" onClick={startChallenge} loading={creating}>
            <RefreshCw className="h-4 w-4" />
            Start a new challenge
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {verifiedIdentities.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-sm text-slate-400">No verified trusted identities available.</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={onNavigateGraph}>
                Add to Trust Graph
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Trusted contact to verify with *</label>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className={inputCls}>
                  {verifiedIdentities.map((i) => (
                    <option key={i.id} value={i.id} className="bg-ink-900">
                      {i.display_name} ({i.identity_type.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Challenge method</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: 'callback', label: 'Simulated callback', icon: Phone },
                    { v: 'otp', label: 'OTP code', icon: KeyRound },
                  ] as const).map((m) => (
                    <button
                      key={m.v}
                      onClick={() => setMethod(m.v)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                        method === m.v ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button onClick={startChallenge} loading={creating} className="w-full">
                <KeyRound className="h-4 w-4" />
                Start challenge
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChallengeResultBadge({ challenge, identityName }: { challenge: VerificationChallenge; identityName?: string }) {
  const map: Record<ChallengeResult, { color: string; icon: typeof CheckCircle2; label: string }> = {
    pending: { color: 'text-slate-400', icon: Clock, label: 'Pending' },
    success: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Success' },
    failure: { color: 'text-red-400', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'text-slate-400', icon: XCircle, label: 'Cancelled' },
  };
  const cfg = map[challenge.result];
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <cfg.icon className={`h-5 w-5 ${cfg.color}`} />
        <div>
          <p className="text-sm font-medium text-white">{cfg.label}</p>
          <p className="text-xs text-slate-500">
            {challenge.challenge_method} · {identityName ?? 'Trusted contact'} · {new Date(challenge.completed_at ?? challenge.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

function SimulatedPaymentPanel({ scan, lastChallenge }: { scan: SafetyScan; lastChallenge: VerificationChallenge | null }) {
  const [done, setDone] = useState(false);
  const canContinue = scan.final_decision === 'TRUST';
  const failed = lastChallenge?.result === 'failure' || scan.final_decision === 'STOP';

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Simulated payment action</h2>
        </div>
        <FeatureLabel kind="simulated" />
      </div>

      {failed ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-2">
            <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-300">Payment stopped — safety warning</p>
              <p className="mt-1 text-xs text-red-200/80">
                Verification failed or risk remains too high. Do not proceed with this payment. No real payment is being processed.
              </p>
            </div>
          </div>
        </div>
      ) : canContinue ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {lastChallenge?.result === 'success'
              ? 'Verification succeeded and the decision was recalculated to TRUST. You may continue the simulated payment.'
              : 'This payment was rated TRUST. You may continue the simulated payment.'}
          </div>
          {!done ? (
            <Button variant="success" onClick={() => setDone(true)} className="w-full">
              <CheckCircle2 className="h-4 w-4" />
              Continue simulated payment
            </Button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-2 text-sm text-white">Simulated payment completed</p>
              <p className="mt-1 text-xs text-slate-500">No real payment was processed. This is a prototype.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          Payment is on hold. Complete a verification challenge to continue. No real payment is being processed.
        </div>
      )}
    </div>
  );
}

function PassportPanel({
  scan,
  passport,
  lastChallenge,
  onUpdated,
  userEmail,
}: {
  scan: SafetyScan;
  passport: DecisionPassport | null;
  lastChallenge: VerificationChallenge | null;
  onUpdated: () => void;
  userEmail: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrity, setIntegrity] = useState<'valid' | 'tampered' | 'unknown' | null>(null);
  const [checking, setChecking] = useState(false);
  const [tamperedData, setTamperedData] = useState<Record<string, unknown> | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const decisionId = `TS-${shortId()}-${Date.now().toString(36).toUpperCase()}`;
      const passportData = {
        decisionId,
        scanId: scan.id,
        generatedAt: new Date().toISOString(),
        receiverReference: scan.receiver_reference,
        paymentAmount: scan.payment_amount,
        extractedUpiId: scan.extracted_upi_id,
        riskSignals: scan.risk_signals,
        riskScore: scan.risk_score,
        originalDecision: scan.original_decision,
        challenge: lastChallenge
          ? {
              method: lastChallenge.challenge_method,
              result: lastChallenge.result,
              completedAt: lastChallenge.completed_at,
            }
          : null,
        finalDecision: scan.final_decision,
        user: userEmail,
        disclaimer: 'Prototype signature — not legally certified evidence.',
      };
      const canonical = JSON.stringify(passportData);
      const hash = await sha256Hex(canonical);
      const signature = await signData(hash);
      const { error } = await supabase.from('decision_passports').insert({
        scan_id: scan.id,
        passport_data: passportData,
        hash,
        digital_signature: signature,
        integrity_status: 'valid',
      });
      if (error) throw new Error(error.message);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate passport.');
    } finally {
      setGenerating(false);
    }
  };

  const verifyIntegrity = async () => {
    if (!passport) return;
    setChecking(true);
    setError(null);
    try {
      // If tampered data is staged, verify against that; otherwise verify stored data.
      const dataToCheck = tamperedData ?? passport.passport_data;
      const canonical = JSON.stringify(dataToCheck);
      const recomputedHash = await sha256Hex(canonical);
      const hashValid = recomputedHash === passport.hash;
      const sigValid = await verifySignature(passport.hash, passport.digital_signature);
      const valid = hashValid && sigValid && !tamperedData;
      setIntegrity(valid ? 'valid' : 'tampered');
      await supabase
        .from('decision_passports')
        .update({ integrity_status: valid ? 'valid' : 'tampered' })
        .eq('id', passport.id);
      onUpdated();
    } catch {
      setIntegrity('unknown');
    } finally {
      setChecking(false);
    }
  };

  const simulateTampering = () => {
    if (!passport) return;
    // Modify one field in a local copy — integrity verification must now fail.
    const data = JSON.parse(JSON.stringify(passport.passport_data)) as Record<string, unknown>;
    data.riskScore = (data.riskScore as number) + 999;
    setTamperedData(data);
    setIntegrity(null);
  };

  const resetTampering = () => {
    setTamperedData(null);
    setIntegrity(null);
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Decision Passport</h2>
        </div>
        <div className="flex items-center gap-2">
          <FeatureLabel kind="real" />
          {passport && <span className="font-mono text-xs text-slate-500">{passport.id.slice(0, 8)}</span>}
        </div>
      </div>

      {!passport ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Generate a tamper-evident Decision Passport with a SHA-256 hash and a prototype digital signature.
          </p>
          <Button onClick={generate} loading={generating}>
            <PenTool className="h-4 w-4" />
            Generate passport
          </Button>
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="print-area rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 border-b border-white/10 pb-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Decision ID</p>
              <p className="mt-1 font-mono text-sm text-white">
                {(passport.passport_data as { decisionId?: string }).decisionId ?? '—'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <PassportRow label="Generated" value={new Date(passport.created_at).toLocaleString()} />
              <PassportRow label="Receiver" value={String(scan.receiver_reference ?? '—')} />
              <PassportRow label="Amount" value={scan.payment_amount != null ? `₹${Number(scan.payment_amount).toLocaleString('en-IN')}` : '—'} />
              <PassportRow label="Risk score" value={String(scan.risk_score)} />
              <PassportRow label="Original decision" value={scan.original_decision} />
              <PassportRow label="Final decision" value={scan.final_decision} />
              <PassportRow
                label="Challenge"
                value={lastChallenge ? `${lastChallenge.challenge_method} · ${lastChallenge.result}` : 'None'}
              />
            </div>
            <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
              <div>
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                  <Hash className="h-3 w-3" /> SHA-256 hash
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-cyan-300">{passport.hash}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                  <PenTool className="h-3 w-3" /> Prototype signature
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-300">{passport.digital_signature}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-white/10 pt-2 text-[10px] text-slate-500">
              Prototype signature — not legally certified evidence. Generated with Web Crypto API (ECDSA P-256).
            </p>
          </div>

          {integrity && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                integrity === 'valid'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : integrity === 'tampered'
                  ? 'border-red-500/20 bg-red-500/10 text-red-300'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {integrity === 'valid' ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {integrity === 'valid'
                ? 'Integrity verified — hash and signature match.'
                : integrity === 'tampered'
                ? 'Integrity check FAILED — the report data was modified.'
                : 'Could not verify integrity.'}
            </div>
          )}

          {tamperedData && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
              Tampered data staged: riskScore changed to {(tamperedData as { riskScore: number }).riskScore}.
              Click "Verify passport integrity" to confirm the check now fails.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={verifyIntegrity} loading={checking}>
              <ShieldCheck className="h-4 w-4" />
              Verify passport integrity
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
            {tamperedData ? (
              <Button variant="ghost" size="sm" onClick={resetTampering}>
                <RefreshCw className="h-4 w-4" />
                Reset tampering
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={simulateTampering}>
                <ShieldAlert className="h-4 w-4" />
                Simulate tampering
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={generate} loading={generating}>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
            <a
              href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(passport.passport_data, null, 2))}`}
              download={`trustshield-passport-${(passport.passport_data as { decisionId?: string }).decisionId ?? passport.id}.json`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-100 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function PassportRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-white">{value}</p>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/50 focus:bg-white/10';

function FeatureLabel({ kind }: { kind: 'real' | 'simulated' }) {
  const real = kind === 'real';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
        real
          ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
          : 'bg-amber-500/10 text-amber-300 ring-amber-500/30'
      }`}
      title={real ? 'Real prototype logic running locally in your browser' : 'Simulated for demo — no real bank/UPI/SMS integration'}
    >
      {real ? <ShieldCheck className="h-3 w-3" /> : <Beaker className="h-3 w-3" />}
      {real ? 'Real prototype' : 'Simulated'}
    </span>
  );
}
