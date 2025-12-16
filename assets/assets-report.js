async function loadIndex(){ try { const r = await fetch('/data/index.json',{cache:'no-store'}); return await r.json(); } catch { return []; } }
async function loadProd(s){ try { const r = await fetch('/data/products/'+s+'.json',{cache:'no-store'}); return await r.json(); } catch { return null; } }

async function exists(url){
  try { const r = await fetch(url, { method: 'HEAD', cache:'no-store' }); return r.ok; } catch { return false; }
}

function card(p, ok){
  const el = document.createElement('div'); el.className='card';
  const img = (p.images||[])[0] || '';
  el.innerHTML = `
    <div class="img">${ ok && img ? '<img src="'+img+'" alt="'+(p.title||'')+'">' : '<div style="color:#888">No image</div>' }</div>
    <div class="meta">
      <div style="font-weight:700">${p.title||''}</div>
      <div>${(p.collection||'').replace(/-/g,' ') } • ${p.subcategory||''}</div>
      <div style="margin-top:6px">
        <span class="badge ${ok?'ok':'miss'}">${ ok ? 'Image OK' : 'Missing image' }</span>
        ${ p.zodiac ? '<span class="badge">'+p.zodiac+'</span>' : '' }
        ${ p.element ? '<span class="badge">'+p.element+'</span>' : '' }
      </div>
    </div>`;
  return el;
}

async function init(){
  const root = document.getElementById('ar-list'); if (!root) return;
  const slugs = await loadIndex();
  const prods = (await Promise.all(slugs.map(loadProd))).filter(Boolean).filter(p => p.kind==='product');
  for (const p of prods){
    const img = (p.images||[])[0] || '';
    const ok = img ? await exists(img) : false;
    root.appendChild(card(p, ok));
  }
}
document.readyState !== 'loading' ? init() : document.addEventListener('DOMContentLoaded', init);
