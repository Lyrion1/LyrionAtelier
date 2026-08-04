import { ZS } from '../shared/zodiac.mjs';

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  ctrl.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return ctrl.signal;
}

export async function loadCatalog(){
  const sources = [];
  // a) Supabase catalog function
  try {
    const r = await fetch('https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/printful-sync', { method:'GET', signal: withTimeout(5000) });
    if (r.ok) sources.push(await r.json());
  } catch {}
  // b) Local JSON seed (if present)
  try {
    const r = await fetch('/data/all-products.json', { cache: 'no-cache', signal: withTimeout(5000) });
    if (r.ok) sources.push(await r.json());
  } catch {}
  // c) Globals exposed by Copilot fix
  const g1 = window?.LyrionAtelier?.products;
  const g2 = window?.products;
  if (Array.isArray(g1)) sources.push(g1);
  if (Array.isArray(g2)) sources.push(g2);
  const list = (sources.find(Array.isArray) || []).filter(Boolean);
  // images map
  let imgMap = {};
  const mapCandidates = ['/data/images-map.json', '/public/data/images-map.json'];
  for (const url of mapCandidates) {
    try {
      const r = await fetch(url, { cache: 'no-cache', signal: withTimeout(5000) });
      if (r.ok) { imgMap = await r.json(); break; }
    } catch {}
  }
  const zKey = (t='') => {
    const s = String(t).toLowerCase();
    return ZS.find(z => s.includes(z)) || null;
  };
  // sanitize + attach images + default state
  return list.map(p => {
    const state = { published: true, ready: true, ...(p?.state||{}) };
    let images = Array.isArray(p?.images) && p.images.length ? p.images : [];
    if (!images.length){
      const z = zKey(p?.metadata?.zodiac || p?.title);
      if (z && imgMap[z]) images = [imgMap[z]];
    }
    return { ...p, state, images };
  });
}
