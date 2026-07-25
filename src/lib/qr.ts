import type { ParsedQr } from '@/types';

// Parse a UPI deep-link style QR payload locally.
// Supports: upi://pay?pa=...&pn=...&am=...&tn=...
// Falls back to raw text if not a UPI link.
export function parseQrPayload(raw: string): ParsedQr {
  const result: ParsedQr = { raw: raw ?? '' };
  if (!raw) return result;

  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'upi:') {
      const params = url.searchParams;
      const pa = params.get('pa') ?? undefined;
      const pn = params.get('pn') ?? undefined;
      const am = params.get('am') ?? undefined;
      const tn = params.get('tn') ?? undefined;
      if (pa) result.upiId = pa;
      if (pn) result.receiverName = decodeURIComponent(pn);
      if (am) {
        const n = Number(am);
        if (!Number.isNaN(n)) result.amount = n;
      }
      if (tn) result.note = decodeURIComponent(tn);
      return result;
    }
  } catch {
    // not a URL — try plain UPI ID match
  }

  // Bare UPI ID like name@bank
  const upiMatch = trimmed.match(/([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64})/);
  if (upiMatch) {
    result.upiId = upiMatch[1];
  }

  return result;
}

export function extractUpiFromText(text: string): string | undefined {
  if (!text) return undefined;
  const m = text.match(/([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64})/);
  return m ? m[1] : undefined;
}
