const SIGN = /(ARI|TAU|GEM|CAN|LEO|VIR|LIB|SCO|SAG|CAP|AQU|PIS)/;

const DUO_DISCOUNT_RATE = 0.1;
const FAMILY_DISCOUNT_RATE = 0.15;
const POSTER_DISCOUNT_RATE = 0.2;
const TRINITY_DISCOUNT_RATE = 0.15;

function parse(item) {
  const sku = item.sku || '';
  const qty = Number(item.quantity || 1);
  const isYouth = /^LY-YF-/.test(sku);
  const isPoster = /-PST-/.test(sku) || /PST/.test(sku) || /poster/i.test(item.title || '');
  const match = sku.match(SIGN);
  const sign = match ? match[1] : null;
  const dept = isPoster ? 'homeware' : (isYouth ? 'youth' : 'adult');
  return { ...item, sku, qty, sign, isYouth, isPoster, dept, unit: Number(item.price || 0) };
}

function applyPromotions(lineItems) {
  const items = lineItems.map(parse);
  const discounts = [];

  // RULE A — Duo (any 2 apparel, adult): 10% off those 2 lines
  const adultApparel = items.filter((i) => i.dept === 'adult' && !i.isPoster);
  const adultCount = adultApparel.reduce((n, i) => n + i.qty, 0);
  if (adultCount >= 2) {
    const target = [];
    for (const it of [...adultApparel].sort((a, b) => b.unit - a.unit)) {
      for (let k = 0; k < it.qty && target.length < 2; k += 1) target.push(it);
      if (target.length >= 2) break;
    }
    const amount = Math.round(target.reduce((s, i) => s + i.unit * DUO_DISCOUNT_RATE, 0));
    if (amount > 0) discounts.push({ code: 'DUO10', label: 'Zodiac Duo (10%)', amountCents: amount });
  }

  // RULE B — Family constellation (adult + youth same sign): 15% off youth line(s) of that sign
  const bySign = new Map();
  for (const it of items) {
    if (!it.sign) continue;
    if (!bySign.has(it.sign)) bySign.set(it.sign, { adult: 0, youth: [] });
    const pack = bySign.get(it.sign);
    if (it.dept === 'adult') pack.adult += it.qty;
    if (it.dept === 'youth') pack.youth.push(it);
  }

  for (const [sign, pack] of bySign) {
    if (pack.adult > 0 && pack.youth.length) {
      const amount = Math.round(pack.youth.reduce((s, i) => s + i.unit * i.qty * FAMILY_DISCOUNT_RATE, 0));
      if (amount > 0) discounts.push({ code: `FAMILY15-${sign}`, label: `Family Constellation ${sign} (15%)`, amountCents: amount });
    }
  }

  // RULE C — Poster add-on: poster -20% if any apparel present
  const hasApparel = items.some((i) => !i.isPoster);
  if (hasApparel) {
    const posters = items.filter((i) => i.isPoster);
    const amount = Math.round(posters.reduce((s, i) => s + i.unit * i.qty * POSTER_DISCOUNT_RATE, 0));
    if (amount > 0) discounts.push({ code: 'POSTER20', label: 'Constellation Poster (20% off with apparel)', amountCents: amount });
  }

  // RULE D — Trinity (3+ items any mix): 15% off the cheapest line (1 unit)
  const countAll = items.reduce((n, i) => n + i.qty, 0);
  if (countAll >= 3) {
    const cheapest = [...items].sort((a, b) => a.unit - b.unit)[0];
    if (cheapest)
      discounts.push({
        code: 'TRINITY15',
        label: 'Trinity (3+ pieces)',
        amountCents: Math.round(cheapest.unit * TRINITY_DISCOUNT_RATE)
      });
  }

  const merged = Object.values(
    discounts.reduce((acc, d) => {
      const key = d.code || d.label;
      acc[key] = acc[key] ? { ...acc[key], amountCents: acc[key].amountCents + d.amountCents } : d;
      return acc;
    }, {})
  );

  const totalDiscount = merged.reduce((s, d) => s + d.amountCents, 0);

  return { items, discounts: merged, totalDiscount };
}

module.exports = { applyPromotions };
