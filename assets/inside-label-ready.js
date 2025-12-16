(async function(){
 if (!/\/tools\/printful(?:\/|\.html)?$/.test(location.pathname)) return;
 try {
 const LABEL_URL = '/printful-files/brand/neck-label-3x4in.png';
 const LABEL_PATTERN = /neck-label-3x4in\.png$/;
 const res = await fetch(LABEL_URL, { method: 'HEAD', cache: 'no-store' });
 if (!res.ok) return;
 const apply = ()=>{
 // Flip badge text if present
 document.querySelectorAll('.pf-card .badges .badge').forEach(b=>{
 if (/Inside label/i.test(b.textContent)) { b.textContent = 'Inside label ready'; b.classList.remove('miss'); b.classList.add('ok'); }
 });
 // Add a download link into the first action row if missing
 document.querySelectorAll('.pf-card .pf-actions').forEach(actions=>{
 const row = actions.querySelector('.row');
 if (!row) return;
 if ([...row.querySelectorAll('a')].some(a=>LABEL_PATTERN.test(a.getAttribute('href')||''))) return;
 const a = document.createElement('a');
 a.textContent = 'Download inside label';
 a.href = LABEL_URL;
 a.setAttribute('download','');
 row.appendChild(a);
 });
 };
 apply();
 const list = document.getElementById('pf-list');
 if (list) { new MutationObserver(()=> apply()).observe(list, { childList:true }); }
 } catch(_) {}
})();
