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

    async init() {
      this.container = document.getElementById('premium-report-container');
      if (!this.container) return;

      const params = new URLSearchParams(window.location.search);
      const isDemo = params.get('demo') === 'true';
      const companyNumber = params.get('company');

      // Demo route — render demo data immediately, no wallet check
      if (isDemo) {
        var Transformer = window.CompanyWisePremiumTransformer;
        if (Transformer) {
          this.company = Transformer.getDemoCompany();
          this.render(this.company);
          this.initScrollReveal();
        } else {
          this.renderError('Demo data is not available.');
        }
        return;
      }

      // Company route — wallet gate then API fetch
      if (companyNumber) {
        var Wallet = window.CompanyWiseWallet;

        // Already has access — fetch and render
        if (Wallet && Wallet.hasAccess(companyNumber)) {
          await this.fetchAndRender(companyNumber);
          return;
        }

        // Has credits — spend one and fetch
        if (Wallet && Wallet.getBalance() > 0) {
          if (Wallet.spendCredit(companyNumber)) {
            await this.fetchAndRender(companyNumber);
          } else {
            this.renderAccessDenied();
          }
          return;
        }

        // No access, no credits
        this.renderAccessDenied();
        return;
      }

      // No params — empty state
      this.renderEmpty();
    },

    async fetchAndRender(companyNumber) {
      this.renderLoading();

      try {
        var API = window.CompanyWisePremiumAPI;
        var Transformer = window.CompanyWisePremiumTransformer;

        var companyData = await API.getCompany(companyNumber);

        // Fetch filing facts (non-critical)
        var factsData = null;
        var latestFiling = (companyData.filings || [])[0];
        if (latestFiling) {
          try {
            factsData = await API.getFilingFacts(latestFiling.id);
          } catch (_) {
            // Non-critical — render without financials
          }
        }

        var report = Transformer.transform(companyData, factsData);
        this.company = report;
        this.render(report);
        this.initScrollReveal();
      } catch (err) {
        var msg = err.status === 404
          ? 'Company not found. Please check the company number and try again.'
          : 'Could not load company data. Please try again later.';
        this.renderError(msg);
      }
    },

    // ---- Loading State ----
    renderLoading() {
      this.container.innerHTML = `
        <div class="pr-loading" style="padding: 2rem 1rem;">
          <!-- Breadcrumb skeleton -->
          <div class="pr-fade-up" style="margin-bottom: 1.5rem;">
            <div style="height: 1rem; width: 200px; background: var(--surface-200); border-radius: 0.25rem;"></div>
          </div>
          <!-- Header skeleton -->
          <div style="background: var(--surface-50); border: 1px solid var(--surface-200); border-radius: 1rem; padding: 2rem; margin-bottom: 1.5rem;">
            <div style="height: 1.5rem; width: 60%; background: var(--surface-200); border-radius: 0.25rem; margin-bottom: 0.75rem;"></div>
            <div style="height: 1rem; width: 40%; background: var(--surface-200); border-radius: 0.25rem; margin-bottom: 1.5rem;"></div>
            <div style="display: flex; gap: 1rem;">
              <div style="height: 0.875rem; width: 120px; background: var(--surface-200); border-radius: 0.25rem;"></div>
              <div style="height: 0.875rem; width: 140px; background: var(--surface-200); border-radius: 0.25rem;"></div>
              <div style="height: 0.875rem; width: 100px; background: var(--surface-200); border-radius: 0.25rem;"></div>
            </div>
          </div>
          <!-- Score card skeleton -->
          <div style="background: var(--surface-50); border: 1px solid var(--surface-200); border-radius: 1rem; padding: 2rem; margin-bottom: 1.5rem; display: flex; gap: 2rem; align-items: center;">
            <div style="width: 120px; height: 120px; border-radius: 50%; background: var(--surface-200);"></div>
            <div style="flex: 1;">
              <div style="height: 1.25rem; width: 50%; background: var(--surface-200); border-radius: 0.25rem; margin-bottom: 0.75rem;"></div>
              <div style="height: 0.875rem; width: 80%; background: var(--surface-200); border-radius: 0.25rem; margin-bottom: 0.5rem;"></div>
              <div style="height: 0.875rem; width: 60%; background: var(--surface-200); border-radius: 0.25rem;"></div>
            </div>
          </div>
          <!-- Section skeletons -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div style="background: var(--surface-50); border: 1px solid var(--surface-200); border-radius: 1rem; padding: 2rem;">
              <div style="height: 1.25rem; width: 180px; background: var(--surface-200); border-radius: 0.25rem; margin-bottom: 1rem;"></div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <div style="height: 3rem; background: var(--surface-200); border-radius: 0.5rem;"></div>
                <div style="height: 3rem; background: var(--surface-200); border-radius: 0.5rem;"></div>
                <div style="height: 3rem; background: var(--surface-200); border-radius: 0.5rem;"></div>
              </div>
            </div>
            <div style="background: var(--surface-50); border: 1px solid var(--surface-200); border-radius: 1rem; padding: 2rem;">
              <div style="height: 1.25rem; width: 160px; background: var(--surface-200); border-radius: 0.25rem; margin-bottom: 1rem;"></div>
              <div style="height: 4rem; background: var(--surface-200); border-radius: 0.5rem;"></div>
            </div>
          </div>
        </div>
      `;
    },

    // ---- Error State ----
    renderError(message) {
      this.container.innerHTML = `
        <div class="pr-placeholder" style="padding: 6rem 1rem;">
          <div style="width: 3.5rem; height: 3.5rem; border-radius: 1rem; background: linear-gradient(to bottom right, #fef2f2, rgba(254, 226, 226, 0.5)); border: 1px solid rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
            <i class="ph ph-warning-circle" style="font-size: 1.5rem; color: var(--red-500, #ef4444);"></i>
          </div>
          <h2 style="font-family: var(--font); font-size: 1.5rem; font-weight: 700; color: var(--text-900); margin: 0 0 0.5rem;">Something went wrong</h2>
          <p class="pr-placeholder-text" style="max-width: 400px; margin: 0 auto 1.5rem;">
            ${escapeHtml(message)}
          </p>
          <a href="../../../pages/Home/home.html" class="btn-primary" style="margin-top: 1.5rem;">
            <i class="ph ph-arrow-left"></i>
            Back to search
          </a>
        </div>
      `;
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
      const hasRisk = c.risk && typeof c.risk === 'string';

      let badgeHtml = '';
      if (hasRisk) {
        const badgeIcon = c.risk === 'low'
          ? 'ph-shield-check'
          : c.risk === 'medium'
          ? 'ph-shield-warning'
          : 'ph-shield-slash';
        badgeHtml = `
          <div class="pr-header-actions">
            <span class="pr-badge pr-badge--${c.risk}">
              <i class="ph-fill ${badgeIcon}"></i>
              ${c.risk} risk
            </span>
          </div>
        `;
      }

      const companyMeta = c.companyType || c.type || '';

      const now = new Date();
      const generated = now.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      return `
        <div class="pr-header pr-fade-up">
          <div class="pr-header-top">
            <div class="pr-header-info">
              <h1 class="pr-company-name">${escapeHtml(c.name)}</h1>
              <p class="pr-company-meta">${escapeHtml(c.number)}${companyMeta ? ' \u00B7 ' + escapeHtml(companyMeta) : ''}</p>
            </div>
            ${badgeHtml}
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
      if (!c.flags || c.flags.length === 0) {
        // No flags — show a simplified verdict-only card
        const verdict = c.verdict || c.detailedRecommendation || c.recommendation || '';
        if (!verdict) return '';
        return `
          <div class="pr-score-card pr-fade-up">
            <div class="pr-score-details" style="flex: 1;">
              <h2 class="pr-score-title">Assessment</h2>
              <p class="pr-score-summary">${escapeHtml(verdict)}</p>
            </div>
          </div>
        `;
      }

      const score = c.riskScore || this.deriveScore(c);
      const circumference = 2 * Math.PI * 48;
      const offset = circumference - (score / 100) * circumference;
      const riskLevel = c.risk || 'medium';

      const positiveFlags = c.flags.filter(f => f.type === 'green').length;
      const negativeFlags = c.flags.filter(f => f.type === 'red').length;
      const neutralFlags = c.flags.filter(f => f.type === 'amber').length;

      return `
        <div class="pr-score-card pr-fade-up">
          <div class="pr-score-ring">
            <svg viewBox="0 0 120 120">
              <circle class="pr-score-ring-bg" cx="60" cy="60" r="48" />
              <circle class="pr-score-ring-fill pr-score-ring-fill--${riskLevel}"
                cx="60" cy="60" r="48"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}" />
            </svg>
            <div class="pr-score-value">
              <span class="pr-score-number pr-score-number--${riskLevel}">${score}</span>
              <span class="pr-score-label">/ 100</span>
            </div>
          </div>
          <div class="pr-score-details">
            <h2 class="pr-score-title">
              ${riskLevel === 'low' ? 'Low Risk \u2014 Likely Safe'
                : riskLevel === 'medium' ? 'Medium Risk \u2014 Proceed with Caution'
                : 'High Risk \u2014 Significant Concerns'}
            </h2>
            <p class="pr-score-summary">${c.detailedRecommendation || c.recommendation || c.verdict || ''}</p>
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
      const incDateRaw = c.incorporationDate || c.incorporated || null;
      const age = incDateRaw ? this.getCompanyAge(incDateRaw) : 'N/A';
      const incDate = incDateRaw
        ? new Date(incDateRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';

      const sicCode = c.sicCode || null;
      const sicNumber = sicCode ? sicCode.split(' - ')[0] : 'N/A';
      const sicDescription = sicCode
        ? (sicCode.split(' - ')[1] || sicCode)
        : (c.activity || 'N/A');

      const status = c.status || 'N/A';
      const companyType = c.type || c.companyType || 'N/A';
      const address = c.address || 'N/A';

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
                <div class="pr-overview-value">${escapeHtml(status)}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Company Age</div>
                <div class="pr-overview-value">${escapeHtml(age)}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Incorporated</div>
                <div class="pr-overview-value">${incDate}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Company Type</div>
                <div class="pr-overview-value">${escapeHtml(companyType)}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">SIC Code</div>
                <div class="pr-overview-value">${escapeHtml(sicNumber)}</div>
              </div>
              <div class="pr-overview-item">
                <div class="pr-overview-label">Business Activity</div>
                <div class="pr-overview-value">${escapeHtml(sicDescription)}</div>
              </div>
              <div class="pr-overview-item pr-overview-item--full">
                <div class="pr-overview-label">Registered Address</div>
                <div class="pr-overview-value">${escapeHtml(address)}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // ---- Risk Analysis ----
    renderRiskAnalysis(c) {
      if (!c.flags || c.flags.length === 0) return '';

      const riskLevel = c.risk || 'medium';

      return `
        <div class="pr-section pr-fade-up">
          <div class="pr-section-header">
            <div class="pr-section-icon ${riskLevel === 'high' ? 'pr-section-icon--red' : riskLevel === 'medium' ? 'pr-section-icon--amber' : 'pr-section-icon--emerald'}">
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
      // Support both mock shape (c.lastAccounts) and API shape (c.filing)
      let lastAcc, nextAcc, confDue;
      let isAccountsOverdue = false;
      let isConfirmationOverdue = false;

      if (c.lastAccounts || c.nextAccountsDue || c.confirmationDue) {
        // Mock / demo data shape
        lastAcc = c.lastAccounts
          ? new Date(c.lastAccounts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Never filed';
        nextAcc = c.nextAccountsDue
          ? new Date(c.nextAccountsDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'N/A';
        confDue = c.confirmationDue
          ? new Date(c.confirmationDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'N/A';
        isAccountsOverdue = c.nextAccountsDue && new Date(c.nextAccountsDue) < new Date();
        isConfirmationOverdue = c.confirmationDue && new Date(c.confirmationDue) < new Date();
      } else if (c.filing) {
        // API transformed shape
        lastAcc = c.filing.balanceSheetDateFormatted || 'Never filed';
        nextAcc = 'N/A';
        confDue = 'N/A';
      } else {
        lastAcc = 'N/A';
        nextAcc = 'N/A';
        confDue = 'N/A';
      }

      // Build timeline
      const timeline = this.buildTimeline(c);

      // Filing stats — use filing object when available
      let totalFilingsHtml = '';
      if (c.filing && c.filing.totalFilings) {
        totalFilingsHtml = `
          <div class="pr-filing-stat">
            <div class="pr-filing-stat-label">Total Filings</div>
            <div class="pr-filing-stat-value">${c.filing.totalFilings}</div>
          </div>
        `;
      }

      let periodHtml = '';
      if (c.filing && c.filing.periodMonths) {
        periodHtml = `
          <div class="pr-filing-stat">
            <div class="pr-filing-stat-label">Period Length</div>
            <div class="pr-filing-stat-value">${c.filing.periodMonths} months</div>
          </div>
        `;
      }

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
              ${totalFilingsHtml}
              ${periodHtml}
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
                  Detailed filing history is not available for this company.
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

      const accountsDate = f.accountsDate
        ? new Date(f.accountsDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Unknown';

      const workingCapitalRatio = f.workingCapitalRatio
        || (f.currentAssets && f.currentLiabilities ? (f.currentAssets / f.currentLiabilities).toFixed(1) : null);

      const grossMargin = f.grossMargin
        || (f.grossProfit && f.turnover && f.grossProfit.current && f.turnover.current ? f.grossProfit.current / f.turnover.current : null);

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
                        <div class="pr-director-role">${escapeHtml(dir.role)} \u00B7 Appointed ${appointedDate}</div>
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
                  Director information is not available for this company.
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
                        ${charge.holder ? `Holder: ${charge.holder} \u00B7 ` : ''}
                        ${charge.created ? `Created ${new Date(charge.created).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ''}
                        ${charge.status ? ` \u00B7 ${charge.status.charAt(0).toUpperCase() + charge.status.slice(1)}` : ''}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="pr-placeholder">
                <i class="ph ph-shield-check"></i>
                <p class="pr-placeholder-text">
                  No registered charges or CCJs found for this company.
                </p>
              </div>
            `}
          </div>
        </div>
      `;
    },

    // ---- Recommendation ----
    renderRecommendation(c) {
      const recommendationText = c.detailedRecommendation || c.recommendation || c.verdict || '';
      if (!recommendationText) return '';

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
              ${recommendationText}
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

      // Build from filing object when available (API data)
      if (c.filing && c.filing.balanceSheetDate) {
        timeline.push({
          date: c.filing.balanceSheetDateFormatted || new Date(c.filing.balanceSheetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          label: 'Balance Sheet Date',
          detail: c.filing.periodMonths ? c.filing.periodMonths + ' month period' : null,
          status: 'success'
        });
      }

      // Fall back to key dates from the company object (mock/demo data)
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

      if (!c.risk) {
        // No risk assessment — return generic advice
        actions.push('Review the financial data above to form your own assessment.');
        actions.push('Consider requesting a deposit or milestone-based payment schedule.');
        actions.push('Include clear payment terms in your contract.');
        return actions;
      }

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
      let score = 70;
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
      if (!dateStr) return 'N/A';
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
