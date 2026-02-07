/* ============================================
   COMPANYWISE — modal.js
   Free report modal component
   Self-initializing with public API
   Depends on: modal/api.js, modal/transformer.js
   ============================================ */

(function () {
  'use strict';

  // ---- Utility ----
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Report Modal Component ----
  const ReportModal = {
    container: null,
    isOpen: false,
    currentCompanyNumber: null,
    currentReport: null,

    // ---- Initialisation ----

    init() {
      this.createContainer();
      this.bindGlobalEvents();

      // Re-render modal if credits change while it's open
      document.addEventListener('creditWalletChanged', () => {
        if (this.isOpen && this.currentReport) {
          this.currentReport.hasPremiumAccess = this.hasPremiumAccess(this.currentCompanyNumber);
          this.renderReport(this.currentReport);
          this.bindModalEvents();
        }
      });
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

    // ---- Public API ----

    // Open modal with a company number — triggers fetch + skeleton + render
    async open(companyNumber) {
      if (!companyNumber) return;

      this.currentCompanyNumber = companyNumber;
      this.currentReport = null;

      // Show skeleton immediately
      this.renderShell(null, 'loading');
      this.show();

      try {
        // Fetch company data
        const companyData = await window.CompanyWiseModalAPI.getCompany(companyNumber);

        // Fetch filing facts for latest filing
        let factsData = null;
        const latestFiling = (companyData.filings || [])[0];
        if (latestFiling) {
          try {
            factsData = await window.CompanyWiseModalAPI.getFilingFacts(latestFiling.id);
          } catch (_) {
            // Non-critical — render without financials
          }
        }

        // Transform into report object
        const report = window.CompanyWiseTransformer.transform(companyData, factsData);
        report.hasPremiumAccess = this.hasPremiumAccess(companyNumber);

        this.currentReport = report;
        this.renderReport(report);
      } catch (err) {
        const message = err.status === 404
          ? 'Company not found.'
          : 'Could not load report. Please try again.';
        this.renderShell(null, 'error', message);
      }
    },

    // Close modal
    close() {
      this.hide();
    },

    // ---- Shell (shared chrome: overlay + header + footer) ----

    // Renders the modal shell with loading, error, or report body
    renderShell(report, state, errorMessage) {
      const headerHtml = report
        ? this.renderHeader(report)
        : this.renderHeaderSkeleton();

      let bodyHtml;
      if (state === 'loading') {
        bodyHtml = this.renderSkeleton();
      } else if (state === 'error') {
        bodyHtml = this.renderError(errorMessage);
      } else {
        bodyHtml = this.renderBody(report);
      }

      const footerHtml = report
        ? this.renderFooter(report)
        : this.renderFooterDefault();

      this.container.innerHTML = `
        <div class="report-modal-overlay${this.isOpen ? ' active' : ''}" id="report-modal">
          <div class="report-modal-backdrop" id="report-modal-backdrop"></div>
          <div class="report-modal-container">
            <div class="report-modal-content">
              ${headerHtml}
              <div class="report-modal-body">
                <div class="report-modal-body-inner">
                  ${bodyHtml}
                </div>
              </div>
              ${footerHtml}
            </div>
          </div>
        </div>
      `;

      // Always bind close/backdrop so they work in every state
      this.bindModalEvents();
    },

    // Render full report (called after transform completes)
    renderReport(report) {
      this.renderShell(report, 'report');
    },

    // ---- Header ----

    renderHeader(report) {
      const subtitle = [report.companyNumber, report.jurisdiction].filter(Boolean).map(escapeHtml).join(' \u00B7 ');
      return `
        <div class="report-modal-header">
          <div class="report-modal-header-inner">
            <div class="report-modal-header-info">
              <h2 class="report-modal-title">${escapeHtml(report.name)}</h2>
              <p class="report-modal-subtitle">${subtitle}</p>
            </div>
            <div class="report-modal-header-actions">
              <button class="report-modal-close" id="report-modal-close" aria-label="Close modal">
                <i class="ph ph-x"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    renderHeaderSkeleton() {
      return `
        <div class="report-modal-header">
          <div class="report-modal-header-inner">
            <div class="report-modal-header-info">
              <div class="report-skel report-skel--title"></div>
              <div class="report-skel report-skel--text" style="width: 40%;"></div>
            </div>
            <div class="report-modal-header-actions">
              <button class="report-modal-close" id="report-modal-close" aria-label="Close modal">
                <i class="ph ph-x"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    // ---- Body States ----

    renderSkeleton() {
      return `
        <section class="report-section">
          <div class="report-skel report-skel--heading" style="width: 50%;"></div>
          <div class="report-overview-grid" style="margin-top: 0.75rem;">
            <div class="report-overview-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value"></div></div>
            <div class="report-overview-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value"></div></div>
            <div class="report-overview-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value"></div></div>
            <div class="report-overview-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value"></div></div>
          </div>
        </section>
        <section class="report-section">
          <div class="report-skel report-skel--heading" style="width: 45%;"></div>
          <div class="report-filing-grid" style="margin-top: 0.75rem;">
            <div class="report-filing-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value"></div></div>
            <div class="report-filing-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value"></div></div>
            <div class="report-filing-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value"></div></div>
          </div>
        </section>
        <section class="report-section">
          <div class="report-skel report-skel--heading" style="width: 55%;"></div>
          <div class="report-financials-grid" style="margin-top: 0.75rem;">
            <div class="report-financial-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value-lg"></div></div>
            <div class="report-financial-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value-lg"></div></div>
            <div class="report-financial-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value-lg"></div></div>
            <div class="report-financial-item"><div class="report-skel report-skel--label"></div><div class="report-skel report-skel--value-lg"></div></div>
          </div>
        </section>
      `;
    },

    renderError(message) {
      return `
        <section class="report-section">
          <div class="report-error">
            <i class="ph ph-warning-circle"></i>
            <p>${escapeHtml(message)}</p>
          </div>
        </section>
      `;
    },

    // ---- Body: Full Report ----

    renderBody(report) {
      return [
        this.renderOverview(report),
        this.renderFilingCompliance(report),
        this.renderFinancials(report),
        this.renderHealthSignals(report),
        this.renderVerdict(report),
        this.renderPremiumGated('directors'),
        this.renderPremiumGated('ccjs'),
      ].join('');
    },

    // ---- Section: Company Overview ----

    renderOverview(report) {
      const statusLabel = report.dormant ? 'Dormant' : 'Active';
      const statusClass = report.dormant ? 'report-overview-value--dormant' : '';

      return `
        <section class="report-section">
          <h3 class="report-section-title">
            <i class="ph ph-buildings"></i>
            Company Overview
          </h3>
          <div class="report-section-content">
            <div class="report-overview-grid">
              <div class="report-overview-item">
                <div class="report-overview-label">Status</div>
                <div class="report-overview-value ${statusClass}">${statusLabel}</div>
              </div>
              <div class="report-overview-item">
                <div class="report-overview-label">Company Age</div>
                <div class="report-overview-value">${report.incorporationAge || 'Not available'}</div>
              </div>
              <div class="report-overview-item">
                <div class="report-overview-label">Incorporated</div>
                <div class="report-overview-value">${report.incorporationDate ? new Date(report.incorporationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available'}</div>
              </div>
              <div class="report-overview-item">
                <div class="report-overview-label">Business Activity</div>
                <div class="report-overview-value">${report.activity ? escapeHtml(report.activity) : 'Not available'}</div>
              </div>
            </div>
            ${report.address ? `
            <div class="report-overview-grid" style="margin-top: 0.75rem;">
              <div class="report-overview-item" style="grid-column: span 2;">
                <div class="report-overview-label">Registered Address</div>
                <div class="report-overview-value">${escapeHtml(report.address)}</div>
              </div>
            </div>
            ` : ''}
          </div>
        </section>
      `;
    },

    // ---- Section: Filing Compliance ----

    renderFilingCompliance(report) {
      if (!report.filing) {
        return `
          <section class="report-section">
            <h3 class="report-section-title">
              <i class="ph ph-calendar-check"></i>
              Filing Compliance
            </h3>
            <div class="report-section-content">
              <div class="report-placeholder">
                <i class="ph ph-file-dashed"></i>
                No filings on record
              </div>
            </div>
          </section>
        `;
      }

      const f = report.filing;
      return `
        <section class="report-section">
          <h3 class="report-section-title">
            <i class="ph ph-calendar-check"></i>
            Filing Compliance
          </h3>
          <div class="report-section-content">
            <div class="report-filing-grid">
              <div class="report-filing-item">
                <div class="report-filing-label">Latest Accounts</div>
                <div class="report-filing-value">${f.balanceSheetDateFormatted}</div>
              </div>
              <div class="report-filing-item">
                <div class="report-filing-label">Period</div>
                <div class="report-filing-value">${f.periodMonths ? f.periodMonths + ' months' : '\u2014'}</div>
              </div>
              <div class="report-filing-item">
                <div class="report-filing-label">Filings on Record</div>
                <div class="report-filing-value">${f.totalFilings}</div>
              </div>
            </div>
          </div>
        </section>
      `;
    },

    // ---- Section: Headline Financials ----

    renderFinancials(report) {
      if (!report.financials) {
        return `
          <section class="report-section">
            <h3 class="report-section-title">
              <i class="ph ph-chart-line-up"></i>
              Financial Snapshot
            </h3>
            <div class="report-section-content">
              <div class="report-placeholder">
                <i class="ph ph-chart-bar"></i>
                No financial data available for this company
              </div>
            </div>
          </section>
        `;
      }

      const fin = report.financials;
      const tiles = [];

      if (fin.revenue != null) {
        tiles.push({ label: 'Revenue', value: fin.revenueFormatted, negative: fin.revenue < 0 });
      }
      if (fin.profitLoss != null) {
        tiles.push({ label: fin.profitLoss >= 0 ? 'Profit' : 'Loss', value: fin.profitLossFormatted, negative: fin.profitLoss < 0 });
      }
      if (fin.netAssets != null) {
        tiles.push({ label: 'Net Assets', value: fin.netAssetsFormatted, negative: fin.netAssets < 0 });
      }
      if (fin.cash != null) {
        tiles.push({ label: 'Cash', value: fin.cashFormatted, negative: fin.cash < 0 });
      }

      if (tiles.length === 0) {
        return `
          <section class="report-section">
            <h3 class="report-section-title">
              <i class="ph ph-chart-line-up"></i>
              Financial Snapshot
            </h3>
            <div class="report-section-content">
              <div class="report-placeholder">
                <i class="ph ph-chart-bar"></i>
                No financial data available for this company
              </div>
            </div>
          </section>
        `;
      }

      const accountsNotice = report.filing
        ? `<div class="report-accounts-age"><i class="ph ph-info"></i> Based on accounts dated ${report.filing.balanceSheetDateFormatted}</div>`
        : '';

      return `
        <section class="report-section">
          <h3 class="report-section-title">
            <i class="ph ph-chart-line-up"></i>
            Financial Snapshot
          </h3>
          <div class="report-section-content">
            <div class="report-financials-grid">
              ${tiles.map(t => `
                <div class="report-financial-item">
                  <div class="report-financial-label">${t.label}</div>
                  <div class="report-financial-value${t.negative ? ' report-financial-value--negative' : ''}">${t.value}</div>
                </div>
              `).join('')}
            </div>
            ${accountsNotice}
          </div>
        </section>
      `;
    },

    // ---- Section: Health Signals ----

    renderHealthSignals(report) {
      if (!report.signals || report.signals.length === 0) return '';

      return `
        <section class="report-section">
          <h3 class="report-section-title">
            <i class="ph ph-heartbeat"></i>
            Health Signals
          </h3>
          <div class="report-section-content">
            <div class="report-signals-list">
              ${report.signals.map(s => `
                <div class="report-signal-item report-signal-item--${s.pass ? 'pass' : 'fail'}">
                  <i class="ph-fill ${s.pass ? 'ph-check-circle' : 'ph-x-circle'}"></i>
                  <span class="report-signal-text">${escapeHtml(s.label)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      `;
    },

    // ---- Section: Verdict ----

    renderVerdict(report) {
      if (!report.verdict) return '';

      return `
        <section class="report-section report-section--highlight">
          <h3 class="report-section-title">
            <i class="ph ph-lightbulb"></i>
            Verdict
          </h3>
          <div class="report-section-content">
            <p class="report-recommendation-text">${escapeHtml(report.verdict)}</p>
          </div>
        </section>
      `;
    },

    // ---- Premium Gated Sections ----

    hasPremiumAccess(companyNumber) {
      const Wallet = window.CompanyWiseWallet;
      return Wallet && Wallet.hasAccess(companyNumber);
    },

    renderPremiumGated(sectionType) {
      if (sectionType === 'directors') {
        return `
          <section class="report-section report-locked-section" data-locked="directors">
            <h3 class="report-section-title">
              <i class="ph ph-users"></i>
              Directors
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

    // ---- Footer ----

    renderFooter(report) {
      return `
        <div class="report-modal-footer">
          <div class="report-modal-footer-inner">
            <p class="report-modal-footer-text">
              <i class="ph ph-database"></i>
              Data sourced from Companies House
            </p>
            <div class="report-modal-footer-actions">
              ${this.renderFooterUpgrade(report)}
            </div>
          </div>
        </div>
      `;
    },

    renderFooterDefault() {
      return `
        <div class="report-modal-footer">
          <div class="report-modal-footer-inner">
            <p class="report-modal-footer-text">
              <i class="ph ph-database"></i>
              Data sourced from Companies House
            </p>
            <div class="report-modal-footer-actions"></div>
          </div>
        </div>
      `;
    },

    renderFooterUpgrade(report) {
      if (report.hasPremiumAccess) {
        const Wallet = window.CompanyWiseWallet;
        const balance = Wallet ? Wallet.getBalance() : 0;
        return `
          <span class="report-modal-footer-text" style="color: var(--risk-low);">
            <i class="ph-fill ph-shield-check"></i>
            Premium unlocked
          </span>
          ${balance > 0 ? '<span class="report-modal-footer-text"><i class="ph-fill ph-star"></i> ' + balance + ' credit' + (balance !== 1 ? 's' : '') + ' left</span>' : ''}
        `;
      }

      return `
        <button class="report-unlock-btn report-unlock-btn--footer" id="report-footer-upgrade">
          <i class="ph ph-star"></i>
          Get Premium Access
        </button>
      `;
    },

    // ---- Events ----

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

    // ---- Show / Hide ----

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
        this.currentCompanyNumber = null;
        this.currentReport = null;
      }, 300);

      this.isOpen = false;
    }
  };

  // ---- Export Global API ----
  window.CompanyWiseModal = {
    open: (companyNumber) => ReportModal.open(companyNumber),
    close: () => ReportModal.close(),
    isOpen: () => ReportModal.isOpen
  };

  // ---- Auto-Initialize ----
  document.addEventListener('DOMContentLoaded', () => {
    ReportModal.init();
  });

})();
