exports.handler = async (event) => {
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY_LIVE || process.env.STRIPE_PUBLISHABLE_KEY;
  const allowedOrigins = [
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL
  ].filter(Boolean);

  const requestOrigin = event?.headers?.origin || event?.headers?.Origin;
  if (allowedOrigins.length && requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Origin not allowed' })
    };
  }

  const allowOrigin = requestOrigin && (!allowedOrigins.length || allowedOrigins.includes(requestOrigin))
    ? requestOrigin
    : allowedOrigins[0];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {})
    },
    body: JSON.stringify({
      publishableKey
    })
  };
};
