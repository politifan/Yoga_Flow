document.addEventListener('DOMContentLoaded', () => {
  const revealables = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('reveal');
    });
  }, { threshold: 0.2 });
  revealables.forEach(el => io.observe(el));
});

