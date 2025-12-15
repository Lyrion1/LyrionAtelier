console.log('Oracle checkout script loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
 console.log('DOM loaded, attaching event listeners');
 
 // Get all book buttons
 const bookButtons = document.querySelectorAll('.book-reading-btn');
 console.log('Found', bookButtons.length, 'book buttons');
 
 // Add click handler to each button
 bookButtons.forEach(function(button) {
 button.addEventListener('click', async function(e) {
 e.preventDefault();
 console.log('Book button clicked');
 
 // Get product data from button attributes
 const productName = button.getAttribute('data-name');
 const productPrice = button.getAttribute('data-price');
 const productType = 'oracle_reading';
 
 console.log('Product:', productName, 'Price:', productPrice);
 
 // Validate data
 if (!productName || !productPrice) {
 console.error('Missing product data on button');
 alert('Error: Product information missing. Please refresh the page and try again.');
 return;
 }
 
 // Show loading state
 const originalText = button.textContent;
 button.textContent = 'Processing...';
 button.disabled = true;
 
 try {
 console.log('Calling create-checkout-session function...');
 
 // Call Netlify function to create checkout session
 const response = await fetch('/.netlify/functions/create-checkout-session', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 productName: productName,
 productPrice: parseFloat(productPrice),
 productType: productType
 })
 });
 
 console.log('Response status:', response.status);
 
 if (!response.ok) {
 const errorText = await response.text();
 console.error('Response not OK:', errorText);
 throw new Error('Server error: ' + response.status);
 }
 
 const data = await response.json();
 console.log('Response data:', data);
 
 if (data.error) {
 throw new Error(data.error);
 }
 
 if (!data.url) {
 throw new Error('No checkout URL received');
 }
 
 // Redirect to Stripe Checkout
 console.log('Redirecting to:', data.url);
 window.location.href = data.url;
 
 } catch (error) {
 console.error('Checkout error:', error);
 
 // Show user-friendly error
 alert('Unable to start checkout. Please try again or contact admin@lyrionatelier.com\n\nError: ' + error.message);
 
 // Restore button
 button.textContent = originalText;
 button.disabled = false;
 }
 });
 });
});
