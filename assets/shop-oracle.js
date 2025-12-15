// assets/shop-oracle.js
(function(){
 const $ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

 // SHOP: hide reading cards if any accidentally appear
 const shopGrid = document.getElementById('shopGrid');
 if (shopGrid){
 $('.card', shopGrid).forEach(el => {
 const isReading = el.dataset.kind === 'reading' || /oracle reading/i.test(el.textContent);
 if (isReading) el.remove();
 });
 }

 // ORACLE: ensure images + badge; basic fallback image
 const oracleGrid = document.getElementById('oracleGrid');
 if (oracleGrid){
 $('.card', oracleGrid).forEach(el => {
 // Ensure badge
 if (!el.querySelector('.card__badge')){
 const b = document.createElement('div');
 b.className = 'card__badge';
 b.textContent = 'Oracle reading';
 const im = el.querySelector('.card__image') || el;
 im.appendChild(b);
 }
 // Ensure image
 let img = el.querySelector('.card__image img');
 if (!img){
 const wrap = el.querySelector('.card__image') || el.insertBefore(document.createElement('div'), el.firstChild);
 wrap.classList.add('card__image');
 img = document.createElement('img');
 wrap.appendChild(img);
 }
 const title = (el.querySelector('.card__title')?.textContent || el.getAttribute('data-title') || 'astrology').trim();
 const fallback = `https://source.unsplash.com/600x400/?astrology,stars,${encodeURIComponent(title)}`;
 const dataImg = el.dataset.image || img.getAttribute('data-src') || '';
 const hasSrcAttr = (img.getAttribute('src') || '').trim();
 if (!hasSrcAttr){ img.src = dataImg || fallback; }
 img.loading = 'lazy'; img.decoding = 'async';
 img.onerror = () => { img.onerror = null; img.src = fallback; };
 });
 }
})();
