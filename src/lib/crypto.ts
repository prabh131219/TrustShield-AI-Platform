// Prototype crypto helpers using Web Crypto API.
// SHA-256 hashing + a prototype Ed25519-style digital signature (ECDSA P-256).
// The signature is a prototype — not legally certified evidence.

const enc = new TextEncoder();

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return bufToHex(buf);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Prototype keypair generated once per browser and stored in IndexedDB via localStorage fallback.
const KEY_STORAGE = 'ts_proto_keypair_v1';

interface StoredKey {
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
}

let cachedKeyPair: CryptoKeyPair | null = null;

async function getKeyPair(): Promise<CryptoKeyPair> {
  if (cachedKeyPair) return cachedKeyPair;

  const stored = localStorage.getItem(KEY_STORAGE);
  if (stored) {
    try {
      const parsed: StoredKey = JSON.parse(stored);
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        parsed.privateKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign'],
      );
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        parsed.publicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify'],
      );
      cachedKeyPair = { privateKey, publicKey };
      return cachedKeyPair;
    } catch {
      // fall through to generate
    }
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  localStorage.setItem(KEY_STORAGE, JSON.stringify({ privateKeyJwk, publicKeyJwk }));
  cachedKeyPair = keyPair;
  return keyPair;
}

export async function signData(hashHex: string): Promise<string> {
  const keyPair = await getKeyPair();
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    enc.encode(hashHex),
  );
  return bufToHex(sig);
}

export async function verifySignature(hashHex: string, signatureHex: string): Promise<boolean> {
  try {
    const keyPair = await getKeyPair();
    const sigBytes = hexToBuf(signatureHex);
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      keyPair.publicKey,
      sigBytes,
      enc.encode(hashHex),
    );
  } catch {
    return false;
  }
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

export function generateChallengeCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(n % 1_000_000).padStart(6, '0');
}

export function shortId(): string {
  return crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
}
