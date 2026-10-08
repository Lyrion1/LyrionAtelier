const FORM_SUBMIT_TIMEOUT = 10000;

function setStatus(statusEl, type, message, subline) {
  if (!statusEl) return;
  statusEl.textContent = '';
  statusEl.classList.remove('status-success', 'status-error', 'is-visible');
  if (message) {
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    statusEl.appendChild(messageEl);
    if (subline) {
      const sublineEl = document.createElement('div');
      sublineEl.className = 'status-subline';
      sublineEl.textContent = subline;
      statusEl.appendChild(sublineEl);
    }
    statusEl.classList.add('is-visible');
  }
  if (type) statusEl.classList.add(type === 'success' ? 'status-success' : 'status-error');
}

function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    button.disabled = true;
    button.textContent = 'Sending...';
    button.classList.add('is-loading');
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Send message';
    button.classList.remove('is-loading');
  }
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

  setButtonLoading(submitBtn, true);
  const formData = new FormData(form);
  formData.set('form-name', form.getAttribute('name') || 'contact');
  formData.set('pageUrl', window.location.href);
  formData.set('userAgent', navigator.userAgent);

  const controller = new AbortController();
  let didTimeout = false;
  let shouldReset = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, FORM_SUBMIT_TIMEOUT);
  try {
    // The site is static, so messages go to the enquiry function, which
    // stores them and emails them to the owner with the sender as reply-to.
    const response = await fetch('https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'contact',
        name: formData.get('name') || '',
        email: formData.get('email') || '',
        subject: formData.get('reason') || formData.get('subject') || '',
        message: formData.get('message') || '',
        website: formData.get('bot-field') || ''
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Network response was not ok');
    setStatus(
      statusEl,
      'success',
      'Message sent. We’ll reply from admin@lyrionatelier.com.',
      'Check your inbox (and spam) for our reply.'
    );
    shouldReset = true;
  } catch (err) {
    shouldReset = false;
    setStatus(
      statusEl,
      'error',
      didTimeout ? 'The request timed out. Please try again.' : 'Something cosmic went awry. Please try again.'
    );
  } finally {
    clearTimeout(timeoutId);
    setButtonLoading(submitBtn, false);
    if (shouldReset) {
      form.reset();
    }
  }
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  // Links such as /contact?subject=Luxury%20Print%20certificate start the message for the customer.
  const subject = new URLSearchParams(location.search).get('subject');
  if (subject) {
    const reason = form.querySelector('#contact-reason');
    const message = form.querySelector('#contact-message');
    if (reason && /certificate/i.test(subject)) reason.value = 'Compatibility Certificate';
    if (message && !message.value) message.value = `Enquiry about the ${subject.slice(0, 80)}: `;
  }
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
