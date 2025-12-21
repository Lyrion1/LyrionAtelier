const respond = (payload) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

exports.handler = async () => {
  const apiKey = process.env.PRINTFUL_API_KEY;
  const payload = { ok: false, status: 0, store: null, error: null };

  if (!apiKey) {
    payload.status = 401;
    payload.error = 'PRINTFUL_API_KEY is not configured';
    return respond(payload);
  }

  try {
    const auth = Buffer.from(`${apiKey}:`).toString('base64');
    const res = await fetch('https://api.printful.com/store', {
      headers: { Authorization: `Basic ${auth}` }
    });

    payload.status = res.status;

    const json = await res.json().catch((parseErr) => {
      payload.error = payload.error || `Invalid JSON response: ${parseErr?.message || 'parse error'}`;
      return null;
    });

    if (res.ok) {
      payload.ok = true;
      payload.store = json?.result?.name || null;
    } else {
      const errorValue =
        json?.error ||
        json?.error_message ||
        json?.result?.error ||
        json?.result ||
        res.statusText ||
        'Request failed';
      payload.error = typeof errorValue === 'string' ? errorValue : JSON.stringify(errorValue);
    }
  } catch (err) {
    payload.status = payload.status || 500;
    payload.error = err?.message || 'Unexpected error';
  }

  return respond(payload);
};
