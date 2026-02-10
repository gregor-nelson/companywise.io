/* ============================================
   COMPANYWISE — Financial Panel Component
   Composed illustration: anchor card + floating data widgets
   ============================================ */

(function() {
  'use strict';

  // Create namespace
  window.WWCPanels = window.WWCPanels || {};
  window.WWCPanels.renderers = window.WWCPanels.renderers || {};

  // ============================================================================
  // DEMO DATA — edit these values as you explore the real dataset
  //
  // Each value is annotated with where it will come from in production.
  // Update the numbers here as you interrogate the bulk CSV and API responses.
  // Mark anything you can't source as null — the renderers handle missing data.
  // ============================================================================

  const DEMO_DATA = {

    'overdue-accounts': {
      daysOverdue: 47,           // calculated: today minus next_accounts_due_date (bulk CSV)
      dueDate: '15 Jan 2024',   // from: next_accounts_due_date (bulk CSV column: NextAccountsDueDate)
      status: 'overdue'          // derived: 'overdue' if daysOverdue > 0, else 'on-time'
    },

    'ccjs-charges': {
      activeCCJs: 2,             // source TBC — not in bulk CSV, may need Registry Trust or paid data
      activeCharges: 1,          // from: API GET /company/{number}/charges (count where status = outstanding)
      satisfiedCount: 3,         // from: API GET /company/{number}/charges (count where status = fully-satisfied)
      totalValue: '£14,200',     // source TBC — CH charges don't always include amounts
      oldestActive: '2023'       // from: API charges response, created_on field of oldest outstanding
    },

    'financial-position': {
      turnover: {
        value: '£1.2M',         // from: iXBRL parsed accounts (uk-gaap:TurnoverRevenue or similar)
        trend: 'up',            // derived: compare current vs prior year filing
        change: '+12%'          // derived: percentage change year-on-year
      },
      netAssets: {
        value: '£340K',         // from: iXBRL parsed accounts (uk-gaap:NetAssetsLiabilities)
        trend: 'up',            // derived: compare current vs prior year filing
        change: '+8%'           // derived: percentage change year-on-year
      },
      accountsType: 'Full',     // from: bulk CSV column: AccountsCategory (Full, Small, Micro, etc)
      filingYear: 'FY 2023'     // from: bulk CSV column: LastAccountsMadeUpTo
    }

  };

  // ============================================================================
  // SIGNAL DEFINITIONS — static metadata, doesn't change per company
  // ============================================================================

  const SIGNAL_DEFINITIONS = [
    {
      id: 'overdue-accounts',
      cardType: 'deadline-tracker',
      title: 'Overdue Accounts',
      description: 'Are their filings late? How late? Companies that can\'t file on time often can\'t pay on time either.',
      icon: 'ph-calendar-x',
      iconColor: 'red',
      weight: 'high',
      thresholds: { warning: 14, danger: 30, critical: 60 }
    },
    {
      id: 'ccjs-charges',
      cardType: 'legal-record',
      title: 'CCJs & Charges',
      description: 'County Court Judgments and active charges — legal markers that the company has had trouble paying debts.',
      icon: 'ph-gavel',
      iconColor: 'red',
      weight: 'high'
    },
    {
      id: 'financial-position',
      cardType: 'accounts-snapshot',
      title: 'Financial Health',
      description: 'Where available, we parse reported turnover and net assets from filed accounts to gauge stability.',
      icon: 'ph-trend-up',
      iconColor: 'emerald',
      weight: 'high'
    }
  ];

  // ============================================================================
  // BUILD SIGNALS — merges definitions with data
  // ============================================================================

  function buildSignals(data) {
    return SIGNAL_DEFINITIONS.map(def => ({
      ...def,
      data: data[def.id] || {},
      hasData: data[def.id] ? Object.values(data[def.id]).some(v => v !== null) : false
    }));
  }

  // ============================================================================
  // PANEL DEFINITION
  // ============================================================================

  const FinancialPanel = {
    id: 'financial-health',
    label: 'Financial',
    shortLabel: 'Financial',
    icon: 'ph-chart-line-up',
    color: 'red',
    panelType: 'financial',

    hero: {
      headline: 'Financial red flags',
      subheadline: 'Critical indicators of payment risk and cash flow problems that directly impact your bottom line',
      bullets: [
        'Late filing patterns that correlate with payment issues',
        'Legal markers showing trouble paying debts',
        'Reported financial position from filed accounts'
      ]
    },

    signals: buildSignals(DEMO_DATA)
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  function getUrgencyClass(days, thresholds) {
    if (days >= thresholds.critical) return 'critical';
    if (days >= thresholds.danger) return 'danger';
    if (days >= thresholds.warning) return 'warning';
    return 'ok';
  }

  // ============================================================================
  // CARD RENDERERS — Composed Illustration Style
  // ============================================================================

  /**
   * Placeholder when signal data isn't available
   */
  function renderNoDataCard(signal, extraClass) {
    return `
      <div class="fin-card ${extraClass || ''} fin-card--no-data" data-signal="${signal.id}">
        <div class="fin-card__header">
          <div class="fin-card__icon fin-card__icon--muted">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="fin-card__titles">
            <h4 class="fin-card__name">${signal.title}</h4>
          </div>
        </div>
        <div class="fin-card__empty">
          <i class="ph ph-database"></i>
          <span>Data not yet available</span>
        </div>
      </div>
    `;
  }

  /**
   * Anchor card — Overdue Accounts
   * Primary showcase card with SVG radial gauge + scale bar
   */
  function renderAnchorCard(signal) {
    const { data } = signal;

    if (!signal.hasData || data.daysOverdue === null) {
      return renderNoDataCard(signal, 'fin-card--anchor');
    }

    const thresholds = signal.thresholds || { warning: 14, danger: 30, critical: 60 };
    const urgencyClass = getUrgencyClass(data.daysOverdue, thresholds);
    const gaugePercent = Math.min((data.daysOverdue / 90) * 100, 100);
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference - (gaugePercent / 100) * circumference;

    return `
      <div class="fin-card fin-card--anchor" data-signal="${signal.id}">
        <div class="fin-card__header">
          <div class="fin-card__icon fin-card__icon--red">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="fin-card__titles">
            <h4 class="fin-card__name">${signal.title}</h4>
            <p class="fin-card__sub">Are their filings late?</p>
          </div>
          <span class="fin-card__badge fin-card__badge--high">High</span>
        </div>

        <div class="fin-anchor__body">
          <div class="fin-anchor__gauge">
            <svg viewBox="0 0 120 120" class="fin-gauge__svg">
              <circle cx="60" cy="60" r="54" class="fin-gauge__track"></circle>
              <circle cx="60" cy="60" r="54" class="fin-gauge__fill fin-gauge__fill--${urgencyClass}"
                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${dashOffset};"
              ></circle>
            </svg>
            <div class="fin-gauge__center">
              <span class="fin-gauge__value fin-gauge__value--${urgencyClass}">${data.daysOverdue}</span>
              <span class="fin-gauge__label">days</span>
            </div>
          </div>

          <div class="fin-anchor__detail">
            <div class="fin-anchor__status fin-anchor__status--${data.status}">
              <i class="ph-fill ph-warning-circle"></i>
              <span>Accounts overdue</span>
            </div>
            <div class="fin-anchor__due">
              <i class="ph ph-calendar"></i>
              <span>Due: ${data.dueDate}</span>
            </div>

            <div class="fin-anchor__scale">
              <div class="fin-anchor__scale-bar">
                <div class="fin-anchor__zone fin-anchor__zone--ok" style="width: 15.5%"></div>
                <div class="fin-anchor__zone fin-anchor__zone--warning" style="width: 17.8%"></div>
                <div class="fin-anchor__zone fin-anchor__zone--danger" style="width: 33.3%"></div>
                <div class="fin-anchor__zone fin-anchor__zone--critical" style="width: 33.3%"></div>
                <div class="fin-anchor__marker" style="left: ${gaugePercent}%"></div>
              </div>
              <div class="fin-anchor__scale-labels">
                <span>0</span><span>14</span><span>30</span><span>60</span><span>90+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — CCJs & Charges
   * Compact 3-item breakdown with total
   */
  function renderCCJFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || (data.activeCCJs === null && data.activeCharges === null)) {
      return renderNoDataCard(signal, 'fin-card--float-ccj');
    }

    const hasActiveIssues = data.activeCCJs > 0 || data.activeCharges > 0;

    return `
      <div class="fin-card fin-card--float-ccj" data-signal="${signal.id}">
        <div class="fin-card__header">
          <div class="fin-card__icon fin-card__icon--red">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="fin-card__titles">
            <h4 class="fin-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="fin-ccj__body">
          <div class="fin-ccj__items">
            <div class="fin-ccj__item ${data.activeCCJs > 0 ? 'fin-ccj__item--danger' : ''}">
              <span class="fin-ccj__value">${data.activeCCJs}</span>
              <span class="fin-ccj__label">Active CCJs</span>
            </div>
            <div class="fin-ccj__item ${data.activeCharges > 0 ? 'fin-ccj__item--warning' : ''}">
              <span class="fin-ccj__value">${data.activeCharges}</span>
              <span class="fin-ccj__label">Charges</span>
            </div>
            <div class="fin-ccj__item fin-ccj__item--ok">
              <span class="fin-ccj__value">${data.satisfiedCount}</span>
              <span class="fin-ccj__label">Satisfied</span>
            </div>
          </div>

          <div class="fin-ccj__total ${hasActiveIssues ? 'fin-ccj__total--alert' : 'fin-ccj__total--clear'}">
            <i class="ph ${hasActiveIssues ? 'ph-currency-gbp' : 'ph-check-circle'}"></i>
            <span>${hasActiveIssues ? 'Total: <strong>' + data.totalValue + '</strong>' : 'No active judgments'}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — Financial Health
   * Compact dual-metric display with trend indicators
   */
  function renderHealthFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || (data.turnover.value === null && data.netAssets.value === null)) {
      return renderNoDataCard(signal, 'fin-card--float-health');
    }

    return `
      <div class="fin-card fin-card--float-health" data-signal="${signal.id}">
        <div class="fin-card__header">
          <div class="fin-card__icon fin-card__icon--emerald">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="fin-card__titles">
            <h4 class="fin-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="fin-health__body">
          <div class="fin-health__metrics">
            <div class="fin-health__metric">
              <span class="fin-health__label">Turnover</span>
              <div class="fin-health__row">
                <span class="fin-health__value">${data.turnover.value}</span>
                <span class="fin-health__trend fin-health__trend--${data.turnover.trend}">
                  <i class="ph-bold ph-trend-${data.turnover.trend}"></i>
                  ${data.turnover.change}
                </span>
              </div>
            </div>
            <div class="fin-health__divider"></div>
            <div class="fin-health__metric">
              <span class="fin-health__label">Net Assets</span>
              <div class="fin-health__row">
                <span class="fin-health__value">${data.netAssets.value}</span>
                <span class="fin-health__trend fin-health__trend--${data.netAssets.trend}">
                  <i class="ph-bold ph-trend-${data.netAssets.trend}"></i>
                  ${data.netAssets.change}
                </span>
              </div>
            </div>
          </div>

          <div class="fin-health__footer">
            <span><i class="ph ph-file-text"></i> ${data.accountsType} accounts</span>
            <span><i class="ph ph-calendar-blank"></i> ${data.filingYear}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // PANEL RENDERER — Composed Showcase
  // ============================================================================

  /**
   * Renders the full Financial panel as a composed illustration:
   * - Anchor card (Overdue Accounts) centred with gauge
   * - Float card top-right (CCJs & Charges)
   * - Float card bottom-left (Financial Health)
   * - Depth card + blur accent for layered feel
   */
  function renderFinancialPanel(signals) {
    const overdue = signals.find(s => s.id === 'overdue-accounts');
    const ccjs = signals.find(s => s.id === 'ccjs-charges');
    const financial = signals.find(s => s.id === 'financial-position');

    return `
      <div class="fin-showcase">
        <div class="fin-showcase__depth" aria-hidden="true"></div>
        ${overdue ? renderAnchorCard(overdue) : ''}
        ${ccjs ? renderCCJFloat(ccjs) : ''}
        ${financial ? renderHealthFloat(financial) : ''}
        <div class="fin-showcase__blur" aria-hidden="true"></div>
      </div>
    `;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.WWCPanels.FinancialPanel = FinancialPanel;
  window.WWCPanels.renderers.financial = renderFinancialPanel;

  // Re-assemble categories if the index has already loaded
  if (window.WWCPanels.assembleCategories) {
    window.WWCPanels.assembleCategories();
  }

})();
