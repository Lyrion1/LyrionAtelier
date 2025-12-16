import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import sharp from 'sharp';
import archiver from 'archiver';

const ROOT = process.cwd();
const PRODUCTS_DIR = path.join(ROOT, 'data', 'products');
const INDEX_FILE = path.join(ROOT, 'data', 'index.json');
const OUT_BASE = path.join(ROOT, 'printful-files', 'products');
const FRONT_DEFAULT_IN = 12;
const FRONT_CREW_IN = 11.5;
const FRONT_HOOD_IN = 12;
const SPECIAL_FRONT_IN = { 'aquarian-current-hoodie': 6 }; // chest crest hoodie
const BRAND = {
  sun: path.join(ROOT, 'printful-files', 'brand', 'sun-1_25in.png'), // 375×375 px @300dpi
  adult: path.join(ROOT, 'printful-files', 'brand', 'logo-adult-1_2in.png'), // 360×360 px
  youth: path.join(ROOT, 'printful-files', 'brand', 'logo-youth-1_2in.png'), // 360×360 px
  neck: path.join(ROOT, 'printful-files', 'brand', 'neck-label-3x4in.png') // 900×1200 px
};

function loadSlugs() {
  try {
    const s = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    if (Array.isArray(s) && s.length) return s;
  } catch {
    // fall through to glob
  }
  return fg.sync('*.json', { cwd: PRODUCTS_DIR }).map(f => f.replace(/\.json$/, ''));
}
function loadProduct(slug) {
  try {
    const file = path.join(PRODUCTS_DIR, slug + '.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
function money(c) { return (Number(c || 0) / 100).toFixed(2); }

function dept(p) {
  const sub = (p.subcategory || '').toLowerCase();
  if ((p.department || '').toLowerCase() === 'homeware') return 'home';
  if ((p.department || '').toLowerCase() === 'digital') return 'digital';
  if (sub.includes('youth') || sub.includes('kid')) return 'youth';
  return 'adult';
}
function frontWidthIn(p) {
  const sub = (p.subcategory || '').toLowerCase();
  let w = FRONT_DEFAULT_IN; // default tees
  if (sub.includes('crew')) w = FRONT_CREW_IN;
  if (sub.includes('hood')) w = FRONT_HOOD_IN; // full front unless overridden
  if (p.slug && SPECIAL_FRONT_IN[p.slug]) w = SPECIAL_FRONT_IN[p.slug];
  return w;
}
function firstImagePath(p) {
  const img = (p.images || [])[0] || '';
  if (img) return path.join(ROOT, img.replace(/^\//, ''));
  const guess = fg.sync('assets/artwork/**/*' + (p.slug || '') + '*.{png,jpg,jpeg,webp}', { cwd: ROOT, absolute: true })[0];
  return guess || null;
}

async function ensurePNGsrc(src) {
  if (!src) return null;
  const ext = path.extname(src).toLowerCase();
  if (ext === '.png') return { file: src, temp: false };
  const tmp = src.replace(/\.(jpg|jpeg|webp)$/i, '.png');
  await sharp(src).png().toFile(tmp);
  return { file: tmp, temp: true };
}

async function makeFrontPrint(p, outDir) {
  const widthIn = frontWidthIn(p);
  const px = Math.round(widthIn * 300); // 300 DPI
  const src = firstImagePath(p);
  if (!src) return null;
  const srcPNG = await ensurePNGsrc(src);
  const img = sharp(srcPNG.file).rotate();
  const meta = await img.metadata();
  const scale = px / (meta.width || px);
  const h = Math.round((meta.height || px) * scale);

  const canvas = sharp({
    create: { width: px, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  });
  const buf = await sharp(srcPNG.file).resize({ width: px, fit: 'contain' }).png().toBuffer();
  const outFile = path.join(outDir, `front-${px}px.png`);
  await canvas.composite([{ input: buf, left: 0, top: 0 }]).png({ compressionLevel: 7 }).toFile(outFile);
  if (srcPNG.temp) { try { await fs.promises.unlink(srcPNG.file); } catch {} }
  return { file: outFile, px };
}

async function copyIfExists(src, dest) {
  try {
    await fs.promises.access(src, fs.constants.R_OK);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(src, dest);
    return dest;
  } catch {
    return null;
  }
}

async function zipDir(dir, zipPath) {
  await fs.promises.mkdir(path.dirname(zipPath), { recursive: true });
  const tmpZip = path.join(path.dirname(zipPath), path.basename(zipPath) + '.tmp');
  const out = fs.createWriteStream(tmpZip);
  const archive = archiver('zip', { zlib: { level: 9 } });
  return new Promise((resolve, reject) => {
    out.on('close', async () => {
      try { await fs.promises.rename(tmpZip, zipPath); } catch (error) { return reject(error); }
      resolve(zipPath);
    });
    archive.on('error', reject);
    archive.pipe(out);
    archive.directory(dir, false);
    archive.finalize();
  });
}

async function run() {
  const slugs = loadSlugs();
  for (const slug of slugs) {
    const pth = path.join(OUT_BASE, slug);
    const p = loadProduct(slug);
    if (!p || p.kind !== 'product') continue;
    await fs.promises.mkdir(pth, { recursive: true });

    const results = {};
    results.front = await makeFrontPrint(p, pth);
    const crestSrc = dept(p) === 'youth' ? BRAND.youth : BRAND.adult;
    results.sleeve = await copyIfExists(crestSrc, path.join(pth, 'sleeve-crest-1_2in.png'));
    results.back = await copyIfExists(BRAND.sun, path.join(pth, 'backneck-sun-1_25in.png'));
    results.neck = await copyIfExists(BRAND.neck, path.join(pth, 'inside-label-3x4in.png'));

    const manifest = {
      title: p.title, slug, department: p.department, subcategory: p.subcategory,
      priceUSD: p.variants && p.variants[0] ? money(p.variants[0].price) : '0.00',
      front: results.front ? { file: path.basename(results.front.file), width_px: results.front.px, width_in: frontWidthIn(p) } : null,
      sleeve_crest: results.sleeve ? path.basename(results.sleeve) : null,
      backneck_sun: results.back ? path.basename(results.back) : null,
      inside_label: results.neck ? path.basename(results.neck) : null
    };
    await fs.promises.writeFile(path.join(pth, 'manifest.json'), JSON.stringify(manifest, null, 2));

    const zipPath = path.join(OUT_BASE, slug, 'pack.zip');
    await zipDir(pth, zipPath);
    console.log('[pack]', slug);
  }
}
await run();
