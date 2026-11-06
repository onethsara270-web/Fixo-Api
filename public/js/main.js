// Loading screen
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader')?.classList.add('done');
  }, 1200);
});

// Nav scroll
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// Scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Animated counters
document.querySelectorAll('[data-count]').forEach(el => {
  const cObs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    };
    requestAnimationFrame(tick);
    cObs.unobserve(el);
  }, { threshold: 0.5 });
  cObs.observe(el);
});

// MOBILE MENU TOGGLE
function toggleMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (!hamburger || !mobileMenu) return;

  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  
  if (mobileMenu.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// Close mobile menu when a link is clicked
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    toggleMobileMenu();
  });
});
