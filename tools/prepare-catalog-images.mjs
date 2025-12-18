import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, 'public', 'assets', 'raw-art');
const OUT_DIR = path.join(ROOT, 'assets', 'catalog');
const MAP_OUT = path.join(ROOT, 'data', 'image-map.json');
const MAP_PUBLIC_OUT = path.join(ROOT, 'public', 'data', 'image-map.json');
const PLACEHOLDER_SRC = path.join(ROOT, 'assets', 'placeholder.webp');
const PLACEHOLDER_OUT = path.join(OUT_DIR, 'placeholder.webp');
const exts = /\.(png|jpe?g|webp|avif)$/i;
const ZODIACS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

const slugify = (val) => String(val || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

async function walk(dir){
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
      const res = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(res) : res;
    }));
    return files.flat();
  } catch (err) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

async function ensurePlaceholder(){
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.copyFile(PLACEHOLDER_SRC, PLACEHOLDER_OUT);
  return '/assets/catalog/placeholder.webp';
}

async function toWebp(src, outPath){
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const image = sharp(src).rotate();
  await image
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(outPath);
  return outPath;
}

async function build(){
  const files = (await walk(RAW_DIR)).filter(f => exts.test(f));
  const map = {};
  const placeholderUrl = await ensurePlaceholder();
  let brandUrl = null;

  for (const file of files){
    const name = slugify(path.basename(file, path.extname(file)));
    if (!name) continue;
    const out = path.join(OUT_DIR, `${name}.webp`);
    await toWebp(file, out);
    const url = `/assets/catalog/${path.basename(out)}`;
    map[name] = url;
    const primary = name.split('-')[0];
    if (primary && !map[primary]) map[primary] = url;
    if (file.includes(`${path.sep}brand${path.sep}`)) brandUrl = url;
  }

  if (brandUrl){
    for (const z of ZODIACS){
      if (!map[z]) map[z] = brandUrl;
    }
  }
  for (const z of ZODIACS){
    if (!map[z]) map[z] = placeholderUrl;
  }
  if (!map.placeholder) map.placeholder = placeholderUrl;

  const next = JSON.stringify(map, null, 2);
  const prev = await fs.readFile(MAP_OUT, 'utf8').catch(() => '');
  const prevPublic = await fs.readFile(MAP_PUBLIC_OUT, 'utf8').catch(() => '');
  if (prev !== next){
    await fs.mkdir(path.dirname(MAP_OUT), { recursive: true });
    await fs.writeFile(MAP_OUT, `${next}\n`);
  }
  if (prevPublic !== next){
    await fs.mkdir(path.dirname(MAP_PUBLIC_OUT), { recursive: true });
    await fs.writeFile(MAP_PUBLIC_OUT, `${next}\n`);
  }

  console.log('[catalog] wrote', Object.keys(map).length, 'image entries');
}

build().catch((err) => {
  console.error('[catalog] prepare failed', err);
  process.exitCode = 1;
});
