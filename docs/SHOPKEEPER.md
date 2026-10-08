# The shopkeeper's guide

How lyrionatelier.com follows the house engine, where every product and
piece of content lives, and what to set up so orders, readings and reminders
run without anyone touching the site.

LYRION LTD, company number 16904877, registered in England and Wales.
Registered office: Flat 9 Centro, 399 South Row, Milton Keynes, MK9 2PG.

---

## 1. The engine contract

The n8n house engine proposes seasonal moves, designs, campaigns and journal
articles. The owner approves each on Telegram, and the engine commits the
decision to this repository through the GitHub API. The site reads these
files and changes itself.

**Never hand-edit, rename or move these files.** Any of them may be absent;
the site then behaves exactly as it did before the house existed.

| File | Written by | What the site does with it |
| --- | --- | --- |
| `data/house.json` | engine | Read in the browser on every page load. Decides what is on show, what is in its last week, what is resting, and which campaign is running. |
| `data/designs-queue.json` | engine | Read by the **Design intake** workflow. Approved designs become Printful products once their artwork arrives. |
| `data/codex-queue/YYYY-MM-DD-slug.md` | engine | Read by the **Publish Codex articles** workflow. Approved articles become Codex pages. |

CI (`Verify catalogue`) reports on these files but **never fails because of
them**, whatever they contain.

### `data/house.json`

```json
{
  "updated": "2026-10-07T06:00:00Z",
  "written_by": "Lyrion house engine. Do not edit by hand.",
  "lead_sign": "Libra",
  "on_show": ["Libra", "Scorpio"],
  "last_chance": ["Virgo"],
  "retired_until_next_season": ["Leo"],
  "campaigns": [{ "key": "retrograde-edit", "title": "Run the Retrograde Edit", "start": "2026-10-24", "end": "2026-11-13" }]
}
```

The rules live in one file, `js/house-core.js`, used by the browser, CI and
the checkout functions alike.

| A product that is… | is shown… | and can be bought? |
| --- | --- | --- |
| of the `lead_sign` | first everywhere, under **On show** | yes |
| of a sign in `on_show` | under **On show**, after the lead sign | yes |
| of a sign in `last_chance` | in the labelled **Last chance** row | yes |
| of any other sign | in the **Returns with the season** row at the end | **no** (the buy button says "Returns with the season", and checkout refuses it) |
| not seasonal (core pieces, readings, certificates, keepsakes) | under **The core collection** | yes, always |

The engine lists only the signs it has just retired, so **a sign it does not
mention is treated as out of season**. The lead sign counts as on show even
if `on_show` leaves it out.

`house.json` is **ignored** (and the site shows everything as before) if it
is missing, is not JSON, if `lead_sign` is not one of the twelve sign names
with a capital letter, or if `on_show`, `last_chance` or
`retired_until_next_season` is not a list of sign names. A single bad
campaign entry (unknown key, bad date, end before start) is dropped on its
own and does not affect the seasons.

**Campaigns** switch on when today (London time) is between `start` and
`end`, both days included, and off the day after. The homepage then shows the
campaign feature, with the engine's `title` and the site's own copy for that
key from `data/campaigns.json`:

| key | the feature links to |
| --- | --- |
| `retrograde-edit` | the pieces listed in `data/campaigns.json` |
| `spring-equinox` | Aries |
| `summer-solstice` | Cancer |
| `autumn-equinox` | Libra |
| `winter-solstice` | Capricorn |

`/shop?campaign=<key>` shows that edit; `/shop?element=fire` (earth, air,
water) shows one element, and the homepage's element panels lead with the
lead sign's element.

### `data/designs-queue.json`

An array of approved designs:

```json
{ "id": 12, "approved": "2026-10-08", "status": "awaiting artwork", "action": "design",
  "sign": "Scorpio", "name": "", "garment": "", "decoration": "", "palette": "",
  "wording": "", "story": "", "artwork_prompt": "" }
```

When `artwork/incoming/design-12.png` is committed, the **Design intake**
workflow (`scripts/design-intake.mjs`):

1. matches `garment` to a Printful blank in `data/garments.json`
   (tee, hoodie, sweatshirt; extend that file to add more),
2. checks the artwork against Printful's printfile for the placement
   (front print, or chest embroidery if `decoration` mentions embroidery),
3. creates the product in the Printful store,
4. generates mockups with Printful's mockup generator and saves them to
   `images/products/`,
5. adds the product to `data/catalogue.json`, seasonal, for its sign,
6. records the result in `data/designs-built.json`.

It never modifies `data/designs-queue.json`. A failed build is retried on
later runs (up to five attempts) and its error is recorded in
`designs-built.json`.

**Prices are the owner's decision.** A built design stays unlisted until its
garment has a price for every size in `data/garments.json`
(`price_gbp_by_size`, for example `{ "S": 44.99, "M": 44.99, "2XL": 46.99 }`).
The next run then lists every design of that garment. The artwork
specification is in [ARTWORK.md](ARTWORK.md).

### `data/codex-queue/`

```markdown
---
title: Venus in the scales
description: One sentence for search results and the Codex index.
date: 2026-10-06
status: approved
---
First paragraph.

Second paragraph.
```

The **Publish Codex articles** workflow (`scripts/publish-codex.mjs`) runs
when the engine commits an article and every morning. For each article with
`status: approved` and a date on or before today it:

- writes `codex/<slug>.html` in the Codex design, with its own title, meta
  description, canonical URL, Article and breadcrumb structured data,
- lists it under **From the journal** in `codex.html`,
- adds it to `sitemap.xml`.

Articles dated in the future wait for their day. A file that cannot be read
is skipped with a warning. If an article leaves the queue, its page is
removed on the next run.

---

## 2. Where products and content live

### Before this change

| What | Where |
| --- | --- |
| Product list | `data/all-products.json` (43 products, mixed shapes), plus 20 hand-built pages in `shop/*.html` with their own inline prices, plus 3 Taurus pieces that existed only as static pages and a hard-coded list in `js/shop-page.js`, plus 7 legacy files in `data/products/` |
| Checkout prices | `public/data/products.json`, generated from `all-products.json`; readings, certificates and 6 static-page products were missing, so checkout rejected them |
| Readings and certificates | hard-coded HTML buttons on `oracle/*.html` and `compatibility/*.html`, several slugs per product |
| Homepage features | first 8 published products, hard-coded headings |
| Gift pages | `js/gifts-page.js` reading `all-products.json` |
| Codex | hand-written entries in `codex.html` |

### After

| What | Where |
| --- | --- |
| **Every product** | `data/catalogue.json`: one entry per product, one slug each |
| Checkout prices | `public/data/products.json`, generated from the catalogue (`npm run build:catalog`) |
| Static product pages | still `shop/*.html`, but their prices, variant ids and structured data are rewritten from the catalogue (`node scripts/sync-static-pages.mjs`) and checked in CI |
| Seasons and campaigns | `data/house.json` (engine) + `data/campaigns.json` (site copy) |
| New designs | `data/designs-queue.json` (engine) → `data/designs-built.json` + catalogue (workflow) |
| Garment blanks and prices for new designs | `data/garments.json` (owner) |
| Journal | `data/codex-queue/` (engine) → `codex/*.html` (workflow) |

`data/all-products.json` is gone; every page that read it now reads the
catalogue through `js/house.js`.

### `data/catalogue.json`

```json
{
  "slug": "leo-zodiac-hoodie",
  "title": "Leo Zodiac Hoodie",
  "sign": "Leo",
  "element": "Fire",
  "collection": "Zodiac Hero",
  "category": "zodiac-hero",
  "type": "apparel",
  "description": "…",
  "images": ["/leo-zodiac-hoodie/leo-zodiac-hoodie-lifestyle.jpg"],
  "link": "/shop/leo-hoodie.html",
  "price_gbp": { "min": 46.99, "max": 50.99 },
  "variants": [{ "size": "S", "price_gbp": 46.99, "printful_variant_id": "694b0b7b4276f7" }],
  "fulfilment": "printful",
  "printful": { "product": "Urban Hoodie", "sync_product_id": null },
  "seasonal": true,
  "listed": true
}
```

- Prices are pounds and pence in GBP, the currency Stripe charges. Shoppers
  see them in their own currency through the live rates in `js/main.js`,
  exactly as before.
- `type`: apparel, accessory, home, mystery-box, reading, certificate.
- `fulfilment`: `printful` (sent to Printful automatically), `digital`
  (written, approved and emailed), `manual`, or `enquiry` (shown, never sold
  online).
- `personalisation` on readings and certificates: person, couple, pet,
  newborn (what the basket asks for).
- `seasonal: true` needs a `sign`; readings and certificates are never seasonal.

CI rejects a malformed catalogue: a repeated slug, a lower-case or unknown
sign, a price in pence, a variant without a valid Printful id, an id shared
by two products, a missing image, a price range that disagrees with the
variants, a seasonal reading, and more (`scripts/lib/catalog.mjs`).

**One slug per product, checked in CI** (`scripts/verify-catalog.mjs`):
the catalogue, the checkout price map, every static product page (slug,
variant ids, prices), every reading, certificate and keepsake button (id and
price), and, once the Printful sync workflow has written
`data/printful-sync.json`, every Printful variant id against the store.

---

## 3. Orders, readings and certificates

```
basket ─► create-checkout ─► Stripe embedded checkout (on lyrionatelier.com)
                                     │ paid
                                     ▼
                              stripe-webhook
              ┌──────────────────────┴───────────────────────┐
     posted pieces                                    readings, certificates
  confirmed Printful order                     draft written from birth details
  (variants, address, gift note)               ─► owner emailed a link to /approve
  retried; owner emailed on failure            ─► one click: PDF emailed to the
  house-cron retries every 3 hours                customer (or the gift recipient)
```

- **create-checkout** prices every line from the catalogue by its exact
  variant, refuses resting signs and enquiry-only pieces, accepts only the
  prizes the discount wheel can award, adds delivery (free from £50 of posted
  pieces, £5.99 below, as the basket shows) and carries birth details, the
  gift note and the recipient's email in the session.
- **stripe-webhook** creates and confirms the Printful order
  (`POST /orders?confirm=true`, idempotent on the payment id), or records a
  delivery and writes a draft with Claude from computed chart positions.
- **delivery-approve** behind `/approve`: opening the link never sends
  anything; one click on **Approve and send** builds the PDF and emails it.
- **house-cron** (every three hours): retries failed Printful orders and
  drafts, reminds the owner of anything awaiting approval, enforces the
  retention periods in the privacy policy, and writes a heartbeat so the
  Supabase project is never paused for inactivity.

Readings are framed as reflection and entertainment. The writing prompt
forbids predictions and anything about health, money or legal matters, uses
only computed placements (Sun to Pluto and the lunar nodes; no houses, rising
sign or Midheaven, which need a birth place's coordinates), and every piece
is read by the owner before it is sent.

---

## 4. Birthday Book reminders for the engine

```
GET https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/birthday-book?action=reminders&days=21
x-house-key: <HOUSE_ENGINE_KEY>
```

Returns the confirmed, subscribed entries whose birthday falls exactly 21
days from today (London), with the owner's email, the person's name and sign,
a Gift Concierge link for them, and the unsubscribe link to put in the email
(and its `List-Unsubscribe` one-click URL for the header). 29 February
birthdays are reminded on 28 February in other years. The engine sends the
emails; nothing is ever sent to the people in the book.

---

## 5. Secrets and where they live

Never commit secret values. Each is set once.

| Secret | Where | Used by |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Supabase project `zqomzteaeiqtnipkgyuo` → Edge Functions → Secrets | create-checkout, stripe-webhook |
| `STRIPE_WEBHOOK_SECRET` | same | stripe-webhook (signing secret of the Stripe endpoint below) |
| `PRINTFUL_API_KEY` | same, **and** GitHub → Settings → Secrets and variables → Actions | stripe-webhook, house-cron; Design intake and Printful sync workflows |
| `PRINTFUL_STORE_ID` (optional, for multi-store accounts) | both places | as above |
| `ANTHROPIC_API_KEY` | Supabase secrets | readings and certificates |
| `RESEND_API_KEY` | Supabase secrets | every email |
| `MAIL_FROM` (e.g. `Lyrīon Atelier <orders@your-verified-domain>`) | Supabase secrets | every email; the domain must be verified in Resend |
| `OWNER_EMAIL` (optional, default admin@lyrionatelier.com) | Supabase secrets | approvals and failure alerts |
| `APPROVAL_SECRET` (long random string) | Supabase secrets | signs approval, opt-in and unsubscribe links |
| `HOUSE_CRON_KEY` (long random string) | Supabase secrets **and** GitHub Actions secrets | house-cron and its workflow |
| `HOUSE_ENGINE_KEY` (long random string) | Supabase secrets **and** the n8n engine | Birthday Book reminders endpoint |
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions secrets | Deploy checkout functions workflow |
| `SUPABASE_DB_PASSWORD` | GitHub Actions secrets | applies `supabase/migrations` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | set by Supabase automatically | database access from the functions |
| `NETLIFY_SITE_ID`, `NETLIFY_AUTH_TOKEN` | GitHub Actions secrets (existing) | staging deploy only |

The Stripe **publishable** key in `public/data/site.json` is public by
design.

**Stripe webhook endpoint:**
`https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/stripe-webhook`,
events `checkout.session.completed` and
`checkout.session.async_payment_succeeded`.

---

## 6. Workflows

| Workflow | When | Does |
| --- | --- | --- |
| Verify catalogue | every pull request and push to main | unit tests, catalogue and slug checks, Edge Function type-check and tests |
| Publish Codex articles | engine commits to `data/codex-queue/`, daily 05:07 UTC | pages, index, sitemap |
| Design intake | engine commits designs or artwork, daily 06:41 UTC | Printful products, mockups, catalogue |
| Sync Printful snapshot | daily 03:17 UTC | `data/printful-sync.json` for the id check |
| House sweep and keep-alive | every 3 hours | retries, reminders, retention, heartbeat |
| Deploy checkout functions | changes under `supabase/` on main | migrations and functions |
| Build Printful Packs, Normalize Brand Assets | manual only | legacy asset builds |

---

## 7. Doing things by hand

- **Change a price:** edit `data/catalogue.json`, then
  `npm run build:catalog && node scripts/sync-static-pages.mjs`. CI checks the rest.
- **Hide a product:** set `"listed": false`.
- **Retire or show a sign early:** that is the engine's job; do not edit
  `data/house.json`.
- **Write a reading yourself:** open the approval link from the email,
  replace the text, press Approve and send.
