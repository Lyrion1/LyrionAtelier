# Stripe Live Mode Activation Checklist

## Files Updated:
- [x] README.md (Stripe key usage and env vars)
- [x] js/checkout-handler.js
- [x] test-checkout.html
- [x] success.html
- [x] netlify/functions/create-checkout-session.js
- [x] netlify/functions/create-checkout.js
- [x] netlify/functions/checkout.js
- [x] netlify/functions/create-payment-intent.js
- [x] netlify/functions/create-test-session.js
- [x] netlify/functions/get-checkout-session.js
- [x] netlify/functions/get-session.js
- [x] netlify/functions/handle-stripe-order.js
- [x] netlify/functions/generate-certificate.js
- [x] netlify/functions/oracle-subscribe.js

## Manual Steps Required:
1. Verify live keys are saved in Netlify env vars:
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
2. Create live products in Stripe dashboard matching test products
3. Update all price_XXXXX IDs to live price IDs
4. Test with real card (then refund yourself)

## Live Price IDs Needed:
- Product 1: price_1ShjdBE6FRwoxLBfyUvK1ark → NEEDS LIVE VERSION
- Oracle subscriptions: STRIPE_PRICE_ORACLE_COSMIC / STRIPE_PRICE_ORACLE_MASTERY → set to live price IDs
