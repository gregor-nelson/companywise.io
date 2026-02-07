/* ============================================
   COMPANYWISE — premium-report.js
   Full-page premium report component
   Self-initializing with public API

   Renders a detailed company report with:
   - Risk score overview
   - Company overview
   - Risk analysis (flags)
   - Filing compliance timeline
   - Financial deep dive
   - Directors & officers
   - CCJs & charges
   - Recommendation & action items
   ============================================ */

(function () {
  'use strict';

  // ---- Utility ----
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Premium Report Component ----
  const PremiumReport = {
    container: null,
    company: null,

    init() {
      this.container = document.getElementById('premium-report-container');
      if (!this.container) return;

      this.company = this.getCompanyFromContext();
      if (!this.company) {
        this.renderEmpty();
        return;
      }

      const Wallet = window.CompanyWiseWallet;
      const companyNumber = this.company.number;

      // Already has access — render immediately
      if (Wallet && Wallet.hasAccess(companyNumber)) {
        this.render(this.company);
        this.initScrollReveal();
        return;
      }

      // Has credits — spend one and render
      if (Wallet && Wallet.getBalance() > 0) {
        if (Wallet.spendCredit(companyNumber)) {
          this.render(this.company);
          this.initScrollReveal();
        } else {
          this.renderAccessDenied();
        }
        return;
      }

      // No access, no credits — show access denied with upgrade prompt
      this.renderAccessDenied();
    },

    renderAccessDenied() {
      this.container.innerHTML = `
        <div class="pr-placeholder" style="padding: 6rem 1rem;">
          <div style="width: 3.5rem; height: 3.5rem; border-radius: 1rem; background: linear-gradient(to bottom right, #eff6ff, rgba(219, 234, 254, 0.5)); border: 1px solid rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
            <i class="ph ph-lock-simple" style="font-size: 1.5rem; color: var(--blue-500);"></i>
          </div>
          <h2 style="font-family: var(--font); font-size: 1.5rem; font-weight: 700; color: var(--text-900); margin: 0 0 0.5rem;">Premium Report</h2>
          <p class="pr-placeholder-text" style="max-width: 400px; margin: 0 auto 1.5rem;">
            You need credits to view this premium report. Purchase a credit pack to unlock detailed financial analysis, director history, and more.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn-primary" id="pr-buy-credits">
              <i class="ph ph-star"></i>
              Buy Credits
            </button>
            <a href="../../../pages/Home/home.html" class="btn-secondary">
              <i class="ph ph-arrow-left"></i>
              Back to search
            </a>
          </div>
        </div>
      `;

      const buyBtn = document.getElementById('pr-buy-credits');
      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          if (window.CompanyWisePurchase) {
            window.CompanyWisePurchase.open();
          }
        });
      }
    },

    // Resolve company data — checks URL params, then falls back to mock
    getCompanyFromContext() {
      const params = new URLSearchParams(window.location.search);
      const companyNumber = params.get('company');

      // Try mock data for development
      if (window.CompanyWiseMockData) {
        if (companyNumber) {
          return window.CompanyWiseMockData.findCompany(companyNumber);
        }
        // Default to first company with financials for demo
        return window.CompanyWiseMockData.companies.find(c => c.financials) ||
               window.CompanyWiseMockData.companies[0];
      }

      return null;
    },

    // ---- Main Render ----
    render(company) {
      const c = company;
      this.container.innerHTML = `
        ${this.renderBreadcrumb(c)}
        ${this.renderHeader(c)}
        ${this.renderScoreCard(c)}
        <div class="pr-sections">
          ${this.renderOverview(c)}
          ${this.renderRiskAnalysis(c)}
          ${this.renderFilingCompliance(c)}
          ${this.renderFinancials(c)}
          ${this.renderDirectors(c)}
          ${this.renderCharges(c)}
          ${this.renderRecommendation(c)}
        </div>
        ${this.renderReportFooter(c)}
      `;
    },

    // ---- Empty State ----
    renderEmpty() {
      this.container.innerHTML = `
        <div class="pr-placeholder" style="padding: 6rem 1rem;">
          <i class="ph ph-magnifying-glass"></i>
          <p class="pr-placeholder-text">
            No company data available. Please run a company check from the home page first.
          </p>
          <a href="../../../pages/Home/home.html" class="btn-primary" style="margin-top: 1.5rem;">
            <i class="ph ph-arrow-left"></i>
            Back to search
          </a>
        </div>
      `;
    },

    // ---- Breadcrumb ----
    renderBreadcrumb(c) {
      return `
        <nav class="pr-breadcrumb pr-fade-up">
          <a href="../../../pages/Home/home.html">Home</a>
          <i class="ph ph-caret-right"></i>
          <span>${escapeHtml(c.name)}</span>
        </nav>
      `;
    },

    // ---- Report Header ----
    renderHeader(c) {
      const badgeIcon = c.risk === 'low'
        ? 'ph-shield-check'
        : c.risk === 'medium'
        ? 'ph-shield-warning'
        : 'ph-shield-slash';

      const now = new Date();
      const generated = now.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      return `
        <div class="pr-header pr-fade-up">
          <div class="pr-header-top">
            <div class="pr-header-info">
              <h1 class="pr-company-name">${escapeHtml(c.name)}</h1>
              <p class="pr-company-meta">${escapeHtml(c.number)} · ${escapeHtml(c.type)}</p>
            </div>
            <div class="pr-header-actions">
              <span class="pr-badge pr-badge--${c.risk}">
                <i class="ph-fill ${badgeIcon}"></i>
                ${c.risk} risk
              </span>
            </div>
          </div>
          <div class="pr-header-meta">
            <div class="pr-meta-item">
              <i class="ph ph-calendar-blank"></i>
              Generated ${generated}
            </div>
            <div class="pr-meta-item">
              <i class="ph ph-database"></i>
              Companies House data
            </div>
            <div class="pr-meta-item">
              <i class="ph ph-star"></i>
              Premium report
            </div>
          </div>
        </div>
      `;
    },

    // ---- Risk Score Card ----
    renderScoreCard(c) {
      const score = c.riskScore || this.deriveScore(c);
      const circumference = 2 * Math.PI * 48;
      const offset = circumference - (score / 100) * circumference;

      const positiveFlags = c.flags.filter(f => f.type === 'green').length;
      const negativeFlags = c.flags.filter(f => f.type === 'red').length;
      const neutralFlags = c.flags.filter(f => f.type === 'amber').length;

      return `
        <div class="pr-score-card pr-fade-up">
          <div class="pr-score-ring">
            <svg viewBox="0 0 120 120">
              <circle class="pr-score-ring-bg" cx="60" cy="60" r="48" />
              <circle class="pr-score-ring-fill pr-score-ring-fill--${c.risk}"
                cx="60" cy="60" r="48"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}" />
            </svg>
            <div class="pr-score-value">
              <span class="pr-score-number pr-score-number--${c.risk}">${score}</span>
              <span class="pr-score-label">/ 100</span>
            </div>
          </div>
          <div class="pr-score-details">
            <h2 class="pr-score-title">
              ${c.risk === 'low' ? 'Low Risk — Likely Safe'
                : c.risk === 'medium' ? 'Medium Risk — Proceed with Caution'
                : 'High Risk — Significant Concerns'}
            </h2>
            <p class="pr-score-summary">${c.detailedRecommendation || c.recommendation}</p>
            <div class="pr-score-factors">
              ${positiveFlags > 0 ? `
                <span class="pr-score-factor pr-score-factor--positive">
                  <i class="ph-fill ph-check-circle"></i>
                  ${positiveFlags} positive signal${positiveFlags > 1 ? 's' : ''}
                </span>
              ` : ''}
              ${neutralFlags > 0 ? `
                <span class="pr-score-factor pr-score-factor--neutral">
                  <i class="ph-fill ph-warning-circle"></i>
                  ${neutralFlags} caution${neutralFlags > 1 ? 's' : ''}
                </span>
              ` : ''}
              ${negativeFlags > 0 ? `
                <span class="pr-score-factor pr-score-factor--negative">
                  <i class="ph-fill ph-x-circle"></i>
                  ${negativeFlags} red flag${negativeFlags > 1 ? 's' : ''}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    },

    // ---- Company Overview ----
    renderOverview(c) {
      const age = this.getCompanyAge(c.incorporated);
      const incDate = new Date(c.incorporated).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      const sicDescription = c.sicCode.split(' - ')[1] || c.sicCode;

      return `
        <div class="pr-section pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon">
              <i class="ph ph-buildings"></i>
            </div>
            <h3 class="pr-section-title">Company Overview</h3>
          </div>
          <div class="pr-section-body">
            <div class="pr-overview-grid">
              <div class="pr-overview-item">
                <div class="pr-overview-label">Status</div>
                <div class="pr-overview-value">${c.status}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Company Age</div>
                <div class="pr-overview-value">${age}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Incorporated</div>
                <div class="pr-overview-value">${incDate}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Company Type</div>
                <div class="pr-overview-value">${c.type}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">SIC Code</div>
                <div class="pr-overview-value">${c.sicCode.split(' - ')[0]}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Business Activity</div>
                <div class="pr-overview-value">${sicDescription}</div>
              </div>
              <div class="pr-overview-item pr-overview-item--full">
                <div class="pr-overview-label">Registered Address</div>
                <div class="pr-overview-value">${escapeHtml(c.address)}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // ---- Risk Analysis ----
    renderRiskAnalysis(c) {
      if (!c.flags || c.flags.length === 0) return '';

      return `
        <div class="pr-section pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon ${c.risk === 'high' ? 'pr-section-icon--red' : c.risk === 'medium' ? 'pr-section-icon--amber' : 'pr-section-icon--emerald'}">
              <i class="ph ph-shield-warning"></i>
            </div>
            <h3 class="pr-section-title">Risk Analysis</h3>
          </div>
          <div class="pr-section-body">
            <div class="pr-flags-list">
              ${c.flags.map(flag => `
                <div class="pr-flag pr-flag--${flag.type}">
                  <i class="ph-fill ${flag.icon}"></i>
                  <div class="pr-flag-content">
                    <div class="pr-flag-text">${flag.text}</div>
                    ${flag.detail ? `<div class="pr-flag-detail">${flag.detail}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    // ---- Filing Compliance ----
    renderFilingCompliance(c) {
      const lastAcc = c.lastAccounts
        ? new Date(c.lastAccounts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Never filed';
      const nextAcc = c.nextAccountsDue
        ? new Date(c.nextAccountsDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';
      const confDue = c.confirmationDue
        ? new Date(c.confirmationDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';

      const isAccountsOverdue = c.nextAccountsDue && new Date(c.nextAccountsDue) < new Date();
      const isConfirmationOverdue = c.confirmationDue && new Date(c.confirmationDue) < new Date();

      // Build timeline from filing history if available
      const timeline = this.buildTimeline(c);

      return `
        <div class="pr-section pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon">
              <i class="ph ph-calendar-check"></i>
            </div>
            <h3 class="pr-section-title">Filing Compliance</h3>
          </div>
          <div class="pr-section-body">
            <div class="pr-filing-stats">
              <div class="pr-filing-stat">
                <div class="pr-filing-stat-label">Last Accounts</div>
                <div class="pr-filing-stat-value">${lastAcc}</div>
              </div>
              <div class="pr-filing-stat ${isAccountsOverdue ? 'pr-filing-stat--danger' : ''}">
                <div class="pr-filing-stat-label">Next Accounts Due</div>
                <div class="pr-filing-stat-value">${nextAcc}${isAccountsOverdue ? ' (Overdue)' : ''}</div>
              </div>
              <div class="pr-filing-stat ${isConfirmationOverdue ? 'pr-filing-stat--warning' : ''}">
                <div class="pr-filing-stat-label">Confirmation Due</div>
                <div class="pr-filing-stat-value">${confDue}${isConfirmationOverdue ? ' (Overdue)' : ''}</div>
              </div>
            </div>
            ${timeline.length > 0 ? `
              <div class="pr-timeline">
                ${timeline.map(item => `
                  <div class="pr-timeline-item">
                    <div class="pr-timeline-dot pr-timeline-dot--${item.status}"></div>
                    <div class="pr-timeline-date">${item.date}</div>
                    <div class="pr-timeline-label">${item.label}</div>
                    ${item.detail ? `<div class="pr-timeline-detail">${item.detail}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="pr-placeholder">
                <i class="ph ph-clock-countdown"></i>
                <p class="pr-placeholder-text">
                  Detailed filing history will be available when connected to the Companies House API.
                </p>
              </div>
            `}
          </div>
        </div>
      `;
    },

    // ---- Financial Deep Dive ----
    renderFinancials(c) {
      if (!c.financials) {
        return `
          <div class="pr-section pr-fade-up">
            <div class="pr-section-header">
              <div class="pr-section-icon">
                <i class="ph ph-chart-line-up"></i>
              </div>
              <h3 class="pr-section-title">Financial Deep Dive</h3>
            </div>
            <div class="pr-section-body">
              <div class="pr-placeholder">
                <i class="ph ph-chart-bar"></i>
                <p class="pr-placeholder-text">
                  Financial data not available for this company. This may be a micro-entity filing without detailed accounts.
                </p>
              </div>
            </div>
          </div>
        `;
      }

      const f = c.financials;
      const fmt = this.formatCurrency;
      const pct = this.formatPercent;
      const yoy = this.calcYoY;

      const accountsDate = f.accountsDate
        ? new Date(f.accountsDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Unknown';

      const workingCapitalRatio = f.workingCapitalRatio
        || (f.currentAssets && f.currentLiabilities ? (f.currentAssets / f.currentLiabilities).toFixed(1) : null);

      const grossMargin = f.grossMargin
        || (f.grossProfit && f.turnover ? f.grossProfit.current / f.turnover.current : null);

      return `
        <div class="pr-section pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon">
              <i class="ph ph-chart-line-up"></i>
            </div>
            <h3 class="pr-section-title">Financial Deep Dive</h3>
          </div>
          <div class="pr-section-body">
            <!-- Key Metrics -->
            <div class="pr-financials-grid">
              ${f.turnover ? `
                <div class="pr-financial-card">
                  <div class="pr-financial-label">Turnover</div>
                  <div class="pr-financial-value">${fmt(f.turnover.current)}</div>
                  ${this.renderTrend(f.turnover.current, f.turnover.previous)}
                </div>
              ` : ''}
              ${f.grossProfit ? `
                <div class="pr-financial-card">
                  <div class="pr-financial-label">Gross Profit</div>
                  <div class="pr-financial-value">${fmt(f.grossProfit.current)}</div>
                  ${this.renderTrend(f.grossProfit.current, f.grossProfit.previous)}
                </div>
              ` : ''}
              ${f.operatingProfit ? `
                <div class="pr-financial-card">
                  <div class="pr-financial-label">Operating Profit</div>
                  <div class="pr-financial-value">${fmt(f.operatingProfit.current)}</div>
                  ${this.renderTrend(f.operatingProfit.current, f.operatingProfit.previous)}
                </div>
              ` : ''}
              ${f.netAssets ? `
                <div class="pr-financial-card">
                  <div class="pr-financial-label">Net Assets</div>
                  <div class="pr-financial-value">${fmt(f.netAssets.current)}</div>
                  ${this.renderTrend(f.netAssets.current, f.netAssets.previous)}
                </div>
              ` : ''}
            </div>

            <!-- Balance Sheet -->
            ${(f.currentAssets !== undefined || f.currentLiabilities !== undefined || f.cash !== undefined) ? `
              <div class="pr-balance-table">
                ${f.cash !== undefined ? `
                  <div class="pr-balance-row">
                    <span class="pr-balance-label">Cash at Bank</span>
                    <span class="pr-balance-value">${fmt(f.cash)}</span>
                  </div>
                ` : ''}
                ${f.debtors !== undefined ? `
                  <div class="pr-balance-row">
                    <span class="pr-balance-label">Trade Debtors</span>
                    <span class="pr-balance-value">${fmt(f.debtors)}</span>
                  </div>
                ` : ''}
                ${f.stocks !== undefined ? `
                  <div class="pr-balance-row">
                    <span class="pr-balance-label">Stock</span>
                    <span class="pr-balance-value">${fmt(f.stocks)}</span>
                  </div>
                ` : ''}
                ${f.currentAssets !== undefined ? `
                  <div class="pr-balance-row pr-balance-row--highlight">
                    <span class="pr-balance-label">Total Current Assets</span>
                    <span class="pr-balance-value" style="font-weight: 700;">${fmt(f.currentAssets)}</span>
                  </div>
                ` : ''}
                ${f.currentLiabilities !== undefined ? `
                  <div class="pr-balance-row">
                    <span class="pr-balance-label">Current Liabilities</span>
                    <span class="pr-balance-value">${fmt(f.currentLiabilities)}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Key Ratios -->
            <div class="pr-ratios-grid">
              ${workingCapitalRatio ? `
                <div class="pr-ratio-card">
                  <div class="pr-ratio-value ${parseFloat(workingCapitalRatio) >= 1.5 ? 'pr-balance-value--good' : parseFloat(workingCapitalRatio) >= 1 ? 'pr-balance-value--warning' : 'pr-balance-value--danger'}">
                    ${workingCapitalRatio}x
                  </div>
                  <div class="pr-ratio-label">Working Capital</div>
                </div>
              ` : ''}
              ${grossMargin ? `
                <div class="pr-ratio-card">
                  <div class="pr-ratio-value">${pct(grossMargin)}</div>
                  <div class="pr-ratio-label">Gross Margin</div>
                </div>
              ` : ''}
              ${f.cash !== undefined && f.currentLiabilities ? `
                <div class="pr-ratio-card">
                  <div class="pr-ratio-value ${(f.cash / f.currentLiabilities) >= 1 ? 'pr-balance-value--good' : 'pr-balance-value--warning'}">
                    ${(f.cash / f.currentLiabilities).toFixed(1)}x
                  </div>
                  <div class="pr-ratio-label">Cash Ratio</div>
                </div>
              ` : ''}
            </div>

            <div class="pr-accounts-notice">
              <i class="ph ph-info"></i>
              Based on accounts dated ${accountsDate}
            </div>
          </div>
        </div>
      `;
    },

    // ---- Directors & Officers ----
    renderDirectors(c) {
      const hasDirectors = c.directors && c.directors.length > 0;

      return `
        <div class="pr-section pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon">
              <i class="ph ph-users"></i>
            </div>
            <h3 class="pr-section-title">Directors & Officers</h3>
          </div>
          <div class="pr-section-body">
            ${hasDirectors ? `
              <div class="pr-directors-list">
                ${c.directors.map(dir => {
                  const appointedDate = new Date(dir.appointed).toLocaleDateString('en-GB', {
                    month: 'short', year: 'numeric'
                  });
                  return `
                    <div class="pr-director-card">
                      <div class="pr-director-avatar">
                        <i class="ph ph-user"></i>
                      </div>
                      <div class="pr-director-info">
                        <div class="pr-director-name">${escapeHtml(dir.name)}</div>
                        <div class="pr-director-role">${escapeHtml(dir.role)} · Appointed ${appointedDate}</div>
                        <div class="pr-director-tags">
                          <span class="pr-director-tag pr-director-tag--info">
                            <i class="ph ph-calendar-blank"></i>
                            ${appointedDate}
                          </span>
                          ${dir.otherCompanies ? `
                            <span class="pr-director-tag pr-director-tag--info">
                              <i class="ph ph-buildings"></i>
                              ${dir.otherCompanies} other companies
                            </span>
                          ` : ''}
                          ${dir.dissolvedCompanies ? `
                            <span class="pr-director-tag pr-director-tag--${dir.dissolvedCompanies >= 3 ? 'danger' : 'warning'}">
                              <i class="ph ph-warning"></i>
                              ${dir.dissolvedCompanies} dissolved
                            </span>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="pr-placeholder">
                <i class="ph ph-user-circle-dashed"></i>
                <p class="pr-placeholder-text">
                  Director information will be available when connected to the Companies House API.
                </p>
              </div>
            `}
          </div>
        </div>
      `;
    },

    // ---- CCJs & Charges ----
    renderCharges(c) {
      const hasCharges = c.charges && c.charges.length > 0;

      return `
        <div class="pr-section pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon">
              <i class="ph ph-gavel"></i>
            </div>
            <h3 class="pr-section-title">CCJs & Charges</h3>
          </div>
          <div class="pr-section-body">
            ${hasCharges ? `
              <div class="pr-charges-list">
                ${c.charges.map(charge => `
                  <div class="pr-charge-item">
                    <div class="pr-charge-icon pr-charge-icon--${charge.status === 'satisfied' ? 'satisfied' : 'active'}">
                      <i class="ph ${charge.status === 'satisfied' ? 'ph-check' : 'ph-warning'}"></i>
                    </div>
                    <div class="pr-charge-info">
                      <div class="pr-charge-title">${charge.description}</div>
                      <div class="pr-charge-meta">
                        ${charge.holder ? `Holder: ${charge.holder} · ` : ''}
                        ${charge.created ? `Created ${new Date(charge.created).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ''}
                        ${charge.status ? ` · ${charge.status.charAt(0).toUpperCase() + charge.status.slice(1)}` : ''}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="pr-placeholder">
                <i class="ph ph-shield-check"></i>
                <p class="pr-placeholder-text">
                  No registered charges or CCJs found. This data will be enriched from Companies House API.
                </p>
              </div>
            `}
          </div>
        </div>
      `;
    },

    // ---- Recommendation ----
    renderRecommendation(c) {
      const actions = this.getActionItems(c);

      return `
        <div class="pr-section pr-section--recommendation pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon">
              <i class="ph ph-lightbulb"></i>
            </div>
            <h3 class="pr-section-title">Our Recommendation</h3>
          </div>
          <div class="pr-section-body">
            <p class="pr-recommendation-text">
              ${c.detailedRecommendation || c.recommendation}
            </p>
            ${actions.length > 0 ? `
              <div class="pr-action-items">
                ${actions.map(action => `
                  <div class="pr-action-item">
                    <i class="ph-fill ph-arrow-circle-right"></i>
                    <span>${action}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    },

    // ---- Report Footer ----
    renderReportFooter(c) {
      return `
        <div class="pr-report-footer pr-fade-up">
          <div class="pr-report-footer-info">
            <p class="pr-report-footer-text">
              <i class="ph ph-database"></i>
              Data sourced from Companies House
            </p>
            <p class="pr-report-footer-text">
              <i class="ph ph-info"></i>
              This report is for informational purposes only and does not constitute financial advice.
            </p>
          </div>
          <div class="pr-report-footer-actions">
            <button class="btn-secondary" disabled title="Coming soon">
              <i class="ph ph-file-pdf"></i>
              Download PDF
            </button>
          </div>
        </div>
      `;
    },

    // ---- Helpers ----

    buildTimeline(c) {
      const timeline = [];

      // Build from filing history if available
      if (window.CompanyWiseMockData && window.CompanyWiseMockData.filingHistory) {
        const history = window.CompanyWiseMockData.filingHistory.filter(
          f => f.companyNumber === c.number
        );
        history.slice(0, 6).forEach(filing => {
          const date = new Date(filing.date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
          timeline.push({
            date,
            label: filing.type,
            detail: filing.description || null,
            status: filing.overdue ? 'danger' : 'success'
          });
        });
      }

      // Fall back to key dates from the company object
      if (timeline.length === 0) {
        if (c.lastAccounts) {
          timeline.push({
            date: new Date(c.lastAccounts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            label: 'Last Accounts Filed',
            detail: null,
            status: 'success'
          });
        }
        if (c.nextAccountsDue) {
          const overdue = new Date(c.nextAccountsDue) < new Date();
          timeline.push({
            date: new Date(c.nextAccountsDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            label: overdue ? 'Accounts Overdue' : 'Next Accounts Due',
            detail: overdue ? 'This filing is overdue' : null,
            status: overdue ? 'danger' : 'warning'
          });
        }
        if (c.confirmationDue) {
          const overdue = new Date(c.confirmationDue) < new Date();
          timeline.push({
            date: new Date(c.confirmationDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            label: overdue ? 'Confirmation Statement Overdue' : 'Confirmation Statement Due',
            detail: overdue ? 'This filing is overdue' : null,
            status: overdue ? 'warning' : 'success'
          });
        }
      }

      return timeline;
    },

    getActionItems(c) {
      const actions = [];

      if (c.risk === 'high') {
        actions.push('Request 100% payment upfront before starting work.');
        actions.push('Consider using an escrow service for larger projects.');
        actions.push('Get a signed contract with clear payment terms and late payment penalties.');
      } else if (c.risk === 'medium') {
        actions.push('Request a deposit or milestone-based payment schedule.');
        actions.push('Include clear payment terms (e.g. 14-day net) in your contract.');
        actions.push('Set up a reminder system for invoice follow-ups.');
      } else {
        actions.push('Standard payment terms are likely appropriate for this client.');
        actions.push('Consider offering Net 30 terms for ongoing relationships.');
      }

      return actions;
    },

    deriveScore(c) {
      // Simple score derivation from flags when no explicit score
      let score = 70; // baseline
      if (c.flags) {
        c.flags.forEach(flag => {
          if (flag.type === 'green') score += 8;
          if (flag.type === 'amber') score -= 5;
          if (flag.type === 'red') score -= 12;
        });
      }
      return Math.max(5, Math.min(95, score));
    },

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

    formatCurrency(val) {
      if (val === null || val === undefined) return '\u2014';
      const abs = Math.abs(val);
      if (abs >= 1000000) return `\u00A3${(val / 1000000).toFixed(1)}m`;
      if (abs >= 1000) return `\u00A3${(val / 1000).toFixed(0)}k`;
      return `\u00A3${val.toLocaleString()}`;
    },

    formatPercent(val) {
      if (val === null || val === undefined) return '\u2014';
      return `${(val * 100).toFixed(1)}%`;
    },

    calcYoY(current, previous) {
      if (!previous || previous === 0) return null;
      return (current - previous) / Math.abs(previous);
    },

    renderTrend(current, previous) {
      const change = this.calcYoY(current, previous);
      if (change === null) return '';
      const direction = change >= 0 ? 'up' : 'down';
      const sign = change >= 0 ? '+' : '';
      const icon = change >= 0 ? 'ph-trend-up' : 'ph-trend-down';
      return `
        <div class="pr-financial-trend pr-financial-trend--${direction}">
          <i class="ph ${icon}"></i>
          ${sign}${(change * 100).toFixed(1)}% YoY
        </div>
      `;
    },

    // ---- Scroll Reveal ----
    initScrollReveal() {
      const elements = this.container.querySelectorAll('.pr-fade-up');
      if (!elements.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );

      elements.forEach((el, i) => {
        el.style.transitionDelay = `${i * 70}ms`;
        observer.observe(el);
      });
    }
  };

  // ---- Export Global API ----
  window.CompanyWisePremiumReport = {
    init: () => PremiumReport.init(),
    loadCompany: (company) => {
      PremiumReport.company = company;
      PremiumReport.render(company);
      PremiumReport.initScrollReveal();
    }
  };

  // ---- Auto-Initialize ----
  document.addEventListener('DOMContentLoaded', () => {
    PremiumReport.init();
  });

})();
