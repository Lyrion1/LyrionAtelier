(function(){
const path = (location.pathname||'').toLowerCase();
const isEventish = path.startsWith('/codex') || path.startsWith('/events') || path.startsWith('/contact');
if (isEventish) return;
const isShop = path === '/shop' || path === '/shop/' || path.startsWith('/shop/index');
if (!isShop) return;

function ensureContainer(){
let root = document.getElementById('shop-grid');
if (root) return root;
const host = document.querySelector('main, #main, .main, .content, body') || document.body;
root = document.createElement('div');
root.id = 'shop-grid';
host.appendChild(root);
return root;
}
function ensureCSS(href){
try {
  const sheets = Array.from(document.styleSheets || []);
  if (sheets.some(s=>s.href && s.href.endsWith(href))) return;
} catch(err){
  console.debug('[shop auto-loader] stylesheet check skipped:', err?.message || err);
}
if (document.querySelector(`link[href="${href}"]`)) return;
const link = document.createElement('link');
link.rel='stylesheet';
link.href=href;
document.head.appendChild(link);
}
function ready(fn){
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}
ready(async ()=>{
ensureCSS('/assets/shop-grid.css');
ensureContainer();
try { await import('/assets/shop-filters.js'); await import('/assets/shop-grid.js'); } catch(e){ console.warn('[shop auto-loader] failed to load shop grid module (/assets/shop-grid.js):', e); }
window.__LYRION_SHOP_AUTOMOUNT = { active:true, mountedAt: new Date().toISOString() };
});
})();
