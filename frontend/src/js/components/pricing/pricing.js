/* ============================================
   COMPANYWISE — pricing.js
   Self-initializing Pricing section component
   Matching Motorwise design system
   ============================================ */

(function() {
  'use strict';

  // ============================================================================
  // PRICING COMPONENT
  // ============================================================================

  class Pricing {
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
        <section id="pricing" class="prc-section">
          <!-- Background Elements -->
          <div class="prc-bg-pattern"></div>
          <div class="prc-blur-accent prc-blur-accent--left"></div>
          <div class="prc-blur-accent prc-blur-accent--right"></div>

          <div class="prc-container">
            <!-- Section Header -->
            <div class="prc-header">
              <div class="prc-label fade-in-up">
                <i class="ph ph-coins"></i>
                <span>Pricing</span>
              </div>
              <h2 class="prc-title fade-in-up">Pay per check. No subscriptions.</h2>
              <p class="prc-subtitle fade-in-up">
                Your first check is free, no account needed. After that, buy credit packs. Credits never expire. No auto-renew.
              </p>
            </div>

            <!-- Pricing Cards Grid -->
            <div class="prc-cards-grid">
              <!-- Free Tier -->
              <div class="prc-card fade-in-up" data-tier="free">
                <div class="prc-card-inner">
                  <!-- Tier Icon -->
                  <div class="prc-tier-icon">
                    <div class="prc-tier-icon-bg"></div>
                    <i class="ph ph-gift"></i>
                  </div>

                  <!-- Tier Info -->
                  <div class="prc-tier-name">Free</div>
                  <div class="prc-tier-credits">3 checks / month</div>

                  <!-- Price -->
                  <div class="prc-price">
                    <span class="prc-price-amount">£0</span>
                  </div>
                  <div class="prc-per-check">No account for first check</div>

                  <!-- Features -->
                  <ul class="prc-features">
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Full risk analysis</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Plain English verdict</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Payment recommendations</span>
                    </li>
                  </ul>

                  <!-- CTA -->
                  <a href="#" class="prc-cta prc-cta--secondary" onclick="document.getElementById('hero-search-input')?.focus(); window.scrollTo({top: 0, behavior: 'smooth'}); return false;">
                    <span>Start checking</span>
                    <i class="ph ph-arrow-right"></i>
                  </a>
                </div>
              </div>

              <!-- Starter -->
              <div class="prc-card fade-in-up" data-tier="starter">
                <div class="prc-card-inner">
                  <!-- Tier Icon -->
                  <div class="prc-tier-icon prc-tier-icon--blue">
                    <div class="prc-tier-icon-bg"></div>
                    <i class="ph ph-rocket-launch"></i>
                  </div>

                  <!-- Tier Info -->
                  <div class="prc-tier-name">Starter</div>
                  <div class="prc-tier-credits">10 credits</div>

                  <!-- Price -->
                  <div class="prc-price">
                    <span class="prc-price-amount">£5</span>
                    <span class="prc-price-term">one-off</span>
                  </div>
                  <div class="prc-per-check">£0.50 per check</div>

                  <!-- Features -->
                  <ul class="prc-features">
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Everything in Free</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Credits never expire</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Check history saved</span>
                    </li>
                  </ul>

                  <!-- CTA -->
                  <a href="#" class="prc-cta prc-cta--secondary">
                    <span>Buy credits</span>
                    <i class="ph ph-arrow-right"></i>
                  </a>
                </div>
              </div>

              <!-- Standard (Featured) -->
              <div class="prc-card prc-card--featured fade-in-up" data-tier="standard">
                <div class="prc-card-inner">
                  <!-- Popular Badge -->
                  <div class="prc-badge">Most popular</div>

                  <!-- Tier Icon -->
                  <div class="prc-tier-icon prc-tier-icon--emerald">
                    <div class="prc-tier-icon-bg"></div>
                    <i class="ph ph-star"></i>
                  </div>

                  <!-- Tier Info -->
                  <div class="prc-tier-name">Standard</div>
                  <div class="prc-tier-credits">25 credits</div>

                  <!-- Price -->
                  <div class="prc-price">
                    <span class="prc-price-amount">£10</span>
                    <span class="prc-price-term">one-off</span>
                  </div>
                  <div class="prc-per-check prc-per-check--highlight">£0.40 per check</div>

                  <!-- Savings Badge -->
                  <div class="prc-savings">
                    <i class="ph ph-tag"></i>
                    <span>Save 20%</span>
                  </div>

                  <!-- Features -->
                  <ul class="prc-features">
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Everything in Starter</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Best value per check</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Priority support</span>
                    </li>
                  </ul>

                  <!-- CTA -->
                  <a href="#" class="prc-cta prc-cta--primary">
                    <span>Buy credits</span>
                    <i class="ph ph-arrow-right"></i>
                  </a>
                </div>
              </div>

              <!-- Pro -->
              <div class="prc-card fade-in-up" data-tier="pro">
                <div class="prc-card-inner">
                  <!-- Tier Icon -->
                  <div class="prc-tier-icon prc-tier-icon--amber">
                    <div class="prc-tier-icon-bg"></div>
                    <i class="ph ph-crown"></i>
                  </div>

                  <!-- Tier Info -->
                  <div class="prc-tier-name">Pro</div>
                  <div class="prc-tier-credits">60 credits</div>

                  <!-- Price -->
                  <div class="prc-price">
                    <span class="prc-price-amount">£20</span>
                    <span class="prc-price-term">one-off</span>
                  </div>
                  <div class="prc-per-check">£0.33 per check</div>

                  <!-- Savings Badge -->
                  <div class="prc-savings prc-savings--amber">
                    <i class="ph ph-tag"></i>
                    <span>Save 34%</span>
                  </div>

                  <!-- Features -->
                  <ul class="prc-features">
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Everything in Standard</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Lowest cost per check</span>
                    </li>
                    <li>
                      <i class="ph-bold ph-check"></i>
                      <span>Bulk checking ideal</span>
                    </li>
                  </ul>

                  <!-- CTA -->
                  <a href="#" class="prc-cta prc-cta--secondary">
                    <span>Buy credits</span>
                    <i class="ph ph-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>

            <!-- Trust Note -->
            <div class="prc-trust-note fade-in-up">
              <div class="prc-trust-items">
                <div class="prc-trust-item">
                  <i class="ph ph-infinity"></i>
                  <span>Credits never expire</span>
                </div>
                <div class="prc-trust-divider"></div>
                <div class="prc-trust-item">
                  <i class="ph ph-check-circle"></i>
                  <span>One credit = one full check</span>
                </div>
                <div class="prc-trust-divider"></div>
                <div class="prc-trust-item">
                  <i class="ph ph-prohibit"></i>
                  <span>No recurring charges</span>
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
        blurAccents: [...this.container.querySelectorAll('.prc-blur-accent')],
        cards: [...this.container.querySelectorAll('.prc-card')],
        fadeElements: [...this.container.querySelectorAll('.fade-in-up')],
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

  function initPricing() {
    const container = document.querySelector('[data-component="pricing"]');
    if (!container) return null;

    const component = new Pricing(container);

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
      componentInstance = initPricing();
    });
  } else {
    componentInstance = initPricing();
  }

  // Expose for external use
  window.CompanyWisePricing = {
    Pricing,
    getInstance: () => componentInstance,
    init: initPricing,
  };

})();
