/* ============================================
   COMPANYWISE — what-we-check.js
   Interactive "What We Check" section with swipable tabs
   Inspired by ReportPreviewShowcase pattern
   ============================================ */

(function() {
  'use strict';

  // Get categories from the panels component
  const CATEGORIES = window.WWCPanels?.CATEGORIES || [];

  // ============================================================================
  // WHAT WE CHECK COMPONENT
  // ============================================================================

  class WhatWeCheck {
    constructor(container) {
      this.container = container;
      this.hasAnimated = false;
      this.activeIndex = 0;
      this.isTransitioning = false;
      this.hoveredTab = null;

      // Swipe state
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isDragging = false;
      this.currentTranslateX = 0;

      this.render();
      this.elements = this.queryElements();
      this.bindEvents();
    }

    // -------------------------------------------------------------------------
    // Render Component HTML
    // -------------------------------------------------------------------------

    render() {
      const currentCategory = CATEGORIES[this.activeIndex];

      this.container.innerHTML = `
        <section id="what-we-check" class="wwc-section">
          <!-- Background Elements -->
          <div class="wwc-bg-pattern"></div>
          <div class="wwc-blur-accent wwc-blur-accent--left"></div>
          <div class="wwc-blur-accent wwc-blur-accent--right"></div>

          <div class="wwc-container">
            <!-- Section Header -->
            <div class="wwc-header fade-in-up">
              <div class="wwc-label">
                <i class="ph ph-detective"></i>
                <span>What we check</span>
              </div>
              <h2 class="wwc-title">12 signals. One verdict.</h2>
              <p class="wwc-subtitle">
                We pull data from Companies House and translate it into risk signals that actually matter when you're deciding whether to take on a client.
              </p>
            </div>

            <!-- Main Card Container -->
            <div class="wwc-card-wrapper fade-in-up" style="transition-delay: 100ms;">
              <!-- Integrated Tabs at Top Edge -->
              <div class="wwc-tabs" role="tablist" aria-label="Signal categories">
                ${CATEGORIES.map((cat, idx) => this.renderTab(cat, idx)).join('')}
              </div>

              <!-- Main Card Body -->
              <div class="wwc-card">
                <!-- Two-Column Layout -->
                <div class="wwc-body">

                  <!-- Hero Zone (Desktop Left Column) -->
                  <div class="wwc-hero-zone" data-el="hero-zone">
                    ${this.renderHeroContent(currentCategory)}
                  </div>

                  <!-- Content Zone (Right Column) -->
                  <div class="wwc-content-zone">
                    <!-- Mobile Hero Header -->
                    <div class="wwc-mobile-hero" data-el="mobile-hero">
                      ${this.renderMobileHero(currentCategory)}
                    </div>

                    <!-- Swipeable Content Container -->
                    <div class="wwc-swipe-container" data-el="swipe-container">
                      <!-- Edge hints for swipe affordance -->
                      <div class="wwc-swipe-hint wwc-swipe-hint--left" data-el="hint-left"></div>
                      <div class="wwc-swipe-hint wwc-swipe-hint--right" data-el="hint-right"></div>

                      <!-- Signals Grid -->
                      <div class="wwc-signals-grid ${currentCategory.panelType ? 'wwc-signals-grid--' + currentCategory.panelType : (currentCategory.enhanced ? 'wwc-signals-grid--enhanced' : '')}" data-el="signals-grid">
                        ${this.renderSignals(currentCategory.signals, currentCategory)}
                      </div>
                    </div>

                    <!-- Mobile Progress Dots -->
                    <div class="wwc-dots" data-el="dots">
                      ${CATEGORIES.map((_, idx) => `
                        <button
                          class="wwc-dot ${idx === this.activeIndex ? 'wwc-dot--active' : ''}"
                          data-index="${idx}"
                          aria-label="Go to ${CATEGORIES[idx].label}"
                        ></button>
                      `).join('')}
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="wwc-footer">
                  <!-- Summary Row -->
                  <div class="wwc-summary-row">
                    <div class="wwc-summary-icon">
                      <i class="ph ph-shield-check"></i>
                    </div>
                    <div class="wwc-summary-content">
                      <h4 class="wwc-summary-title">Weighted scoring, not just checkboxes</h4>
                      <p class="wwc-summary-text">
                        Not all flags are equal. We weight each signal based on how strongly it correlates with payment risk.
                      </p>
                    </div>
                    <div class="wwc-summary-visual">
                      <div class="wwc-weight-bar" data-el="weight-bar">
                        <div class="wwc-weight-segment wwc-weight-segment--high"><span>High</span></div>
                        <div class="wwc-weight-segment wwc-weight-segment--medium"><span>Med</span></div>
                        <div class="wwc-weight-segment wwc-weight-segment--low"><span>Low</span></div>
                      </div>
                      <p class="wwc-weight-label">Signal weighting</p>
                    </div>
                  </div>

                  <!-- CTA Row -->
                  <div class="wwc-cta-row">
                    <div class="wwc-cta-content">
                      <div class="wwc-cta-icon">
                        <i class="ph ph-magnifying-glass"></i>
                      </div>
                      <div>
                        <h4 class="wwc-cta-title">Ready to check a company?</h4>
                        <p class="wwc-cta-text">Get a full risk assessment in seconds</p>
                      </div>
                    </div>
                    <button
                      class="wwc-cta-btn"
                      onclick="document.getElementById('hero-search-input')?.focus(); window.scrollTo({top: 0, behavior: 'smooth'});"
                    >
                      <i class="ph-bold ph-magnifying-glass"></i>
                      <span>Try a free check</span>
                      <i class="ph ph-arrow-right"></i>
                    </button>
                  </div>

                  <!-- Attribution -->
                  <div class="wwc-attribution">
                    <span><i class="ph ph-database"></i> Companies House Data</span>
                    <span><i class="ph ph-shield-check"></i> Official Registry</span>
                    <span><i class="ph ph-lightning"></i> Real-time Analysis</span>
                  </div>
                </div>
              </div>

              <!-- Decorative Shadow -->
              <div class="wwc-card-shadow" aria-hidden="true"></div>
            </div>
          </div>
        </section>
      `;
    }

    // -------------------------------------------------------------------------
    // Render Helpers
    // -------------------------------------------------------------------------

    renderTab(category, index) {
      const isActive = index === this.activeIndex;
      const rotations = [-1, 0.5, -0.5, 1];
      const rotation = rotations[index % 4];

      return `
        <button
          class="wwc-tab ${isActive ? 'wwc-tab--active' : ''}"
          role="tab"
          aria-selected="${isActive}"
          aria-controls="panel-${category.id}"
          data-tab-index="${index}"
          style="--tab-rotation: ${rotation}deg; --tab-z: ${isActive ? 10 : 5 - index};"
        >
          <span class="wwc-tab-accent"></span>
          <i class="ph ${category.icon}"></i>
          <span class="wwc-tab-label">${category.label}</span>
        </button>
      `;
    }

    renderHeroContent(category) {
      return `
        <div class="wwc-hero-icon wwc-hero-icon--${category.color}">
          <i class="ph ${category.icon}"></i>
        </div>
        <h3 class="wwc-hero-headline">${category.hero.headline}</h3>
        <p class="wwc-hero-subheadline">${category.hero.subheadline}</p>
        <ul class="wwc-hero-bullets">
          ${category.hero.bullets.map(bullet => `
            <li>
              <span class="wwc-bullet-check"><i class="ph-bold ph-check"></i></span>
              <span>${bullet}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    renderMobileHero(category) {
      return `
        <div class="wwc-mobile-hero-icon wwc-mobile-hero-icon--${category.color}">
          <i class="ph ${category.icon}"></i>
        </div>
        <div class="wwc-mobile-hero-content">
          <h3 class="wwc-mobile-hero-title">${category.hero.headline}</h3>
          <p class="wwc-mobile-hero-subtitle">${category.hero.subheadline}</p>
        </div>
      `;
    }

    renderSignals(signals, category) {
      // Check for panel-specific renderer
      const panelType = category.panelType;
      if (panelType && window.WWCPanels?.renderers?.[panelType]) {
        return window.WWCPanels.renderers[panelType](signals);
      }

      // Fallback to enhanced or standard cards
      if (category.enhanced) {
        return signals.map((signal, idx) => this.renderEnhancedSignal(signal, idx)).join('');
      }

      return signals.map((signal, idx) => `
        <div class="wwc-signal-card" data-signal-index="${idx}">
          <div class="wwc-signal-inner">
            <div class="wwc-signal-icon wwc-signal-icon--${signal.iconColor}">
              <i class="ph ${signal.icon}"></i>
            </div>
            <div class="wwc-signal-content">
              <h4 class="wwc-signal-title">${signal.title}</h4>
              <p class="wwc-signal-description">${signal.description}</p>
            </div>
            <div class="wwc-signal-weight wwc-signal-weight--${signal.weight}">
              <i class="ph-bold ${signal.weight === 'high' ? 'ph-warning' : 'ph-info'}"></i>
              <span>${signal.weight.charAt(0).toUpperCase() + signal.weight.slice(1)} weight</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    // -------------------------------------------------------------------------
    // Enhanced Signal Card Rendering (Visual Redesign)
    // -------------------------------------------------------------------------

    renderEnhancedSignal(signal, idx) {
      const weightBars = this.renderSeverityMeter(signal.weight);
      const preview = signal.preview ? this.renderSignalPreview(signal.preview) : '';

      return `
        <div class="wwc-signal-card wwc-signal-card--enhanced" data-signal-index="${idx}" data-weight="${signal.weight}">
          <!-- Weight accent bar -->
          <div class="wwc-signal-accent wwc-signal-accent--${signal.weight}"></div>

          <div class="wwc-signal-inner">
            <!-- Header: Icon + Severity Meter -->
            <div class="wwc-signal-header">
              <div class="wwc-signal-icon wwc-signal-icon--${signal.iconColor}">
                <i class="ph ${signal.icon}"></i>
              </div>
              ${weightBars}
            </div>

            <!-- Content -->
            <div class="wwc-signal-content">
              <h4 class="wwc-signal-title">${signal.title}</h4>
              <p class="wwc-signal-description">${signal.description}</p>
            </div>

            <!-- Sample Data Preview -->
            ${preview}
          </div>

          <!-- Hover glow effect -->
          <div class="wwc-signal-glow wwc-signal-glow--${signal.weight}"></div>
        </div>
      `;
    }

    renderSeverityMeter(weight) {
      const levels = { high: 5, medium: 3, low: 1 };
      const filled = levels[weight] || 1;
      const bars = Array.from({ length: 5 }, (_, i) =>
        `<span class="wwc-severity-bar ${i < filled ? 'wwc-severity-bar--filled' : ''}"></span>`
      ).join('');

      return `
        <div class="wwc-severity-meter wwc-severity-meter--${weight}">
          <div class="wwc-severity-bars">${bars}</div>
          <span class="wwc-severity-label">${weight}</span>
        </div>
      `;
    }

    renderSignalPreview(preview) {
      let content = '';

      switch (preview.type) {
        case 'overdue-gauge':
          const gaugePercent = Math.min(preview.value / 90 * 100, 100);
          content = `
            <div class="wwc-preview-overdue">
              <div class="wwc-preview-gauge">
                <div class="wwc-gauge-track">
                  <div class="wwc-gauge-fill wwc-gauge-fill--danger" style="--gauge-width: ${gaugePercent}%"></div>
                </div>
                <div class="wwc-gauge-markers">
                  <span>0</span>
                  <span>30</span>
                  <span>60</span>
                  <span>90+</span>
                </div>
              </div>
              <div class="wwc-preview-stat">
                <span class="wwc-preview-value">${preview.value}</span>
                <span class="wwc-preview-unit">${preview.unit}</span>
              </div>
              <div class="wwc-preview-context">
                <span class="wwc-preview-status wwc-preview-status--danger">
                  <i class="ph-fill ph-warning-circle"></i>
                  ${preview.statusText}
                </span>
                <span class="wwc-preview-note">${preview.context}</span>
              </div>
            </div>
          `;
          break;

        case 'ccj-breakdown':
          content = `
            <div class="wwc-preview-ccj">
              <div class="wwc-preview-items">
                ${preview.items.map(item => `
                  <div class="wwc-preview-item wwc-preview-item--${item.severity}">
                    <span class="wwc-item-value">${item.value}</span>
                    <span class="wwc-item-label">${item.label}</span>
                  </div>
                `).join('')}
              </div>
              <div class="wwc-preview-total">
                <i class="ph ph-currency-gbp"></i>
                <span>Total: <strong>${preview.totalAmount}</strong></span>
              </div>
            </div>
          `;
          break;

        case 'financial-metrics':
          content = `
            <div class="wwc-preview-financial">
              <div class="wwc-preview-metrics">
                ${preview.metrics.map(metric => `
                  <div class="wwc-preview-metric">
                    <div class="wwc-metric-header">
                      <span class="wwc-metric-label">${metric.label}</span>
                      <span class="wwc-metric-trend wwc-metric-trend--${metric.trend}">
                        <i class="ph-bold ph-trend-${metric.trend}"></i>
                        ${metric.change}
                      </span>
                    </div>
                    <span class="wwc-metric-value">${metric.value}</span>
                  </div>
                `).join('')}
              </div>
              <div class="wwc-preview-period">
                <i class="ph ph-calendar-blank"></i>
                <span>${preview.period}</span>
              </div>
            </div>
          `;
          break;

        default:
          content = '';
      }

      return `
        <div class="wwc-signal-preview">
          <div class="wwc-preview-header">
            <i class="ph ph-chart-bar"></i>
            <span>${preview.label}</span>
          </div>
          <div class="wwc-preview-content">
            ${content}
          </div>
        </div>
      `;
    }

    // -------------------------------------------------------------------------
    // DOM Queries
    // -------------------------------------------------------------------------

    queryElements() {
      const $ = (sel) => this.container.querySelector(`[data-el="${sel}"]`);

      return {
        heroZone: $('hero-zone'),
        mobileHero: $('mobile-hero'),
        signalsGrid: $('signals-grid'),
        swipeContainer: $('swipe-container'),
        hintLeft: $('hint-left'),
        hintRight: $('hint-right'),
        dots: $('dots'),
        weightBar: $('weight-bar'),
        tabs: [...this.container.querySelectorAll('.wwc-tab')],
        dotButtons: [...this.container.querySelectorAll('.wwc-dot')],
        blurAccents: [...this.container.querySelectorAll('.wwc-blur-accent')],
        fadeElements: [...this.container.querySelectorAll('.fade-in-up')],
      };
    }

    // -------------------------------------------------------------------------
    // Event Bindings
    // -------------------------------------------------------------------------

    bindEvents() {
      // Tab clicks
      this.elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const index = parseInt(tab.dataset.tabIndex, 10);
          this.navigateToCategory(index);
        });

        // Hover effects
        tab.addEventListener('mouseenter', () => {
          this.hoveredTab = parseInt(tab.dataset.tabIndex, 10);
          tab.classList.add('wwc-tab--hovered');
        });

        tab.addEventListener('mouseleave', () => {
          this.hoveredTab = null;
          tab.classList.remove('wwc-tab--hovered');
        });
      });

      // Dot clicks
      this.elements.dotButtons.forEach(dot => {
        dot.addEventListener('click', () => {
          const index = parseInt(dot.dataset.index, 10);
          this.navigateToCategory(index);
        });
      });

      // Swipe handling
      const swipeEl = this.elements.swipeContainer;
      if (swipeEl) {
        swipeEl.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
        swipeEl.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        swipeEl.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
      }

      // Keyboard navigation
      this.container.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    // -------------------------------------------------------------------------
    // Navigation
    // -------------------------------------------------------------------------

    navigateToCategory(newIndex) {
      if (newIndex === this.activeIndex || newIndex < 0 || newIndex >= CATEGORIES.length) return;
      if (this.isTransitioning) return;

      this.isTransitioning = true;
      const direction = newIndex > this.activeIndex ? 'left' : 'right';

      // Fade out current content
      this.elements.heroZone?.classList.add('wwc-transitioning');
      this.elements.mobileHero?.classList.add('wwc-transitioning');
      this.elements.signalsGrid?.classList.add('wwc-transitioning', `wwc-exit-${direction}`);

      // Update after fade out
      setTimeout(() => {
        this.activeIndex = newIndex;
        const category = CATEGORIES[newIndex];

        // Update hero content
        if (this.elements.heroZone) {
          this.elements.heroZone.innerHTML = this.renderHeroContent(category);
        }

        // Update mobile hero
        if (this.elements.mobileHero) {
          this.elements.mobileHero.innerHTML = this.renderMobileHero(category);
        }

        // Update signals
        if (this.elements.signalsGrid) {
          this.elements.signalsGrid.innerHTML = this.renderSignals(category.signals, category);
          // Update grid class based on panel type or enhanced flag
          this.elements.signalsGrid.className = 'wwc-signals-grid';
          if (category.panelType) {
            this.elements.signalsGrid.classList.add('wwc-signals-grid--' + category.panelType);
          } else if (category.enhanced) {
            this.elements.signalsGrid.classList.add('wwc-signals-grid--enhanced');
          }
          this.elements.signalsGrid.classList.remove(`wwc-exit-${direction}`);
          this.elements.signalsGrid.classList.add(`wwc-enter-${direction === 'left' ? 'right' : 'left'}`);
        }

        // Update tabs
        this.elements.tabs.forEach((tab, idx) => {
          tab.classList.toggle('wwc-tab--active', idx === newIndex);
          tab.setAttribute('aria-selected', idx === newIndex);
        });

        // Update dots
        this.elements.dotButtons.forEach((dot, idx) => {
          dot.classList.toggle('wwc-dot--active', idx === newIndex);
        });

        // Update swipe hints
        this.updateSwipeHints();

        // Fade in new content
        setTimeout(() => {
          this.elements.heroZone?.classList.remove('wwc-transitioning');
          this.elements.mobileHero?.classList.remove('wwc-transitioning');
          this.elements.signalsGrid?.classList.remove('wwc-transitioning', `wwc-enter-${direction === 'left' ? 'right' : 'left'}`);
          this.isTransitioning = false;
        }, 50);
      }, 150);
    }

    updateSwipeHints() {
      if (this.elements.hintLeft) {
        this.elements.hintLeft.classList.toggle('wwc-swipe-hint--visible', this.activeIndex > 0);
      }
      if (this.elements.hintRight) {
        this.elements.hintRight.classList.toggle('wwc-swipe-hint--visible', this.activeIndex < CATEGORIES.length - 1);
      }
    }

    // -------------------------------------------------------------------------
    // Touch/Swipe Handling
    // -------------------------------------------------------------------------

    onTouchStart(e) {
      if (this.isTransitioning) return;

      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.isDragging = false;
      this.currentTranslateX = 0;
    }

    onTouchMove(e) {
      if (this.isTransitioning) return;

      const deltaX = e.touches[0].clientX - this.touchStartX;
      const deltaY = e.touches[0].clientY - this.touchStartY;

      // Determine if horizontal swipe
      if (!this.isDragging && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        this.isDragging = true;
        this.elements.signalsGrid?.classList.add('wwc-dragging');
      }

      if (this.isDragging) {
        e.preventDefault();

        // Apply resistance at edges
        let translateX = deltaX;
        if ((this.activeIndex === 0 && deltaX > 0) ||
            (this.activeIndex === CATEGORIES.length - 1 && deltaX < 0)) {
          translateX = deltaX * 0.3; // resistance
        }

        this.currentTranslateX = translateX;
        if (this.elements.signalsGrid) {
          this.elements.signalsGrid.style.transform = `translateX(${translateX}px)`;
        }
      }
    }

    onTouchEnd() {
      if (!this.isDragging) return;

      this.isDragging = false;
      this.elements.signalsGrid?.classList.remove('wwc-dragging');

      const threshold = 80;
      const velocity = Math.abs(this.currentTranslateX) / 100;

      if (this.elements.signalsGrid) {
        this.elements.signalsGrid.style.transform = '';
      }

      if (Math.abs(this.currentTranslateX) > threshold || velocity > 0.5) {
        if (this.currentTranslateX > 0 && this.activeIndex > 0) {
          this.navigateToCategory(this.activeIndex - 1);
        } else if (this.currentTranslateX < 0 && this.activeIndex < CATEGORIES.length - 1) {
          this.navigateToCategory(this.activeIndex + 1);
        }
      }

      this.currentTranslateX = 0;
    }

    // -------------------------------------------------------------------------
    // Keyboard Navigation
    // -------------------------------------------------------------------------

    onKeyDown(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigateToCategory(this.activeIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigateToCategory(this.activeIndex + 1);
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
        }, index * 100);
      });
    }

    animateWeightBar() {
      const bar = this.elements.weightBar;
      if (!bar) return;

      setTimeout(() => {
        bar.classList.add('is-animated');
      }, 600);
    }

    // -------------------------------------------------------------------------
    // Main Animation Trigger
    // -------------------------------------------------------------------------

    start() {
      if (this.hasAnimated) return;
      this.hasAnimated = true;

      this.animateBlurAccents();

      setTimeout(() => {
        this.animateFadeElements();
        this.updateSwipeHints();
      }, 100);

      setTimeout(() => {
        this.animateWeightBar();
      }, 500);
    }
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  function initWhatWeCheck() {
    const container = document.querySelector('[data-component="what-we-check"]');
    if (!container) return null;

    const component = new WhatWeCheck(container);

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
      componentInstance = initWhatWeCheck();
    });
  } else {
    componentInstance = initWhatWeCheck();
  }

  // Expose for external use
  window.CompanyWiseWhatWeCheck = {
    WhatWeCheck,
    getInstance: () => componentInstance,
    init: initWhatWeCheck,
  };

})();
