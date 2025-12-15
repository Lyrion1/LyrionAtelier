// /assets/success.js
(async function () {
 const el = document.getElementById('status');
 const params = new URLSearchParams(window.location.search);
 const id = params.get('session_id');

 if (!id) {
  el.innerHTML = `<h1>Missing session</h1><p>No payment session was provided.</p>`;
  return;
 }

 try {
  const res = await fetch(`/.netlify/functions/get-checkout-session?session_id=${encodeURIComponent(id)}`);
  const data = await res.json();

  if (data.error) {
   el.innerHTML = `<h1>Verification failed</h1><p>${data.error}</p>`;
   return;
  }

  const amount = (data.amount_total / 100).toFixed(2);
  const currency = (data.currency || 'usd').toUpperCase();

  if (data.payment_status === 'paid' || data.status === 'complete') {
   el.innerHTML = `
 <h1>Payment successful </h1>
 <p>We received <strong>${currency} ${amount}</strong>.</p>
 ${data.email ? `<p>Receipt sent to <strong>${data.email}</strong>.</p>` : ''}
 <p><a href="/">Return home</a></p>
 `;
  } else {
   el.innerHTML = `
 <h1>Payment not completed</h1>
 <p>Status: <strong>${data.payment_status || data.status}</strong></p>
 <p><a href="/cart">Return to checkout</a></p>
 `;
  }
 } catch (e) {
  el.innerHTML = `<h1>Network error</h1><p>Could not verify your payment.</p>`;
 }
})();
