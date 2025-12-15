// assets/crystal-fab.js
(function () {
// Only run on the homepage
if (!/\/($|index\.html$)/.test(location.pathname)) return;

// Remove any existing "Free Reading" floating button on the page
const candidates = Array.from(document.querySelectorAll('a,button'))
.filter(el => /free\s*reading/i.test(el.textContent || '') || /free-reading/i.test(el.id || el.className || ''));
candidates.forEach(el => el.remove());

// Insert the new FAB just before </body>
const fab = document.createElement('a');
fab.href = '/oracle/free-reading';
fab.className = 'crystal-fab';
fab.setAttribute('aria-label', 'Free Reading');
fab.innerHTML = `<span class="icon" aria-hidden="true">🔮</span><span class="label">Free reading</span>`;
document.body.appendChild(fab);
})();
