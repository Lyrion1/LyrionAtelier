document.addEventListener('DOMContentLoaded', function() {
  const hamburger =
    document.querySelector('.hamburger') ||
    document.querySelector('.menu-toggle') ||
    document.querySelector('#menu-toggle') ||
    document.querySelector('.nav-toggle');
  const mobileNav =
    document.querySelector('.mobile-nav') ||
    document.querySelector('#mobile-menu') ||
    document.querySelector('.nav-links');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      mobileNav.classList.toggle('active');
      hamburger.classList.toggle('active');
    });

    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
        hamburger.classList.remove('active');
      });
    });
  }
});
