console.log('Oracle checkout script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing oracle checkout buttons');
  
  const bookButtons = document.querySelectorAll('.book-reading-btn');
  console.log('Found', bookButtons.length, 'book buttons');
  
  bookButtons.forEach(function(button) {
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const productName = button.getAttribute('data-name');
      const productPrice = button.getAttribute('data-price');
      
      console.log('Book button clicked:', productName);
      
      // Show loading state
      const originalText = button.textContent;
      button.textContent = 'Processing...';
      button.disabled = true;
      
      const success = await window.initiateCheckout({
        name: productName,
        price: productPrice,
        type: 'oracle_reading'
      });
      
      if (!success) {
        // Restore button if checkout failed
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  });
});
