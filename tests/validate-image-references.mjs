import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp|gif|svg|avif)(?:\.(?:png|jpe?g|webp|gif|svg|avif))*$/i;
const IMAGE_REF_RE = /(["'(])((?:\/|\.\/|\.\.\/)[^"'()\s>]+?\.(?:png|jpe?g|webp|gif|svg|avif)(?:\.(?:png|jpe?g|webp|gif|svg|avif))*)(?:[?#][^"'()\s>]*)?/gi;
const SCAN_EXTS = new Set(['.html', '.js']);

const refs = [];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function normalizeRef(sourceFile, ref) {
  if (/^https?:\/\//i.test(ref)) return null;
  const clean = ref.split('#')[0].split('?')[0];
  if (clean.startsWith('/')) return clean;
  const resolved = path.resolve(path.dirname(sourceFile), clean);
  const rel = `/${toPosix(path.relative(ROOT, resolved))}`;
  return rel.startsWith('/..') ? null : rel;
}

function collectJsonRefs(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  const walkValue = (value) => {
    if (typeof value === 'string') {
      const cleaned = value.split('#')[0].split('?')[0];
      if (IMAGE_EXT_RE.test(cleaned) && !/^https?:\/\//i.test(cleaned)) {
        const normalized = normalizeRef(file, cleaned);
        if (normalized) refs.push({ source: toPosix(path.relative(ROOT, file)), ref: normalized });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walkValue);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(walkValue);
    }
  };
  walkValue(data);
}

for (const file of walk(ROOT)) {
  const rel = toPosix(path.relative(ROOT, file));
  if (rel === 'tests/validate-image-references.mjs') continue;

  if (rel.endsWith('.json') && path.basename(rel).toLowerCase() === 'products.json') {
    collectJsonRefs(file);
    continue;
  }

  const ext = path.extname(file).toLowerCase();
  if (!SCAN_EXTS.has(ext)) continue;

  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = IMAGE_REF_RE.exec(content)) !== null) {
    const normalized = normalizeRef(file, match[2]);
    if (normalized) refs.push({ source: rel, ref: normalized });
  }
}

const deduped = new Map();
for (const item of refs) {
  const key = `${item.source}|${item.ref}`;
  if (!deduped.has(key)) deduped.set(key, item);
}

const checked = [...deduped.values()];
const missing = checked.filter(({ ref }) => {
  const abs = path.join(ROOT, ref.replace(/^\//, ''));
  return !fs.existsSync(abs);
});

console.log(`Image references checked: ${checked.length}`);
if (missing.length) {
  console.error(`Missing image references: ${missing.length}`);
  missing.forEach(({ source, ref }) => console.error(`- ${source} -> ${ref}`));
  process.exit(1);
}

console.log('All referenced local images exist.');
