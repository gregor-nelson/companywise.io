/* ============================================
   COMPANYWISE — Financial Panel Component
   Unique visual cards for financial health signals
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
  // CARD RENDERERS
  // ============================================================================

  /**
   * Render a placeholder card when data isn't available yet
   */
  function renderNoDataCard(signal, message) {
    return `
      <div class="wwc-card wwc-card--financial wwc-card--no-data" data-signal="${signal.id}">
        <div class="wwc-card__header">
          <div class="wwc-card__icon wwc-card__icon--muted">
            <i class="ph ${signal.icon}"></i>
          </div>
        </div>
        <div class="wwc-card__body">
          <h4 class="wwc-card__title">${signal.title}</h4>
          <p class="wwc-card__desc">${message || 'Data not yet available for this signal.'}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render a deadline tracker card (for overdue accounts)
   * Visual: Circular countdown gauge with urgency colors
   */
  function renderDeadlineTracker(signal) {
    const { data } = signal;

    if (!signal.hasData || data.daysOverdue === null) {
      return renderNoDataCard(signal, 'No accounts due date found in dataset.');
    }

    const thresholds = signal.thresholds || { warning: 14, danger: 30, critical: 60 };
    const urgencyClass = getUrgencyClass(data.daysOverdue, thresholds);
    const gaugePercent = Math.min((data.daysOverdue / 90) * 100, 100);
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference - (gaugePercent / 100) * circumference;

    return `
      <div class="wwc-card wwc-card--financial wwc-card--deadline" data-signal="${signal.id}">
        <div class="wwc-card__header">
          <div class="wwc-card__icon wwc-card__icon--${signal.iconColor}">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="wwc-card__weight wwc-card__weight--${signal.weight}">
            <span>${signal.weight}</span>
          </div>
        </div>

        <div class="wwc-card__body">
          <h4 class="wwc-card__title">${signal.title}</h4>
          <p class="wwc-card__desc">${signal.description}</p>
        </div>

        <div class="wwc-card__visual wwc-card__visual--deadline">
          <div class="deadline-gauge">
            <svg viewBox="0 0 120 120" class="deadline-gauge__svg">
              <circle cx="60" cy="60" r="54" class="deadline-gauge__track"></circle>
              <circle cx="60" cy="60" r="54" class="deadline-gauge__fill deadline-gauge__fill--${urgencyClass}"
                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${dashOffset};"
              ></circle>
            </svg>
            <div class="deadline-gauge__center">
              <span class="deadline-gauge__value ${urgencyClass}">${data.daysOverdue}</span>
              <span class="deadline-gauge__label">days</span>
            </div>
          </div>

          <div class="deadline-meta">
            <div class="deadline-meta__status deadline-meta__status--${data.status}">
              <i class="ph-fill ph-warning-circle"></i>
              <span>Accounts overdue</span>
            </div>
            <div class="deadline-meta__date">
              <i class="ph ph-calendar"></i>
              <span>Due: ${data.dueDate}</span>
            </div>
          </div>

          <div class="deadline-scale">
            <div class="deadline-scale__bar">
              <div class="deadline-scale__zone deadline-scale__zone--ok" style="width: 15.5%"></div>
              <div class="deadline-scale__zone deadline-scale__zone--warning" style="width: 17.8%"></div>
              <div class="deadline-scale__zone deadline-scale__zone--danger" style="width: 33.3%"></div>
              <div class="deadline-scale__zone deadline-scale__zone--critical" style="width: 33.3%"></div>
              <div class="deadline-scale__marker" style="left: ${gaugePercent}%"></div>
            </div>
            <div class="deadline-scale__labels">
              <span>0</span>
              <span>14</span>
              <span>30</span>
              <span>60</span>
              <span>90+</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a legal record card (for CCJs & Charges)
   * Visual: Stacked case files with status indicators
   */
  function renderLegalRecord(signal) {
    const { data } = signal;

    if (!signal.hasData || (data.activeCCJs === null && data.activeCharges === null)) {
      return renderNoDataCard(signal, 'No CCJ or charge data available yet.');
    }

    const hasActiveIssues = data.activeCCJs > 0 || data.activeCharges > 0;

    return `
      <div class="wwc-card wwc-card--financial wwc-card--legal" data-signal="${signal.id}">
        <div class="wwc-card__header">
          <div class="wwc-card__icon wwc-card__icon--${signal.iconColor}">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="wwc-card__weight wwc-card__weight--${signal.weight}">
            <span>${signal.weight}</span>
          </div>
        </div>

        <div class="wwc-card__body">
          <h4 class="wwc-card__title">${signal.title}</h4>
          <p class="wwc-card__desc">${signal.description}</p>
        </div>

        <div class="wwc-card__visual wwc-card__visual--legal">
          <div class="legal-stack">
            <div class="legal-file legal-file--active ${data.activeCCJs > 0 ? 'legal-file--has-items' : ''}">
              <div class="legal-file__tab legal-file__tab--danger">
                <i class="ph-bold ph-warning"></i>
              </div>
              <div class="legal-file__content">
                <span class="legal-file__count">${data.activeCCJs}</span>
                <span class="legal-file__label">Active CCJs</span>
              </div>
            </div>

            <div class="legal-file legal-file--charges ${data.activeCharges > 0 ? 'legal-file--has-items' : ''}">
              <div class="legal-file__tab legal-file__tab--warning">
                <i class="ph-bold ph-link"></i>
              </div>
              <div class="legal-file__content">
                <span class="legal-file__count">${data.activeCharges}</span>
                <span class="legal-file__label">Charges</span>
              </div>
            </div>

            <div class="legal-file legal-file--satisfied">
              <div class="legal-file__tab legal-file__tab--success">
                <i class="ph-bold ph-check"></i>
              </div>
              <div class="legal-file__content">
                <span class="legal-file__count">${data.satisfiedCount}</span>
                <span class="legal-file__label">Satisfied</span>
              </div>
            </div>
          </div>

          <div class="legal-total ${hasActiveIssues ? 'legal-total--alert' : 'legal-total--clear'}">
            <i class="ph ${hasActiveIssues ? 'ph-currency-gbp' : 'ph-check-circle'}"></i>
            <span>${hasActiveIssues ? `Total outstanding: <strong>${data.totalValue}</strong>` : 'No active judgments'}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render accounts snapshot card (for financial health)
   * Visual: Mini financial dashboard with trend arrows
   */
  function renderAccountsSnapshot(signal) {
    const { data } = signal;

    if (!signal.hasData || (data.turnover.value === null && data.netAssets.value === null)) {
      return renderNoDataCard(signal, 'No parsed accounts data available. Company may file micro or dormant accounts.');
    }

    return `
      <div class="wwc-card wwc-card--financial wwc-card--accounts" data-signal="${signal.id}">
        <div class="wwc-card__header">
          <div class="wwc-card__icon wwc-card__icon--${signal.iconColor}">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="wwc-card__weight wwc-card__weight--${signal.weight}">
            <span>${signal.weight}</span>
          </div>
        </div>

        <div class="wwc-card__body">
          <h4 class="wwc-card__title">${signal.title}</h4>
          <p class="wwc-card__desc">${signal.description}</p>
        </div>

        <div class="wwc-card__visual wwc-card__visual--accounts">
          <div class="accounts-dashboard">
            <div class="accounts-metric">
              <div class="accounts-metric__header">
                <span class="accounts-metric__label">Turnover</span>
                <span class="accounts-metric__trend accounts-metric__trend--${data.turnover.trend}">
                  <i class="ph-bold ph-trend-${data.turnover.trend}"></i>
                  ${data.turnover.change}
                </span>
              </div>
              <div class="accounts-metric__value">${data.turnover.value}</div>
              <div class="accounts-metric__bar">
                <div class="accounts-metric__fill accounts-metric__fill--${data.turnover.trend}" style="width: 78%"></div>
              </div>
            </div>

            <div class="accounts-metric">
              <div class="accounts-metric__header">
                <span class="accounts-metric__label">Net Assets</span>
                <span class="accounts-metric__trend accounts-metric__trend--${data.netAssets.trend}">
                  <i class="ph-bold ph-trend-${data.netAssets.trend}"></i>
                  ${data.netAssets.change}
                </span>
              </div>
              <div class="accounts-metric__value">${data.netAssets.value}</div>
              <div class="accounts-metric__bar">
                <div class="accounts-metric__fill accounts-metric__fill--${data.netAssets.trend}" style="width: 62%"></div>
              </div>
            </div>
          </div>

          <div class="accounts-footer">
            <div class="accounts-badge">
              <i class="ph ph-file-text"></i>
              <span>${data.accountsType} accounts</span>
            </div>
            <div class="accounts-period">
              <i class="ph ph-calendar-blank"></i>
              <span>${data.filingYear}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

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
  // PANEL RENDERER
  // ============================================================================

  /**
   * Render all cards for the Financial panel
   */
  function renderFinancialPanel(signals) {
    return signals.map(signal => {
      switch (signal.cardType) {
        case 'deadline-tracker':
          return renderDeadlineTracker(signal);
        case 'legal-record':
          return renderLegalRecord(signal);
        case 'accounts-snapshot':
          return renderAccountsSnapshot(signal);
        default:
          return renderDeadlineTracker(signal);
      }
    }).join('');
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