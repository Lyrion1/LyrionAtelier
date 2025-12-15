// /assets/test-checkout.js
document.getElementById('testCheckoutBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/.netlify/functions/create-test-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: window.location.origin })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    window.location = data.url; // Redirect to Stripe Checkout
  } catch (e) {
    alert('Network error starting checkout.');
  }
});
