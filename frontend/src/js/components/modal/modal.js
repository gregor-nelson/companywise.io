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
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="report-modal-backdrop"></div>
          <div class="report-modal-container relative w-full h-full z-[1]">
            <div class="bg-white flex flex-col h-full overflow-hidden">
              ${headerHtml}
              <div class="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col gap-6">
                <div class="w-full max-w-3xl mx-auto flex flex-col gap-5">
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
        <div class="flex justify-between items-start gap-4 px-5 sm:px-8 py-5 border-b border-neutral-200/50 shrink-0">
          <div class="w-full max-w-3xl mx-auto flex justify-between items-start gap-4">
            <div class="min-w-0 flex-1">
              <h2 class="text-lg sm:text-xl font-semibold text-neutral-900 mb-1 leading-tight m-0">${escapeHtml(report.name)}</h2>
              <p class="text-sm text-neutral-400 m-0">${subtitle}</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button class="w-8 h-8 flex items-center justify-center bg-neutral-100 border border-neutral-200/50 rounded-lg cursor-pointer text-neutral-500 hover:text-neutral-900 transition-colors" id="report-modal-close" aria-label="Close modal">
                <i class="ph ph-x text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    renderHeaderSkeleton() {
      return `
        <div class="flex justify-between items-start gap-4 px-5 sm:px-8 py-5 border-b border-neutral-200/50 shrink-0">
          <div class="w-full max-w-3xl mx-auto flex justify-between items-start gap-4">
            <div class="min-w-0 flex-1">
              <div class="h-5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div>
              <div class="h-3.5 w-2/5 bg-neutral-200 rounded animate-pulse"></div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button class="w-8 h-8 flex items-center justify-center bg-neutral-100 border border-neutral-200/50 rounded-lg cursor-pointer text-neutral-500 hover:text-neutral-900 transition-colors" id="report-modal-close" aria-label="Close modal">
                <i class="ph ph-x text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    // ---- Body States ----

    renderSkeleton() {
      return `
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <div class="h-3.5 w-1/2 bg-neutral-200 rounded animate-pulse mb-3"></div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50"><div class="h-2.5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-3.5 w-4/5 bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50"><div class="h-2.5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-3.5 w-4/5 bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50"><div class="h-2.5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-3.5 w-4/5 bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50"><div class="h-2.5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-3.5 w-4/5 bg-neutral-200 rounded animate-pulse"></div></div>
          </div>
        </section>
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <div class="h-3.5 w-2/5 bg-neutral-200 rounded animate-pulse mb-3"></div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50"><div class="h-2.5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-3.5 w-4/5 bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50"><div class="h-2.5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-3.5 w-4/5 bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50"><div class="h-2.5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-3.5 w-4/5 bg-neutral-200 rounded animate-pulse"></div></div>
          </div>
        </section>
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <div class="h-3.5 w-[55%] bg-neutral-200 rounded animate-pulse mb-3"></div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 text-center"><div class="h-2.5 w-3/5 mx-auto bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-5 w-4/5 mx-auto bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 text-center"><div class="h-2.5 w-3/5 mx-auto bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-5 w-4/5 mx-auto bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 text-center"><div class="h-2.5 w-3/5 mx-auto bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-5 w-4/5 mx-auto bg-neutral-200 rounded animate-pulse"></div></div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 text-center"><div class="h-2.5 w-3/5 mx-auto bg-neutral-200 rounded animate-pulse mb-1.5"></div><div class="h-5 w-4/5 mx-auto bg-neutral-200 rounded animate-pulse"></div></div>
          </div>
        </section>
      `;
    },

    renderError(message) {
      return `
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <div class="text-center py-8 px-4">
            <i class="ph ph-warning-circle block text-3xl mb-3 text-amber-500"></i>
            <p class="text-sm text-neutral-600 m-0">${escapeHtml(message)}</p>
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
      const statusColor = report.dormant ? 'text-amber-600' : 'text-neutral-800';

      return `
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
              <i class="ph ph-buildings text-blue-500 text-base"></i>
            </div>
            Company Overview
          </h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Status</div>
              <div class="text-sm font-medium ${statusColor}">${statusLabel}</div>
            </div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Company Age</div>
              <div class="text-sm font-medium text-neutral-800">${report.incorporationAge || 'Not available'}</div>
            </div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Incorporated</div>
              <div class="text-sm font-medium text-neutral-800">${report.incorporationDate ? new Date(report.incorporationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available'}</div>
            </div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Business Activity</div>
              <div class="text-sm font-medium text-neutral-800">${report.activity ? escapeHtml(report.activity) : 'Not available'}</div>
            </div>
          </div>
          ${report.address ? `
          <div class="grid grid-cols-1 gap-3 mt-3">
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Registered Address</div>
              <div class="text-sm font-medium text-neutral-800">${escapeHtml(report.address)}</div>
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
          <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
            <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
                <i class="ph ph-calendar-check text-blue-500 text-base"></i>
              </div>
              Filing Compliance
            </h3>
            <div class="text-center py-6 text-neutral-400">
              <i class="ph ph-file-dashed block text-2xl mb-2 opacity-50"></i>
              <p class="text-sm m-0">No filings on record</p>
            </div>
          </section>
        `;
      }

      const f = report.filing;
      return `
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
              <i class="ph ph-calendar-check text-blue-500 text-base"></i>
            </div>
            Filing Compliance
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Latest Accounts</div>
              <div class="text-sm font-medium text-neutral-800">${f.balanceSheetDateFormatted}</div>
            </div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Period</div>
              <div class="text-sm font-medium text-neutral-800">${f.periodMonths ? f.periodMonths + ' months' : '\u2014'}</div>
            </div>
            <div class="bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">Filings on Record</div>
              <div class="text-sm font-medium text-neutral-800">${f.totalFilings}</div>
            </div>
          </div>
        </section>
      `;
    },

    // ---- Section: Headline Financials ----

    renderFinancials(report) {
      const emptyState = `
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
              <i class="ph ph-chart-line-up text-blue-500 text-base"></i>
            </div>
            Financial Snapshot
          </h3>
          <div class="text-center py-6 text-neutral-400">
            <i class="ph ph-chart-bar block text-2xl mb-2 opacity-50"></i>
            <p class="text-sm m-0">No financial data available for this company</p>
          </div>
        </section>
      `;

      if (!report.financials) return emptyState;

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

      if (tiles.length === 0) return emptyState;

      const accountsNotice = report.filing
        ? `<div class="flex items-center gap-1.5 text-xs text-neutral-400 pt-3">
            <i class="ph ph-info text-sm opacity-70"></i>
            Based on accounts dated ${report.filing.balanceSheetDateFormatted}
          </div>`
        : '';

      return `
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
              <i class="ph ph-chart-line-up text-blue-500 text-base"></i>
            </div>
            Financial Snapshot
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${tiles.map(t => `
              <div class="bg-white rounded-xl p-3 border border-neutral-100/50 text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1">${t.label}</div>
                <div class="text-lg font-semibold leading-tight ${t.negative ? 'text-red-600' : 'text-neutral-900'}">${t.value}</div>
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
        <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
          <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
              <i class="ph ph-heartbeat text-blue-500 text-base"></i>
            </div>
            Health Signals
          </h3>
          <div class="flex flex-wrap gap-2">
            ${report.signals.map(s => {
              const cls = s.pass
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 border-emerald-200/50'
                : 'bg-gradient-to-br from-red-50 to-red-100/50 text-red-600 border-red-200/50';
              return `
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${cls}">
                  <i class="ph-fill ${s.pass ? 'ph-check-circle' : 'ph-x-circle'}"></i>
                  <span class="leading-none">${escapeHtml(s.label)}</span>
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
        <section class="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/50 p-4 sm:p-5">
          <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
            <div class="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
              <i class="ph ph-lightbulb text-blue-500 text-base"></i>
            </div>
            Verdict
          </h3>
          <p class="text-sm text-neutral-700 leading-relaxed m-0">${escapeHtml(report.verdict)}</p>
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
          <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5 relative overflow-hidden" data-locked="directors">
            <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
                <i class="ph ph-users text-blue-500 text-base"></i>
              </div>
              Directors
              <span class="inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 text-[10px] font-bold uppercase tracking-wider text-blue-500">
                <i class="ph ph-star text-[10px]"></i> Premium
              </span>
            </h3>
            <div class="blur-sm select-none pointer-events-none">
              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-100/50">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shrink-0">
                    <i class="ph ph-user text-blue-500 text-sm"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-neutral-800">Director Name Hidden</div>
                    <div class="text-[11px] text-neutral-400">Role \u00B7 Appointed Jan 2020</div>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-100/50">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shrink-0">
                    <i class="ph ph-user text-blue-500 text-sm"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-neutral-800">Director Name Hidden</div>
                    <div class="text-[11px] text-neutral-400">Role \u00B7 Appointed Mar 2019</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center z-[2]">
              <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-blue-600 text-white text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-600/25" data-unlock="directors">
                <i class="ph ph-lock-simple-open"></i>
                Unlock with Premium
              </button>
            </div>
          </section>
        `;
      }

      if (sectionType === 'ccjs') {
        return `
          <section class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5 relative overflow-hidden" data-locked="ccjs">
            <h3 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
                <i class="ph ph-gavel text-blue-500 text-base"></i>
              </div>
              CCJs & Charges
              <span class="inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 text-[10px] font-bold uppercase tracking-wider text-blue-500">
                <i class="ph ph-star text-[10px]"></i> Premium
              </span>
            </h3>
            <div class="blur-sm select-none pointer-events-none">
              <div class="text-center py-6 text-neutral-400">
                <i class="ph ph-gavel block text-2xl mb-2 opacity-50"></i>
                <p class="text-sm m-0">County Court Judgements and charge data</p>
              </div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center z-[2]">
              <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-blue-600 text-white text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-600/25" data-unlock="ccjs">
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
        <div class="px-5 sm:px-8 py-3.5 border-t border-neutral-200/50 flex justify-center items-center shrink-0 bg-slate-50">
          <div class="w-full max-w-3xl flex justify-between items-center">
            <p class="text-xs text-neutral-400 m-0 flex items-center gap-1.5">
              <i class="ph ph-database text-sm"></i>
              Data sourced from Companies House
            </p>
            <div class="flex gap-2 items-center">
              ${this.renderFooterUpgrade(report)}
            </div>
          </div>
        </div>
      `;
    },

    renderFooterDefault() {
      return `
        <div class="px-5 sm:px-8 py-3.5 border-t border-neutral-200/50 flex justify-center items-center shrink-0 bg-slate-50">
          <div class="w-full max-w-3xl flex justify-between items-center">
            <p class="text-xs text-neutral-400 m-0 flex items-center gap-1.5">
              <i class="ph ph-database text-sm"></i>
              Data sourced from Companies House
            </p>
            <div class="flex gap-2 items-center"></div>
          </div>
        </div>
      `;
    },

    renderFooterUpgrade(report) {
      if (report.hasPremiumAccess) {
        const Wallet = window.CompanyWiseWallet;
        const balance = Wallet ? Wallet.getBalance() : 0;
        return `
          <span class="text-xs text-emerald-600 flex items-center gap-1.5">
            <i class="ph-fill ph-shield-check text-sm"></i>
            Premium unlocked
          </span>
          ${balance > 0 ? '<span class="text-xs text-neutral-400 flex items-center gap-1.5"><i class="ph-fill ph-star text-sm"></i> ' + balance + ' credit' + (balance !== 1 ? 's' : '') + ' left</span>' : ''}
        `;
      }

      return `
        <button class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-none bg-blue-600 text-white text-xs font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-0.5" id="report-footer-upgrade">
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
