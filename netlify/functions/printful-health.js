exports.handler = async () => {
  const token = process.env.PRINTFUL_API_KEY;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (!token) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ ok: false, error: 'PRINTFUL_API_KEY not set' }) };
  }

  try {
    const res = await fetch('https://api.printful.com/store', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ ok: false, ...data }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, store: data?.result }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
