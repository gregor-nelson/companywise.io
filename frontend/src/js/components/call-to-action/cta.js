/* ============================================
   COMPANYWISE — cta.js
   Self-initializing CTA section component
   Chevron background design (Motorwise pattern)
   ============================================ */

(function() {
  'use strict';

  // ============================================================================
  // CTA COMPONENT
  // ============================================================================

  class CTA {
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
        <!-- SVG Filter for Chevron Rounding -->
        <svg width="0" height="0" style="position: absolute; pointer-events: none;">
          <defs>
            <filter id="chevron-rounding-cta">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        <section id="cta" class="cta-section">
          <!-- Background Chevrons - Mobile (single chevron) -->
          <div class="cta-chevron-mobile">
            <div
              class="cta-chevron-shape"
              style="clip-path: polygon(0% 0%, 100% 0%, 100% calc(100% - 48px), 50% 100%, 0% calc(100% - 48px)); filter: url(#chevron-rounding-cta);"
            ></div>
          </div>

          <!-- Background Chevrons - Desktop (3 stacked, mirrored/right-aligned) -->
          <div class="cta-chevron-desktop" style="filter: url(#chevron-rounding-cta);">
            <!-- Tertiary chevron (12vw) -->
            <div
              class="cta-chevron cta-chevron--tertiary cta-chevron-animate"
              style="clip-path: polygon(60px 0%, 100% 0%, 100% 100%, 60px 100%, 0% 50%);"
            ></div>
            <!-- Secondary chevron (18vw) -->
            <div
              class="cta-chevron cta-chevron--secondary cta-chevron-animate"
              style="clip-path: polygon(80px 0%, 100% 0%, 100% 100%, 80px 100%, 0% 50%);"
            ></div>
            <!-- Primary chevron (55vw) -->
            <div
              class="cta-chevron cta-chevron--primary cta-chevron-animate"
              style="clip-path: polygon(80px 0%, 100% 0%, 100% 100%, 80px 100%, 0% 50%); border-radius: 0 24px 24px 0;"
            ></div>
          </div>

          <!-- Blur Accents -->
          <div class="cta-blur-accent cta-blur-accent--left"></div>
          <div class="cta-blur-accent cta-blur-accent--right"></div>

          <!-- Content Container -->
          <div class="cta-container">
            <!-- Two-Column Grid -->
            <div class="cta-grid">

              <!-- Left Column: Illustration Cards (desktop only) -->
              <div class="cta-illustration">
                <!-- Card Stack Container -->
                <div class="cta-card-stack">

                  <!-- Back Depth Card -->
                  <div class="cta-depth-card" aria-hidden="true"></div>

                  <!-- Anchor Card: Success Stats -->
                  <div class="cta-anchor-card fade-in-up" data-card="stats">
                    <!-- Header -->
                    <div class="cta-card-header">
                      <div class="cta-card-icon cta-card-icon--blue">
                        <i class="ph ph-chart-line-up"></i>
                      </div>
                      <div>
                        <p class="cta-card-title">Smart Decisions</p>
                        <p class="cta-card-subtitle">Powered by official data</p>
                      </div>
                      <span class="cta-card-badge cta-card-badge--emerald">Live</span>
                    </div>

                    <!-- Stats Bars -->
                    <div class="cta-stats-container">
                      <div class="cta-stat-row">
                        <span class="cta-stat-label">Companies indexed</span>
                        <div class="cta-stat-bar-bg">
                          <div class="cta-stat-bar cta-stat-bar--blue" data-width="95"></div>
                        </div>
                        <span class="cta-stat-value">5.3M+</span>
                      </div>
                      <div class="cta-stat-row">
                        <span class="cta-stat-label">Risk signals checked</span>
                        <div class="cta-stat-bar-bg">
                          <div class="cta-stat-bar cta-stat-bar--emerald" data-width="100"></div>
                        </div>
                        <span class="cta-stat-value">12</span>
                      </div>
                      <div class="cta-stat-row">
                        <span class="cta-stat-label">Avg. check time</span>
                        <div class="cta-stat-bar-bg">
                          <div class="cta-stat-bar cta-stat-bar--amber" data-width="30"></div>
                        </div>
                        <span class="cta-stat-value">3s</span>
                      </div>
                    </div>

                    <!-- Footer -->
                    <div class="cta-card-footer">
                      <div class="cta-footer-item">
                        <i class="ph ph-check-circle"></i>
                        <span>Updated monthly</span>
                      </div>
                      <div class="cta-footer-item">
                        <i class="ph ph-shield-check"></i>
                        <span>Official source</span>
                      </div>
                    </div>
                  </div>

                  <!-- Float Card: Risk Verdict (top-left) -->
                  <div class="cta-float-card cta-float-card--top fade-in-up" data-card="verdict">
                    <div class="cta-float-header">
                      <div class="cta-float-icon cta-float-icon--emerald">
                        <i class="ph ph-seal-check"></i>
                      </div>
                      <p class="cta-float-title">Low Risk</p>
                    </div>
                    <div class="cta-verdict-preview">
                      <div class="cta-verdict-ring">
                        <svg viewBox="0 0 36 36" class="cta-ring-svg">
                          <path
                            class="cta-ring-bg"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            class="cta-ring-fill cta-ring-fill--emerald"
                            stroke-dasharray="85, 100"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span class="cta-ring-score">85</span>
                      </div>
                      <div class="cta-verdict-text">
                        <p class="cta-verdict-label">Safe to proceed</p>
                        <p class="cta-verdict-desc">Standard terms OK</p>
                      </div>
                    </div>
                  </div>

                  <!-- Float Card: Quick Check (bottom-right) -->
                  <div class="cta-float-card cta-float-card--bottom fade-in-up" data-card="quick">
                    <!-- Badge -->
                    <div class="cta-quick-badge">
                      <i class="ph-fill ph-lightning"></i>
                      <span>Free</span>
                    </div>

                    <div class="cta-quick-content">
                      <div class="cta-quick-icon">
                        <i class="ph ph-magnifying-glass"></i>
                      </div>
                      <div class="cta-quick-text">
                        <p class="cta-quick-title">First check free</p>
                        <p class="cta-quick-desc">No account required</p>
                      </div>
                    </div>

                    <div class="cta-quick-footer">
                      <i class="ph ph-arrow-right"></i>
                      <span>Try it now</span>
                    </div>
                  </div>

                  <!-- Blur beneath stack -->
                  <div class="cta-stack-blur" aria-hidden="true"></div>
                </div>
              </div>

              <!-- Right Column: Content -->
              <div class="cta-content">
                <!-- Badge -->
                <div class="cta-badge fade-in-up">
                  <i class="ph ph-rocket-launch"></i>
                  <span>Get started</span>
                </div>

                <!-- Headline -->
                <h2 class="cta-title fade-in-up">
                  Check first.<br>Chase never.
                </h2>

                <!-- Description -->
                <p class="cta-description fade-in-up">
                  Stop guessing whether your client will pay. Know before you send the quote — it takes 3 seconds and your first check is <span class="cta-highlight">completely free</span>.
                </p>

                <!-- Trust Row -->
                <div class="cta-trust fade-in-up">
                  <div class="cta-trust-item">
                    <i class="ph ph-gift"></i>
                    <span>No credit card</span>
                  </div>
                  <div class="cta-trust-divider"></div>
                  <div class="cta-trust-item">
                    <i class="ph ph-user"></i>
                    <span>No account needed</span>
                  </div>
                  <div class="cta-trust-divider"></div>
                  <div class="cta-trust-item">
                    <i class="ph ph-timer"></i>
                    <span>Results in 3 seconds</span>
                  </div>
                </div>

                <!-- CTA Button -->
                <div class="cta-actions fade-in-up">
                  <a
                    href="#"
                    class="cta-button cta-button--primary"
                    onclick="document.getElementById('search-input').focus(); window.scrollTo({top: 0, behavior: 'smooth'}); return false;"
                  >
                    <i class="ph-bold ph-magnifying-glass"></i>
                    <span>Check a company now</span>
                    <i class="ph ph-arrow-right"></i>
                  </a>
                </div>

                <!-- Social Proof -->
                <div class="cta-proof fade-in-up">
                  <div class="cta-proof-avatars">
                    <div class="cta-avatar cta-avatar--1">
                      <i class="ph-fill ph-user"></i>
                    </div>
                    <div class="cta-avatar cta-avatar--2">
                      <i class="ph-fill ph-user"></i>
                    </div>
                    <div class="cta-avatar cta-avatar--3">
                      <i class="ph-fill ph-user"></i>
                    </div>
                  </div>
                  <p class="cta-proof-text">
                    Trusted by freelancers across the UK
                  </p>
                </div>
              </div>

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
        blurAccents: [...this.container.querySelectorAll('.cta-blur-accent')],
        fadeElements: [...this.container.querySelectorAll('.fade-in-up')],
        statBars: [...this.container.querySelectorAll('.cta-stat-bar')],
        chevrons: [...this.container.querySelectorAll('.cta-chevron-animate')],
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
        }, index * 80);
      });
    }

    animateStatBars() {
      this.elements.statBars.forEach((bar, index) => {
        const targetWidth = bar.dataset.width || 0;
        setTimeout(() => {
          bar.style.width = `${targetWidth}%`;
        }, 400 + index * 150);
      });
    }

    animateChevrons() {
      this.elements.chevrons.forEach((chevron, index) => {
        setTimeout(() => {
          chevron.classList.add('is-visible');
        }, index * 100);
      });
    }

    // -------------------------------------------------------------------------
    // Main Animation Trigger
    // -------------------------------------------------------------------------

    start() {
      if (this.hasAnimated) return;
      this.hasAnimated = true;

      // Sequence animations
      this.animateChevrons();
      this.animateBlurAccents();

      setTimeout(() => {
        this.animateFadeElements();
      }, 100);

      setTimeout(() => {
        this.animateStatBars();
      }, 300);
    }
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  function initCTA() {
    const container = document.querySelector('[data-component="cta"]');
    if (!container) return null;

    const component = new CTA(container);

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
      componentInstance = initCTA();
    });
  } else {
    componentInstance = initCTA();
  }

  // Expose for external use
  window.CompanyWiseCTA = {
    CTA,
    getInstance: () => componentInstance,
    init: initCTA,
  };

})();
