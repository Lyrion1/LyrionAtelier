/**
 * One-shot rewrite of hard-coded dollar prices in customer HTML.
 * Safe to re-run: replacements are idempotent where it matters.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function rewriteHtmlPrices(html) {
  const parts = html.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi);
  return parts.map((part, index) => {
    if (index % 2 === 1) return rewriteScript(part);
    let next = part;
    next = next.replace(/Lyrīon Essentials — Coming Soon/g, 'Made to order');
    next = next.replace(/Lyrīon Essentials &mdash; Coming Soon/g, 'Made to order');
    next = next.replace(
      /Free Shipping Over \$50/g,
      'Free delivery over <span data-gbp="50"></span>'
    );
    next = next.replace(
      /Free delivery on orders of \$50 or more\./g,
      'Free delivery on orders of <span data-gbp="50"></span> or more.'
    );
    next = next.replace(
      /<option value="([^"]+)"([^>]*)>([^<]*?)\s[-–—]\s*\$(\d+(?:\.\d{1,2})?)<\/option>/g,
      (m, id, attrs, label, price) => {
        const size = label.trim().replace(/"/g, '');
        const clean = attrs.replace(/\sdata-gbp="[^"]*"/g, '').replace(/\sdata-size="[^"]*"/g, '');
        return `<option value="${id}"${clean} data-gbp="${Number(price).toFixed(2)}" data-size="${size}">${size}</option>`;
      }
    );
    next = next.replace(/>(\$)(\d+(?:\.\d{1,2})?)(\/mo)?</g, (m, _d, amount, per) => {
      if (Number(amount) === 0) return '><';
      const suffix = per ? ` data-suffix="${per}"` : '';
      return ` data-gbp="${amount}"${suffix}><`;
    });
    // "$39" inside a heading or button that is not the whole element.
    // A zero placeholder is cleared; cart and product scripts fill the real amount.
    next = next.replace(/\$(\d+(?:\.\d{1,2})?)(\/mo)?/g, (m, amount, per) => {
      if (Number(amount) === 0) return '';
      const suffix = per ? ` data-suffix="${per}"` : '';
      return `<span data-gbp="${amount}"${suffix}></span>`;
    });
    return next;
  }).join('');
}

function rewriteScript(part) {
  let next = part;
  next = next.replaceAll(
    'priceDisplay.textContent = `$${formatted}`;',
    'priceDisplay.textContent = window.LyrionMoney.format(Number(formatted));'
  );
  next = next.replaceAll(
    'addBtn.textContent = `Add to Cart - $${formatted}`;',
    "addBtn.textContent = 'Add to Cart — ' + window.LyrionMoney.format(Number(formatted));"
  );
  next = next.replaceAll(
    'const label = `Add to Cart - $${formatted}`;',
    "const label = 'Add to Cart — ' + window.LyrionMoney.format(Number(formatted));"
  );
  next = next.replaceAll(
    'startingPriceEl.textContent = `Starting at $${formatted}`;',
    "startingPriceEl.textContent = 'Starting at ' + window.LyrionMoney.format(Number(formatted));"
  );
  next = next.replaceAll(
    'startingPriceEl.textContent = `$${formatted}`;',
    'startingPriceEl.textContent = window.LyrionMoney.format(Number(formatted));'
  );
  next = next.replaceAll(
    'option.textContent = `${variant.size} - $${Number(variant.price).toFixed(2)}`;',
    "option.textContent = variant.size + ' — ' + window.LyrionMoney.format(Number(variant.price));"
  );
  next = next.replaceAll(
    'priceLabel: priceValue !== null ? `$${priceValue.toFixed(2)}` : \'Price unavailable\',',
    "priceLabel: priceValue !== null ? (window.LyrionMoney ? window.LyrionMoney.format(priceValue) : '') : 'Price unavailable',"
  );
  if (next.includes('window.LyrionMoney.format') && !next.includes('lyrion:currencychange') && next.includes('updatePrice')) {
    next = next.replace(
      /updatePrice\(\);\s*\n/,
      "updatePrice();\n    document.addEventListener('lyrion:currencychange', () => { if (typeof initializePrice === 'function') initializePrice(); if (typeof updatePrice === 'function') updatePrice(); });\n"
    );
  }
  return next;
}

function ensureMoneyScript(html) {
  if (html.includes('/js/money.js') || html.includes('js/money.js')) return html;
  if (html.includes('/js/analytics.js')) {
    return html.replace(
      '<script src="/js/analytics.js"></script>',
      '<script src="/js/analytics.js"></script>\n<script src="/js/money.js"></script>'
    );
  }
  if (html.includes('js/analytics.js')) {
    return html.replace(
      '<script src="js/analytics.js"></script>',
      '<script src="js/analytics.js"></script>\n<script src="/js/money.js"></script>'
    );
  }
  return html.replace('<head>', '<head>\n<script src="/js/money.js"></script>');
}

const META = {
  '404.html': ['Lost in the Cosmos | Lyrīon Atelier', 'This page is not on lyrionatelier.com. Head back to the shop, the oracle, or the journal.'],
  'cart.html': ['Your Bag | Lyrīon Atelier', 'Review your Lyrīon Atelier bag before checkout. The currency you choose is the currency you are charged.'],
  'contact-success.html': ['Message received | Lyrīon Atelier', 'Your note to Lyrīon Atelier has been received. We reply by email.'],
  'privacy-policy.html': ['Privacy Policy | Lyrīon Atelier', 'How LYRION LTD collects, uses and stores personal information on lyrionatelier.com, including cookies and analytics consent.'],
  'terms-of-service.html': ['Terms of Service | Lyrīon Atelier', 'The terms for shopping, readings and certificates from Lyrīon Atelier, operated by LYRION LTD.'],
  'refund-policy.html': ['Refund Policy | Lyrīon Atelier', 'Refunds, size exchanges and digital readings at Lyrīon Atelier, operated by LYRION LTD in England and Wales.'],
  'product.html': ['Piece | Lyrīon Atelier', 'A made-to-order piece from Lyrīon Atelier. The price shown is the price charged at checkout.'],
  'success.html': ['Order confirmed | Lyrīon Atelier', 'Your Lyrīon Atelier order is confirmed. A receipt is on its way by email.'],
  'compatibility/digital-certificate.html': ['Digital Compatibility Certificate | Lyrīon Atelier', 'A digital cosmic compatibility certificate for two birth charts, emailed by Lyrīon Atelier.'],
  'compatibility/luxury-print.html': ['Luxury Print Compatibility Certificate | Lyrīon Atelier', 'A luxury printed cosmic compatibility certificate, made to order by Lyrīon Atelier.'],
  'compatibility/museum-framed.html': ['Museum Framed Compatibility Certificate | Lyrīon Atelier', 'A museum-framed cosmic compatibility certificate from Lyrīon Atelier.'],
  'compatibility/twin-flames.html': ['Twin Flames Certificate | Lyrīon Atelier', 'The Twin Flames compatibility keepsake from Lyrīon Atelier, written from two birth charts.'],
  'oracle/2026-reading.html': ['What 2026 Has Written for You | Lyrīon Atelier', 'A personalised year-ahead astrology reading from your birth details. Written for reflection and emailed within 48 hours by Lyrīon Atelier.'],
  'oracle/life-path-reading.html': ['Life Path Reading | Lyrīon Atelier', 'A life path reading exploring strengths and the patterns in your birth chart. Delivered within 48 hours by Lyrīon Atelier.'],
  'oracle/solar-return-reading.html': ['Solar Return Reading | Lyrīon Atelier', 'Your year ahead, read from your solar return as themes to reflect on. Emailed within 48 hours by Lyrīon Atelier.'],
  'oracle/natal-chart-blueprint.html': ['Natal Chart Blueprint | Lyrīon Atelier', 'A full natal chart reading: personality, relationships, career and growth, from the sky at your birth. Emailed within 48 hours.'],
  'oracle/career-purpose-reading.html': ['Career & Purpose Reading | Lyrīon Atelier', 'A career and purpose reading drawn from your birth chart. Written for reflection and emailed within 48 hours by Lyrīon Atelier.'],
  'oracle/relationship-synastry.html': ['Relationship Synastry Reading | Lyrīon Atelier', 'A synastry reading of two birth charts, written as a relationship portrait for reflection. Emailed within 48 hours.'],
  'oracle/transit-forecast.html': ['Transit Forecast | Lyrīon Atelier', 'A transit forecast reading the current sky against your birth chart. Delivered within 48 hours by Lyrīon Atelier.'],
  'oracle/lunar-nodes-reading.html': ['Lunar Nodes Reading | Lyrīon Atelier', 'A lunar nodes reading on direction and growth in your chart. Written for reflection and emailed within 48 hours.'],
  'oracle/chiron-wound-healing.html': ['Chiron Wound Healing Reading | Lyrīon Atelier', 'A Chiron reading on the wound and the gift in your chart. Written for reflection and emailed within 48 hours.'],
  'oracle/full-cosmic-synthesis.html': ['Full Cosmic Synthesis | Lyrīon Atelier', 'The longest Lyrīon Atelier reading: natal chart, year ahead and relationships in one synthesis, emailed within 48 hours.']
};

function canonicalFor(rel) {
  const clean = rel.replace(/\.html$/, '').replace(/\/index$/, '');
  if (clean === 'index') return 'https://lyrionatelier.com/';
  return `https://lyrionatelier.com/${clean}`;
}

function ensureMeta(html, rel) {
  const spec = META[rel];
  if (!spec) return html;
  const [title, description] = spec;
  if (html.includes('name="description"')) return html;
  const url = canonicalFor(rel);
  const block = `
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="https://lyrionatelier.com/images/lyrion-logo.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://lyrionatelier.com/images/lyrion-logo.png">
`;
  if (html.includes('</title>')) return html.replace('</title>', `</title>${block}`);
  return html.replace('</head>', `${block}</head>`);
}

const files = await walk(ROOT);
let changed = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel.startsWith('admin/') || rel.startsWith('tools/') || rel.startsWith('tests/')) continue;
  let html = await readFile(file, 'utf8');
  const original = html;
  html = ensureMoneyScript(html);
  html = rewriteHtmlPrices(html);
  html = ensureMeta(html, rel);
  if (html !== original) {
    await writeFile(file, html);
    changed += 1;
    console.log('updated', rel);
  }
}
console.log('files changed', changed);
