exports.handler = async () => {
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY_LIVE || process.env.STRIPE_PUBLISHABLE_KEY;
  const allowedOrigin = process.env.URL || '*';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin
    },
    body: JSON.stringify({
      publishableKey
    })
  };
};
