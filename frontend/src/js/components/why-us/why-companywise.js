/* ============================================
   COMPANYWISE — why-companywise.js
   Self-initializing Comparison section component
   Matching Motorwise design system
   ============================================ */

(function() {
  'use strict';

  // ============================================================================
  // WHY COMPANYWISE COMPONENT
  // ============================================================================

  class WhyCompanyWise {
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
        <section id="why-companywise" class="why-section">
          <!-- Background Elements -->
          <div class="why-bg-pattern"></div>
          <div class="why-blur-accent why-blur-accent--left"></div>
          <div class="why-blur-accent why-blur-accent--right"></div>

          <div class="why-container">
            <!-- Section Header -->
            <div class="why-header">
              <div class="why-label fade-in-up">
                <i class="ph ph-scales"></i>
                <span>Why CompanyWise</span>
              </div>
              <h2 class="why-title fade-in-up">Built different. On purpose.</h2>
              <p class="why-subtitle fade-in-up">
                Enterprise tools cost hundreds per month. Free sites hide the useful data. We built something better.
              </p>
            </div>

            <!-- Comparison Table -->
            <div class="why-table-wrapper fade-in-up">
              <div class="why-table-container">
                <table class="why-table">
                  <thead>
                    <tr>
                      <th class="why-th why-th--feature">Feature</th>
                      <th class="why-th why-th--highlight">
                        <div class="why-th-brand">
                          <div class="why-th-brand-icon">
                            <i class="ph-bold ph-seal-check"></i>
                          </div>
                          <span>CompanyWise</span>
                        </div>
                      </th>
                      <th class="why-th why-th--competitor">Enterprise tools</th>
                      <th class="why-th why-th--competitor">Free check sites</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="why-tr">
                      <td class="why-td why-td--feature">
                        <div class="why-feature-label">
                          <i class="ph ph-gift"></i>
                          <span>Actually free tier</span>
                        </div>
                      </td>
                      <td class="why-td why-td--highlight">
                        <div class="why-check why-check--yes">
                          <i class="ph-fill ph-check-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--no">
                          <i class="ph-fill ph-x-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--partial">
                          <i class="ph-fill ph-minus-circle"></i>
                        </div>
                      </td>
                    </tr>

                    <tr class="why-tr">
                      <td class="why-td why-td--feature">
                        <div class="why-feature-label">
                          <i class="ph ph-chat-text"></i>
                          <span>Plain English verdicts</span>
                        </div>
                      </td>
                      <td class="why-td why-td--highlight">
                        <div class="why-check why-check--yes">
                          <i class="ph-fill ph-check-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--no">
                          <i class="ph-fill ph-x-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--no">
                          <i class="ph-fill ph-x-circle"></i>
                        </div>
                      </td>
                    </tr>

                    <tr class="why-tr">
                      <td class="why-td why-td--feature">
                        <div class="why-feature-label">
                          <i class="ph ph-prohibit"></i>
                          <span>No subscription required</span>
                        </div>
                      </td>
                      <td class="why-td why-td--highlight">
                        <div class="why-check why-check--yes">
                          <i class="ph-fill ph-check-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--no">
                          <i class="ph-fill ph-x-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--yes">
                          <i class="ph-fill ph-check-circle"></i>
                        </div>
                      </td>
                    </tr>

                    <tr class="why-tr">
                      <td class="why-td why-td--feature">
                        <div class="why-feature-label">
                          <i class="ph ph-user"></i>
                          <span>Freelancer pricing</span>
                        </div>
                      </td>
                      <td class="why-td why-td--highlight">
                        <div class="why-check why-check--yes">
                          <i class="ph-fill ph-check-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--no">
                          <i class="ph-fill ph-x-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--partial">
                          <i class="ph-fill ph-minus-circle"></i>
                        </div>
                      </td>
                    </tr>

                    <tr class="why-tr why-tr--last">
                      <td class="why-td why-td--feature">
                        <div class="why-feature-label">
                          <i class="ph ph-lightbulb"></i>
                          <span>Actionable recommendations</span>
                        </div>
                      </td>
                      <td class="why-td why-td--highlight">
                        <div class="why-check why-check--yes">
                          <i class="ph-fill ph-check-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--partial">
                          <i class="ph-fill ph-minus-circle"></i>
                        </div>
                      </td>
                      <td class="why-td">
                        <div class="why-check why-check--no">
                          <i class="ph-fill ph-x-circle"></i>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Bottom Highlights -->
            <div class="why-highlights">
              <div class="why-highlight-item fade-in-up">
                <div class="why-highlight-icon why-highlight-icon--emerald">
                  <i class="ph ph-lightning"></i>
                </div>
                <div class="why-highlight-content">
                  <h4 class="why-highlight-title">Instant results</h4>
                  <p class="why-highlight-desc">No waiting for reports. Get your verdict in seconds.</p>
                </div>
              </div>

              <div class="why-highlight-item fade-in-up">
                <div class="why-highlight-icon why-highlight-icon--blue">
                  <i class="ph ph-shield-check"></i>
                </div>
                <div class="why-highlight-content">
                  <h4 class="why-highlight-title">Official data source</h4>
                  <p class="why-highlight-desc">Direct from Companies House — the UK's official register.</p>
                </div>
              </div>

              <div class="why-highlight-item fade-in-up">
                <div class="why-highlight-icon why-highlight-icon--amber">
                  <i class="ph ph-target"></i>
                </div>
                <div class="why-highlight-content">
                  <h4 class="why-highlight-title">Built for freelancers</h4>
                  <p class="why-highlight-desc">Not credit managers. Not accountants. Just you.</p>
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
        blurAccents: [...this.container.querySelectorAll('.why-blur-accent')],
        tableRows: [...this.container.querySelectorAll('.why-tr')],
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

    animateTableRows() {
      this.elements.tableRows.forEach((row, index) => {
        setTimeout(() => {
          row.classList.add('is-visible');
        }, 300 + index * 60);
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

      setTimeout(() => {
        this.animateTableRows();
      }, 200);
    }
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  function initWhyCompanyWise() {
    const container = document.querySelector('[data-component="why-companywise"]');
    if (!container) return null;

    const component = new WhyCompanyWise(container);

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
      componentInstance = initWhyCompanyWise();
    });
  } else {
    componentInstance = initWhyCompanyWise();
  }

  // Expose for external use
  window.CompanyWiseWhy = {
    WhyCompanyWise,
    getInstance: () => componentInstance,
    init: initWhyCompanyWise,
  };

})();
