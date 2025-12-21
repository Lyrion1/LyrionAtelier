exports.handler = async () => {
  const token = process.env.PRINTFUL_OAUTH_TOKEN;
  if (!token) return new Response(JSON.stringify({ ok: false, status: 401, message: 'PRINTFUL_OAUTH_TOKEN missing' }), { status: 401 });
  const r = await fetch('https://api.printful.com/store', { headers: { Authorization: `Bearer ${token}` } });
  const body = await r.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: r.ok, status: r.status, body }), { headers: { 'content-type': 'application/json' } });
};
