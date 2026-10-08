/*
 * Written enquiry forms (Partners page, contact page). Posts to the enquiry
 * function, which stores the message and emails it to the owner.
 */
(function () {
  'use strict';
  function bind(form) {
    var status = form.querySelector('[data-enquiry-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v); });
      data.kind = form.dataset.enquiry;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.textContent = 'Sending…';
      fetch(window.LyrionHouse.FUNCTIONS + '/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || 'Your message could not be sent.'); return d; }); })
        .then(function () { form.reset(); status.textContent = 'Thank you. Your message has reached us and we will reply by email.'; })
        .catch(function (err) { status.textContent = err.message + ' You can also write to admin@lyrionatelier.com.'; })
        .then(function () { btn.disabled = false; });
    });
  }
  function start() { document.querySelectorAll('form[data-enquiry]').forEach(bind); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
