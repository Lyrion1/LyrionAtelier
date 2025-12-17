import { promises as fs } from 'fs';
import path from 'path';
import { ZS } from '../shared/zodiac.mjs';

const ROOT = process.cwd();
const PUB = path.join(ROOT, 'public');
const OUT = path.join(PUB, 'data', 'images-map.json');
const exts = /\.(png|jpg|jpeg|webp|avif)$/i;

async function walk(dir){
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const res = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(res);
      return res;
    }));
    return files.flat();
  } catch (err) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

const rel = (base, p) => '/' + path.relative(base, p).split(path.sep).join('/');
const prefer = (a, b) => a.length >= b.length ? a : b; // filename length ~ higher res usually

(async () => {
const roots = [];
const pubExists = await fs.stat(PUB).then(() => true).catch(() => false);
if (pubExists) roots.push(PUB);
roots.push(ROOT);

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  const files = (await Promise.all(roots.map(walk))).flat().filter(p => exts.test(p));
  const out = {};

  for (const z of ZS){
    const cand = files.filter(f => f.toLowerCase().includes(z));
    if (cand.length) {
      const pick = cand.reduce(prefer);
      const base = pick.startsWith(PUB) ? PUB : ROOT;
      out[z] = rel(base, pick);
    }
  }
  // brand fallback if any zodiac missing
  const brand = files.find(f => /brand|logo|tree|angel/i.test(f));
  if (brand) {
    const base = brand.startsWith(PUB) ? PUB : ROOT;
    for (const z of ZS){ if (!out[z]) out[z] = rel(base, brand); }
  }

  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log('images-map:', OUT, 'with', Object.keys(out).length, 'entries');
})().catch(err => {
  console.error('images-map build failed:', err);
  process.exitCode = 1;
});
