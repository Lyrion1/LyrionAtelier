# Printful Integration Setup

## What This Does:
- Auto-sends physical product orders to Printful
- Emails you for digital product orders
- Auto-fetches Printful variant IDs (no manual copying!)

## Setup Steps:

### 1. Add Environment Variables to Netlify

Go to: Netlify Dashboard → Site Settings → Environment Variables

Add these 5 variables:

| Variable Name | Value | Where to Get It |
|--------------|-------|----------------|
| `STRIPE_SECRET_KEY` | sk_live_... | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | whsec_... | Stripe → Developers → Webhooks |
| `PRINTFUL_API_KEY` | Your key | Printful → Settings → API |
| `RESEND_API_KEY` | re_... | resend.com → API Keys |
| `OWNER_EMAIL` | your@email.com | Your email for notifications |

### 2. Run Variant Fetcher Script

On your local machine:

```bash
npm install
PRINTFUL_API_KEY=your_key_here npm run fetch-printful
```
