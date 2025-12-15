// assets/crystal-fab-forwarder.js
(function(){
// Only on homepage
if (!/\/($|index\.html$)/.test(location.pathname)) return;

// Find the existing "Free Reading" floating trigger.
// We look for visible elements whose label/text matches and that are fixed or sticky.
const candidates = Array.from(document.querySelectorAll('a,button,[role="button"]'))
.filter(el => {
const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
if (!/free\s*reading/i.test(label)) return false;
const pos = getComputedStyle(el).position;
return pos === 'fixed' || pos === 'sticky';
});

const originalTrigger = candidates[0] || null;

// Build the new FAB
const fab = document.createElement('a');
fab.className = 'crystal-fab';
fab.setAttribute('aria-label', 'Free Reading');
fab.innerHTML = `<span class="icon" aria-hidden="true">🔮</span><span class="label">Free reading</span>`;
fab.href = originalTrigger ? '#' : '/oracle/free-reading';

fab.addEventListener('click', (e) => {
// Forward click to the original trigger so existing modal + Anthropic flow runs unchanged
if (originalTrigger) {
e.preventDefault();
originalTrigger.click();
}
});

document.body.appendChild(fab);

// Hide the original floating trigger to avoid duplicate UI (but keep it in DOM so its JS remains intact)
if (originalTrigger) {
originalTrigger.style.display = 'none';
}
})();
