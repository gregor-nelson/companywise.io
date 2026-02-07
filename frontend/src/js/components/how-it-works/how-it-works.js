/* ============================================
   COMPANYWISE — how-it-works.js
   Self-initializing "How it Works" section component
   Matching Motorwise design system
   ============================================ */

(function() {
  'use strict';

  // ============================================================================
  // HOW IT WORKS COMPONENT
  // ============================================================================

  class HowItWorks {
    constructor(container) {
      this.container = container;
      this.hasAnimated = false;
      this.render();
      this.elements = this.queryElements();
    }

    // -------------------------------------------------------------------------
    // Render Component HTML
    // -------------------------------------------------------------------------

    render() {
      this.container.innerHTML = `
        <section id="how-it-works" class="hiw-section">
          <!-- Background Elements -->
          <div class="hiw-bg-pattern"></div>
          <div class="hiw-blur-accent hiw-blur-accent--left"></div>
          <div class="hiw-blur-accent hiw-blur-accent--right"></div>

          <div class="hiw-container">
            <!-- Section Header -->
            <div class="hiw-header">
              <div class="hiw-label fade-in-up">
                <i class="ph ph-steps"></i>
                <span>How it works</span>
              </div>
              <h2 class="hiw-title fade-in-up">Three steps. Zero jargon.</h2>
              <p class="hiw-subtitle fade-in-up">
                No sign-up forms, no pricing pages, no "contact sales" buttons. Just the answer you need before you send that quote.
              </p>
            </div>

            <!-- Steps Grid -->
            <div class="hiw-steps-grid">
              <!-- Step 1 -->
              <div class="hiw-step-card fade-in-up" data-step="1">
                <div class="hiw-step-card-inner">
                  <!-- Step Number Badge -->
                  <div class="hiw-step-number">
                    <span>01</span>
                  </div>

                  <!-- Icon Container -->
                  <div class="hiw-step-icon">
                    <div class="hiw-step-icon-bg"></div>
                    <i class="ph ph-magnifying-glass"></i>
                  </div>

                  <!-- Content -->
                  <div class="hiw-step-content">
                    <h3 class="hiw-step-title">Search the company</h3>
                    <p class="hiw-step-description">
                      Enter the name or Companies House number of your prospective client. We search 5+ million UK companies instantly.
                    </p>
                  </div>

                  <!-- Visual Element -->
                  <div class="hiw-step-visual">
                    <div class="hiw-search-preview">
                      <div class="hiw-search-bar">
                        <i class="ph ph-buildings"></i>
                        <span class="hiw-search-text">Acme Ltd...</span>
                        <div class="hiw-search-cursor"></div>
                      </div>
                      <div class="hiw-search-results">
                        <div class="hiw-search-result">
                          <span class="hiw-result-name">Acme Solutions Ltd</span>
                          <span class="hiw-result-number">12345678</span>
                        </div>
                        <div class="hiw-search-result">
                          <span class="hiw-result-name">Acme Digital Ltd</span>
                          <span class="hiw-result-number">87654321</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Connector Line (to next step) -->
                  <div class="hiw-connector" aria-hidden="true">
                    <svg viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0 10 Q50 10 100 10" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
                      <polygon points="95,5 100,10 95,15" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="hiw-step-card fade-in-up" data-step="2">
                <div class="hiw-step-card-inner">
                  <!-- Step Number Badge -->
                  <div class="hiw-step-number">
                    <span>02</span>
                  </div>

                  <!-- Icon Container -->
                  <div class="hiw-step-icon hiw-step-icon--amber">
                    <div class="hiw-step-icon-bg"></div>
                    <i class="ph ph-detective"></i>
                  </div>

                  <!-- Content -->
                  <div class="hiw-step-content">
                    <h3 class="hiw-step-title">Get the verdict</h3>
                    <p class="hiw-step-description">
                      We check 12 risk signals — overdue accounts, dissolved companies, CCJs, director history — and translate it into plain English.
                    </p>
                  </div>

                  <!-- Visual Element -->
                  <div class="hiw-step-visual">
                    <div class="hiw-analysis-preview">
                      <div class="hiw-signal-row">
                        <div class="hiw-signal hiw-signal--green">
                          <i class="ph-bold ph-check"></i>
                        </div>
                        <span>Accounts filed on time</span>
                      </div>
                      <div class="hiw-signal-row">
                        <div class="hiw-signal hiw-signal--amber">
                          <i class="ph-bold ph-warning"></i>
                        </div>
                        <span>Virtual office address</span>
                      </div>
                      <div class="hiw-signal-row">
                        <div class="hiw-signal hiw-signal--green">
                          <i class="ph-bold ph-check"></i>
                        </div>
                        <span>No CCJs on record</span>
                      </div>
                      <div class="hiw-progress-bar">
                        <div class="hiw-progress-fill" data-progress="75"></div>
                      </div>
                    </div>
                  </div>

                  <!-- Connector Line -->
                  <div class="hiw-connector" aria-hidden="true">
                    <svg viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0 10 Q50 10 100 10" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
                      <polygon points="95,5 100,10 95,15" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="hiw-step-card fade-in-up" data-step="3">
                <div class="hiw-step-card-inner">
                  <!-- Step Number Badge -->
                  <div class="hiw-step-number">
                    <span>03</span>
                  </div>

                  <!-- Icon Container -->
                  <div class="hiw-step-icon hiw-step-icon--emerald">
                    <div class="hiw-step-icon-bg"></div>
                    <i class="ph ph-shield-check"></i>
                  </div>

                  <!-- Content -->
                  <div class="hiw-step-content">
                    <h3 class="hiw-step-title">Decide with confidence</h3>
                    <p class="hiw-step-description">
                      Low, Medium, or High risk — with specific recommendations on payment terms. Know before you quote, not after you chase.
                    </p>
                  </div>

                  <!-- Visual Element -->
                  <div class="hiw-step-visual">
                    <div class="hiw-verdict-preview">
                      <div class="hiw-verdict-badge hiw-verdict-badge--low">
                        <i class="ph-fill ph-shield-check"></i>
                        <span>Low Risk</span>
                      </div>
                      <div class="hiw-verdict-rec">
                        <i class="ph ph-lightbulb"></i>
                        <span>Standard payment terms should be fine.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom CTA -->
            <div class="hiw-cta fade-in-up">
              <a href="#" class="hiw-cta-btn" onclick="document.getElementById('hero-search-input')?.focus(); window.scrollTo({top: 0, behavior: 'smooth'}); return false;">
                <i class="ph-bold ph-magnifying-glass"></i>
                <span>Try it now — it's free</span>
                <i class="ph ph-arrow-right"></i>
              </a>
            </div>
          </div>
        </section>
      `;
    }

    // -------------------------------------------------------------------------
    // DOM Queries
    // -------------------------------------------------------------------------

    queryElements() {
      return {
        blurAccents: [...this.container.querySelectorAll('.hiw-blur-accent')],
        stepCards: [...this.container.querySelectorAll('.hiw-step-card')],
        fadeElements: [...this.container.querySelectorAll('.fade-in-up')],
        progressBars: [...this.container.querySelectorAll('.hiw-progress-fill')],
        searchCursor: this.container.querySelector('.hiw-search-cursor'),
      };
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
        }, index * 100);
      });
    }

    animateProgressBars() {
      this.elements.progressBars.forEach((bar) => {
        const progress = bar.dataset.progress || 0;
        setTimeout(() => {
          bar.style.width = `${progress}%`;
        }, 800);
      });
    }

    animateSearchCursor() {
      const cursor = this.elements.searchCursor;
      if (!cursor) return;

      // Simple blink animation
      setInterval(() => {
        cursor.classList.toggle('blink');
      }, 530);
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

      setTimeout(() => {
        this.animateProgressBars();
        this.animateSearchCursor();
      }, 600);
    }
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  function initHowItWorks() {
    const container = document.querySelector('[data-component="how-it-works"]');
    if (!container) return null;

    const component = new HowItWorks(container);

    // Use IntersectionObserver to trigger animation when visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          component.start();
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(container);

    return component;
  }

  // Run on DOM ready
  let componentInstance = null;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      componentInstance = initHowItWorks();
    });
  } else {
    componentInstance = initHowItWorks();
  }

  // Expose for external use
  window.CompanyWiseHowItWorks = {
    HowItWorks,
    getInstance: () => componentInstance,
    init: initHowItWorks,
  };

})();
