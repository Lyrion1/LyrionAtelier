# Stripe Environment Variables

User has already added these to Netlify:

Required in Netlify Dashboard → Environment Variables:
- STRIPE_PUBLISHABLE_KEY = pk_live_... (for frontend)
- STRIPE_SECRET_KEY = sk_live_... (for backend/webhooks)
- STRIPE_WEBHOOK_SECRET = whsec_... (for webhook verification)

- Already configured
- No manual key entry needed
- Keys pulled from env vars automatically
