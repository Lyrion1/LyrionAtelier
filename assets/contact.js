window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

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

function encodeFormData(formData) {
  const params = new URLSearchParams();
  formData.forEach((value, key) => {
    params.append(key, value);
  });
  return params.toString();
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

  const formData = new FormData(form);
  formData.set('form-name', form.getAttribute('name') || 'contact');
  formData.set('pageUrl', window.location.href);
  formData.set('userAgent', navigator.userAgent);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
  }

  try {
    const response = await fetch(form.getAttribute('action') || '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeFormData(formData)
    });
    if (!response.ok) throw new Error('Network error');
    setStatus(statusEl, 'success', 'Message sent. We’ll reply to admin@lyrionatelier.com');
    form.classList.add('form-sent');
    form.reset();
  } catch (err) {
    setStatus(statusEl, 'error', 'Something cosmic went awry. Please try again.');
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
});
