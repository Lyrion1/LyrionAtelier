const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

const buildHeaders = (event) => {
  const isProd = process.env.CONTEXT === 'production';
  if (!isProd) return DEFAULT_HEADERS;

  const origin = event.headers?.origin || event.headers?.Origin || process.env.URL || '*';
  return {
    ...DEFAULT_HEADERS,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
};

const authHeaders = (apiKey) => ({
  Authorization: `Bearer ${apiKey}`,
});

const handleAuthFailure = (statusCode, headers, message) => ({
  statusCode,
  headers,
  body: JSON.stringify({ ok: false, error: message, hint: 'Check PRINTFUL_API_KEY' }),
});

exports.handler = async (event) => {
  const headers = buildHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'PRINTFUL_API_KEY missing' }) };
  }

  try {
    const [productsRes, storeRes] = await Promise.all([
      fetch('https://api.printful.com/sync/products?limit=5', { headers: authHeaders(apiKey) }),
      fetch('https://api.printful.com/store', { headers: authHeaders(apiKey) })
    ]);

    if (productsRes.status === 401 || productsRes.status === 403) {
      return handleAuthFailure(productsRes.status, headers, await productsRes.text());
    }
    if (storeRes.status === 401 || storeRes.status === 403) {
      return handleAuthFailure(storeRes.status, headers, await storeRes.text());
    }

    if (!productsRes.ok) {
      return { statusCode: productsRes.status, headers, body: JSON.stringify({ ok: false, error: await productsRes.text() }) };
    }
    if (!storeRes.ok) {
      return { statusCode: storeRes.status, headers, body: JSON.stringify({ ok: false, error: await storeRes.text() }) };
    }

    const productsJson = await productsRes.json();
    const storeJson = await storeRes.json();

    const items = (productsJson?.result || []).map((prod) => ({
      id: prod?.id,
      name: prod?.name,
      variants: prod?.variants
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        store: storeJson?.result || null,
        count: items.length,
        items
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error?.message || 'Unexpected error' })
    };
  }
};
