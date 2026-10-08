# Owner steps: switching on the house automation

Three things in order: turn GitHub Actions back on, add the secrets, then
place one real test order. Nothing here needs a computer; a phone browser
works. Where a page only shows its settings on a wide screen, use your
browser's "Request desktop site" option.

Never paste a secret value into an email, chat, issue or commit. Each one is
typed only into the GitHub or Supabase box named below.

---

## 0. Before anything: GitHub Actions is not starting jobs

Since PR #455 merged, every workflow run (CI, Deploy checkout functions,
Publish Codex articles, Design intake) has failed within three seconds
without a machine ever being assigned: no steps, no log. Runs in August on
the same workflows worked. That pattern usually means Actions is blocked at
the account level, most often by a billing problem or a spending limit of
zero on private-repository minutes.

1. Open github.com, tap your picture, then **Settings → Billing and plans**.
   Look for a failed payment, an expired card or a spending limit of £0 for
   Actions, and fix it.
2. Open github.com/Lyrion1/LyrionAtelier → **Settings → Actions → General**.
   Check that Actions is allowed for this repository.
3. Open the **Actions** tab, open the latest **Verify catalogue** run and tap
   **Re-run all jobs**. When it shows a machine starting and steps running,
   Actions is back.

The live website is not affected: GitHub Pages deploys separately, and the
merge of PR #455 deployed normally.

---

## 1. The secrets, one at a time

### Where they go

- **Supabase function secrets**: supabase.com/dashboard, sign in with the
  account that owns project **zqomzteaeiqtnipkgyuo** (the one checkout runs
  on), open that project, then **Edge Functions → Secrets** (the page is
  `supabase.com/dashboard/project/zqomzteaeiqtnipkgyuo/functions/secrets`).
  Tap **Add new secret**, type the name exactly as written here, paste the
  value, save.
- **GitHub repository secrets**: github.com/Lyrion1/LyrionAtelier →
  **Settings → Secrets and variables → Actions → New repository secret**.
  Type the name exactly, paste the value, tap **Add secret**.

A "long random string" below means at least 40 letters and numbers. On a
phone, the password generator in your password manager (iCloud Keychain,
Google Password Manager, 1Password) makes one: create a new password, copy
it, paste it where it is needed, and keep it in the password manager.

### The list

Some of these are probably set already, because the checkout live today uses
them. The deploy workflow checks each one by name before deploying anything
and tells you which are missing, without ever reading a value.

| # | Name | What it is | Where you get it | Goes in |
| --- | --- | --- | --- | --- |
| 1 | `STRIPE_SECRET_KEY` | Stripe's secret API key (starts `sk_live_`) | Stripe dashboard → **Developers → API keys** → Secret key → Reveal | Supabase (probably set already) |
| 2 | `STRIPE_WEBHOOK_SECRET` | Proves webhook calls really come from Stripe (starts `whsec_`) | Stripe → **Developers → Webhooks** → the endpoint ending `/functions/v1/stripe-webhook` → **Signing secret** → Reveal | Supabase (probably set already) |
| 3 | `PRINTFUL_API_KEY` | Printful private token | Printful developer portal (developers.printful.com) → **Your tokens** → create a private token for your store with access to orders, sync products, files and mockups | Supabase **and** GitHub (same value in both) |
| 4 | `PRINTFUL_STORE_ID` | Only if your Printful account has more than one store | Printful → **Stores** → the store's ID | Supabase and GitHub (optional) |
| 5 | `ANTHROPIC_API_KEY` | Writes the reading and certificate drafts you approve | console.anthropic.com → **API keys → Create key** | Supabase |
| 6 | `RESEND_API_KEY` | Sends every email (approvals, deliveries, alerts) | resend.com → **API Keys → Create API key** (sending access) | Supabase |
| 7 | `MAIL_FROM` | The sender line, for example `Lyrīon Atelier <orders@lyrionatelier.com>` | Not a key: type it. First verify the domain in Resend → **Domains** (Resend shows the DNS records to add) | Supabase |
| 8 | `OWNER_EMAIL` | Where approvals and failure alerts go; without it, admin@lyrionatelier.com | Type the address | Supabase (optional) |
| 9 | `APPROVAL_SECRET` | Signs the approve, confirm and unsubscribe links | A long random string you make | Supabase |
| 10 | `HOUSE_CRON_KEY` | Lets the 3-hourly sweep and keep-alive in | A long random string you make | Supabase **and** GitHub (exactly the same value in both) |
| 11 | `HOUSE_ENGINE_KEY` | Lets the house engine ask for Birthday Book reminders | A long random string you make | Supabase, and give the same value to the n8n engine |
| 12 | `SUPABASE_ACCESS_TOKEN` | Lets GitHub deploy the functions | supabase.com/dashboard/account/tokens → **Generate new token**, signed in as the account that owns zqomzteaeiqtnipkgyuo | GitHub |
| 13 | `SUPABASE_DB_PASSWORD` | Lets GitHub add the new tables | Supabase project → **Project Settings → Database** → database password. If nobody has it, **Reset database password**; first check nothing else uses the old one | GitHub |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase
automatically; do not add them.

### In this order

1. Fix GitHub Actions (section 0).
2. In Supabase, add or confirm secrets 1, 2, 3, 5, 6, 7, 9, 10 and 11 (and 4,
   8 if you use them).
3. In GitHub, add 3, 10, 12 and 13 (and 4 if you use it).
4. In Stripe → **Developers → Webhooks** → the `stripe-webhook` endpoint →
   **Edit** (or "Update details"), make sure both events are selected:
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
5. In GitHub → **Actions → Deploy checkout functions → Run workflow**. It
   applies the database changes, then deploys the six functions. If anything
   is missing it deploys nothing, finishes green, and its summary names what
   is missing. The checkout already live keeps working either way.
6. In GitHub → **Actions → House sweep and keep-alive → Run workflow**. It
   should print a short report starting `{"heartbeat":true`.

---

## 2. The live test order

Do this after step 5 above has deployed. Before it, the old checkout is
still live and this test would not show the new path.

**Product:** Single Cosmic Design Mug, 11oz, £12.99. It is the cheapest
Printful piece, it is not tied to a sign, so the house never rests it, and
it is under £50 so delivery of £5.99 is charged: **£18.98 in total**.

1. On your phone, open
   `https://lyrionatelier.com/product?slug=single-cosmic-design-mug`.
2. Choose **11oz** and add it to the basket. The basket should show £12.99,
   delivery £5.99, total £18.98.
3. In the basket's gift note, type `Live test - please cancel`.
4. Check out with a real card and your own UK address.
5. You should land on the order confirmation page (`/success`).

**What you should see**

| Where | What |
| --- | --- |
| Stripe → **Payments** | A £18.98 payment marked Succeeded. Open it: the shipping address is yours. |
| Stripe → **Developers → Webhooks** → the endpoint → **Event deliveries** | `checkout.session.completed` delivered with status 200. |
| Printful → **Orders** | Within a minute, one new order: one 11oz mug, your address, status **Pending** (sent for fulfilment, not a draft), the gift message on it, and an external ID starting `pi_` that matches the Stripe payment's ID. |
| Supabase → **Table editor → orders** | One row for the payment, `printful_status` = `created`. |
| Your inbox | Stripe's receipt, if receipts are on in Stripe. No alert email from the shop: alerts are sent only when something fails. |

**Prove a repeated webhook cannot make a second order:** in Stripe → the
webhook endpoint → the delivered event → **Resend**. Refresh Printful
Orders: still exactly one order for this payment.

**Then cancel and refund, straight away**

1. Printful → **Orders** → the test order → **Cancel order**. Printful
   allows this while the order has not gone into production, and nothing is
   charged for production; any amount Printful took for the order is
   returned to your Printful balance or card. Do it within the hour.
2. Stripe → **Payments** → the £18.98 payment → **Refund** → full amount.
   Stripe keeps its own processing fee on refunded payments.

If the Printful order does not appear within five minutes, you will get an
email titled "Printful order failed, retrying" with Printful's reason; send
me the reason (not any keys) and I will fix it.

Optional second test, for readings and certificates: buy the £39 Digital
Compatibility Certificate (`/compatibility/digital-certificate`) with two
real birth dates. Within minutes you get an "Approve:" email; open the link,
read the draft, tap send, and the PDF arrives in the buyer's inbox. Refund
it in Stripe afterwards.
