document.addEventListener('DOMContentLoaded', function() {
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
navToggle.addEventListener('click', function() {
navLinks.classList.toggle('active');
navToggle.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
link.addEventListener('click', function() {
navLinks.classList.remove('active');
navToggle.classList.remove('active');
});
});
}
});
