// The site with the house engine's files absent, present and broken.
//   node --test tests/engine-files.test.mjs
//
// The engine writes data/house.json, data/designs-queue.json and
// data/codex-queue/*.md. None of them is on main yet. Each state below runs
// in a scratch copy of the site, so the real files are never touched, and
// checks the catalogue guard, the Codex publisher, the design intake and the
// checkout's own reading of house.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const REPO = path.resolve(import.meta.dirname, '..');
const FIX = path.join(REPO, 'tests', 'fixtures');
const H = createRequire(import.meta.url)('../js/house-core.js');
// Large asset folders are linked rather than copied.
const LINKED = new Set(['.git', 'node_modules', 'images', '_incoming', 'shop-images', 'compatibility-images', 'oracle-images', 'docs', 'assets']);

function scratch() {
  const root = mkdtempSync(path.join(tmpdir(), 'engine-files-'));
  for (const name of readdirSync(REPO)) {
    if (LINKED.has(name)) symlinkSync(path.join(REPO, name), path.join(root, name));
    else cpSync(path.join(REPO, name), path.join(root, name), { recursive: true });
  }
  for (const f of ['data/house.json', 'data/designs-queue.json']) rmSync(path.join(root, f), { force: true });
  rmSync(path.join(root, 'data', 'codex-queue'), { recursive: true, force: true });
  return root;
}

function node(root, args, env = {}) {
  const r = spawnSync('node', args, { cwd: root, encoding: 'utf8', env: { ...process.env, PRINTFUL_API_KEY: '', ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const QUEUED_DESIGN = [{
  id: 'scorpio-001', sign: 'Scorpio', action: 'design', status: 'awaiting artwork',
  garments: ['tee'], decoration: 'print', story: 'A test design', palette: ['#1c1420'], approved: '2026-10-06',
}];

const STATES = {
  'absent (as on main today)': () => {},
  'present and valid': (root) => {
    writeFileSync(path.join(root, 'data', 'house.json'), readFileSync(path.join(FIX, 'house', 'scorpio-on-show.json')));
    writeFileSync(path.join(root, 'data', 'designs-queue.json'), JSON.stringify(QUEUED_DESIGN, null, 2));
    cpSync(path.join(FIX, 'codex-queue'), path.join(root, 'data', 'codex-queue'), { recursive: true });
  },
  'present but malformed': (root) => {
    writeFileSync(path.join(root, 'data', 'house.json'), '{"lead_sign": "Libra", "on_show": [');
    writeFileSync(path.join(root, 'data', 'designs-queue.json'), '{ not json');
    mkdirSync(path.join(root, 'data', 'codex-queue'));
    cpSync(path.join(FIX, 'codex-queue', '2026-10-04-malformed.md'), path.join(root, 'data', 'codex-queue', '2026-10-04-malformed.md'));
  },
  'present but empty (an engine caught mid-write)': (root) => {
    writeFileSync(path.join(root, 'data', 'house.json'), '');
    writeFileSync(path.join(root, 'data', 'designs-queue.json'), '');
    mkdirSync(path.join(root, 'data', 'codex-queue'));
  },
};

for (const [name, setUp] of Object.entries(STATES)) {
  test(`engine files ${name}: CI passes, nothing breaks, the engine's files are left as written`, () => {
    const root = scratch();
    try {
      setUp(root);
      const read = (f) => (existsSync(path.join(root, f)) ? readFileSync(path.join(root, f), 'utf8') : null);
      const engineBefore = ['data/house.json', 'data/designs-queue.json'].map(read);

      const verify = node(root, ['scripts/verify-catalog.mjs']);
      assert.equal(verify.code, 0, verify.out);
      assert.match(verify.out, /Catalogue verification passed/);

      const codex = node(root, ['scripts/publish-codex.mjs', '--today', '2026-10-08']);
      assert.equal(codex.code, 0, codex.out);
      const published = existsSync(path.join(root, 'codex', 'venus-in-the-scales.html')) || existsSync(path.join(root, 'codex', 'venus-in-the-scales', 'index.html'));
      assert.equal(published, name === 'present and valid', 'only an approved article is published');

      const intake = node(root, ['scripts/design-intake.mjs'], { INTAKE_ROOT: root });
      assert.equal(intake.code, 0, intake.out);

      // The engine's own files are never rewritten, renamed or removed.
      assert.deepEqual(['data/house.json', 'data/designs-queue.json'].map(read), engineBefore);

      // Checkout reads house.json through the same rules: whatever the file
      // holds, every listed piece stays buyable unless a valid house rests its sign.
      let raw;
      try { raw = JSON.parse(read('data/house.json')); } catch { raw = null; }
      const house = H.normaliseHouse(raw);
      const catalogue = JSON.parse(read('data/catalogue.json'));
      const resting = catalogue.products.filter((p) => p.listed && p.fulfilment !== 'enquiry' && !H.isPurchasable(p, house)).map((p) => p.sign);
      if (name === 'present and valid') {
        assert.ok(resting.length > 0 && resting.every((s) => !['Libra', 'Scorpio', 'Virgo'].includes(s)), resting.join());
      } else {
        assert.deepEqual(resting, [], 'with no usable house.json everything shows and sells as before');
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
