import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'printful-files', 'brand');
const OUT = {
  sun: path.join(OUT_DIR, 'sun-1_25in.png'), // 375×375
  adult: path.join(OUT_DIR, 'logo-adult-1_2in.png'), // 360×360
  youth: path.join(OUT_DIR, 'logo-youth-1_2in.png') // 360×360
};

const CANDIDATES = [
  // common favicon/sun locations
  'assets/**/favicon*.png', 'public/**/favicon*.png', 'static/**/favicon*.png', '**/favicon*.png',
  'assets/**/sun*.png', '**/sun*.png',
  // logos
  'assets/**/logo*.png', 'assets/**/brand*.png', '**/*logo*adult*.png', '**/*logo*youth*.png', '**/*cherub*.png'
];

function bySizeDesc(a, b) { return (b.meta?.width || 0) * (b.meta?.height || 0) - (a.meta?.width || 0) * (a.meta?.height || 0); }

async function probe(files) {
  const out = [];
  for (const f of files) {
    try {
      const input = path.resolve(f);
      const img = sharp(input);
      const meta = await img.metadata();
      out.push({ input, meta });
    } catch (error) {
      console.warn('[normalize-brand] skipping', f, '-', error?.message || error);
    }
  }
  return out.sort(bySizeDesc);
}

function looksLikeSun(name) { return /sun|favicon/i.test(name); }
function looksLikeYouth(name) { return /youth|kid|cherub/i.test(name); }
function looksLikeAdult(name) { return /adult|main|primary/i.test(name); }

async function pickSources() {
  const files = await fg(CANDIDATES, { dot: false, onlyFiles: true, ignore: ['node_modules/**', 'netlify/**', 'printful-files/**'] });
  const data = await probe(files);
  if (!data.length) return {};

  // Heuristics
  const sun = data.find(d => looksLikeSun(path.basename(d.input))) || data[0];
  // Try to split logos
  let youth = data.find(d => looksLikeYouth(path.basename(d.input)));
  let adult = data.find(d => looksLikeAdult(path.basename(d.input)));

  // Fallbacks: pick next best non-sun for logos
  const nonSun = data.filter(d => d.input !== sun?.input);
  if (!adult) adult = nonSun[0];
  if (!youth) youth = nonSun.find(d => d.input !== adult?.input) || nonSun[1];

  return { sun, adult, youth };
}

async function saveSquare(src, size, outPath) {
  const img = sharp(src);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await img
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function run() {
  const { sun, adult, youth } = await pickSources();

  if (!sun) {
    console.error('No source images found.\nPlace sun/favicon/logo PNGs in assets/, public/, static/, or the repo root (not node_modules/netlify/printful-files) and re-run.');
    return;
  }

  // Create outputs if missing or if source is newer
  async function needsBuild(src, out) {
    if (!src || !out) return false;
    try {
      const s = fs.statSync(src);
      const o = fs.existsSync(out) ? fs.statSync(out) : null;
      return !o || o.mtimeMs < s.mtimeMs;
    } catch (error) { return true; }
  }

  if (await needsBuild(sun.input, OUT.sun)) {
    await saveSquare(sun.input, 375, OUT.sun);
    console.log('[ok] sun →', OUT.sun.replace(process.cwd(), ''));
  } else { console.log('[skip] sun up-to-date'); }

  if (adult && await needsBuild(adult.input, OUT.adult)) {
    await saveSquare(adult.input, 360, OUT.adult);
    console.log('[ok] adult logo →', OUT.adult.replace(process.cwd(), ''));
  } else { console.log('[skip] adult logo up-to-date or missing source'); }

  if (youth && await needsBuild(youth.input, OUT.youth)) {
    await saveSquare(youth.input, 360, OUT.youth);
    console.log('[ok] youth logo →', OUT.youth.replace(process.cwd(), ''));
  } else { console.log('[skip] youth logo up-to-date or missing source'); }
}

await run();
