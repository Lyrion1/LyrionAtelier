// Unit tests for the house rules and the catalogue guard.
//   node --test tests/house.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { houseCore as H, validateCatalogue, loadCatalogue, buildCheckoutMap } from '../scripts/lib/catalog.mjs';
import { parseArticle } from '../scripts/publish-codex.mjs';

const ENGINE_EXAMPLE = {
  updated: '2026-10-07T06:00:00Z',
  written_by: 'Lyrion house engine. Do not edit by hand.',
  lead_sign: 'Libra',
  on_show: ['Libra', 'Scorpio'],
  last_chance: ['Virgo'],
  retired_until_next_season: ['Leo'],
  campaigns: [{ key: 'retrograde-edit', title: 'Run the Retrograde Edit', start: '2026-10-24', end: '2026-11-13' }],
};
const piece = (sign, seasonal = true) => ({ sign, seasonal, listed: true, fulfilment: 'printful' });

test('the engine contract example is a valid house', () => {
  const h = H.normaliseHouse(ENGINE_EXAMPLE);
  assert.equal(h.valid, true);
  assert.equal(h.lead_sign, 'Libra');
  assert.deepEqual(h.on_show, ['Libra', 'Scorpio']);
});

test('missing or malformed house.json means everything shows as before', () => {
  for (const raw of [null, undefined, 'text', [], {}, { lead_sign: 'libra' }, { lead_sign: 'Libra', on_show: 'Scorpio' }, { lead_sign: 'Libra', on_show: ['Ophiuchus'] }]) {
    const h = H.normaliseHouse(raw);
    assert.equal(h.valid, false, JSON.stringify(raw));
    assert.equal(H.productState(piece('Leo'), h), 'open');
    assert.equal(H.isPurchasable(piece('Leo'), h), true);
  }
});

test('states follow the house: lead, on show, last chance, retired, core', () => {
  const h = H.normaliseHouse(ENGINE_EXAMPLE);
  assert.equal(H.productState(piece('Libra'), h), 'lead');
  assert.equal(H.productState(piece('Scorpio'), h), 'on_show');
  assert.equal(H.productState(piece('Virgo'), h), 'last_chance');
  assert.equal(H.productState(piece('Leo'), h), 'retired');
  assert.equal(H.productState(piece('Aries'), h), 'retired', 'a sign the engine does not mention is out of season');
  assert.equal(H.productState(piece('Leo', false), h), 'core', 'non-seasonal pieces never retire');
  assert.equal(H.productState({ sign: null, seasonal: false, listed: true, fulfilment: 'digital' }, h), 'core');
  assert.equal(H.isPurchasable(piece('Leo'), h), false);
  assert.equal(H.isPurchasable(piece('Virgo'), h), true);
});

test('ranking puts the lead sign first and retired signs last', () => {
  const h = H.normaliseHouse(ENGINE_EXAMPLE);
  const list = ['Leo', 'Virgo', null, 'Scorpio', 'Libra'].map((s, i) => ({ ...piece(s, !!s), i }));
  assert.deepEqual(H.rank(list, h).map((p) => p.sign), ['Libra', 'Scorpio', 'Virgo', null, 'Leo']);
  assert.deepEqual(H.rank(list, { valid: false }).map((p) => p.i), [0, 1, 2, 3, 4]);
});

test('campaigns switch on between start and end and off afterwards', () => {
  const h = H.normaliseHouse(ENGINE_EXAMPLE);
  assert.equal(H.activeCampaigns(h, '2026-10-23').length, 0);
  assert.equal(H.activeCampaigns(h, '2026-10-24').length, 1);
  assert.equal(H.activeCampaigns(h, '2026-11-13').length, 1);
  assert.equal(H.activeCampaigns(h, '2026-11-14').length, 0);
  const bad = H.normaliseHouse({ ...ENGINE_EXAMPLE, campaigns: [{ key: 'black-friday', start: '2026-01-01', end: '2026-12-31' }, { key: 'spring-equinox', start: '2026-13-01', end: '2026-03-30' }] });
  assert.equal(bad.valid, true, 'bad campaigns do not invalidate the seasons');
  assert.equal(bad.campaigns.length, 0);
});

test('sign from birth date uses the site boundaries', () => {
  assert.equal(H.signFromBirthDate(3, 20), 'Pisces');
  assert.equal(H.signFromBirthDate(3, 21), 'Aries');
  assert.equal(H.signFromBirthDate(4, 20), 'Taurus');
  assert.equal(H.signFromBirthDate(10, 23), 'Scorpio');
  assert.equal(H.signFromBirthDate(12, 22), 'Capricorn');
  assert.equal(H.signFromBirthDate(1, 19), 'Capricorn');
  assert.equal(H.signFromBirthDate(2, 29), 'Pisces');
});

test('the committed catalogue is valid and matches the checkout map', async () => {
  const c = await loadCatalogue();
  assert.deepEqual(validateCatalogue(c), []);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../public/data/products.json', import.meta.url))), buildCheckoutMap(c));
});

test('a malformed catalogue is rejected', async () => {
  const c = await loadCatalogue();
  const clone = () => JSON.parse(JSON.stringify(c));
  const cases = {
    'not an object': null,
    'duplicate slug': (() => { const x = clone(); x.products.push({ ...x.products[0] }); return x; })(),
    'pence instead of pounds': (() => { const x = clone(); x.products[0].variants[0].price_gbp = 5199; return x; })(),
    'lower-case sign': (() => { const x = clone(); x.products[0].sign = 'aries'; return x; })(),
    'shared Printful variant': (() => { const x = clone(); x.products[1].variants[0].printful_variant_id = x.products[0].variants[0].printful_variant_id; return x; })(),
    'seasonal reading': (() => { const x = clone(); const r = x.products.find((p) => p.type === 'reading'); r.seasonal = true; r.sign = 'Leo'; r.element = 'Fire'; return x; })(),
    'missing image file': (() => { const x = clone(); x.products[0].images = ['/images/does-not-exist.jpg']; return x; })(),
    'price range disagrees with variants': (() => { const x = clone(); x.products[0].price_gbp.min = 1; return x; })(),
  };
  for (const [name, bad] of Object.entries(cases)) assert.notEqual(validateCatalogue(bad).length, 0, name);
});

test('codex articles: approved ones parse, others are refused', () => {
  const ok = parseArticle('---\ntitle: T\ndescription: D\ndate: 2026-10-06\nstatus: approved\n---\nOne.\n\nTwo.\n', '2026-10-06-t.md');
  assert.equal(ok.slug, 't');
  assert.deepEqual(ok.paragraphs, ['One.', 'Two.']);
  assert.throws(() => parseArticle('no front matter', '2026-10-06-t.md'));
  assert.throws(() => parseArticle('---\ntitle: T\n---\nx', 'bad name.md'));
});
