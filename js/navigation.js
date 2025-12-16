document.addEventListener('DOMContentLoaded', function() {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navAnchors = document.querySelectorAll('.nav-links a');

  if (navToggle && navLinks && !navToggle.hasAttribute('onclick')) {
    navToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      navToggle.classList.toggle('active');
    });
  }

  if (navAnchors.length > 0) {
    navAnchors.forEach(link => {
      link.addEventListener('click', function() {
        navLinks?.classList.remove('active');
        navToggle?.classList.remove('active');
      });
    });
  }
});
