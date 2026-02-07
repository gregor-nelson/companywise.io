/* ============================================
   COMPANYWISE — main.js
   Page-specific UI interactions (FAQ, scroll reveal, counters)
   Search & hero moved to hero.js
   ============================================ */

// ---- FAQ Module ----
const FAQ = {
  init() {
    document.querySelectorAll('.faq-item').forEach((item) => {
      const question = item.querySelector('.faq-question');
      question.addEventListener('click', () => {
        document.querySelectorAll('.faq-item.open').forEach((open) => {
          if (open !== item) open.classList.remove('open');
        });
        item.classList.toggle('open');
      });
    });
  },
};


// ---- Scroll Reveal Module ----
const ScrollReveal = {
  init() {
    const elements = document.querySelectorAll('.fade-up');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  },
};


// ---- Counter Animation ----
const CounterAnimation = {
  init() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animate(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  },

  animate(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  },
};


// ---- Init Everything ----
document.addEventListener('DOMContentLoaded', () => {
  // Init header
  const headerContainer = document.getElementById('header-container');
  if (headerContainer && window.CompanyWiseHeader) {
    window.CompanyWiseHeader.initHeader({ container: headerContainer });
  }

  // Init footer
  const footerContainer = document.getElementById('footer-container');
  if (footerContainer && window.CompanyWiseFooter) {
    window.CompanyWiseFooter.initFooter({ container: footerContainer });
  }

  // Hero is self-initializing via hero.js

  FAQ.init();
  ScrollReveal.init();
  CounterAnimation.init();
});