// End-to-end test of the design intake against a stand-in for the Printful
// API, in a scratch copy of the site so the real files are never touched.
//   node --test tests/design-intake.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = async (env) => (await promisify(execFile)('node', [path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'scripts/design-intake.mjs')], { env, encoding: 'utf8' })).stdout;
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function png(width, height) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function stubPrintful() {
  const calls = [];
  const jpeg = readFileSync(path.join(REPO, 'images/samples/sample-pet-chart.jpg'));
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    calls.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null, auth: req.headers.authorization });
    const send = (result) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ code: 200, result })); };
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/products') return send([{ id: 146, brand: 'Gildan', model: '18500', title: 'Unisex Heavy Blend Hoodie | Gildan 18500' }]);
    if (u.pathname === '/products/146') return send({
      product: { id: 146, model: '18500', title: 'Unisex Heavy Blend Hoodie | Gildan 18500' },
      variants: [
        { id: 5530, size: 'S', color: 'Black' }, { id: 5531, size: 'M', color: 'Black' }, { id: 5532, size: 'L', color: 'Black' }, { id: 9999, size: 'S', color: 'White' },
      ],
    });
    if (u.pathname === '/mockup-generator/printfiles/146') return send({
      printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }],
      variant_printfiles: [{ variant_id: 5530, placements: { front: 1 } }],
    });
    if (u.pathname === '/store/products' && req.method === 'POST') return send({ id: 777001, external_id: 'abc' });
    if (u.pathname === '/store/products/777001') return send({ sync_variants: [
      { id: 1, variant_id: 5530, external_id: '7a1b2c3d4e5f01' }, { id: 2, variant_id: 5531, external_id: '7a1b2c3d4e5f02' }, { id: 3, variant_id: 5532, external_id: '7a1b2c3d4e5f03' },
    ] });
    if (u.pathname === '/mockup-generator/create-task/146') return send({ task_key: 'gt-1', status: 'pending' });
    if (u.pathname === '/mockup-generator/task') return send({ task_key: 'gt-1', status: 'completed', mockups: [{ mockup_url: `http://127.0.0.1:${server.address().port}/m/front.jpg`, extra: [{ url: `http://127.0.0.1:${server.address().port}/m/side.jpg` }] }] });
    if (u.pathname.startsWith('/m/')) { res.setHeader('Content-Type', 'image/jpeg'); return res.end(jpeg); }
    res.statusCode = 404; res.end('{}');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, calls, base: `http://127.0.0.1:${server.address().port}` })));
}

function scratchSite() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'lyrion-intake-'));
  // Hard links keep the copy cheap; data/ is copied for real because the intake rewrites it.
  execFileSync('cp', ['-al', ...['images', 'shop', 'oracle', 'compatibility', 'charts', 'compatibility-images', 'oracle-images', 'shop-images', 'assets', 'gemini-starlight-tee', 'leo-zodiac-hoodie', 'pisces-hoodie', 'cosmic-crewneck-pisces', 'aquarius-crop-hoodie', 'capricorn-verdant-sweatshirt', 'youth-aries-fire-tee', 'youth-aries-heavy-blend-hoodie', 'fisherman-beanie', 'lyrion-pique-polo', 'corduroy-cap-sun-crest', 'lyrion-sun-crest-socks', 'pisces-intuition-hoodie', 'aries-denim-bucket-hat'].filter((d) => existsSync(path.join(REPO, d))).map((d) => path.join(REPO, d)), dir]);
  execFileSync('cp', ['-r', path.join(REPO, 'data'), path.join(dir, 'data')]);
  for (const f of ['product.html', 'codex.html']) execFileSync('cp', [path.join(REPO, f), dir]);
  return dir;
}

test('a queued design with artwork becomes a Printful product, mockups and a catalogue entry', async () => {
  const { server, calls, base } = await stubPrintful();
  const root = scratchSite();
  try {
    writeFileSync(path.join(root, 'data/designs-queue.json'), JSON.stringify([
      { id: 12, approved: '2026-10-08', status: 'awaiting artwork', action: 'design', sign: 'Scorpio', name: 'Scorpio Night Garden Hoodie', garment: 'Heavyweight hoodie', decoration: 'Screen print front', palette: 'black and silver', wording: 'Still waters', story: 'A night garden for the fixed water sign.', artwork_prompt: 'night garden' },
      { id: 13, approved: '2026-10-08', status: 'awaiting artwork', action: 'design', sign: 'Scorpio', name: 'No artwork yet', garment: 'tee', decoration: '', palette: '', wording: '', story: '', artwork_prompt: '' },
    ]));
    mkdirSync(path.join(root, 'artwork/incoming'), { recursive: true });
    writeFileSync(path.join(root, 'artwork/incoming/design-12.png'), png(1800, 2400));
    const queueBefore = readFileSync(path.join(root, 'data/designs-queue.json'), 'utf8');

    const env = { ...process.env, INTAKE_ROOT: root, PRINTFUL_API_BASE: base, PRINTFUL_API_KEY: 'test-key', ARTWORK_BASE_URL: 'https://example.invalid/art' };
    const out = await run(env);
    assert.match(out, /1 built, 0 newly listed, 1 waiting for artwork, 0 failed/);

    const catalogue = JSON.parse(readFileSync(path.join(root, 'data/catalogue.json'), 'utf8'));
    const product = catalogue.products.find((p) => p.design?.id === 12);
    assert.ok(product, 'the design is in the catalogue');
    assert.equal(product.slug, 'scorpio-night-garden-hoodie');
    assert.equal(product.sign, 'Scorpio');
    assert.equal(product.element, 'Water');
    assert.equal(product.seasonal, true);
    assert.equal(product.listed, false, 'unlisted until the owner sets prices');
    assert.deepEqual(product.variants.map((v) => v.printful_variant_id), ['7a1b2c3d4e5f01', '7a1b2c3d4e5f02', '7a1b2c3d4e5f03']);
    assert.equal(product.printful.sync_product_id, 777001);
    for (const img of product.images) assert.ok(existsSync(path.join(root, img)), img);

    const built = JSON.parse(readFileSync(path.join(root, 'data/designs-built.json'), 'utf8'));
    assert.equal(built.length, 1);
    assert.equal(built[0].status, 'built');
    assert.equal(readFileSync(path.join(root, 'data/designs-queue.json'), 'utf8'), queueBefore, 'the queue is never modified');

    const create = calls.find((c) => c.url === '/store/products' && c.method === 'POST');
    assert.equal(create.auth, 'Bearer test-key');
    assert.deepEqual(create.body.sync_variants.map((v) => v.variant_id), [5530, 5531, 5532], 'only the Black blanks');
    assert.equal(create.body.sync_variants[0].files[0].type, 'front');
    assert.equal(create.body.sync_variants[0].files[0].url, 'https://example.invalid/art/artwork/incoming/design-12.png');

    // The owner sets the hoodie's prices; the next run lists the design without rebuilding it.
    const garments = JSON.parse(readFileSync(path.join(root, 'data/garments.json'), 'utf8'));
    garments.garments.hoodie.price_gbp_by_size = { S: 44.99, M: 44.99, L: 44.99 };
    writeFileSync(path.join(root, 'data/garments.json'), JSON.stringify(garments));
    const second = await run(env);
    assert.match(second, /0 built, 1 newly listed/);
    const after = JSON.parse(readFileSync(path.join(root, 'data/catalogue.json'), 'utf8')).products.find((p) => p.design?.id === 12);
    assert.equal(after.listed, true);
    assert.deepEqual(after.price_gbp, { min: 44.99, max: 44.99 });
    assert.equal(calls.filter((c) => c.url === '/store/products' && c.method === 'POST').length, 1, 'never created twice');
  } finally {
    server.close();
    rmSync(root, { recursive: true, force: true });
  }
});
