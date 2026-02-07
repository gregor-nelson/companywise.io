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
  const getMockFilingHistory = () => window.CompanyWiseMockData?.filingHistory || [];

  // Chart dimensions
  const CHART = {
    width: 260,
    height: 120,
    padding: { top: 15, right: 15, bottom: 25, left: 35 }
  };

  CHART.plotWidth = CHART.width - CHART.padding.left - CHART.padding.right;
  CHART.plotHeight = CHART.height - CHART.padding.top - CHART.padding.bottom;

  // Scale functions
  const scaleX = (year) => {
    const minYear = 2019;
    const maxYear = 2025;
    return CHART.padding.left + ((year - minYear) / (maxYear - minYear)) * CHART.plotWidth;
  };

  const scaleY = (value) => {
    return CHART.padding.top + CHART.plotHeight - (value / 100) * CHART.plotHeight;
  };

  // Generate SVG path
  const generatePath = () => {
    return getMockFilingHistory().map((d, i) => {
      const x = scaleX(d.year);
      const y = scaleY(d.status);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

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
    verdictCard: null,
    isLoading: false,
    riskScore: 0,
    currentCompany: null,

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
      const pathD = generatePath();
      const latePoint = getMockFilingHistory()[4]; // 2023 - late filing
      const lateX = scaleX(latePoint.year);
      const lateY = scaleY(latePoint.status);

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

                <!-- Verdict Card (shown after search) -->
                <div id="hero-verdict-card" class="hero-verdict-card"></div>
              </div>

              <!-- Right Column - Card Stack Illustration -->
              <div class="hero-illustration">
                <div class="hero-card-stack">
                  <!-- Back Card - Depth -->
                  <div class="hero-card-back" id="hero-card-back"></div>

                  <!-- Middle Card - Filing History Chart -->
                  <div class="hero-card-middle" id="hero-card-middle">
                    <div class="hero-card-header">
                      <div class="hero-card-icon">
                        <i class="ph ph-chart-line-up"></i>
                      </div>
                      <div>
                        <h3 class="hero-card-title">Filing History</h3>
                        <p class="hero-card-subtitle">Compliance score over time</p>
                      </div>
                    </div>

                    <div class="hero-chart-container">
                      <svg
                        viewBox="0 0 ${CHART.width} ${CHART.height}"
                        class="hero-chart"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <!-- Gradient -->
                        <defs>
                          <linearGradient id="heroChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
                            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
                          </linearGradient>
                        </defs>

                        <!-- Grid lines -->
                        ${[25, 50, 75, 100].map(val => `
                          <line
                            x1="${CHART.padding.left}"
                            y1="${scaleY(val)}"
                            x2="${CHART.width - CHART.padding.right}"
                            y2="${scaleY(val)}"
                            class="hero-chart-grid-line"
                          />
                        `).join('')}

                        <!-- Y-axis labels -->
                        ${[0, 50, 100].map(val => `
                          <text
                            x="${CHART.padding.left - 6}"
                            y="${scaleY(val) + 3}"
                            text-anchor="end"
                            class="hero-chart-label"
                          >${val}%</text>
                        `).join('')}

                        <!-- X-axis labels -->
                        ${getMockFilingHistory().filter((_, i) => i % 2 === 0 || i === getMockFilingHistory().length - 1).map(d => `
                          <text
                            x="${scaleX(d.year)}"
                            y="${CHART.height - 6}"
                            text-anchor="middle"
                            class="hero-chart-label"
                          >${d.year}</text>
                        `).join('')}

                        <!-- Area fill -->
                        <path
                          d="${pathD} L ${scaleX(2025)} ${CHART.height - CHART.padding.bottom} L ${scaleX(2019)} ${CHART.height - CHART.padding.bottom} Z"
                          class="hero-chart-area"
                        />

                        <!-- Line path -->
                        <path
                          id="hero-chart-line"
                          d="${pathD}"
                          class="hero-chart-line"
                        />

                        <!-- Data points -->
                        ${getMockFilingHistory().map((d, i) => {
                          const x = scaleX(d.year);
                          const y = scaleY(d.status);
                          const isLate = i === 4;
                          return `
                            <circle
                              cx="${x}"
                              cy="${y}"
                              r="${isLate ? 5 : 3.5}"
                              class="hero-chart-point ${isLate ? 'hero-chart-point--warning' : ''}"
                              data-index="${i}"
                            />
                          `;
                        }).join('')}

                        <!-- Late filing marker -->
                        <g class="hero-warning-marker" id="hero-warning-marker">
                          <rect
                            x="${lateX - 24}"
                            y="${lateY - 32}"
                            width="48"
                            height="18"
                            rx="9"
                            class="hero-warning-marker-bg"
                          />
                          <text
                            x="${lateX}"
                            y="${lateY - 20}"
                            text-anchor="middle"
                            class="hero-warning-marker-text"
                          >Late</text>
                          <polygon
                            points="${lateX - 4},${lateY - 14} ${lateX + 4},${lateY - 14} ${lateX},${lateY - 8}"
                            class="hero-warning-marker-arrow"
                          />
                        </g>
                      </svg>
                    </div>

                    <div class="hero-warning-banner">
                      <div class="hero-warning-banner-icon">
                        <i class="ph ph-warning"></i>
                      </div>
                      <div>
                        <p class="hero-warning-banner-title">Late filing detected</p>
                        <p class="hero-warning-banner-text">Accounts submitted 3 months late in 2023</p>
                      </div>
                    </div>
                  </div>

                  <!-- Front Card - Risk Score -->
                  <div class="hero-card-front" id="hero-card-front">
                    <div class="hero-risk-header">
                      <div class="hero-risk-icon">
                        <i class="ph ph-pulse"></i>
                      </div>
                      <div>
                        <h4 class="hero-risk-title">Risk Engine</h4>
                        <p class="hero-risk-subtitle">12 signals analysed</p>
                      </div>
                    </div>

                    <div class="hero-risk-score">
                      <div class="hero-risk-ring">
                        <svg viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="19.5" class="hero-risk-ring-bg" />
                          <circle
                            cx="22"
                            cy="22"
                            r="19.5"
                            class="hero-risk-ring-fill"
                            id="hero-risk-ring-fill"
                            stroke-dasharray="122.52"
                            stroke-dashoffset="122.52"
                          />
                        </svg>
                        <div class="hero-risk-ring-value" id="hero-risk-value">0</div>
                      </div>
                      <div class="hero-risk-meta">
                        <div class="hero-risk-level">
                          <span class="hero-risk-level-label">Risk Level</span>
                          <span class="hero-risk-level-badge">MEDIUM</span>
                        </div>
                        <p class="hero-risk-checks">12 signals checked</p>
                      </div>
                    </div>

                    <div class="hero-flags">
                      <div class="hero-flags-header">
                        <span class="hero-flags-title">Flags Detected</span>
                        <span class="hero-flags-count">3</span>
                      </div>
                      <div class="hero-flags-list">
                        <div class="hero-flag-item">
                          <div class="hero-flag-dot hero-flag-dot--amber">
                            <i class="ph-bold ph-warning"></i>
                          </div>
                          <span class="hero-flag-text">Late filing history</span>
                        </div>
                        <div class="hero-flag-item">
                          <div class="hero-flag-dot hero-flag-dot--red">
                            <i class="ph-bold ph-x"></i>
                          </div>
                          <span class="hero-flag-text">Director dissolved co.</span>
                        </div>
                        <div class="hero-flag-item">
                          <div class="hero-flag-dot hero-flag-dot--amber">
                            <i class="ph-bold ph-warning"></i>
                          </div>
                          <span class="hero-flag-text">Virtual office address</span>
                        </div>
                      </div>
                    </div>
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
      this.verdictCard = document.getElementById('hero-verdict-card');
      this.searchForm = document.getElementById('hero-search-form');
      this.searchBtn = document.getElementById('hero-search-btn');
      this.searchError = document.getElementById('hero-search-error');
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
      const middleCard = document.getElementById('hero-card-middle');
      const frontCard = document.getElementById('hero-card-front');
      const chartLine = document.getElementById('hero-chart-line');
      const warningMarker = document.getElementById('hero-warning-marker');
      const chartPoints = document.querySelectorAll('.hero-chart-point');

      // Back card
      setTimeout(() => {
        if (backCard) backCard.classList.add('visible');
      }, 0);

      // Middle card
      setTimeout(() => {
        if (middleCard) middleCard.classList.add('visible');
      }, 150);

      // Chart line animation
      setTimeout(() => {
        if (chartLine) {
          const pathLength = chartLine.getTotalLength();
          chartLine.style.strokeDasharray = pathLength;
          chartLine.style.strokeDashoffset = pathLength;

          // Animate path
          let start = null;
          const duration = 1000;

          function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            chartLine.style.strokeDashoffset = pathLength * (1 - eased);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          }

          requestAnimationFrame(animate);
        }

        // Animate data points
        chartPoints.forEach((point, i) => {
          setTimeout(() => {
            point.classList.add('visible');
          }, i * 140);
        });
      }, 400);

      // Warning marker
      setTimeout(() => {
        if (warningMarker) warningMarker.classList.add('visible');
      }, 1200);

      // Front card
      setTimeout(() => {
        if (frontCard) frontCard.classList.add('visible');
      }, 1400);

      // Risk score animation
      setTimeout(() => {
        this.animateRiskScore(67);
      }, 1600);
    },

    // Animate risk score ring
    animateRiskScore(targetScore) {
      const ringFill = document.getElementById('hero-risk-ring-fill');
      const ringValue = document.getElementById('hero-risk-value');

      if (!ringFill || !ringValue) return;

      const circumference = 2 * Math.PI * 19.5; // 122.52
      const targetOffset = circumference - (targetScore / 100) * circumference;

      let currentScore = 0;
      const duration = 1000;
      const start = performance.now();

      function animate(timestamp) {
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        currentScore = Math.floor(eased * targetScore);
        ringValue.textContent = currentScore;

        const currentOffset = circumference - (currentScore / 100) * circumference;
        ringFill.style.strokeDashoffset = currentOffset;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }

      requestAnimationFrame(animate);
    },

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

    // Select a company and render verdict
    selectCompany(company) {
      this.searchInput.value = company.name;
      this.closeDropdown();
      this.renderVerdict(company);
    },

    // Render verdict card
    renderVerdict(company) {
      // Store current company for modal access
      this.currentCompany = company;

      const card = this.verdictCard;
      card.classList.remove('visible');

      const age = this.getCompanyAge(company.incorporated);
      const accountsDate = company.lastAccounts
        ? new Date(company.lastAccounts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Never filed';

      const badgeIcon = company.risk === 'low'
        ? 'ph-shield-check'
        : company.risk === 'medium'
        ? 'ph-shield-warning'
        : 'ph-shield-slash';

      card.innerHTML = `
        <div class="hero-verdict-header">
          <div>
            <h3 class="hero-verdict-company-name">${company.name}</h3>
            <p class="hero-verdict-company-meta">${company.number} · ${company.type}</p>
          </div>
          <div class="hero-verdict-badge hero-verdict-badge--${company.risk}">
            <i class="ph-fill ${badgeIcon}"></i>
            ${company.risk} risk
          </div>
        </div>
        <div class="hero-verdict-meta-row">
          <div class="hero-verdict-meta-item">
            <span class="hero-verdict-meta-label">Incorporated</span>
            <div class="hero-verdict-meta-value">${age}</div>
          </div>
          <div class="hero-verdict-meta-item">
            <span class="hero-verdict-meta-label">Status</span>
            <div class="hero-verdict-meta-value">${company.status}</div>
          </div>
          <div class="hero-verdict-meta-item">
            <span class="hero-verdict-meta-label">Last Accounts</span>
            <div class="hero-verdict-meta-value">${accountsDate}</div>
          </div>
          <div class="hero-verdict-meta-item">
            <span class="hero-verdict-meta-label">Sector</span>
            <div class="hero-verdict-meta-value">${company.sicCode.split(' - ')[1]}</div>
          </div>
        </div>
        <div class="hero-verdict-flags">
          ${company.flags
            .map(
              (f) => `
            <div class="hero-verdict-flag-item hero-verdict-flag-item--${f.type}">
              <i class="ph-fill ${f.icon}"></i>
              <span>${f.text}</span>
            </div>`
            )
            .join('')}
        </div>
        <div class="hero-verdict-recommendation">
          <i class="ph ph-lightbulb"></i>
          <span>${company.recommendation}</span>
        </div>
        <div class="hero-verdict-actions">
          <button class="hero-verdict-btn hero-verdict-btn--secondary" id="hero-view-free-btn">
            <i class="ph ph-file-text"></i>
            View Free Report
          </button>
          <button class="hero-verdict-btn hero-verdict-btn--primary" id="hero-view-premium-btn">
            <i class="ph ph-star"></i>
            Get Premium Report
          </button>
        </div>
      `;

      // Bind free report button
      const freeBtn = document.getElementById('hero-view-free-btn');
      if (freeBtn) {
        freeBtn.addEventListener('click', () => {
          if (window.CompanyWiseModal) {
            window.CompanyWiseModal.open(this.currentCompany);
          }
        });
      }

      // Bind premium report button
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
              // Spend failed — treat as no credits
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

      requestAnimationFrame(() => {
        card.classList.add('visible');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
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
