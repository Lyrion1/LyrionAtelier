async function loadIndex(){ try{ const r=await fetch('/data/index.json',{cache:'no-store'}); return await r.json(); } catch{ return []; } }
async function loadProd(slug){ try{ const r=await fetch('/data/products/'+slug+'.json',{cache:'no-store'}); return await r.json(); } catch{ return null; } }
function money(c){ return '$'+(Number(c||0)/100).toFixed(2); }

function card(p){
 const el = document.createElement('div'); el.className='pf-card';
 const img = (p.images||[])[0] || 'https://source.unsplash.com/600x600/?stars,night';
 const price = p.variants && p.variants[0] ? money(p.variants[0].price) : '$0.00';
 const wrist = p.brand_marks?.wrist_logo ? 'Wrist crest: ' + p.brand_marks.wrist_logo : 'Wrist crest: –';
 const back = p.brand_marks?.back_neck_favicon ? 'Back-neck sun: 1.25 in' : 'Back-neck sun: –';
 const inside= p.brand_marks?.inside_label ? 'Inside label: 3×4 in' : 'Inside label: –';

 el.innerHTML = `
 <div class="pf-img"><img alt="${p.title}" src="${img}"></div>
 <div class="pf-meta">
 <div class="pf-title">${p.title}</div>
 <div class="pf-sub">${(p.collection||'').replace(/-/g,' ') } • ${(p.subcategory||'')}</div>
 <div class="pf-badges">
 ${ p.zodiac ? '<span class="pf-badge">'+p.zodiac+'</span>' : '' }
 ${ p.element ? '<span class="pf-badge">'+p.element+'</span>' : '' }
 ${ p.palette ? '<span class="pf-badge">'+p.palette+'</span>' : '' }
 <span class="pf-badge">${p.edition||''}</span>
 <span class="pf-badge">${price}</span>
 </div>
 <div class="pf-rows">
 <div>${wrist}</div>
 <div>${back}</div>
 <div>${inside}</div>
 </div>
 </div>
 `;
 return el;
}

async function init(){
 const root = document.getElementById('pf-list'); if (!root) return;
 const slugs = await loadIndex();
 const items = (await Promise.all(slugs.map(loadProd))).filter(Boolean).filter(p=>p.kind==='product');
 items.forEach(p=> root.appendChild(card(p)));
}
document.readyState!=='loading'?init():document.addEventListener('DOMContentLoaded',init);
