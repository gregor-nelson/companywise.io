/* ============================================
   COMPANYWISE — hero.js
   Self-initializing hero component
   Matching Motorwise design system
   ============================================ */

(function() {
  'use strict';

  // ---- Mock Data Reference ----
  // Company data loaded from mock-data.js (must be included before this script)
  const getMockCompanies = () => window.CompanyWiseMockData?.companies || [];

  // ---- Utility ----
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Hero Component ----
  const Hero = {
    container: null,
    searchInput: null,
    searchDropdown: null,
    isLoading: false,
    currentCompany: null,

    // Unified card state: 'demo' | 'skeleton' | 'result'
    cardState: 'demo',
    unifiedCard: null,
    unifiedCardInner: null,
    demoCompany: null,

    // Initialize hero
    init(options = {}) {
      this.container = options.container || document.getElementById('hero-container');
      if (!this.container) return;

      this.render();
      this.bindEvents();
      this.startAnimations();
    },

    // Render hero HTML
    render() {
      this.container.innerHTML = `
        <section id="hero" class="hero">
          <!-- Chevron Background — Mobile -->
          <div class="hero-chevron-mobile"></div>

          <!-- Chevron Background — Desktop -->
          <div class="hero-chevrons">
            <div class="hero-chevron hero-chevron-primary"></div>
            <div class="hero-chevron hero-chevron-secondary"></div>
            <div class="hero-chevron hero-chevron-tertiary"></div>
          </div>

          <!-- Blur Accents -->
          <div class="hero-blur-accent hero-blur-accent--top"></div>
          <div class="hero-blur-accent hero-blur-accent--bottom"></div>

          <!-- Grid Pattern -->
          <div class="hero-grid-pattern"></div>

          <div class="hero-container">
            <div class="hero-grid">
              <!-- Left Column - Content -->
              <div class="hero-content">
                <!-- Headline -->
                <div>
                  <h1 class="hero-headline">
                    Trust data, not promises.
                    <span class="hero-headline-accent">Check any company's risk in seconds</span>
                  </h1>
                  <p class="hero-subheadline">
                    Before you quote, know if they'll pay. We scan Companies House data to help freelancers <strong>avoid bad clients</strong>.
                  </p>
                </div>

                <!-- Search -->
                <div class="hero-search-wrapper">
                  <form class="hero-search-form" id="hero-search-form">
                    <div class="hero-search-prefix">
                      <i class="ph ph-buildings"></i>
                    </div>
                    <input
                      id="hero-search-input"
                      class="hero-search-input"
                      type="text"
                      placeholder="Company name or number..."
                      autocomplete="off"
                      spellcheck="false"
                    >
                    <button type="submit" class="hero-search-btn" id="hero-search-btn">
                      Check company
                    </button>
                  </form>
                  <div id="hero-search-dropdown" class="hero-search-dropdown"></div>
                  <div id="hero-search-error" class="hero-search-error" style="display: none;"></div>
                </div>

                <p style="font-size: 0.75rem; color: var(--text-400); margin: 0;">
                  Try: "Horizon Digital", "Quantum Reach", "Castle", "PureFlow"
                </p>

                <!-- Check Types -->
                <div class="hero-check-types">
                  <p class="hero-check-types-label">We check:</p>
                  <div class="hero-check-types-icons">
                    <i class="ph ph-buildings" title="Limited Companies"></i>
                    <i class="ph ph-storefront" title="LLPs"></i>
                    <i class="ph ph-bank" title="PLCs"></i>
                    <i class="ph ph-globe" title="Overseas Companies"></i>
                  </div>
                </div>

                <!-- Feature Checklist -->
                <div class="hero-checklist">
                  <p class="hero-checklist-title">A CompanyWise check uncovers:</p>
                  <div class="hero-checklist-grid">
                    <div class="hero-checklist-item" data-delay="0">
                      <i class="ph ph-check-circle"></i>
                      <span>Overdue accounts</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="80">
                      <i class="ph ph-check-circle"></i>
                      <span>Director history</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="160">
                      <i class="ph ph-check-circle"></i>
                      <span>CCJs & charges</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="240">
                      <i class="ph ph-check-circle"></i>
                      <span>Virtual office flags</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="320">
                      <i class="ph ph-check-circle"></i>
                      <span>Company age</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="400">
                      <i class="ph ph-check-circle"></i>
                      <span>and more...</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column - Card Stack Illustration -->
              <div class="hero-illustration">
                <div class="hero-card-stack">
                  <!-- Back Card - Depth -->
                  <div class="hero-card-back" id="hero-card-back"></div>

                  <!-- Unified Card - Company Summary -->
                  <div class="hero-unified-card" id="hero-unified-card">
                    <div class="hero-unified-card-inner" id="hero-unified-card-inner"></div>
                  </div>

                  <!-- Shadow Accent -->
                  <div class="hero-shadow-accent"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      // Cache DOM references
      this.searchInput = document.getElementById('hero-search-input');
      this.searchDropdown = document.getElementById('hero-search-dropdown');
      this.searchForm = document.getElementById('hero-search-form');
      this.searchBtn = document.getElementById('hero-search-btn');
      this.searchError = document.getElementById('hero-search-error');
      this.unifiedCard = document.getElementById('hero-unified-card');
      this.unifiedCardInner = document.getElementById('hero-unified-card-inner');

      // Populate with demo data (Castle & Brook — high risk)
      this.demoCompany = getMockCompanies()[2];
      if (this.demoCompany) {
        this.renderUnifiedCardContent(this.demoCompany, 'demo');
      }
    },

    // Bind event handlers
    bindEvents() {
      // Search input
      this.searchInput.addEventListener('input', (e) => this.handleInput(e.target.value));
      this.searchInput.addEventListener('focus', () => {
        if (this.searchInput.value.length > 0) {
          this.handleInput(this.searchInput.value);
        }
      });

      // Form submit
      this.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSearch();
      });

      // Close dropdown on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.hero-search-wrapper')) {
          this.closeDropdown();
        }
      });

      // Keyboard navigation
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeDropdown();
        }
      });
    },

    // Start entrance animations
    startAnimations() {
      // Reveal blur accents
      setTimeout(() => {
        document.querySelectorAll('.hero-blur-accent').forEach(el => {
          el.classList.add('visible');
        });
      }, 100);

      // Animate checklist items
      const checkItems = document.querySelectorAll('.hero-checklist-item');
      checkItems.forEach((item, i) => {
        const delay = parseInt(item.dataset.delay) || i * 80;
        setTimeout(() => {
          item.classList.add('visible');
        }, 400 + delay);
      });

      // Card stack animations
      this.animateCardStack();
    },

    // Animate card stack illustration
    animateCardStack() {
      const backCard = document.getElementById('hero-card-back');
      const unifiedCard = document.getElementById('hero-unified-card');

      // Back card appears first
      setTimeout(() => {
        if (backCard) backCard.classList.add('visible');
      }, 0);

      // Unified card appears with demo data
      setTimeout(() => {
        if (unifiedCard) unifiedCard.classList.add('visible');
      }, 300);
    },

    // ---- Unified Card Rendering ----

    // Render unified card content based on state
    renderUnifiedCardContent(company, state) {
      this.cardState = state;
      const inner = this.unifiedCardInner;

      if (state === 'skeleton') {
        inner.innerHTML = this.getSkeletonTemplate();
        inner.classList.remove('hero-unified-card-inner--visible');
        requestAnimationFrame(() => {
          inner.classList.add('hero-unified-card-inner--visible');
        });
        return;
      }

      // 'demo' or 'result' state
      const isDemo = (state === 'demo');

      const age = this.getCompanyAge(company.incorporated);
      const accountsDate = company.lastAccounts
        ? new Date(company.lastAccounts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Never filed';

      const badgeIcon = company.risk === 'low'
        ? 'ph-shield-check'
        : company.risk === 'medium'
        ? 'ph-shield-warning'
        : 'ph-shield-slash';

      inner.classList.remove('hero-unified-card-inner--visible');

      inner.innerHTML = `
        ${isDemo ? '<div class="hero-unified-demo-label"><i class="ph ph-sparkle"></i> Sample Company Check</div>' : ''}
        <div class="hero-unified-header">
          <div>
            <h3 class="hero-unified-company-name">${escapeHtml(company.name)}</h3>
            <p class="hero-unified-company-meta">${escapeHtml(company.number)} &middot; ${escapeHtml(company.type)}</p>
          </div>
          <div class="hero-unified-badge hero-unified-badge--${company.risk}">
            <i class="ph-fill ${badgeIcon}"></i>
            ${company.risk} risk
          </div>
        </div>
        <div class="hero-unified-meta-row">
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Incorporated</span>
            <div class="hero-unified-meta-value">${age}</div>
          </div>
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Status</span>
            <div class="hero-unified-meta-value">${company.status}</div>
          </div>
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Last Accounts</span>
            <div class="hero-unified-meta-value">${accountsDate}</div>
          </div>
        </div>
        <div class="hero-unified-flags">
          <div class="hero-unified-flags-header">
            <span class="hero-unified-flags-title">Flags</span>
            <span class="hero-unified-flags-count">${(company.flags || []).length}</span>
          </div>
          <div class="hero-unified-flags-list">
            ${(company.flags || []).slice(0, 3).map(f => `
              <div class="hero-unified-flag-item hero-unified-flag-item--${f.type}">
                <i class="ph-fill ${f.icon}"></i>
                <span>${f.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="hero-unified-recommendation">
          <i class="ph ph-lightbulb"></i>
          <span>${company.recommendation}</span>
        </div>
        <div class="hero-unified-actions">
          <button class="hero-unified-btn hero-unified-btn--secondary" id="hero-view-free-btn">
            <i class="ph ph-file-text"></i>
            Free Report
          </button>
          <button class="hero-unified-btn hero-unified-btn--primary" id="hero-view-premium-btn">
            <i class="ph ph-star"></i>
            Premium Report
          </button>
        </div>
      `;

      // Fade in the new content
      requestAnimationFrame(() => {
        inner.classList.add('hero-unified-card-inner--visible');
      });

      // Bind CTA buttons
      this.bindUnifiedCardButtons(company);
    },

    // Skeleton template for loading state
    getSkeletonTemplate() {
      return `
        <div class="hero-unified-header">
          <div style="flex:1">
            <div class="hero-skel hero-skel--title"></div>
            <div class="hero-skel hero-skel--text-sm" style="width:60%"></div>
          </div>
          <div class="hero-skel hero-skel--badge"></div>
        </div>
        <div class="hero-unified-meta-row">
          <div class="hero-unified-meta-item">
            <div class="hero-skel hero-skel--text-xs"></div>
            <div class="hero-skel hero-skel--text-sm"></div>
          </div>
          <div class="hero-unified-meta-item">
            <div class="hero-skel hero-skel--text-xs"></div>
            <div class="hero-skel hero-skel--text-sm"></div>
          </div>
          <div class="hero-unified-meta-item">
            <div class="hero-skel hero-skel--text-xs"></div>
            <div class="hero-skel hero-skel--text-sm"></div>
          </div>
        </div>
        <div class="hero-unified-flags" style="padding-top:0.5rem">
          <div class="hero-skel hero-skel--flag"></div>
          <div class="hero-skel hero-skel--flag"></div>
          <div class="hero-skel hero-skel--flag"></div>
        </div>
        <div class="hero-unified-actions" style="margin-top:0.75rem">
          <div class="hero-skel hero-skel--btn"></div>
          <div class="hero-skel hero-skel--btn"></div>
        </div>
      `;
    },

    // Bind CTA buttons on the unified card
    bindUnifiedCardButtons(company) {
      this.currentCompany = company;

      const freeBtn = document.getElementById('hero-view-free-btn');
      if (freeBtn) {
        freeBtn.addEventListener('click', () => {
          if (window.CompanyWiseModal) {
            window.CompanyWiseModal.open(this.currentCompany);
          }
        });
      }

      const premiumBtn = document.getElementById('hero-view-premium-btn');
      if (premiumBtn) {
        premiumBtn.addEventListener('click', () => {
          const Wallet = window.CompanyWiseWallet;
          const co = this.currentCompany;
          if (!co) return;

          // Already has access — navigate to premium report
          if (Wallet && Wallet.hasAccess(co.number)) {
            window.location.href = '../Report/Premium/premium-report.html?company=' + encodeURIComponent(co.number);
            return;
          }

          // Has credits — spend one and navigate
          if (Wallet && Wallet.getBalance() > 0) {
            if (Wallet.spendCredit(co.number)) {
              window.location.href = '../Report/Premium/premium-report.html?company=' + encodeURIComponent(co.number);
            } else {
              if (window.CompanyWiseUpgrade) {
                window.CompanyWiseUpgrade.showMiniDialog(co);
              }
            }
            return;
          }

          // No wallet / no credits — show mini-dialog
          if (window.CompanyWiseUpgrade) {
            window.CompanyWiseUpgrade.showMiniDialog(co);
          }
        });
      }
    },

    // Transition between card states with crossfade
    transitionToState(state, company) {
      const inner = this.unifiedCardInner;

      // Fade out current content
      inner.classList.remove('hero-unified-card-inner--visible');

      // Wait for fade-out, then swap content
      setTimeout(() => {
        this.renderUnifiedCardContent(company, state);
      }, 250);
    },

    // ---- Search Handling ----

    // Handle search input
    handleInput(query) {
      this.hideError();

      if (query.length < 2) {
        this.closeDropdown();
        return;
      }

      const results = getMockCompanies().filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.number.includes(query)
      );

      this.renderDropdown(results);
    },

    // Handle search form submit
    handleSearch() {
      const query = this.searchInput.value.trim();

      if (query.length < 2) {
        this.showError('Please enter at least 2 characters');
        return;
      }

      const results = getMockCompanies().filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.number.includes(query)
      );

      if (results.length === 1) {
        this.selectCompany(results[0]);
      } else if (results.length > 1) {
        this.renderDropdown(results);
      } else {
        this.showError('No companies found — try a different name or number');
      }
    },

    // Render search dropdown
    renderDropdown(results) {
      if (results.length === 0) {
        this.searchDropdown.innerHTML = `
          <div class="hero-search-dropdown-item" style="cursor: default; color: var(--text-400);">
            <span>No companies found — try a different name or number</span>
          </div>`;
        this.searchDropdown.classList.add('active');
        return;
      }

      this.searchDropdown.innerHTML = results
        .map(
          (c) => `
        <div class="hero-search-dropdown-item" data-number="${c.number}">
          <div>
            <div class="company-name">${this.highlight(c.name, this.searchInput.value)}</div>
            <div class="company-number">${c.number} · ${c.status}</div>
          </div>
          <i class="ph ph-arrow-right company-arrow"></i>
        </div>`
        )
        .join('');

      this.searchDropdown.classList.add('active');

      // Bind click events to dropdown items
      this.searchDropdown.querySelectorAll('.hero-search-dropdown-item[data-number]').forEach((item) => {
        item.addEventListener('click', () => {
          const company = getMockCompanies().find((c) => c.number === item.dataset.number);
          if (company) {
            this.selectCompany(company);
          }
        });
      });
    },

    // Highlight search matches
    highlight(text, query) {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(
        regex,
        '<mark style="background: var(--green-glow); color: var(--green-primary); border-radius: 2px; padding: 0 2px;">$1</mark>'
      );
    },

    // Select a company — triggers skeleton → result transition
    selectCompany(company) {
      this.searchInput.value = company.name;
      this.closeDropdown();

      // Transition: current → skeleton → result
      this.transitionToState('skeleton', null);

      // Simulate API delay (future-proofed for real API calls)
      setTimeout(() => {
        this.transitionToState('result', company);
      }, 800);
    },

    // Calculate company age
    getCompanyAge(dateStr) {
      const inc = new Date(dateStr);
      const now = new Date();
      const years = now.getFullYear() - inc.getFullYear();
      const months = now.getMonth() - inc.getMonth();
      const totalMonths = years * 12 + months;

      if (totalMonths < 12) return `${totalMonths} months`;
      if (totalMonths < 24) return `1 year, ${totalMonths - 12} months`;
      return `${Math.floor(totalMonths / 12)} years`;
    },

    // Close dropdown
    closeDropdown() {
      this.searchDropdown.classList.remove('active');
    },

    // Show error message
    showError(message) {
      this.searchError.innerHTML = `<i class="ph ph-warning-circle"></i>${message}`;
      this.searchError.style.display = 'flex';
    },

    // Hide error message
    hideError() {
      this.searchError.style.display = 'none';
    },

    // Set loading state
    setLoading(loading) {
      this.isLoading = loading;
      this.searchInput.disabled = loading;
      this.searchBtn.disabled = loading;

      if (loading) {
        this.searchBtn.innerHTML = `
          <div class="hero-search-spinner"></div>
          <span>Checking...</span>
        `;
      } else {
        this.searchBtn.innerHTML = 'Check company';
      }
    }
  };

  // ---- Export and Auto-Initialize ----
  window.CompanyWiseHero = {
    initHero: (options) => Hero.init(options),
    Hero: Hero
  };

  // Auto-initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('hero-container');
    if (container) {
      Hero.init({ container });
    }
  });
})();
