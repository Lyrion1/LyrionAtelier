(async function(){
 if (!/\/tools\/printful\/?$/.test(location.pathname)) return;
 try {
 const res = await fetch('/printful-files/brand/neck-label-3x4in.png', { method: 'HEAD', cache: 'no-store' });
 const ok = res.ok;
 if (!ok) return;
 // Flip badge text if present
 document.querySelectorAll('.pf-card .badges .badge').forEach(b=>{
 if (/Inside label/i.test(b.textContent)) { b.textContent = 'Inside label Ready'; b.classList.remove('miss'); b.classList.add('ok'); }
 });
 // Add a download link into action rows if missing
 document.querySelectorAll('.pf-card .pf-actions .row').forEach(row=>{
 if (!row) return;
 if ([...row.querySelectorAll('a')].some(a=>/neck-label-3x4in\.png$/.test(a.getAttribute('href')||''))) return;
 const a = document.createElement('a'); a.textContent = 'Download inside label'; a.href='/printful-files/brand/neck-label-3x4in.png'; a.setAttribute('download','');
 row.appendChild(a);
 });
 } catch(_) {}
})();
