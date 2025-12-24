document.addEventListener('DOMContentLoaded', () => {
  const productImages = document.querySelectorAll('.product-card img');
  productImages.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && src.includes('_thumb.png')) {
      img.setAttribute('src', src.replace('_thumb.png', '.png'));
    }
  });

  const featuredImages = document.querySelectorAll('#featured-grid .product-card img');
  featuredImages.forEach((img, index) => {
    if (index < 4) {
      img.setAttribute('loading', 'eager');
    }
  });
});
