// /.netlify/functions/printful-health.js
export async function handler() {
try {
const token = process.env.PRINTFUL_OAUTH_TOKEN; // <-- must exist in Netlify
if (!token) {
return json(401, { ok: false, message: 'PRINTFUL_OAUTH_TOKEN missing' });
}

// Use OAuth Bearer to call Printful. Pick a safe endpoint.
const res = await fetch('https://api.printful.com/v2/stores', {
headers: { Authorization: `Bearer ${token}` }
});

const text = await res.text();
let data;
try { data = JSON.parse(text); }
catch { return json(502, { ok:false, status:res.status, message:'Invalid JSON from Printful', body:text.slice(0,240) }); }

if (!res.ok) return json(res.status, { ok:false, status:res.status, error:data });

const stores = Array.isArray(data?.result) ? data.result : (data?.stores || []);
const store = stores[0] || {};
return json(200, {
ok: true,
status: res.status,
store: { id: store.id, name: store.name, currency: store.currency, country_code: store.country_code },
rateLimit: {
limit: res.headers.get('x-ratelimit-limit'),
remaining: res.headers.get('x-ratelimit-remaining')
}
});
} catch (e) {
return json(500, { ok:false, message: e.message });
}
}

function json(status, body) {
return {
statusCode: status,
headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
body: JSON.stringify(body)
};
}