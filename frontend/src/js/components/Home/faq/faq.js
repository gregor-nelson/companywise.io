/* ============================================
   COMPANYWISE — faq.js
   Self-initializing FAQ section component
   Matching Motorwise design system
   ============================================ */

(function() {
  'use strict';

  // ============================================================================
  // FAQ DATA
  // ============================================================================

  const FAQ_ITEMS = [
    {
      id: 'data-source',
      question: 'Where does the data come from?',
      answer: 'Everything comes from Companies House — the UK\'s official company register. It\'s the same data used by banks, credit agencies, and accountants. We download the full register monthly and supplement it with real-time API lookups.',
      icon: 'ph-database',
    },
    {
      id: 'accuracy',
      question: 'How accurate is the risk verdict?',
      answer: 'We check 12 publicly available risk signals and weight them based on how strongly they correlate with payment problems. This isn\'t a credit score — it\'s a practical assessment designed to help freelancers make informed decisions.',
      icon: 'ph-target',
    },
    {
      id: 'free-check',
      question: 'Is the first check really free?',
      answer: 'Yes. No account needed, no email address, no credit card. Your first company check is completely free and shows the full verdict with all flags and recommendations.',
      icon: 'ph-gift',
    },
    {
      id: 'credits-expire',
      question: 'Do credits expire?',
      answer: 'No. Credits never expire. Buy them when you need them, use them whenever. There\'s no subscription, no auto-renew, and no "use it or lose it" pressure.',
      icon: 'ph-calendar-check',
    },
    {
      id: 'vs-creditsafe',
      question: 'What\'s the difference between this and Creditsafe?',
      answer: 'Those tools are built for credit managers at large companies — they cost hundreds per month, require sales calls, and present data in formats that need financial literacy. We use the same underlying public data but translate it into plain English verdicts with specific recommendations.',
      icon: 'ph-scales',
    },
    {
      id: 'any-company',
      question: 'Can I check any UK company?',
      answer: 'You can check any of the 5+ million companies on the Companies House register. This includes active, dissolved, and those being struck off. Sole traders and partnerships aren\'t covered as they aren\'t on Companies House.',
      icon: 'ph-buildings',
    },
  ];

  // ============================================================================
  // FAQ COMPONENT
  // ============================================================================

  class FAQ {
    constructor(container) {
      this.container = container;
      this.hasAnimated = false;
      this.expandedId = null;
      this.render();
      this.elements = this.queryElements();
      this.bindEvents();
    }

    // -------------------------------------------------------------------------
    // Render Component HTML
    // -------------------------------------------------------------------------

    render() {
      this.container.innerHTML = `
        <section id="faq" class="faq-section">
          <!-- Background Elements -->
          <div class="faq-bg-pattern"></div>
          <div class="faq-blur-accent faq-blur-accent--left"></div>
          <div class="faq-blur-accent faq-blur-accent--right"></div>

          <div class="faq-container">
            <!-- Section Header -->
            <div class="faq-header">
              <div class="faq-label fade-in-up">
                <i class="ph ph-question"></i>
                <span>FAQ</span>
              </div>
              <h2 class="faq-title fade-in-up">Common questions</h2>
              <p class="faq-subtitle fade-in-up">
                Everything you need to know about checking companies before you work with them.
              </p>
            </div>

            <!-- FAQ List -->
            <div class="faq-list">
              ${FAQ_ITEMS.map((item, index) => this.renderItem(item, index)).join('')}
            </div>

            <!-- Bottom CTA -->
            <div class="faq-cta fade-in-up">
              <div class="faq-cta-card">
                <div class="faq-cta-icon">
                  <i class="ph ph-chat-circle-text"></i>
                </div>
                <div class="faq-cta-content">
                  <h4 class="faq-cta-title">Still have questions?</h4>
                  <p class="faq-cta-desc">We're here to help. Get in touch and we'll get back to you as soon as possible.</p>
                </div>
                <a href="mailto:hello@companywise.co.uk" class="faq-cta-btn">
                  <i class="ph ph-envelope"></i>
                  <span>Contact us</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    renderItem(item, index) {
      return `
        <div class="faq-item fade-in-up" data-faq-item="${item.id}" style="transition-delay: ${index * 60}ms;">
          <button class="faq-question" data-faq-toggle="${item.id}">
            <div class="faq-question-icon">
              <i class="ph ${item.icon}"></i>
            </div>
            <span class="faq-question-text">${item.question}</span>
            <div class="faq-question-chevron">
              <i class="ph ph-caret-down"></i>
            </div>
          </button>
          <div class="faq-answer" data-faq-answer="${item.id}">
            <div class="faq-answer-content">
              <p>${item.answer}</p>
            </div>
          </div>
        </div>
      `;
    }

    // -------------------------------------------------------------------------
    // DOM Queries
    // -------------------------------------------------------------------------

    queryElements() {
      return {
        blurAccents: [...this.container.querySelectorAll('.faq-blur-accent')],
        fadeElements: [...this.container.querySelectorAll('.fade-in-up')],
        faqItems: [...this.container.querySelectorAll('.faq-item')],
      };
    }

    // -------------------------------------------------------------------------
    // Event Binding
    // -------------------------------------------------------------------------

    bindEvents() {
      // Delegation for accordion toggles
      this.container.addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-faq-toggle]');
        if (toggle) {
          this.toggleItem(toggle.dataset.faqToggle);
        }
      });

      // Keyboard accessibility
      this.container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const toggle = e.target.closest('[data-faq-toggle]');
          if (toggle) {
            e.preventDefault();
            this.toggleItem(toggle.dataset.faqToggle);
          }
        }
      });
    }

    // -------------------------------------------------------------------------
    // Accordion Logic
    // -------------------------------------------------------------------------

    toggleItem(id) {
      const isExpanding = this.expandedId !== id;
      const previousId = this.expandedId;

      // Close previously expanded item
      if (previousId && previousId !== id) {
        this.setItemState(previousId, false);
      }

      // Toggle current item
      this.setItemState(id, isExpanding);
      this.expandedId = isExpanding ? id : null;
    }

    setItemState(id, isOpen) {
      const item = this.container.querySelector(`[data-faq-item="${id}"]`);
      if (!item) return;

      const answer = item.querySelector(`[data-faq-answer="${id}"]`);
      const chevron = item.querySelector('.faq-question-chevron');
      const icon = item.querySelector('.faq-question-icon');

      // Toggle classes
      item.classList.toggle('is-expanded', isOpen);

      if (answer) {
        if (isOpen) {
          answer.style.maxHeight = answer.scrollHeight + 'px';
          answer.style.opacity = '1';
        } else {
          answer.style.maxHeight = '0';
          answer.style.opacity = '0';
        }
      }

      if (chevron) {
        chevron.classList.toggle('is-rotated', isOpen);
      }

      if (icon) {
        icon.classList.toggle('is-active', isOpen);
      }
    }

    // -------------------------------------------------------------------------
    // Animations
    // -------------------------------------------------------------------------

    animateBlurAccents() {
      this.elements.blurAccents.forEach((accent, index) => {
        setTimeout(() => {
          accent.classList.add('is-visible');
        }, index * 150);
      });
    }

    animateFadeElements() {
      this.elements.fadeElements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add('is-visible');
        }, index * 60);
      });
    }

    // -------------------------------------------------------------------------
    // Main Animation Trigger
    // -------------------------------------------------------------------------

    start() {
      if (this.hasAnimated) return;
      this.hasAnimated = true;

      // Sequence animations
      this.animateBlurAccents();

      setTimeout(() => {
        this.animateFadeElements();
      }, 100);
    }
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  function initFAQ() {
    const container = document.querySelector('[data-component="faq"]');
    if (!container) return null;

    const component = new FAQ(container);

    // Use IntersectionObserver to trigger animation when visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          component.start();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return component;
  }

  // Run on DOM ready
  let componentInstance = null;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      componentInstance = initFAQ();
    });
  } else {
    componentInstance = initFAQ();
  }

  // Expose for external use
  window.CompanyWiseFAQ = {
    FAQ,
    getInstance: () => componentInstance,
    init: initFAQ,
  };

})();
