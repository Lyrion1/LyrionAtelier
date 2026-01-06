# 🚨 CRITICAL: Stripe Webhook Configuration

## ✅ CORRECT Webhook URL
**Add this URL to Stripe Dashboard:**
```
https://lyrionatelier.com/.netlify/functions/stripe-webhook
```

Alternative URL (also works):
```
https://lyrionatelier.com/api/stripe-webhook
```

## 📋 Quick Verification Checklist

### 1. Stripe Dashboard Configuration
- [ ] Go to: Stripe Dashboard → Developers → Webhooks
- [ ] Webhook endpoint exists
- [ ] URL is: `https://lyrionatelier.com/.netlify/functions/stripe-webhook`
- [ ] Event `checkout.session.completed` is selected
- [ ] Webhook status shows "Active" (green)
- [ ] Copy signing secret (starts with `whsec_`)

### 2. Netlify Environment Variables
Go to: Netlify Dashboard → Site Settings → Environment Variables

Required variables:
- [ ] `STRIPE_SECRET_KEY_LIVE` = `sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- [ ] `PRINTFUL_API_KEY` = (Your Printful API key)
- [ ] `RESEND_API_KEY` = `re_...`
- [ ] `OWNER_EMAIL` = `admin@lyrionatelier.com`

Optional variables:
- [ ] `STRIPE_SECRET_KEY` = `sk_test_...` (for testing)
- [ ] `ORDER_FROM` = `orders@lyrionatelier.com`

### 3. After Setting Variables
- [ ] Redeploy site in Netlify (Settings → Deploys → Trigger deploy)
- [ ] Wait for deployment to complete

### 4. Test the Webhook
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click on your webhook endpoint
- [ ] Click "Send test webhook"
- [ ] Select `checkout.session.completed` event
- [ ] Click "Send test webhook"
- [ ] Check that response is 200 OK
- [ ] Check email at admin@lyrionatelier.com

### 5. Verify Email Notifications
Expected emails to admin@lyrionatelier.com:
- [ ] Order received notification (immediate)
- [ ] Printful order created notification (for physical products)
- [ ] Error notification (if something fails)

## 🔍 How to Check if Working

### Method 1: Check Netlify Logs
1. Netlify Dashboard → Functions → stripe-webhook
2. Look for recent invocations
3. Check for successful executions (200 status)

### Method 2: Check Stripe Logs
1. Stripe Dashboard → Developers → Webhooks
2. Click on webhook endpoint
3. View "Recent deliveries"
4. Should show successful responses (200)

### Method 3: Make Test Purchase
1. Go to your site and add product to cart
2. Complete checkout with test card: `4242 4242 4242 4242`
3. Check admin@lyrionatelier.com for order email
4. Check Printful dashboard for new order (if physical product)

## 🚨 Common Issues

### Issue: "Webhook signature verification failed"
**Fix:**
1. Check that `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Ensure you copied the signing secret from the correct webhook endpoint
3. Redeploy Netlify site after updating environment variables

### Issue: No email received
**Fix:**
1. Check Netlify function logs for errors
2. Verify `RESEND_API_KEY` is valid
3. Check spam folder
4. Verify `OWNER_EMAIL` = `admin@lyrionatelier.com`

### Issue: No Printful order created
**Fix:**
1. Check error email for details
2. Verify `PRINTFUL_API_KEY` is valid
3. Check that product name matches mapping (see WEBHOOK_SETUP.md)
4. Review Netlify function logs

### Issue: Webhook not triggering
**Fix:**
1. Verify webhook URL in Stripe dashboard is correct
2. Check that event `checkout.session.completed` is selected
3. Ensure webhook status is "Active"
4. Test with "Send test webhook" in Stripe dashboard

## 📚 Full Documentation
See `WEBHOOK_SETUP.md` for complete setup instructions and troubleshooting guide.

## ⚡ Quick Commands

### Test webhook locally:
```bash
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
stripe trigger checkout.session.completed
```

### Check function syntax:
```bash
node -c netlify/functions/stripe-webhook.js
```

---

**Last Updated:** 2026-01-06
**Function:** `netlify/functions/stripe-webhook.js`
**Status:** ✅ Fixed and working
