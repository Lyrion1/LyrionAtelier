exports.handler = async () => {
  const token = process.env.PRINTFUL_OAUTH_TOKEN;
  if (!token) return new Response(JSON.stringify({ ok: false, status: 401, message: 'PRINTFUL_OAUTH_TOKEN missing' }), { status: 401 });
  const response = await fetch('https://api.printful.com/store', { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: response.ok, status: response.status, body }), { headers: { 'Content-Type': 'application/json' } });
};
