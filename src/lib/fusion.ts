import type { Decision, RiskSignal, TrustedIdentity } from '@/types';

// Transparent rule-based Fusion Risk Engine.
// Not a trained AI, not a perfect fraud detector — a transparent ruleset.

const SUSPICIOUS_TLDS = ['zip', 'xyz', 'top', 'click', 'link', 'work', 'biz', 'info', 'country', 'review'];
const URL_SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly'];

const URGENCY_PATTERNS = [
  /\burgent\b/i,
  /\bimmediately\b/i,
  /\bnow\b/i,
  /\basap\b/i,
  /\bright now\b/i,
  /\bemergency\b/i,
  /\bdeadline\b/i,
  /\bexpires?\b/i,
  /\blast chance\b/i,
  /\bact now\b/i,
  /\bdo not (tell|inform|share)\b/i,
  /\bsecret\b/i,
  /\bdon'?t tell\b/i,
];

// Targeted money-request patterns — avoids flagging polite, normal payment
// messages like "please send the usual amount for groceries". Catches scam
// language: unsolicited fees, gift cards, explicit money/funds requests.
const MONEY_REQUEST_PATTERNS = [
  /\bsend (money|funds|cash)\b/i,
  /\btransfer (money|funds|cash)\b/i,
  /\brequest(ing)? (money|funds|payment)\b/i,
  /\bneed (money|funds|cash)\b/i,
  /\bpay (the |a |your )?(fee|processing fee|charge|tax|deposit)\b/i,
  /\bgift card\b/i,
  /\bpayment (is )?required\b/i,
  /\bpay (now|immediately|today)\b/i,
  /\bdeposit (is )?required\b/i,
];

export interface FusionInput {
  upiId: string;
  receiverName?: string;
  messageText: string;
  url: string;
  receiverKnown: 'known' | 'unknown' | '';
  paymentAmount: number;
  detailsChanged: boolean;
  trustedIdentities: TrustedIdentity[];
}

export interface FusionResult {
  signals: RiskSignal[];
  score: number;
  decision: Decision;
}

export function runFusionEngine(input: FusionInput): FusionResult {
  const signals: RiskSignal[] = [];
  let score = 0;

  // Rule: Unknown receiver +25
  if (input.receiverKnown === 'unknown') {
    score += 25;
    signals.push({ key: 'unknown_receiver', label: 'Unknown receiver', score: 25, detail: 'Receiver marked as unknown.' });
  }

  // Rule: New or recently changed payment details +30
  if (input.detailsChanged) {
    score += 30;
    signals.push({ key: 'details_changed', label: 'Recently changed payment details', score: 30, detail: 'Bank/UPI details were recently changed.' });
  }

  // Rule: Urgency / pressure language +20
  const urgencyHits: string[] = [];
  for (const p of URGENCY_PATTERNS) {
    const m = input.messageText.match(p);
    if (m) urgencyHits.push(m[0]);
  }
  if (urgencyHits.length > 0) {
    score += 20;
    signals.push({
      key: 'urgency',
      label: 'Urgency / pressure language',
      score: 20,
      detail: `Detected: ${urgencyHits.slice(0, 4).join(', ')}`,
    });
  }

  // Rule: Money request in message +10
  const moneyHits: string[] = [];
  for (const p of MONEY_REQUEST_PATTERNS) {
    const m = input.messageText.match(p);
    if (m) moneyHits.push(m[0]);
  }
  if (moneyHits.length > 0) {
    score += 10;
    signals.push({
      key: 'money_request',
      label: 'Money request in message',
      score: 10,
      detail: `Detected: ${moneyHits.slice(0, 4).join(', ')}`,
    });
  }

  // Rule: Suspicious URL pattern +25
  if (input.url) {
    let suspicious = false;
    const reasons: string[] = [];
    try {
      const u = new URL(input.url);
      const host = u.hostname.replace(/^www\./, '');
      if (URL_SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
        suspicious = true;
        reasons.push('URL shortener');
      }
      const tld = host.split('.').pop() ?? '';
      if (SUSPICIOUS_TLDS.includes(tld)) {
        suspicious = true;
        reasons.push(`suspicious TLD (.${tld})`);
      }
      if (u.username || u.password) {
        suspicious = true;
        reasons.push('embedded credentials');
      }
      if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(host)) {
        suspicious = true;
        reasons.push('raw IP address');
      }
      const subCount = host.split('.').length - 1;
      if (subCount >= 4) {
        suspicious = true;
        reasons.push('excessive subdomains');
      }
    } catch {
      // not a valid URL — treat as suspicious if it looks link-ish
      if (input.url.includes('http') || /\b(click|tap|link|open)\b/i.test(input.url)) {
        suspicious = true;
        reasons.push('malformed link');
      }
    }
    if (suspicious) {
      score += 25;
      signals.push({
        key: 'suspicious_url',
        label: 'Suspicious URL pattern',
        score: 25,
        detail: reasons.join('; '),
      });
    }
  }

  // Rule: Receiver absent from Trust Graph +25
  // Only fires when the receiver is not already marked known — if the user knows
  // the receiver, a new UPI not being in the graph is captured by detailsChanged.
  const inGraph = input.trustedIdentities.some(
    (t) => t.active && (t.upi_id?.toLowerCase() === input.upiId.toLowerCase() ||
      (input.receiverName && t.display_name.toLowerCase() === input.receiverName.toLowerCase())),
  );
  if (input.upiId && !inGraph && input.receiverKnown !== 'known') {
    score += 25;
    signals.push({
      key: 'absent_from_graph',
      label: 'Receiver absent from Trust Graph',
      score: 25,
      detail: 'No matching trusted identity found.',
    });
  }

  // Rule: High payment amount +10
  if (input.paymentAmount >= 10000) {
    score += 10;
    signals.push({
      key: 'high_amount',
      label: 'High payment amount',
      score: 10,
      detail: `Amount ₹${input.paymentAmount.toLocaleString('en-IN')} ≥ ₹10,000.`,
    });
  }

  // Rule: Verified trusted receiver -30
  const verifiedMatch = input.trustedIdentities.find(
    (t) => t.active && t.verification_status === 'verified' &&
      (t.upi_id?.toLowerCase() === input.upiId.toLowerCase() ||
        (input.receiverName && t.display_name.toLowerCase() === input.receiverName.toLowerCase())),
  );
  if (verifiedMatch) {
    score -= 30;
    signals.push({
      key: 'verified_trusted',
      label: 'Verified trusted receiver',
      score: -30,
      detail: `Matches verified identity: ${verifiedMatch.display_name}.`,
    });
  }

  // Rule: Successful previous verification -20 (simplified: any verified identity of same type)
  if (verifiedMatch && input.trustedIdentities.some((t) => t.verified_at)) {
    score -= 20;
    signals.push({
      key: 'previous_verification',
      label: 'Successful previous verification',
      score: -20,
      detail: 'Prior successful verification recorded in Trust Graph.',
    });
  }

  score = Math.max(0, score);
  const decision: Decision = score >= 60 ? 'STOP' : score >= 30 ? 'VERIFY' : 'TRUST';

  return { signals, score, decision };
}

export function recalculateDecision(originalScore: number, challengeSuccess: boolean): { finalScore: number; finalDecision: Decision } {
  let finalScore = originalScore;
  let finalDecision: Decision;
  if (challengeSuccess) {
    finalScore = Math.max(0, originalScore - 40);
    finalDecision = finalScore >= 60 ? 'STOP' : finalScore >= 30 ? 'VERIFY' : 'TRUST';
  } else {
    // Failed verification always forces STOP per safety policy.
    finalScore = Math.max(60, originalScore);
    finalDecision = 'STOP';
  }
  return { finalScore, finalDecision };
}
