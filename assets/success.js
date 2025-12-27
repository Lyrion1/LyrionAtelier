// /assets/success.js
(async function () {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  if (!sessionId) {
    showMissingSessionSuccess();
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-session?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      showGenericSuccess();
      return;
    }

    displayOrderDetails(data);
  } catch (error) {
    console.error('Error fetching session:', error);
    showGenericSuccess();
  }

  function displayOrderDetails(session) {
    const amount = typeof session.amount_total === 'number'
      ? (session.amount_total / 100).toFixed(2)
      : null;
    const currency = (session.currency || 'usd').toUpperCase();
    const email = session.customer_details?.email || session.customer?.email;
    const el = document.getElementById('status');

    el.innerHTML = `
      <h1 style="color: #d4af37;">Order Confirmed!</h1>
      <p>Thank you for your order.${amount ? ` We received <strong>${currency} ${amount}</strong>.` : ''}</p>
      ${email ? `<p>A confirmation email has been sent to <strong>${email}</strong>.</p>` : '<p>Check your email for order details.</p>'}
      <a href="/shop">Continue Shopping</a>
    `;
  }

  function showMissingSessionSuccess() {
    document.body.innerHTML = `
 <div style="max-width: 600px; margin: 100px auto; text-align: center; padding: 40px;">
 <h1 style="color: #d4af37; font-size: 3rem; margin-bottom: 20px;"> Order Confirmed!</h1>
 <p style="font-size: 1.2rem; margin-bottom: 30px;">Thank you for your order. You'll receive a confirmation email shortly with all the details.</p>
 <a href="/shop" style="display: inline-block; background: #d4af37; color: #0f0c29; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Continue Shopping</a>
 </div>
 `;
  }

  function showGenericSuccess() {
    document.body.innerHTML = `
 <div style="max-width: 600px; margin: 100px auto; text-align: center; padding: 40px;">
 <h1 style="color: #d4af37;"> Order Confirmed!</h1>
 <p>Check your email for order details.</p>
 <a href="/shop">Continue Shopping</a>
 </div>
 `;
  }
})();
