async function loadIndex(){ try{ const r=await fetch('/data/index.json',{cache:'no-store'}); return await r.json(); } catch{ return []; } }
async function loadProd(slug){ try{ const r=await fetch('/data/products/'+slug+'.json',{cache:'no-store'}); return await r.json(); } catch{ return null; } }

async function exists(url){
 try{ const r = await fetch(url, { method:'HEAD', cache:'no-store' }); return r.ok; } catch { return false; }
}
function money(c){ return '$'+(Number(c||0)/100).toFixed(2); }
function esc(x){ return (x||'').replace(/"/g,'\\"'); }
function b(label, href){ const a=document.createElement('a'); a.textContent=label; a.href=href; a.target='_blank'; return a; }
function copyBtn(label, getText){
 const btn=document.createElement('button'); btn.textContent=label;
 btn.addEventListener('click', async ()=>{
 const text = getText();
 try{ await navigator.clipboard.writeText(text); btn.textContent='Copied!'; setTimeout(()=> btn.textContent=label, 1000); }
 catch{ alert('Copy failed'); }
 });
 return btn;
}

async function card(p){
 const el = document.createElement('div'); el.className='pf-card';
 const img = (p.images||[])[0] || '';
 const price = p.variants && p.variants[0] ? money(p.variants[0].price) : '$0.00';

 // Check files
 const frontOK = img ? await exists(img) : false;
 const backOK = await exists('/printful-files/brand/sun-1_25in.png');
 const wristAdult = await exists('/printful-files/brand/logo-adult-1_2in.png');
 const wristYouth = await exists('/printful-files/brand/logo-youth-1_2in.png');
 const needsYouth = p.brand_marks?.wrist_logo === 'youth';
 const wristOK = needsYouth ? wristYouth : wristAdult;

 el.innerHTML = `
 <div class="pf-img">${ img ? '<img alt="'+esc(p.title)+'" src="'+img+'">' : '<div style="padding:24px;color:#999">No art image</div>' }</div>
 <div class="pf-meta">
 <div class="pf-title">${p.title}</div>
 <div class="pf-sub">${(p.collection||'').replace(/-/g,' ')} • ${(p.subcategory||'')}</div>
 <div class="pf-badges">
 ${ p.zodiac ? '<span class="pf-badge">'+p.zodiac+'</span>' : '' }
 ${ p.element ? '<span class="pf-badge">'+p.element+'</span>' : '' }
 ${ p.palette ? '<span class="pf-badge">'+p.palette+'</span>' : '' }
 <span class="pf-badge">${p.edition||''}</span>
 <span class="pf-badge">${price}</span>
 </div>
 <div class="badges">
 <span class="badge ${frontOK?'ok':'miss'}">Front art ${frontOK?'OK':'Missing'}</span>
 <span class="badge ${backOK?'ok':'miss'}">Back-neck sun</span>
 <span class="badge ${wristOK?'ok':'miss'}">Wrist crest ${needsYouth?'(youth)':''}</span>
 <span class="badge ${p.brand_marks?.inside_label?'ok':'miss'}">Inside label ${p.brand_marks?.inside_label?'Yes':'—'}</span>
 </div>
 <div class="pf-actions">
 <div class="row">
 ${ img ? '<a download href="'+img+'">Download front art</a>' : '' }
 <a download href="/printful-files/brand/sun-1_25in.png">Download back-neck sun</a>
 <a download href="/printful-files/brand/${needsYouth?'logo-youth-1_2in.png':'logo-adult-1_2in.png'}">Download wrist crest</a>
 </div>
 <div class="copyfield copy-name">
 <input readonly value="${p.title}">
 </div>
 <div class="copyfield copy-desc">
 <input readonly value="${p.copy?.notes||''}">
 </div>
 <div class="row">
 ${ b('Open Printful → Add product','https://www.printful.com/dashboard/store').outerHTML }
 </div>
 </div>
 </div>
 `;
 const nameField = el.querySelector('.copyfield.copy-name');
 if (nameField) nameField.appendChild(copyBtn('Copy name', ()=> p.title));
 const descField = el.querySelector('.copyfield.copy-desc');
 if (descField) descField.appendChild(copyBtn('Copy description', ()=> p.copy?.notes || ''));
 return el;
}

async function init(){
 const root = document.getElementById('pf-list'); if (!root) return;
 const slugs = await loadIndex();
 const items = (await Promise.all(slugs.map(loadProd))).filter(Boolean).filter(p=>p.kind==='product');
 // Sort: Signature first, then Core, then Limited, within each by title
 const rank = e => e==='signature'?0 : e==='core'?1 : e==='limited'?2 : 3;
 items.sort((a,b)=> rank(a.edition)-rank(b.edition) || (a.title||'').localeCompare(b.title||''));

 // Render
 for (const p of items){ root.appendChild(await card(p)); }
}
document.readyState!=='loading'?init():document.addEventListener('DOMContentLoaded',init);
