/* ============================================
   COMPANYWISE — Operations Panel Component
   Unique visual cards for operational context signals
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

    'virtual-office': {
      address: '71 Cherry Court, London, SE1 8QR',  // from: bulk CSV column: RegAddress.*
      isVirtualOffice: true,           // derived: match against known formation agent address list
      provider: 'Formations House',    // derived: matched provider name from address database
      matchConfidence: 'high',         // derived: confidence of the virtual office match
      companiesAtAddress: 142          // from: bulk CSV (count companies sharing same postcode + building)
    },

    'sic-code': {
      codes: [                         // from: bulk CSV columns: SICCode.SicText_1 through SicText_4
        { code: '62012', description: 'Business and domestic software development' },
        { code: '62020', description: 'Information technology consultancy activities' }
      ],
      primarySector: 'Technology',     // derived: mapped from first SIC code group
      sectorRiskLevel: 'low',          // derived: from sector failure rate lookup table
      sectorFailureRate: '4.2%',       // derived: ONS / Insolvency Service data for sector
      sectorAvgAge: '6.3 years'        // derived: average company age in this sector from bulk data
    },

    'filing-consistency': {
      totalFilings: 18,                // from: API GET /company/{number}/filing-history (total_count)
      annualAccounts: 7,               // from: API filing-history (count type = AA or AA01)
      confirmationStatements: 8,       // from: API filing-history (count type = CS01)
      otherFilings: 3,                 // derived: totalFilings minus accounts minus CS01
      accountsType: 'Micro',           // from: bulk CSV column: AccountsCategory
      lastFiledDate: '14 Oct 2023',    // from: bulk CSV column: LastAccountsMadeUpTo
      filingHistory: [                 // from: API filing-history, last 5 entries
        { type: 'CS01',   label: 'Confirmation', date: 'Dec 2023', onTime: true },
        { type: 'AA',     label: 'Accounts',     date: 'Oct 2023', onTime: true },
        { type: 'CS01',   label: 'Confirmation', date: 'Dec 2022', onTime: true },
        { type: 'AA',     label: 'Accounts',     date: 'Sep 2022', onTime: false },
        { type: 'AD01',   label: 'Address chg',  date: 'Sep 2022', onTime: null }
      ],
      onTimeRate: '86%'               // derived: percentage of accounts filed before due date
    }

  };

  // ============================================================================
  // SIGNAL DEFINITIONS — static metadata, doesn't change per company
  // ============================================================================

  const SIGNAL_DEFINITIONS = [
    {
      id: 'virtual-office',
      cardType: 'address-verify',
      title: 'Virtual Office Check',
      description: 'Registered at a known formation agent address? Not always bad, but worth knowing about.',
      icon: 'ph-buildings',
      iconColor: 'blue',
      weight: 'low'
    },
    {
      id: 'sic-code',
      cardType: 'sector-analysis',
      title: 'SIC Code Analysis',
      description: 'Industry sector matters. Some sectors have higher failure rates — we factor that into the risk score.',
      icon: 'ph-briefcase',
      iconColor: 'blue',
      weight: 'low'
    },
    {
      id: 'filing-consistency',
      cardType: 'filing-timeline',
      title: 'Filing Consistency',
      description: 'Do they file regular accounts or just confirmation statements? Micro-entity filings reveal less.',
      icon: 'ph-file-text',
      iconColor: 'amber',
      weight: 'medium'
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

  const OperationsPanel = {
    id: 'operations',
    label: 'Operations',
    shortLabel: 'Ops',
    icon: 'ph-gear',
    color: 'emerald',
    panelType: 'operations',

    hero: {
      headline: 'Operational context',
      subheadline: 'Business characteristics that help paint the full picture of how the company operates',
      bullets: [
        'Registered address verification and type',
        'Industry sector risk assessment',
        'Filing consistency and disclosure level'
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
      <div class="wwc-card wwc-card--operations wwc-card--no-data" data-signal="${signal.id}">
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
   * Render an address verification card (for virtual office check)
   * Visual: Address card with verification stamp and shared-address indicator
   */
  function renderAddressVerify(signal) {
    const { data } = signal;

    if (!signal.hasData || data.address === null) {
      return renderNoDataCard(signal, 'No registered address data available.');
    }

    return `
      <div class="wwc-card wwc-card--operations wwc-card--address-verify" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--address-verify">
          <div class="verify-address">
            <div class="verify-address__icon">
              <i class="ph ph-map-pin"></i>
            </div>
            <div class="verify-address__text">${data.address}</div>
          </div>

          <div class="verify-stamp verify-stamp--${data.isVirtualOffice ? 'flagged' : 'clear'}">
            <div class="verify-stamp__badge">
              <i class="ph-fill ${data.isVirtualOffice ? 'ph-warning-circle' : 'ph-check-circle'}"></i>
              <span>${data.isVirtualOffice ? 'Virtual Office Detected' : 'No Virtual Office Match'}</span>
            </div>
            ${data.isVirtualOffice ? `
              <div class="verify-stamp__detail">
                <span class="verify-stamp__provider">
                  <i class="ph ph-buildings"></i>
                  Provider: <strong>${data.provider}</strong>
                </span>
                <span class="verify-stamp__confidence">
                  <i class="ph ph-target"></i>
                  Confidence: <strong>${data.matchConfidence}</strong>
                </span>
              </div>
            ` : ''}
          </div>

          <div class="verify-shared ${data.companiesAtAddress > 50 ? 'verify-shared--crowded' : ''}">
            <i class="ph ph-buildings"></i>
            <span><strong>${data.companiesAtAddress}</strong> companies at this address</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a sector analysis card (for SIC code)
   * Visual: Sector badge with risk meter and industry stats
   */
  function renderSectorAnalysis(signal) {
    const { data } = signal;

    if (!signal.hasData || !data.codes || data.codes.length === 0) {
      return renderNoDataCard(signal, 'No SIC code data available for this company.');
    }

    const riskMap = {
      'low':    { class: 'ok',      label: 'Low Risk Sector',    barWidth: 25 },
      'medium': { class: 'warning', label: 'Medium Risk Sector', barWidth: 55 },
      'high':   { class: 'danger',  label: 'High Risk Sector',   barWidth: 85 }
    };

    const riskInfo = riskMap[data.sectorRiskLevel] || riskMap['medium'];

    return `
      <div class="wwc-card wwc-card--operations wwc-card--sector" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--sector">
          <div class="sector-badge">
            <div class="sector-badge__icon">
              <i class="ph ph-factory"></i>
            </div>
            <div class="sector-badge__info">
              <span class="sector-badge__name">${data.primarySector}</span>
              <span class="sector-badge__risk sector-badge__risk--${riskInfo.class}">${riskInfo.label}</span>
            </div>
          </div>

          <div class="sector-codes">
            ${data.codes.map(sic => `
              <div class="sector-code">
                <span class="sector-code__number">${sic.code}</span>
                <span class="sector-code__desc">${sic.description}</span>
              </div>
            `).join('')}
          </div>

          <div class="sector-risk-meter">
            <div class="sector-risk-meter__label">Sector failure rate</div>
            <div class="sector-risk-meter__bar">
              <div class="sector-risk-meter__track">
                <div class="sector-risk-meter__fill sector-risk-meter__fill--${riskInfo.class}" style="width: ${riskInfo.barWidth}%"></div>
              </div>
              <span class="sector-risk-meter__value">${data.sectorFailureRate}</span>
            </div>
          </div>

          <div class="sector-stats">
            <div class="sector-stat">
              <i class="ph ph-clock"></i>
              <span>Avg. company age: <strong>${data.sectorAvgAge}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a filing timeline card (for filing consistency)
   * Visual: Filing history rows with on-time/late indicators and breakdown
   */
  function renderFilingTimeline(signal) {
    const { data } = signal;

    if (!signal.hasData || data.totalFilings === null) {
      return renderNoDataCard(signal, 'No filing history available from Companies House.');
    }

    return `
      <div class="wwc-card wwc-card--operations wwc-card--filing" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--filing">
          <div class="filing-breakdown">
            <div class="filing-breakdown__item">
              <span class="filing-breakdown__value">${data.annualAccounts}</span>
              <span class="filing-breakdown__label">Accounts</span>
            </div>
            <div class="filing-breakdown__item">
              <span class="filing-breakdown__value">${data.confirmationStatements}</span>
              <span class="filing-breakdown__label">CS01s</span>
            </div>
            <div class="filing-breakdown__item">
              <span class="filing-breakdown__value">${data.otherFilings}</span>
              <span class="filing-breakdown__label">Other</span>
            </div>
            <div class="filing-breakdown__item filing-breakdown__item--highlight">
              <span class="filing-breakdown__value">${data.onTimeRate}</span>
              <span class="filing-breakdown__label">On time</span>
            </div>
          </div>

          <div class="filing-history">
            <div class="filing-history__label">
              <i class="ph ph-clock-counter-clockwise"></i>
              <span>Recent filings</span>
            </div>
            <div class="filing-history__entries">
              ${data.filingHistory.map(filing => `
                <div class="filing-entry">
                  <div class="filing-entry__type">
                    <span class="filing-entry__badge filing-entry__badge--${filing.type.toLowerCase()}">${filing.type}</span>
                  </div>
                  <div class="filing-entry__info">
                    <span class="filing-entry__label">${filing.label}</span>
                    <span class="filing-entry__date">${filing.date}</span>
                  </div>
                  <div class="filing-entry__status">
                    ${filing.onTime === true ? '<i class="ph-fill ph-check-circle filing-entry__status--ok"></i>' :
                      filing.onTime === false ? '<i class="ph-fill ph-warning-circle filing-entry__status--late"></i>' :
                      '<i class="ph ph-minus-circle filing-entry__status--na"></i>'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="filing-footer">
            <div class="filing-footer__type">
              <i class="ph ph-file-text"></i>
              <span>${data.accountsType} accounts</span>
            </div>
            <div class="filing-footer__date">
              <i class="ph ph-calendar-blank"></i>
              <span>Last filed: ${data.lastFiledDate}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // PANEL RENDERER
  // ============================================================================

  /**
   * Render all cards for the Operations panel
   */
  function renderOperationsPanel(signals) {
    return signals.map(signal => {
      switch (signal.cardType) {
        case 'address-verify':
          return renderAddressVerify(signal);
        case 'sector-analysis':
          return renderSectorAnalysis(signal);
        case 'filing-timeline':
          return renderFilingTimeline(signal);
        default:
          return renderNoDataCard(signal);
      }
    }).join('');
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.WWCPanels.OperationsPanel = OperationsPanel;
  window.WWCPanels.renderers.operations = renderOperationsPanel;

  // Re-assemble categories if the index has already loaded
  if (window.WWCPanels.assembleCategories) {
    window.WWCPanels.assembleCategories();
  }

})();
