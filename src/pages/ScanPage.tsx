import { useEffect, useMemo, useState } from 'react';
import { ScanLine, Camera, MessageSquare, Link as LinkIcon, User, IndianRupee, RefreshCw, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseQrPayload } from '@/lib/qr';
import { runFusionEngine } from '@/lib/fusion';
import type { ScanInput, TrustedIdentity, SafetyScan, RiskSignal, Decision } from '@/types';
import { Button } from '@/components/ui/Button';
import { QrScanner } from '@/components/QrScanner';
import { DecisionBadge } from '@/pages/Dashboard';
import { demoScenarios } from '@/lib/demos';

interface ScanPageProps {
  onScanComplete: (scanId: string) => void;
  preloaded?: ScanInput | null;
  onConsumePreload?: () => void;
}

const emptyInput: ScanInput = {
  qrPayload: '',
  upiId: '',
  messageText: '',
  url: '',
  receiverKnown: '',
  paymentAmount: '',
  detailsChanged: false,
};

export function ScanPage({ onScanComplete, preloaded, onConsumePreload }: ScanPageProps) {
  const [input, setInput] = useState<ScanInput>(emptyInput);
  const [identities, setIdentities] = useState<TrustedIdentity[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingIdentities, setLoadingIdentities] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingIdentities(true);
      const { data } = await supabase
        .from('trusted_identities')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setIdentities((data ?? []) as TrustedIdentity[]);
        setLoadingIdentities(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preloaded) {
      setInput(preloaded);
      onConsumePreload?.();
    }
  }, [preloaded, onConsumePreload]);

  const parsed = useMemo(() => parseQrPayload(input.qrPayload), [input.qrPayload]);

  // effective values: QR-parsed values can be overridden by manual fields
  const effectiveUpi = input.upiId || parsed.upiId || '';
  const effectiveAmount = Number(input.paymentAmount || (parsed.amount ?? 0)) || 0;
  const receiverName = parsed.receiverName;

  const update = (patch: Partial<ScanInput>) => setInput((p) => ({ ...p, ...patch }));

  const canSubmit = effectiveUpi || input.messageText || input.url || input.qrPayload;
  const receiverKnownValid = input.receiverKnown === 'known' || input.receiverKnown === 'unknown';

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError('Provide a UPI ID, QR payload, message or URL to analyse.');
      return;
    }
    if (!receiverKnownValid) {
      setError('Select whether the receiver is known or unknown.');
      return;
    }
    setSubmitting(true);
    try {
      const { signals, score, decision } = runFusionEngine({
        upiId: effectiveUpi,
        receiverName,
        messageText: input.messageText,
        url: input.url,
        receiverKnown: input.receiverKnown as 'known' | 'unknown',
        paymentAmount: effectiveAmount,
        detailsChanged: input.detailsChanged,
        trustedIdentities: identities,
      });

      const insert = {
        receiver_reference: effectiveUpi || receiverName || 'Unknown',
        payment_amount: effectiveAmount || null,
        message_text: input.messageText || null,
        url: input.url || null,
        qr_payload: input.qrPayload || null,
        extracted_upi_id: effectiveUpi || null,
        receiver_known: input.receiverKnown,
        details_changed: input.detailsChanged,
        risk_signals: JSON.parse(JSON.stringify(signals)) as RiskSignal[],
        risk_score: score,
        original_decision: decision,
        final_decision: decision,
      };

      const { data, error: insErr } = await supabase.from('safety_scans').insert(insert).select().maybeSingle();
      if (insErr) throw insErr;
      const scan = data as SafetyScan | null;
      if (!scan) throw new Error('Failed to save scan.');
      onScanComplete(scan.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run scan.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadDemo = (demo: typeof demoScenarios[number]) => {
    setInput(demo.input);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Scan & Analyse</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gather payment signals. TrustShield runs a transparent rule-based Fusion Engine and returns one decision.
        </p>
      </div>

      {/* demo scenarios */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">One-click demo scenarios</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {demoScenarios.map((d) => (
            <button
              key={d.id}
              onClick={() => loadDemo(d)}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-cyan-500/30 hover:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{d.title}</span>
                <DecisionBadge decision={d.expected as Decision} />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{d.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* input */}
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Payment signals</h2>

          {/* QR */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">QR code</label>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setScannerOpen(true)} className="flex-1">
                <Camera className="h-4 w-4" />
                Scan / Upload
              </Button>
              {input.qrPayload && (
                <Button variant="ghost" size="sm" onClick={() => update({ qrPayload: '' })}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
            {input.qrPayload && (
              <p className="mt-2 break-all rounded-lg bg-white/5 px-3 py-2 font-mono text-[11px] text-slate-300">
                {input.qrPayload}
              </p>
            )}
          </div>

          {/* UPI ID */}
          <Field icon={User} label="UPI ID (manual)">
            <input
              value={input.upiId}
              onChange={(e) => update({ upiId: e.target.value })}
              placeholder="name@bank"
              className={inputCls}
            />
          </Field>

          {/* message */}
          <Field icon={MessageSquare} label="Payment or scam message">
            <textarea
              value={input.messageText}
              onChange={(e) => update({ messageText: e.target.value })}
              placeholder="Paste the message you received..."
              rows={3}
              className={`${inputCls} resize-y`}
            />
          </Field>

          {/* URL */}
          <Field icon={LinkIcon} label="Suspicious URL">
            <input
              value={input.url}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>

          {/* receiver known */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Is the receiver known?</label>
            <div className="grid grid-cols-2 gap-2">
              {(['known', 'unknown'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => update({ receiverKnown: v })}
                  className={`rounded-xl border px-3 py-2.5 text-sm capitalize transition ${
                    input.receiverKnown === v
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* amount + details changed */}
          <div className="grid grid-cols-2 gap-3">
            <Field icon={IndianRupee} label="Amount (₹)">
              <input
                type="number"
                min="0"
                value={input.paymentAmount}
                onChange={(e) => update({ paymentAmount: e.target.value })}
                placeholder="0"
                className={inputCls}
              />
            </Field>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Details recently changed?</label>
              <button
                onClick={() => update({ detailsChanged: !input.detailsChanged })}
                className={`flex h-[42px] w-full items-center justify-between rounded-xl border px-3 text-sm transition ${
                  input.detailsChanged
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <span>{input.detailsChanged ? 'Yes' : 'No'}</span>
                <span className={`relative h-5 w-9 rounded-full transition ${input.detailsChanged ? 'bg-amber-500' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${input.detailsChanged ? 'left-4' : 'left-0.5'}`} />
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={handleSubmit} loading={submitting} className="mt-5 w-full" size="lg">
            <ScanLine className="h-5 w-5" />
            Run Fusion Analysis
          </Button>
        </div>

        {/* extracted preview */}
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Extracted signals (live preview)</h2>
          <div className="space-y-3">
            <PreviewRow label="UPI ID" value={effectiveUpi || '—'} />
            <PreviewRow label="Receiver name" value={receiverName || '—'} />
            <PreviewRow label="Amount" value={effectiveAmount ? `₹${effectiveAmount.toLocaleString('en-IN')}` : '—'} />
            <PreviewRow label="Payment note" value={parsed.note || '—'} />
            <PreviewRow label="URL" value={input.url || '—'} mono />
            <PreviewRow label="Message length" value={`${input.messageText.length} chars`} />
            <PreviewRow label="Receiver" value={input.receiverKnown || '—'} />
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Parsed locally in your browser. Nothing is sent to a bank.</span>
            </div>
          </div>

          {loadingIdentities && (
            <p className="mt-4 text-xs text-slate-500">Loading Trust Graph for cross-check…</p>
          )}
          {!loadingIdentities && (
            <p className="mt-4 text-xs text-slate-500">
              Cross-checking against {identities.length} trusted {identities.length === 1 ? 'identity' : 'identities'}.
            </p>
          )}
        </div>
      </div>

      {scannerOpen && (
        <QrScanner
          onClose={() => setScannerOpen(false)}
          onResult={(text) => {
            update({ qrPayload: text });
            const p = parseQrPayload(text);
            if (p.upiId && !input.upiId) update({ upiId: p.upiId });
            if (p.amount && !input.paymentAmount) update({ paymentAmount: String(p.amount) });
            setScannerOpen(false);
          }}
        />
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/50 focus:bg-white/10';

function Field({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <div className="[&_input]:pl-10 [&_textarea]:pl-10">{children}</div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-right text-sm text-white ${mono ? 'font-mono text-xs' : ''} break-all`}>{value}</span>
    </div>
  );
}
