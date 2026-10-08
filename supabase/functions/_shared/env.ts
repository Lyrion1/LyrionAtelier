// Configuration read from the function's secrets. See docs/SHOPKEEPER.md,
// "Secrets", for where each one is set. Values are never logged.

export function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

export function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export const SITE_URL = env('SITE_URL') || 'https://lyrionatelier.com';
export const FUNCTIONS_URL = env('SUPABASE_URL') ? `${env('SUPABASE_URL')}/functions/v1` : '';
export const OWNER_EMAIL = env('OWNER_EMAIL') || 'admin@lyrionatelier.com';

// The legal operator, used in emails and generated documents.
export const OPERATOR = {
  name: 'LYRION LTD',
  number: '16904877',
  registered: 'Registered in England and Wales',
  office: 'Flat 9 Centro, 399 South Row, Milton Keynes, MK9 2PG',
};
export const OPERATOR_LINE =
  `${OPERATOR.name}, company number ${OPERATOR.number}. ${OPERATOR.registered}. Registered office: ${OPERATOR.office}.`;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-house-key',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
