import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const ROUTE_MAP: Record<string, string> = {
  '/': 'index.html',
  '/shop': 'shop.html',
  '/cart': 'cart.html',
  '/checkout': 'checkout.html',
  '/contact': 'contact.html',
  '/contact-success': 'contact-success.html',
  '/compatibility': 'compatibility.html',
  '/oracle': 'oracle.html',
  '/codex': 'codex.html',
  '/success': 'success.html',
  '/privacy-policy': 'privacy-policy.html',
  '/terms-of-service': 'terms-of-service.html',
  '/refund-policy': 'refund-policy.html',
  '/product': 'product.html',
  '/curated-for-gifting': 'curated-for-gifting.html'
};

const STATIC_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf'
]);

function walk(dir: string, bucket: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, bucket);
    else bucket.push(full);
  }
  return bucket;
}

function loadDynamicShopSlugs(): Set<string> {
  const slugs = new Set<string>();
  const files = [
    path.join(ROOT, 'public/data/products.json'),
    path.join(ROOT, 'data/all-products.json'),
    path.join(ROOT, 'js/products.js')
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const jsonLike = file.endsWith('.json');
    if (jsonLike) {
      try {
        const parsed = JSON.parse(text);
        const visit = (value: any) => {
          if (!value) return;
          if (Array.isArray(value)) return value.forEach(visit);
          if (typeof value === 'object') {
            ['slug', 'id', 'link'].forEach((key) => {
              const raw = value[key];
              if (typeof raw === 'string') {
                const slug = raw.replace(/^\/shop\//, '').replace(/\.html$/, '').trim();
                if (slug && !slug.includes('/')) slugs.add(slug);
              }
            });
            Object.values(value).forEach(visit);
          }
        };
        visit(parsed);
      } catch {}
    } else {
      const matches = text.matchAll(/slug:\s*["']([^"']+)["']|id:\s*["']([^"']+)["']/g);
      for (const match of matches) {
        const slug = (match[1] || match[2] || '').trim();
        if (slug) slugs.add(slug);
      }
    }
  }
  return slugs;
}

function normalizeTarget(raw: string, sourceFile: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(trimmed)) return null;
  const [base] = trimmed.split('#');
  const [pathname] = base.split('?');
  if (!pathname) return null;
  if (pathname.startsWith('/')) return pathname;
  const rel = path.posix.normalize(path.posix.join(path.posix.dirname(path.relative(ROOT, sourceFile).replace(/\\/g, '/')), pathname));
  return `/${rel}`;
}

function targetExists(target: string, dynamicShopSlugs: Set<string>): boolean {
  const ext = path.extname(target);
  const relative = target.replace(/^\//, '');
  if (target in ROUTE_MAP) return fs.existsSync(path.join(ROOT, ROUTE_MAP[target]));
  if (STATIC_EXTENSIONS.has(ext)) return fs.existsSync(path.join(ROOT, relative));
  if (target.startsWith('/shop/')) {
    const slug = target.replace(/^\/shop\//, '').replace(/\.html$/, '');
    return fs.existsSync(path.join(ROOT, 'shop', `${slug}.html`)) || dynamicShopSlugs.has(slug);
  }
  if (target.startsWith('/oracle/') || target.startsWith('/compatibility/')) {
    return fs.existsSync(path.join(ROOT, `${relative}.html`)) || fs.existsSync(path.join(ROOT, relative));
  }
  return fs.existsSync(path.join(ROOT, `${relative}.html`)) || fs.existsSync(path.join(ROOT, relative));
}

test('all internal links resolve to a real file or supported dynamic route', async () => {
  const candidates = walk(ROOT).filter((file) => /\.(html|js|json)$/i.test(file));
  const dynamicShopSlugs = loadDynamicShopSlugs();
  const checked = new Set<string>();
  const broken: string[] = [];

  for (const file of candidates) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = [
      ...text.matchAll(/(?:href|src|action)\s*=\s*["']([^"']+)["']/g),
      ...text.matchAll(/["'](\/[^"'${}\s]+)["']/g)
    ];

    for (const match of matches) {
      const raw = match[1];
      const normalized = normalizeTarget(raw, file);
      if (!normalized) continue;
      const key = `${path.relative(ROOT, file)} -> ${normalized}`;
      if (checked.has(key)) continue;
      checked.add(key);
      if (!targetExists(normalized, dynamicShopSlugs)) {
        broken.push(key);
      }
    }
  }

  expect(broken, `Checked ${checked.size} internal targets`).toEqual([]);
});
