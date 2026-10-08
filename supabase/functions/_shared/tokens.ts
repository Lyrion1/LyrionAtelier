// Signed, single-purpose links (owner approval, opt-in confirmation,
// unsubscribe). HMAC-SHA256 over "purpose:id" with the APPROVAL_SECRET.
import { requireEnv } from './env.ts';

const enc = new TextEncoder();

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(requireEnv('APPROVAL_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function b64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sign(purpose: string, id: string): Promise<string> {
  return b64url(await crypto.subtle.sign('HMAC', await key(), enc.encode(`${purpose}:${id}`)));
}

export async function verify(purpose: string, id: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const expected = await sign(purpose, id);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
