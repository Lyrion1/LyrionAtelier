window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

const CONTACT_ENDPOINT = '/.netlify/functions/contact';

function setStatus(statusEl, type, message) {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.remove('status-success', 'status-error');
  if (type) statusEl.classList.add(type === 'success' ? 'status-success' : 'status-error');
}

function validateFormFields(form) {
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  const reason = form.reason.value;
  if (!name) return { ok: false, error: 'Please share your name so we can greet you properly.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Add a valid email so we can reply.' };
  if (!reason) return { ok: false, error: 'Select a reason to guide your request.' };
  if (message.length < 10) return { ok: false, error: 'Your message needs a bit more detail (at least 10 characters).' };
  return { ok: true };
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  setStatus(statusEl, null, '');

  const validation = validateFormFields(form);
  if (!validation.ok) {
    setStatus(statusEl, 'error', validation.error);
    return;
  }

  const botField = form['bot-field']?.value || '';
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    subject: form.subject.value.trim(),
    reason: form.reason.value,
    message: form.message.value.trim(),
    'bot-field': botField,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
  }

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) {
      setStatus(statusEl, 'success', 'Message received. We’ll be in touch shortly.');
      form.classList.add('form-sent');
      form.reset();
    } else {
      const errorMessage = data.error || 'Something cosmic went awry. Please try again.';
      setStatus(statusEl, 'error', errorMessage);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || 'Send message';
      }
    }
  } catch (err) {
    setStatus(statusEl, 'error', 'Network stardust scattered. Please retry.');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || 'Send message';
    }
  }
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', handleSubmit);
}

function initEmbeds() {
  const cards = document.querySelectorAll('[data-embed]');
  cards.forEach((card) => {
    const iframe = card.querySelector('.social-embed');
    const fallback = card.querySelector('.embed-fallback');
    let loaded = false;

    if (fallback) {
      fallback.removeAttribute('hidden');
    }

    if (!iframe) {
      if (fallback) fallback.removeAttribute('hidden');
      return;
    }

    iframe.addEventListener('load', () => {
      loaded = true;
      card.classList.add('embed-loaded');
      if (fallback) fallback.setAttribute('hidden', '');
    });

    iframe.addEventListener('error', () => {
      loaded = false;
      card.classList.remove('embed-loaded');
      if (fallback) fallback.removeAttribute('hidden');
    });

    setTimeout(() => {
      if (!loaded && fallback) {
        fallback.removeAttribute('hidden');
      }
    }, 2400);
  });
}

function animateEntrances() {
  const animated = document.querySelectorAll('.fade-lift');
  requestAnimationFrame(() => {
    animated.forEach((el) => el.classList.add('is-visible'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateCartCount === 'function') {
    try { updateCartCount(); } catch (err) { console.error(err); }
  }
  animateEntrances();
  initContactForm();
  initEmbeds();
});
