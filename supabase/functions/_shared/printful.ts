// Printful order creation with retries. Variants are addressed by the sync
// variant's external id, which is what data/catalogue.json stores.
import { requireEnv } from './env.ts';

export interface Recipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export type PrintfulLine =
  | { external_variant_id: string; quantity: number }
  | { sync_variant_id: number; quantity: number };

/**
 * An order line for a catalogue variant id. Printful generates hexadecimal
 * external ids for sync variants; a purely numeric id is the sync variant's
 * own id.
 */
export function orderLine(id: string, quantity: number): PrintfulLine {
  return /^\d+$/.test(id) ? { sync_variant_id: Number(id), quantity } : { external_variant_id: id, quantity };
}

export interface PrintfulOrderInput {
  externalId: string;
  recipient: Recipient;
  items: PrintfulLine[];
  giftNote?: string;
}

const API = Deno.env.get('PRINTFUL_API_BASE') || 'https://api.printful.com';

async function call(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireEnv('PRINTFUL_API_KEY')}`,
    'Content-Type': 'application/json',
  };
  const storeId = Deno.env.get('PRINTFUL_STORE_ID');
  if (storeId) headers['X-PF-Store-Id'] = storeId;
  const resp = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await resp.json().catch(() => ({}));
  return { status: resp.status, data };
}

/** Printful accepts gift subject and message of up to 200 characters each. */
export function giftBlock(note?: string): { subject: string; message: string } | undefined {
  const clean = (note || '').replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  return { subject: 'A gift for you', message: clean.slice(0, 200) };
}

/** The order Printful already holds for this payment, confirmed if it was left as a draft. */
async function findExisting(externalId: string): Promise<{ id: number; status: string } | null> {
  const existing = await call('GET', `/orders/@${encodeURIComponent(externalId)}`);
  if (existing.status !== 200 || !existing.data?.result?.id) return null;
  const order = existing.data.result;
  if (order.status === 'draft') {
    const confirmed = await call('POST', `/orders/${order.id}/confirm`);
    if (confirmed.status >= 400) throw new Error(`Printful confirm failed: ${confirmed.data?.error?.message ?? confirmed.status}`);
    return { id: order.id, status: confirmed.data?.result?.status ?? 'pending' };
  }
  return { id: order.id, status: order.status };
}

/**
 * Create and confirm the order. Before every attempt, Printful is asked for an
 * order with this payment's external id, and one that exists is returned
 * rather than duplicated. That covers Stripe redelivering the webhook and an
 * attempt whose reply was lost after Printful had accepted the order.
 */
export async function createConfirmedOrder(input: PrintfulOrderInput, attempts = 3): Promise<{ id: number; status: string }> {
  const body: Record<string, unknown> = {
    external_id: input.externalId,
    recipient: input.recipient,
    items: input.items,
  };
  const gift = giftBlock(input.giftNote);
  if (gift) body.gift = gift;

  let lastError: unknown = '';
  for (let i = 0; i < attempts; i += 1) {
    const found = await findExisting(input.externalId);
    if (found) return found;
    const res = await call('POST', '/orders?confirm=true', body);
    if (res.status < 300 && res.data?.result?.id) {
      return { id: res.data.result.id, status: res.data.result.status };
    }
    lastError = res.data?.error?.message || res.data?.result || `HTTP ${res.status}`;
    // A 4xx other than rate limiting will not succeed on retry.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
  }
  // The last attempt's reply may itself have been lost.
  const found = await findExisting(input.externalId);
  if (found) return found;
  throw new Error(`Printful order failed: ${typeof lastError === 'string' ? lastError : JSON.stringify(lastError)}`);
}
