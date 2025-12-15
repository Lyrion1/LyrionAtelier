// assets/crystal-fab-forwarder.js
(function(){
// Only on homepage
if (!/\/($|index\.html$)/.test(location.pathname)) return;

// Remove any previously injected FABs to avoid duplicates
document.querySelectorAll('.crystal-fab').forEach(el => el.remove());

// Helper: find the existing "Free Reading" trigger
function findTrigger(){
const nodes = Array.from(document.querySelectorAll('a,button,[role="button"]'));
const matches = nodes.filter(el => /free\s*reading/i.test((el.getAttribute('aria-label') || el.textContent || '').trim()));
if (!matches.length) return null;
// pick the one closest to bottom-right of the viewport
const vw = window.innerWidth, vh = window.innerHeight;
let best = null, bestDist = Infinity;
for (const el of matches){
const r = el.getBoundingClientRect();
const cx = r.left + r.width/2, cy = r.top + r.height/2;
const dist = Math.hypot(vw - cx, vh - cy);
if (dist < bestDist){ bestDist = dist; best = el; }
}
return best;
}

function attach(trigger){
// Hide original but keep it in DOM so its JS still runs
trigger.setAttribute('data-free-reading-original','true');
trigger.setAttribute('aria-hidden','true');
(trigger.style || (trigger.style = {})).cssText += ';opacity:0!important;pointer-events:none!important;width:0!important;height:0!important;';

// Add the new FAB that forwards clicks to the original
const fab = document.createElement('a');
fab.className = 'crystal-fab';
fab.href = '#'; // never navigate to another page
fab.setAttribute('aria-label','Free Reading');
fab.innerHTML = `<span class="icon" aria-hidden="true">🔮</span><span class="label">Free reading</span>`;
fab.addEventListener('click', (e) => { e.preventDefault(); trigger.click(); });
document.body.appendChild(fab);
}

// Wait up to 5s for frameworks to mount then attach
const start = Date.now();
const timer = setInterval(() => {
const t = findTrigger();
if (t){ clearInterval(timer); attach(t); }
else if (Date.now() - start > 5000){ clearInterval(timer); }
}, 150);
})();
