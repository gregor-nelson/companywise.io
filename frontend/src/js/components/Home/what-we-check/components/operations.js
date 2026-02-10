/* ============================================
   COMPANYWISE — Operations Panel Component
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
  // CARD RENDERERS — Composed Illustration Style
  // ============================================================================

  /**
   * Placeholder when signal data isn't available
   */
  function renderNoDataCard(signal, extraClass) {
    return `
      <div class="ops-card ${extraClass || ''} ops-card--no-data" data-signal="${signal.id}">
        <div class="ops-card__header">
          <div class="ops-card__icon ops-card__icon--muted">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="ops-card__titles">
            <h4 class="ops-card__name">${signal.title}</h4>
          </div>
        </div>
        <div class="ops-card__empty">
          <i class="ph ph-database"></i>
          <span>Data not yet available</span>
        </div>
      </div>
    `;
  }

  /**
   * Anchor card — Filing Consistency
   * Primary showcase card with filing breakdown + recent history (capped at 3)
   */
  function renderAnchorCard(signal) {
    const { data } = signal;

    if (!signal.hasData || data.totalFilings === null) {
      return renderNoDataCard(signal, 'ops-card--anchor');
    }

    // Cap filing history to 3 most recent entries
    const recentFilings = (data.filingHistory || []).slice(0, 3);

    return `
      <div class="ops-card ops-card--anchor" data-signal="${signal.id}">
        <div class="ops-card__header">
          <div class="ops-card__icon ops-card__icon--amber">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="ops-card__titles">
            <h4 class="ops-card__name">${signal.title}</h4>
            <p class="ops-card__sub">Do they file regularly?</p>
          </div>
          <span class="ops-card__badge ops-card__badge--medium">Med</span>
        </div>

        <div class="ops-anchor__body">
          <div class="ops-anchor__breakdown">
            <div class="ops-anchor__stat">
              <span class="ops-anchor__stat-value">${data.annualAccounts}</span>
              <span class="ops-anchor__stat-label">Acc</span>
            </div>
            <div class="ops-anchor__stat-divider"></div>
            <div class="ops-anchor__stat">
              <span class="ops-anchor__stat-value">${data.confirmationStatements}</span>
              <span class="ops-anchor__stat-label">CS01</span>
            </div>
            <div class="ops-anchor__stat-divider"></div>
            <div class="ops-anchor__stat">
              <span class="ops-anchor__stat-value">${data.otherFilings}</span>
              <span class="ops-anchor__stat-label">Other</span>
            </div>
            <div class="ops-anchor__stat-divider"></div>
            <div class="ops-anchor__stat ops-anchor__stat--highlight">
              <span class="ops-anchor__stat-value">${data.onTimeRate}</span>
              <span class="ops-anchor__stat-label">On time</span>
            </div>
          </div>

          <div class="ops-anchor__history">
            ${recentFilings.map(filing => `
              <div class="ops-anchor__entry">
                <span class="ops-anchor__entry-badge ops-anchor__entry-badge--${filing.type.toLowerCase()}">${filing.type}</span>
                <span class="ops-anchor__entry-label">${filing.label}</span>
                <span class="ops-anchor__entry-date">${filing.date}</span>
                <span class="ops-anchor__entry-status">
                  ${filing.onTime === true ? '<i class="ph-fill ph-check-circle ops-anchor__entry-status--ok"></i>' :
                    filing.onTime === false ? '<i class="ph-fill ph-warning-circle ops-anchor__entry-status--late"></i>' :
                    '<i class="ph ph-minus-circle ops-anchor__entry-status--na"></i>'}
                </span>
              </div>
            `).join('')}
          </div>

          <div class="ops-anchor__footer">
            <span><i class="ph ph-file-text"></i> ${data.accountsType} accounts</span>
            <span><i class="ph ph-calendar-blank"></i> Last: ${data.lastFiledDate}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — Virtual Office Check (top-right)
   * Simplified: address line + stamp badge + shared count
   */
  function renderVirtualOfficeFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || data.address === null) {
      return renderNoDataCard(signal, 'ops-card--float-office');
    }

    return `
      <div class="ops-card ops-card--float-office" data-signal="${signal.id}">
        <div class="ops-card__header">
          <div class="ops-card__icon ops-card__icon--blue">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="ops-card__titles">
            <h4 class="ops-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="ops-office__body">
          <div class="ops-office__address">
            <i class="ph ph-map-pin"></i>
            <span>${data.address}</span>
          </div>

          <div class="ops-office__stamp ops-office__stamp--${data.isVirtualOffice ? 'flagged' : 'clear'}">
            <i class="ph-fill ${data.isVirtualOffice ? 'ph-warning-circle' : 'ph-check-circle'}"></i>
            <span>${data.isVirtualOffice ? 'Virtual Office Detected' : 'No Virtual Office Match'}</span>
          </div>

          <div class="ops-office__shared ${data.companiesAtAddress > 50 ? 'ops-office__shared--crowded' : ''}">
            <i class="ph ph-buildings"></i>
            <span><strong>${data.companiesAtAddress}</strong> companies at address</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — SIC Code Analysis (bottom-left)
   * Sector badge + risk label + codes + failure rate bar
   */
  function renderSICFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || !data.codes || data.codes.length === 0) {
      return renderNoDataCard(signal, 'ops-card--float-sic');
    }

    const riskMap = {
      'low':    { class: 'ok',      label: 'Low Risk' },
      'medium': { class: 'warning', label: 'Medium Risk' },
      'high':   { class: 'danger',  label: 'High Risk' }
    };

    const riskInfo = riskMap[data.sectorRiskLevel] || riskMap['medium'];
    const barWidth = data.sectorRiskLevel === 'low' ? 25 : data.sectorRiskLevel === 'high' ? 85 : 55;

    return `
      <div class="ops-card ops-card--float-sic" data-signal="${signal.id}">
        <div class="ops-card__header">
          <div class="ops-card__icon ops-card__icon--blue">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="ops-card__titles">
            <h4 class="ops-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="ops-sic__body">
          <div class="ops-sic__sector">
            <span class="ops-sic__sector-name">${data.primarySector}</span>
            <span class="ops-sic__sector-risk ops-sic__sector-risk--${riskInfo.class}">${riskInfo.label}</span>
          </div>

          <div class="ops-sic__codes">
            ${data.codes.map(sic => `
              <div class="ops-sic__code">
                <span class="ops-sic__code-num">${sic.code}</span>
                <span class="ops-sic__code-desc">${sic.description}</span>
              </div>
            `).join('')}
          </div>

          <div class="ops-sic__meter">
            <span class="ops-sic__meter-label">Failure rate</span>
            <div class="ops-sic__meter-row">
              <div class="ops-sic__meter-track">
                <div class="ops-sic__meter-fill ops-sic__meter-fill--${riskInfo.class}" style="width: ${barWidth}%"></div>
              </div>
              <span class="ops-sic__meter-value">${data.sectorFailureRate}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // PANEL RENDERER — Composed Showcase
  // ============================================================================

  /**
   * Renders the full Operations panel as a composed illustration:
   * - Anchor card (Filing Consistency) centred
   * - Float card top-right (Virtual Office Check)
   * - Float card bottom-left (SIC Code Analysis)
   * - Depth card + blur accent for layered feel
   */
  function renderOperationsPanel(signals) {
    const filing = signals.find(s => s.id === 'filing-consistency');
    const office = signals.find(s => s.id === 'virtual-office');
    const sic = signals.find(s => s.id === 'sic-code');

    return `
      <div class="ops-showcase">
        <div class="ops-showcase__depth" aria-hidden="true"></div>
        ${filing ? renderAnchorCard(filing) : ''}
        ${office ? renderVirtualOfficeFloat(office) : ''}
        ${sic ? renderSICFloat(sic) : ''}
        <div class="ops-showcase__blur" aria-hidden="true"></div>
      </div>
    `;
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
