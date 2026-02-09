/* ============================================
   COMPANYWISE — stats.js
   Self-initializing stats bar component
   Counters + scroll-triggered reveal
   ============================================ */

(function () {
  'use strict';

  // ---- Stats Data ----
  const STATS = [
    { value: 5300000, suffix: '+', label: 'UK companies indexed' },
    { value: null, text: 'Free', modifier: 'brand', label: 'No account needed' },
    { value: 12, suffix: ' flags', label: 'Risk signals checked' },
    { value: 3, suffix: 's', modifier: 'success', label: 'Average check time' },
  ];

  // ---- Component ----
  class Stats {
    constructor(container) {
      this.container = container;
      this.hasAnimated = false;
      this.render();
      this.items = [...this.container.querySelectorAll('.stats-item')];
      this.counters = [...this.container.querySelectorAll('[data-count]')];
    }

    render() {
      const itemsHtml = STATS.map((stat) => {
        const modClass = stat.modifier ? ` stats-value--${stat.modifier}` : '';
        const dataAttrs = stat.value != null
          ? ` data-count="${stat.value}"${stat.suffix ? ` data-suffix="${stat.suffix}"` : ''}`
          : '';
        const display = stat.text || '0';

        return `
          <div class="stats-item">
            <div class="stats-value${modClass}"${dataAttrs}>${display}</div>
            <p class="stats-label">${stat.label}</p>
          </div>
        `;
      }).join('');

      this.container.innerHTML = `
        <section id="stats" class="stats-section">
          <div class="stats-container">
            <div class="stats-grid">
              ${itemsHtml}
            </div>
          </div>
        </section>
      `;
    }

    // ---- Animations ----

    start() {
      if (this.hasAnimated) return;
      this.hasAnimated = true;

      // Staggered reveal
      this.items.forEach((item, i) => {
        setTimeout(() => {
          item.classList.add('visible');
        }, i * 100);
      });

      // Counter roll-up (delayed until items are visible)
      setTimeout(() => {
        this.counters.forEach((el) => this.animateCounter(el));
      }, 200);
    }

    animateCounter(el) {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();

      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.floor(eased * target);
        el.textContent = current.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    }
  }

  // ---- Auto-Initialisation ----

  function initStats() {
    const container = document.querySelector('[data-component="stats"]');
    if (!container) return null;

    const component = new Stats(container);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          component.start();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);
    return component;
  }

  let instance = null;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      instance = initStats();
    });
  } else {
    instance = initStats();
  }

  window.CompanyWiseStats = {
    Stats,
    getInstance: () => instance,
    init: initStats,
  };
})();
