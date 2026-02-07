/* ============================================
   COMPANYWISE — modal.js
   Full report modal component
   Self-initializing with public API
   ============================================ */

(function() {
  'use strict';

  // ---- Utility ----
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Report Modal Component ----
  const ReportModal = {
    container: null,
    isOpen: false,
    currentCompany: null,

    // Initialize component
    init() {
      this.createContainer();
      this.bindGlobalEvents();
    },

    // Create persistent container in body
    createContainer() {
      const container = document.createElement('div');
      container.id = 'report-modal-root';
      document.body.appendChild(container);
      this.container = container;
    },

    // Bind global events (ESC key)
    bindGlobalEvents() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    },

    // Public: Open modal with company data
    open(company) {
      if (!company) return;

      this.currentCompany = company;
      this.render(company);
      this.show();
    },

    // Public: Close modal
    close() {
      this.hide();
    },

    // Render modal HTML
    render(company) {
      const age = this.getCompanyAge(company.incorporated);
      const lastAccountsDate = company.lastAccounts
        ? new Date(company.lastAccounts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Never filed';
      const nextAccountsDue = company.nextAccountsDue
        ? new Date(company.nextAccountsDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';
      const confirmationDue = company.confirmationDue
        ? new Date(company.confirmationDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';

      const badgeIcon = company.risk === 'low'
        ? 'ph-shield-check'
        : company.risk === 'medium'
        ? 'ph-shield-warning'
        : 'ph-shield-slash';

      // Check if accounts are overdue
      const isAccountsOverdue = company.nextAccountsDue && new Date(company.nextAccountsDue) < new Date();
      const isConfirmationOverdue = company.confirmationDue && new Date(company.confirmationDue) < new Date();

      this.container.innerHTML = `
        <div class="report-modal-overlay" id="report-modal">
          <div class="report-modal-backdrop" id="report-modal-backdrop"></div>
          <div class="report-modal-container">
            <div class="report-modal-content">

              <!-- Header -->
              <div class="report-modal-header">
                <div class="report-modal-header-inner">
                  <div class="report-modal-header-info">
                    <h2 class="report-modal-title">${company.name}</h2>
                    <p class="report-modal-subtitle">${company.number} · ${company.type}</p>
                  </div>
                  <div class="report-modal-header-actions">
                    <span class="report-modal-badge report-modal-badge--${company.risk}">
                      <i class="ph-fill ${badgeIcon}"></i>
                      ${company.risk} risk
                    </span>
                    <button class="report-modal-close" id="report-modal-close" aria-label="Close modal">
                      <i class="ph ph-x"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Body -->
              <div class="report-modal-body">
                <div class="report-modal-body-inner">

                <!-- Section: Company Overview -->
                <section class="report-section">
                  <h3 class="report-section-title">
                    <i class="ph ph-buildings"></i>
                    Company Overview
                  </h3>
                  <div class="report-section-content">
                    <div class="report-overview-grid">
                      <div class="report-overview-item">
                        <div class="report-overview-label">Status</div>
                        <div class="report-overview-value">${company.status}</div>
                      </div>
                      <div class="report-overview-item">
                        <div class="report-overview-label">Company Age</div>
                        <div class="report-overview-value">${age}</div>
                      </div>
                      <div class="report-overview-item">
                        <div class="report-overview-label">Incorporated</div>
                        <div class="report-overview-value">${new Date(company.incorporated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                      <div class="report-overview-item">
                        <div class="report-overview-label">Business Activity</div>
                        <div class="report-overview-value">${company.sicCode.split(' - ')[1] || company.sicCode}</div>
                      </div>
                    </div>
                    <div class="report-overview-grid" style="margin-top: 0.75rem;">
                      <div class="report-overview-item" style="grid-column: span 2;">
                        <div class="report-overview-label">Registered Address</div>
                        <div class="report-overview-value">${company.address}</div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- Section: Risk Analysis -->
                <section class="report-section">
                  <h3 class="report-section-title">
                    <i class="ph ph-shield-warning"></i>
                    Risk Analysis
                  </h3>
                  <div class="report-section-content">
                    <div class="report-flags-list">
                      ${company.flags.map(flag => `
                        <div class="report-flag-item report-flag-item--${flag.type}">
                          <i class="ph-fill ${flag.icon}"></i>
                          <span class="report-flag-text">${flag.text}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </section>

                <!-- Section: Filing Compliance -->
                <section class="report-section">
                  <h3 class="report-section-title">
                    <i class="ph ph-calendar-check"></i>
                    Filing Compliance
                  </h3>
                  <div class="report-section-content">
                    <div class="report-filing-grid">
                      <div class="report-filing-item">
                        <div class="report-filing-label">Last Accounts</div>
                        <div class="report-filing-value">${lastAccountsDate}</div>
                      </div>
                      <div class="report-filing-item ${isAccountsOverdue ? 'report-filing-item--danger' : ''}">
                        <div class="report-filing-label">Next Accounts Due</div>
                        <div class="report-filing-value">${nextAccountsDue}${isAccountsOverdue ? ' (Overdue)' : ''}</div>
                      </div>
                      <div class="report-filing-item ${isConfirmationOverdue ? 'report-filing-item--warning' : ''}">
                        <div class="report-filing-label">Confirmation Due</div>
                        <div class="report-filing-value">${confirmationDue}${isConfirmationOverdue ? ' (Overdue)' : ''}</div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- Section: Financial Snapshot (Premium-gated) -->
                ${this.renderPremiumGated(company, 'financial')}

                <!-- Section: Directors (Premium-gated) -->
                ${this.renderPremiumGated(company, 'directors')}

                <!-- Section: CCJs & Charges (Premium-gated) -->
                ${this.renderPremiumGated(company, 'ccjs')}

                <!-- Section: Recommendation -->
                <section class="report-section report-section--highlight">
                  <h3 class="report-section-title">
                    <i class="ph ph-lightbulb"></i>
                    Our Recommendation
                  </h3>
                  <div class="report-section-content">
                    <p class="report-recommendation-text">
                      ${company.detailedRecommendation || company.recommendation}
                    </p>
                  </div>
                </section>

                </div>
              </div>

              <!-- Footer -->
              <div class="report-modal-footer">
                <div class="report-modal-footer-inner">
                  <p class="report-modal-footer-text">
                    <i class="ph ph-database"></i>
                    Data sourced from Companies House
                  </p>
                  <div class="report-modal-footer-actions">
                    ${this.renderFooterUpgrade(company)}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      `;

      // Bind modal events
      this.bindModalEvents();
    },

    // Bind events for this modal instance
    bindModalEvents() {
      const closeBtn = document.getElementById('report-modal-close');
      const backdrop = document.getElementById('report-modal-backdrop');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      if (backdrop) {
        backdrop.addEventListener('click', () => this.close());
      }

      // Unlock buttons in locked sections
      this.container.querySelectorAll('.report-unlock-btn[data-unlock]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.CompanyWisePurchase) {
            window.CompanyWisePurchase.open();
          }
        });
      });

      // Footer upgrade button
      const footerUpgrade = document.getElementById('report-footer-upgrade');
      if (footerUpgrade) {
        footerUpgrade.addEventListener('click', () => {
          if (window.CompanyWisePurchase) {
            window.CompanyWisePurchase.open();
          }
        });
      }
    },

    // Show modal with animation
    show() {
      const overlay = document.getElementById('report-modal');
      if (!overlay) return;

      // Lock body scroll
      document.body.classList.add('modal-open');

      // Trigger animation
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });

      this.isOpen = true;
    },

    // Hide modal with animation
    hide() {
      const overlay = document.getElementById('report-modal');
      if (!overlay) return;

      // Remove active class (triggers fade out)
      overlay.classList.remove('active');

      // Re-enable body scroll
      document.body.classList.remove('modal-open');

      // Clean up after animation
      setTimeout(() => {
        this.container.innerHTML = '';
        this.currentCompany = null;
      }, 300);

      this.isOpen = false;
    },

    // Render Financial Snapshot section
    // Data structure expected from backend (maps to numeric_facts table):
    // company.financials = {
    //   accountsDate: "2025-07-31",           // from filings.balance_sheet_date
    //   periodStart: "2024-08-01",            // from filings.period_start_date
    //   periodEnd: "2025-07-31",              // from filings.period_end_date
    //
    //   // From numeric_facts (concept field, duration context)
    //   turnover: { current: 56737000, previous: 54722000 },
    //   grossProfit: { current: 16542000, previous: 15700000 },
    //   operatingProfit: { current: 2798000, previous: 4141000 },
    //
    //   // From numeric_facts (concept field, instant context)
    //   netAssets: { current: 14088000, previous: 12960000 },
    //   currentAssets: 11876000,
    //   currentLiabilities: 2900000,
    //   cash: 7113000,
    //   debtors: 3285000,
    //   stocks: 1478000,
    //
    //   // Derived (calculated in backend or frontend)
    //   workingCapitalRatio: 4.1,
    //   grossMargin: 0.29,
    // }
    renderFinancialSnapshot(company) {
      // Check if financial data is available
      if (!company.financials) {
        return `
          <section class="report-section">
            <h3 class="report-section-title">
              <i class="ph ph-chart-line-up"></i>
              Financial Snapshot
            </h3>
            <div class="report-section-content">
              <div class="report-placeholder">
                <i class="ph ph-chart-bar"></i>
                Financial data not available for this company. This may be a micro-entity filing without detailed accounts.
              </div>
            </div>
          </section>
        `;
      }

      const f = company.financials;
      const formatCurrency = (val) => {
        if (val === null || val === undefined) return '—';
        const abs = Math.abs(val);
        if (abs >= 1000000) return `£${(val / 1000000).toFixed(1)}m`;
        if (abs >= 1000) return `£${(val / 1000).toFixed(0)}k`;
        return `£${val.toLocaleString()}`;
      };

      const formatPercent = (val) => {
        if (val === null || val === undefined) return '—';
        return `${(val * 100).toFixed(1)}%`;
      };

      const calcYoY = (current, previous) => {
        if (!previous || previous === 0) return null;
        return ((current - previous) / Math.abs(previous));
      };

      const renderTrend = (current, previous) => {
        const yoy = calcYoY(current, previous);
        if (yoy === null) return '';
        const direction = yoy >= 0 ? 'up' : 'down';
        const sign = yoy >= 0 ? '+' : '';
        return `<div class="report-financial-trend trend--${direction}">${sign}${(yoy * 100).toFixed(1)}% YoY</div>`;
      };

      const accountsDateFormatted = f.accountsDate
        ? new Date(f.accountsDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Unknown';

      // Calculate working capital ratio if not provided
      const workingCapitalRatio = f.workingCapitalRatio
        || (f.currentAssets && f.currentLiabilities ? (f.currentAssets / f.currentLiabilities).toFixed(1) : null);

      return `
        <section class="report-section">
          <h3 class="report-section-title">
            <i class="ph ph-chart-line-up"></i>
            Financial Snapshot
          </h3>
          <div class="report-section-content">

            <!-- Key Metrics Grid -->
            <div class="report-financials-grid">
              ${f.turnover ? `
              <div class="report-financial-item">
                <div class="report-financial-label">Turnover</div>
                <div class="report-financial-value">${formatCurrency(f.turnover.current)}</div>
                ${renderTrend(f.turnover.current, f.turnover.previous)}
              </div>
              ` : ''}
              ${f.grossProfit ? `
              <div class="report-financial-item">
                <div class="report-financial-label">Gross Profit</div>
                <div class="report-financial-value">${formatCurrency(f.grossProfit.current)}</div>
                ${renderTrend(f.grossProfit.current, f.grossProfit.previous)}
              </div>
              ` : ''}
              ${f.netAssets ? `
              <div class="report-financial-item">
                <div class="report-financial-label">Net Assets</div>
                <div class="report-financial-value">${formatCurrency(f.netAssets.current)}</div>
                ${renderTrend(f.netAssets.current, f.netAssets.previous)}
              </div>
              ` : ''}
              ${f.cash !== undefined ? `
              <div class="report-financial-item">
                <div class="report-financial-label">Cash Position</div>
                <div class="report-financial-value">${formatCurrency(f.cash)}</div>
              </div>
              ` : ''}
            </div>

            <!-- Balance Sheet Summary -->
            ${(f.currentAssets || f.currentLiabilities) ? `
            <div class="report-balance-summary">
              ${f.currentAssets !== undefined ? `
              <div class="report-balance-row">
                <span class="report-balance-label">Current Assets</span>
                <span class="report-balance-value">${formatCurrency(f.currentAssets)}</span>
              </div>
              ` : ''}
              ${f.currentLiabilities !== undefined ? `
              <div class="report-balance-row">
                <span class="report-balance-label">Current Liabilities</span>
                <span class="report-balance-value">${formatCurrency(f.currentLiabilities)}</span>
              </div>
              ` : ''}
              ${workingCapitalRatio ? `
              <div class="report-balance-row report-balance-row--highlight">
                <span class="report-balance-label">Working Capital Ratio</span>
                <span class="report-balance-value ${parseFloat(workingCapitalRatio) >= 1.5 ? 'report-balance-value--good' : parseFloat(workingCapitalRatio) >= 1 ? 'report-balance-value--warning' : 'report-balance-value--danger'}">${workingCapitalRatio}x</span>
              </div>
              ` : ''}
            </div>
            ` : ''}

            <!-- Additional Line Items (if available) -->
            ${(f.stocks || f.debtors) ? `
            <div class="report-balance-details">
              ${f.debtors !== undefined ? `
              <div class="report-balance-detail-item">
                <span class="report-balance-detail-label">Trade Debtors</span>
                <span class="report-balance-detail-value">${formatCurrency(f.debtors)}</span>
              </div>
              ` : ''}
              ${f.stocks !== undefined ? `
              <div class="report-balance-detail-item">
                <span class="report-balance-detail-label">Stock</span>
                <span class="report-balance-detail-value">${formatCurrency(f.stocks)}</span>
              </div>
              ` : ''}
            </div>
            ` : ''}

            <!-- Accounts Age Notice -->
            <div class="report-accounts-age">
              <i class="ph ph-info"></i>
              Based on accounts dated ${accountsDateFormatted}
            </div>

          </div>
        </section>
      `;
    },

    // Check if user has premium access for this company
    hasPremiumAccess(company) {
      const Wallet = window.CompanyWiseWallet;
      return Wallet && Wallet.hasAccess(company.number);
    },

    // Render a premium-gated section (blurred if locked)
    renderPremiumGated(company, sectionType) {
      const unlocked = this.hasPremiumAccess(company);

      if (sectionType === 'financial') {
        if (unlocked) {
          return this.renderFinancialSnapshot(company);
        }
        return `
          <section class="report-section report-locked-section" data-locked="financial">
            <h3 class="report-section-title">
              <i class="ph ph-chart-line-up"></i>
              Financial Snapshot
              <span class="report-premium-badge"><i class="ph ph-star"></i> Premium</span>
            </h3>
            <div class="report-section-content report-locked-blur">
              <div class="report-financials-grid">
                <div class="report-financial-item">
                  <div class="report-financial-label">Turnover</div>
                  <div class="report-financial-value">\u00A3XX.Xm</div>
                </div>
                <div class="report-financial-item">
                  <div class="report-financial-label">Gross Profit</div>
                  <div class="report-financial-value">\u00A3X.Xm</div>
                </div>
                <div class="report-financial-item">
                  <div class="report-financial-label">Net Assets</div>
                  <div class="report-financial-value">\u00A3XX.Xm</div>
                </div>
                <div class="report-financial-item">
                  <div class="report-financial-label">Cash Position</div>
                  <div class="report-financial-value">\u00A3X.Xm</div>
                </div>
              </div>
            </div>
            <div class="report-locked-overlay">
              <button class="report-unlock-btn" data-unlock="financial">
                <i class="ph ph-lock-simple-open"></i>
                Unlock with Premium
              </button>
            </div>
          </section>
        `;
      }

      if (sectionType === 'directors') {
        if (unlocked) {
          return `
            <section class="report-section">
              <h3 class="report-section-title">
                <i class="ph ph-users"></i>
                Directors
              </h3>
              <div class="report-section-content">
                ${company.directors && company.directors.length > 0 ? `
                  <div class="report-directors-list">
                    ${company.directors.map(director => `
                      <div class="report-director-item">
                        <div class="report-director-avatar">
                          <i class="ph ph-user"></i>
                        </div>
                        <div class="report-director-info">
                          <div class="report-director-name">${director.name}</div>
                          <div class="report-director-meta">${director.role} \u00B7 Appointed ${new Date(director.appointed).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div class="report-placeholder">
                    <i class="ph ph-user-circle-dashed"></i>
                    Director information will be available when connected to Companies House API
                  </div>
                `}
              </div>
            </section>
          `;
        }

        const dirCount = company.directors ? company.directors.length : 0;
        return `
          <section class="report-section report-locked-section" data-locked="directors">
            <h3 class="report-section-title">
              <i class="ph ph-users"></i>
              Directors${dirCount > 0 ? ` (${dirCount})` : ''}
              <span class="report-premium-badge"><i class="ph ph-star"></i> Premium</span>
            </h3>
            <div class="report-section-content report-locked-blur">
              <div class="report-directors-list">
                <div class="report-director-item">
                  <div class="report-director-avatar"><i class="ph ph-user"></i></div>
                  <div class="report-director-info">
                    <div class="report-director-name">Director Name Hidden</div>
                    <div class="report-director-meta">Role \u00B7 Appointed Jan 2020</div>
                  </div>
                </div>
                <div class="report-director-item">
                  <div class="report-director-avatar"><i class="ph ph-user"></i></div>
                  <div class="report-director-info">
                    <div class="report-director-name">Director Name Hidden</div>
                    <div class="report-director-meta">Role \u00B7 Appointed Mar 2019</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="report-locked-overlay">
              <button class="report-unlock-btn" data-unlock="directors">
                <i class="ph ph-lock-simple-open"></i>
                Unlock with Premium
              </button>
            </div>
          </section>
        `;
      }

      if (sectionType === 'ccjs') {
        if (unlocked) {
          return `
            <section class="report-section">
              <h3 class="report-section-title">
                <i class="ph ph-gavel"></i>
                CCJs & Charges
              </h3>
              <div class="report-section-content">
                <div class="report-placeholder">
                  <i class="ph ph-shield-check"></i>
                  No registered charges or CCJs found. This data will be enriched from Companies House API.
                </div>
              </div>
            </section>
          `;
        }

        return `
          <section class="report-section report-locked-section" data-locked="ccjs">
            <h3 class="report-section-title">
              <i class="ph ph-gavel"></i>
              CCJs & Charges
              <span class="report-premium-badge"><i class="ph ph-star"></i> Premium</span>
            </h3>
            <div class="report-section-content report-locked-blur">
              <div class="report-placeholder">
                <i class="ph ph-gavel"></i>
                County Court Judgements and charge data
              </div>
            </div>
            <div class="report-locked-overlay">
              <button class="report-unlock-btn" data-unlock="ccjs">
                <i class="ph ph-lock-simple-open"></i>
                Unlock with Premium
              </button>
            </div>
          </section>
        `;
      }

      return '';
    },

    // Render footer upgrade CTA + credit badge
    renderFooterUpgrade(company) {
      const Wallet = window.CompanyWiseWallet;
      const hasAccess = this.hasPremiumAccess(company);

      if (hasAccess) {
        const balance = Wallet ? Wallet.getBalance() : 0;
        return `
          <span class="report-modal-footer-text" style="color: var(--risk-low);">
            <i class="ph-fill ph-shield-check"></i>
            Premium unlocked
          </span>
          ${balance > 0 ? `<span class="report-modal-footer-text"><i class="ph-fill ph-star"></i> ${balance} credit${balance !== 1 ? 's' : ''} left</span>` : ''}
        `;
      }

      return `
        <button class="report-unlock-btn report-unlock-btn--footer" id="report-footer-upgrade">
          <i class="ph ph-star"></i>
          Get Premium Access
        </button>
      `;
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
    }
  };

  // ---- Export Global API ----
  window.CompanyWiseModal = {
    open: (company) => ReportModal.open(company),
    close: () => ReportModal.close(),
    isOpen: () => ReportModal.isOpen
  };

  // ---- Auto-Initialize ----
  document.addEventListener('DOMContentLoaded', () => {
    ReportModal.init();
  });

})();
