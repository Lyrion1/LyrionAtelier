import { promises as fs } from 'fs';
import path from 'path';
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_JS = path.join(ROOT, 'js', 'products.js');
const DATA_JSON = path.join(ROOT, 'data', 'all-products.json');
const ZS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
const exts = /\.(png|jpg|jpeg|webp|avif)$/i;

// Efficient iterative directory walk instead of recursive flatMap
const walk = async (dir) => {
  const results = [];
  const stack = [dir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }
  return results;
};

const toUrl = p => '/' + path.relative(PUBLIC_DIR, p).split(path.sep).join('/');
const isZodiac = p => ZS.find(z => p.toLowerCase().includes(z));
const prefer = (a,b) => a.length >= b.length ? a : b; // crude "bigger is better" by filename length

async function findBestByZodiac(){
  const files = (await walk(PUBLIC_DIR)).filter(f => exts.test(f));
  const map = Object.fromEntries(ZS.map(z => [z, null]));
  
  // Pre-compute lowercase file paths once to avoid repeated toLowerCase() calls
  const fileData = files.map(f => ({ path: f, lower: f.toLowerCase() }));
  
  for (const { path: f, lower } of fileData) {
    const z = ZS.find(sign => lower.includes(sign));
    if (!z) continue;
    map[z] = map[z] ? prefer(map[z], f) : f;
  }
  
  // fallback: brand logos if any zodiac missing - find brand file once
  const brandFile = fileData.find(({ path: f }) => /brand|logo|tree|angel/i.test(f))?.path || null;
  for (const z of ZS) {
    if (!map[z] && brandFile) {
      map[z] = brandFile;
    }
  }
  return Object.fromEntries(Object.entries(map).filter(([,v]) => v).map(([k,v]) => [k, toUrl(v)]));
}

function zKey(p){
  const t = (p?.metadata?.zodiac || p?.title || "").toLowerCase();
  return ZS.find(z => t.includes(z)) || null;
}

async function loadCatalog(){
  try { return JSON.parse(await fs.readFile(DATA_JSON,'utf8')); } catch {}
  try {
    // crude parser for js/products.js => window.LyrionAtelier.products = [...]
    const js = await fs.readFile(DATA_JS,'utf8');
    const arr = js.match(/\[\s*{[\s\S]*}\s*]/);
    return arr ? JSON.parse(arr[0]) : [];
  } catch {}
  return [];
}

async function writeCatalog(list){
  // prefer JSON store if present; otherwise patch js/products.js
  try {
    await fs.mkdir(path.dirname(DATA_JSON), { recursive: true });
    await fs.writeFile(DATA_JSON, JSON.stringify(list, null, 2));
    return true;
  } catch {}
  try {
    const js = await fs.readFile(DATA_JS,'utf8');
    const replaced = js.replace(/\[\s*{[\s\S]*}\s*]/, JSON.stringify(list, null, 2));
    await fs.writeFile(DATA_JS, replaced);
    return true;
  } catch {}
  return false;
}

(async () => {
  const imgMap = await findBestByZodiac();
  let items = await loadCatalog();
  if (!Array.isArray(items) || !items.length) process.exit(0);
  items = items.map(p => {
    const z = zKey(p);
    const img = z ? imgMap[z] : null;
    const images = img ? [img] : (Array.isArray(p.images) && p.images.length ? p.images : []);
    return { ...p, images };
  });
  await writeCatalog(items);
  console.log('Attached images to', items.length, 'products');
})();
