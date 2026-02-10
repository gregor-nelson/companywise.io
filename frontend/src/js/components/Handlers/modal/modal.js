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
          <div class="rm-backdrop" id="report-modal-backdrop"></div>
          <div class="report-modal-container rm-container">
            <div class="rm-panel">
              ${headerHtml}
              <div class="rm-body">
                <div class="rm-body-inner">
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
        <div class="rm-header">
          <div class="rm-header-inner">
            <div class="rm-header-info">
              <h2 class="rm-title">${escapeHtml(report.name)}</h2>
              <p class="rm-subtitle">${subtitle}</p>
            </div>
            <div class="rm-header-actions">
              <button class="rm-close-btn" id="report-modal-close" aria-label="Close modal">
                <i class="ph ph-x"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    renderHeaderSkeleton() {
      return `
        <div class="rm-header">
          <div class="rm-header-inner">
            <div class="rm-header-info">
              <div class="rm-skel rm-skel--title"></div>
              <div class="rm-skel rm-skel--subtitle"></div>
            </div>
            <div class="rm-header-actions">
              <button class="rm-close-btn" id="report-modal-close" aria-label="Close modal">
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
        <section class="rm-section">
          <div class="rm-skel rm-skel--section-title rm-skel--section-title-half"></div>
          <div class="rm-grid">
            <div class="rm-card"><div class="rm-skel rm-skel--card-label"></div><div class="rm-skel rm-skel--card-value"></div></div>
            <div class="rm-card"><div class="rm-skel rm-skel--card-label"></div><div class="rm-skel rm-skel--card-value"></div></div>
            <div class="rm-card"><div class="rm-skel rm-skel--card-label"></div><div class="rm-skel rm-skel--card-value"></div></div>
            <div class="rm-card"><div class="rm-skel rm-skel--card-label"></div><div class="rm-skel rm-skel--card-value"></div></div>
          </div>
        </section>
        <section class="rm-section">
          <div class="rm-skel rm-skel--section-title rm-skel--section-title-narrow"></div>
          <div class="rm-grid rm-grid--3">
            <div class="rm-card"><div class="rm-skel rm-skel--card-label"></div><div class="rm-skel rm-skel--card-value"></div></div>
            <div class="rm-card"><div class="rm-skel rm-skel--card-label"></div><div class="rm-skel rm-skel--card-value"></div></div>
            <div class="rm-card"><div class="rm-skel rm-skel--card-label"></div><div class="rm-skel rm-skel--card-value"></div></div>
          </div>
        </section>
        <section class="rm-section">
          <div class="rm-skel rm-skel--section-title rm-skel--section-title-wide"></div>
          <div class="rm-grid rm-grid--4">
            <div class="rm-card rm-card--center"><div class="rm-skel rm-skel--card-label-center"></div><div class="rm-skel rm-skel--card-value-center"></div></div>
            <div class="rm-card rm-card--center"><div class="rm-skel rm-skel--card-label-center"></div><div class="rm-skel rm-skel--card-value-center"></div></div>
            <div class="rm-card rm-card--center"><div class="rm-skel rm-skel--card-label-center"></div><div class="rm-skel rm-skel--card-value-center"></div></div>
            <div class="rm-card rm-card--center"><div class="rm-skel rm-skel--card-label-center"></div><div class="rm-skel rm-skel--card-value-center"></div></div>
          </div>
        </section>
      `;
    },

    renderError(message) {
      return `
        <section class="rm-section">
          <div class="rm-error">
            <i class="ph ph-warning-circle rm-error-icon"></i>
            <p class="rm-error-text">${escapeHtml(message)}</p>
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
      const statusValueClass = report.dormant ? 'rm-card-value rm-card-value--amber' : 'rm-card-value';

      return `
        <section class="rm-section">
          <h3 class="rm-section-title">
            <div class="rm-section-icon">
              <i class="ph ph-buildings"></i>
            </div>
            Company Overview
          </h3>
          <div class="rm-grid">
            <div class="rm-card">
              <div class="rm-card-label">Status</div>
              <div class="${statusValueClass}">${statusLabel}</div>
            </div>
            <div class="rm-card">
              <div class="rm-card-label">Company Age</div>
              <div class="rm-card-value">${report.incorporationAge || 'Not available'}</div>
            </div>
            <div class="rm-card">
              <div class="rm-card-label">Incorporated</div>
              <div class="rm-card-value">${report.incorporationDate ? new Date(report.incorporationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available'}</div>
            </div>
            <div class="rm-card">
              <div class="rm-card-label">Business Activity</div>
              <div class="rm-card-value">${report.activity ? escapeHtml(report.activity) : 'Not available'}</div>
            </div>
            ${report.financials && report.financials.employees != null ? `
            <div class="rm-card">
              <div class="rm-card-label">Employees</div>
              <div class="rm-card-value">${Math.round(report.financials.employees)}</div>
            </div>
            ` : ''}
          </div>
          ${report.address ? `
          <div class="rm-grid rm-grid--1">
            <div class="rm-card">
              <div class="rm-card-label">Registered Address</div>
              <div class="rm-card-value">${escapeHtml(report.address)}</div>
            </div>
          </div>
          ` : ''}
        </section>
      `;
    },

    // ---- Section: Filing Compliance ----

    renderFilingCompliance(report) {
      if (!report.filing) {
        return `
          <section class="rm-section">
            <h3 class="rm-section-title">
              <div class="rm-section-icon">
                <i class="ph ph-calendar-check"></i>
              </div>
              Filing Compliance
            </h3>
            <div class="rm-empty">
              <i class="ph ph-file-dashed"></i>
              <p>No filings on record</p>
            </div>
          </section>
        `;
      }

      const f = report.filing;
      return `
        <section class="rm-section">
          <h3 class="rm-section-title">
            <div class="rm-section-icon">
              <i class="ph ph-calendar-check"></i>
            </div>
            Filing Compliance
          </h3>
          <div class="rm-grid rm-grid--3">
            <div class="rm-card">
              <div class="rm-card-label">Latest Accounts</div>
              <div class="rm-card-value">${f.balanceSheetDateFormatted}</div>
            </div>
            <div class="rm-card">
              <div class="rm-card-label">Period</div>
              <div class="rm-card-value">${f.periodMonths ? f.periodMonths + ' months' : '\u2014'}</div>
            </div>
            <div class="rm-card">
              <div class="rm-card-label">Filings on Record</div>
              <div class="rm-card-value">${f.totalFilings}</div>
            </div>
          </div>
        </section>
      `;
    },

    // ---- Section: Headline Financials ----

    renderFinancials(report) {
      const emptyState = `
        <section class="rm-section">
          <h3 class="rm-section-title">
            <div class="rm-section-icon">
              <i class="ph ph-chart-line-up"></i>
            </div>
            Financial Snapshot
          </h3>
          <div class="rm-empty">
            <i class="ph ph-chart-bar"></i>
            <p>No financial data available for this company</p>
          </div>
        </section>
      `;

      if (!report.financials) return emptyState;

      const fin = report.financials;
      const tiles = [];

      if (fin.revenue != null) {
        tiles.push({ label: 'Revenue', value: fin.revenueFormatted, negative: fin.revenue < 0 });
      }
      if (fin.grossProfit != null) {
        tiles.push({ label: 'Gross Profit', value: fin.grossProfitFormatted, negative: fin.grossProfit < 0 });
      }
      if (fin.operatingProfit != null) {
        tiles.push({ label: 'Operating Profit', value: fin.operatingProfitFormatted, negative: fin.operatingProfit < 0 });
      } else if (fin.profitLoss != null) {
        tiles.push({ label: fin.profitLoss >= 0 ? 'Profit' : 'Loss', value: fin.profitLossFormatted, negative: fin.profitLoss < 0 });
      }
      if (fin.netAssets != null) {
        tiles.push({ label: 'Net Assets', value: fin.netAssetsFormatted, negative: fin.netAssets < 0 });
      }
      if (fin.equity != null) {
        tiles.push({ label: 'Equity', value: fin.equityFormatted, negative: fin.equity < 0 });
      }
      if (fin.cash != null) {
        tiles.push({ label: 'Cash', value: fin.cashFormatted, negative: fin.cash < 0 });
      }

      if (tiles.length === 0) return emptyState;

      const accountsNotice = report.filing
        ? `<div class="rm-accounts-notice">
            <i class="ph ph-info"></i>
            Based on accounts dated ${report.filing.balanceSheetDateFormatted}
          </div>`
        : '';

      return `
        <section class="rm-section">
          <h3 class="rm-section-title">
            <div class="rm-section-icon">
              <i class="ph ph-chart-line-up"></i>
            </div>
            Financial Snapshot
          </h3>
          <div class="rm-grid rm-grid--4">
            ${tiles.map(t => `
              <div class="rm-card rm-card--center">
                <div class="rm-card-label">${t.label}</div>
                <div class="rm-card-value--lg${t.negative ? ' rm-card-value--negative' : ''}">${t.value}</div>
              </div>
            `).join('')}
          </div>
          ${accountsNotice}
        </section>
      `;
    },

    // ---- Section: Health Signals ----

    renderHealthSignals(report) {
      if (!report.signals || report.signals.length === 0) return '';

      return `
        <section class="rm-section">
          <h3 class="rm-section-title">
            <div class="rm-section-icon">
              <i class="ph ph-heartbeat"></i>
            </div>
            Health Signals
          </h3>
          <div class="rm-signals">
            ${report.signals.map(s => {
              const cls = s.pass ? 'rm-signal--pass' : 'rm-signal--fail';
              return `
                <div class="rm-signal ${cls}">
                  <i class="ph-fill ${s.pass ? 'ph-check-circle' : 'ph-x-circle'}"></i>
                  <span>${escapeHtml(s.label)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      `;
    },

    // ---- Section: Verdict ----

    renderVerdict(report) {
      if (!report.verdict) return '';

      return `
        <section class="rm-section rm-section--verdict">
          <h3 class="rm-section-title">
            <div class="rm-section-icon rm-section-icon--verdict">
              <i class="ph ph-lightbulb"></i>
            </div>
            Verdict
          </h3>
          <p class="rm-verdict-text">${escapeHtml(report.verdict)}</p>
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
          <section class="rm-section rm-section--locked" data-locked="directors">
            <h3 class="rm-section-title">
              <div class="rm-section-icon">
                <i class="ph ph-users"></i>
              </div>
              Directors
              <span class="rm-premium-badge">
                <i class="ph ph-star"></i> Premium
              </span>
            </h3>
            <div class="rm-locked-blur">
              <div class="rm-director-rows">
                <div class="rm-director-row">
                  <div class="rm-director-avatar">
                    <i class="ph ph-user"></i>
                  </div>
                  <div class="rm-director-info">
                    <div class="rm-director-name">Director Name Hidden</div>
                    <div class="rm-director-meta">Role \u00B7 Appointed Jan 2020</div>
                  </div>
                </div>
                <div class="rm-director-row">
                  <div class="rm-director-avatar">
                    <i class="ph ph-user"></i>
                  </div>
                  <div class="rm-director-info">
                    <div class="rm-director-name">Director Name Hidden</div>
                    <div class="rm-director-meta">Role \u00B7 Appointed Mar 2019</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="rm-unlock-overlay">
              <button class="rm-unlock-btn" data-unlock="directors">
                <i class="ph ph-lock-simple-open"></i>
                Unlock with Premium
              </button>
            </div>
          </section>
        `;
      }

      if (sectionType === 'ccjs') {
        return `
          <section class="rm-section rm-section--locked" data-locked="ccjs">
            <h3 class="rm-section-title">
              <div class="rm-section-icon">
                <i class="ph ph-gavel"></i>
              </div>
              CCJs & Charges
              <span class="rm-premium-badge">
                <i class="ph ph-star"></i> Premium
              </span>
            </h3>
            <div class="rm-locked-blur">
              <div class="rm-empty">
                <i class="ph ph-gavel"></i>
                <p>County Court Judgements and charge data</p>
              </div>
            </div>
            <div class="rm-unlock-overlay">
              <button class="rm-unlock-btn" data-unlock="ccjs">
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
        <div class="rm-footer">
          <div class="rm-footer-inner">
            <p class="rm-footer-source">
              <i class="ph ph-database"></i>
              Data sourced from Companies House
            </p>
            <div class="rm-footer-actions">
              ${this.renderFooterUpgrade(report)}
            </div>
          </div>
        </div>
      `;
    },

    renderFooterDefault() {
      return `
        <div class="rm-footer">
          <div class="rm-footer-inner">
            <p class="rm-footer-source">
              <i class="ph ph-database"></i>
              Data sourced from Companies House
            </p>
            <div class="rm-footer-actions"></div>
          </div>
        </div>
      `;
    },

    renderFooterUpgrade(report) {
      if (report.hasPremiumAccess) {
        const Wallet = window.CompanyWiseWallet;
        const balance = Wallet ? Wallet.getBalance() : 0;
        return `
          <span class="rm-footer-premium">
            <i class="ph-fill ph-shield-check"></i>
            Premium unlocked
          </span>
          ${balance > 0 ? '<span class="rm-footer-credits"><i class="ph-fill ph-star"></i> ' + balance + ' credit' + (balance !== 1 ? 's' : '') + ' left</span>' : ''}
        `;
      }

      return `
        <button class="rm-footer-upgrade" id="report-footer-upgrade">
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
      this.container.querySelectorAll('[data-unlock]').forEach(btn => {
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
