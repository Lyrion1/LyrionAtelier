# Stripe Webhook Setup Guide

## Overview
The Stripe webhook handles automatic order processing when customers complete checkout. It:
- ✅ Sends immediate email notification to admin@lyrionatelier.com
- ✅ Creates Printful orders for physical products
- ✅ Handles errors with detailed email notifications

## Correct Webhook Function
**USE THIS FUNCTION:** `stripe-webhook.js`
- Location: `netlify/functions/stripe-webhook.js`
- Full Printful integration
- Comprehensive error handling
- Email notifications

**DO NOT USE:** `handle-stripe-order.js` (legacy, no Printful integration)

## Setup Instructions

### 1. Configure Stripe Webhook

Go to: **Stripe Dashboard → Developers → Webhooks**

1. Click "Add endpoint"
2. Enter webhook URL: `https://lyrionatelier.com/.netlify/functions/stripe-webhook`
3. Select events to send:
   - ✅ `checkout.session.completed`
4. Click "Add endpoint"
5. Copy the **Signing secret** (starts with `whsec_`)

### 2. Add Environment Variables to Netlify

Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these variables:

| Variable Name | Required | Description | Example |
|--------------|----------|-------------|---------|
| `STRIPE_SECRET_KEY_LIVE` | ✅ | Live Stripe secret key | `sk_live_...` |
| `STRIPE_SECRET_KEY` | Optional | Test Stripe secret key (fallback) | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret | `whsec_...` |
| `PRINTFUL_API_KEY` | ✅ | Printful API key | Your key from Printful |
| `RESEND_API_KEY` | ✅ | Resend email API key | `re_...` |
| `OWNER_EMAIL` | ✅ | Admin email for notifications | `admin@lyrionatelier.com` |
| `ORDER_FROM` | Optional | Email from address | `orders@lyrionatelier.com` |

### 3. Test the Webhook

#### Option A: Test with Stripe CLI
```bash
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
stripe trigger checkout.session.completed
```

#### Option B: Test with Real Purchase
1. Make a test purchase on your site
2. Check Netlify function logs: Netlify Dashboard → Functions → stripe-webhook
3. Check your email (admin@lyrionatelier.com) for notification
4. Check Printful dashboard for new order

### 4. Verify Webhook is Active

In Stripe Dashboard → Developers → Webhooks:
- Status should be "Active" (green)
- Recent deliveries should show successful responses (200 OK)
- If you see errors, check Netlify function logs

## Email Notifications

The webhook sends **TWO types of emails** to admin@lyrionatelier.com:

### 1. Order Received Email (Immediate)
Sent as soon as webhook is triggered, includes:
- Customer name, email, phone
- Product ordered and quantity
- Shipping address
- Order amount and ID

### 2. Success or Error Email (After Processing)

**Success Email** (Printful order created):
- Printful order ID
- Customer details
- Confirmation message

**Error Email** (If something fails):
- Detailed error message
- Next steps for manual fulfillment
- Links to check logs and dashboards

## Product Mapping

Products are automatically mapped to Printful variants. The webhook recognizes these products:
- Taurus Constellation Pyjama Top
- Taurus All-Over Print Crop Tee
- Taurus Recycled Baseball Jersey (sizes XS-3XL)
- Taurus Micro-Rib Tank Top (sizes XS-2XL)

**Physical Product Detection:**
Products containing these keywords are sent to Printful:
`hoodie, tee, shirt, crewneck, sweatshirt, apparel, hat, cap, beanie, socks, polo, tank, jersey, pyjama, crop`

## Troubleshooting

### No Email Received
1. Check Netlify function logs for errors
2. Verify `RESEND_API_KEY` is set correctly
3. Verify `OWNER_EMAIL` is set to admin@lyrionatelier.com
4. Check spam folder

### No Printful Order Created
1. Check if product name matches mapping (see Product Mapping above)
2. Verify `PRINTFUL_API_KEY` is valid
3. Check Printful dashboard API settings
4. Look for error email with details

### Webhook Signature Verification Failed
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Ensure webhook URL is exactly: `https://lyrionatelier.com/.netlify/functions/stripe-webhook`
3. Redeploy Netlify site after updating environment variables

### How to Check Logs

**Netlify Function Logs:**
1. Go to Netlify Dashboard
2. Click on your site
3. Go to Functions tab
4. Click on `stripe-webhook`
5. View recent invocations and logs

**Stripe Webhook Logs:**
1. Go to Stripe Dashboard
2. Developers → Webhooks
3. Click on your webhook endpoint
4. View "Recent deliveries" section

## Security Notes

- ✅ Webhook signature is verified on every request
- ✅ Only POST requests are accepted
- ✅ All errors are logged and reported via email
- ✅ Environment variables are kept secure in Netlify

## Support

If you continue to have issues:
1. Check all environment variables are set correctly
2. Review Netlify function logs for detailed errors
3. Check your email (admin@lyrionatelier.com) for error notifications
4. Verify Stripe webhook is sending to correct URL
5. Test with Stripe CLI for local debugging
