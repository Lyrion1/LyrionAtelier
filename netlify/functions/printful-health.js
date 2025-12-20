/* Netlify function: checks Printful API connectivity and returns a concise status JSON.
 Requires env var: PRINTFUL_API_KEY (already set in Netlify/Repo). */

export const handler = async () => {
  const KEY = process.env.PRINTFUL_API_KEY;
  const now = new Date().toISOString();
  if (!KEY) {
    return json(500, { ok: false, now, error: "PRINTFUL_API_KEY is missing in env" });
  }

  // Helper to call Printful with a given Authorization header
  const networkFailure = (err) => ({
    res: { ok: false, status: 503, headers: { get: () => null } },
    data: { error: err?.message || "Network error" }
  });

  const call = async (path, authHeader) => {
    try {
      const res = await fetch(`https://api.printful.com${path}`, {
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "User-Agent": "LyríonAtelier/healthcheck"
        }
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        data = { raw: text };
      }
      return { res, data };
    } catch (err) {
      return networkFailure(err);
    }
  };

  // Try Bearer first, then Basic (some keys are provisioned either way)
  const bearer = `Bearer ${KEY}`;
  const basic = `Basic ${Buffer.from(`${KEY}:`).toString("base64")}`;
  let authUsed = "Bearer";

  // 1) Store info
  let s = await call("/store", bearer);
  if (s.res.status === 401 || s.res.status === 403) {
    s = await call("/store", basic);
    authUsed = "Basic";
  }

  // If still not OK, report cleanly
  if (!s.res.ok) {
    return json(s.res.status, {
      ok: false,
      now,
      authUsed,
      status: s.res.status,
      error: s.data?.error || s.data?.code || s.data?.raw || "Printful /store failed"
    });
  }

  // 2) Grab 1 product to confirm catalog access (won't fail the check if none)
  const productAuth = authUsed === "Bearer" ? bearer : basic;
  let p = await call("/store/products?limit=1", productAuth);
  const sample = (p.res.ok && p.data?.result?.[0]) ? {
    id: p.data.result[0].id,
    name: p.data.result[0].name
  } : null;

  // Rate limit headers (if present)
  const rl = {
    remaining: s.res.headers.get("x-ratelimit-remaining"),
    limit: s.res.headers.get("x-ratelimit-limit"),
    reset: s.res.headers.get("x-ratelimit-reset")
  };

  return json(200, {
    ok: true,
    now,
    authUsed,
    store: {
      id: s.data?.result?.id || null,
      name: s.data?.result?.name || null,
      currency: s.data?.result?.currency || null
    },
    sampleProduct: sample,
    ratelimit: rl
  });
};

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}
