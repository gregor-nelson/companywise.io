/* ============================================
   COMPANYWISE — Stability Panel Component
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

    'company-status': {
      status: 'Active',               // from: bulk CSV column: CompanyStatus
      statusCode: 'active',            // derived: normalised lowercase key for class mapping
      incorporatedDate: '12 Mar 2016', // from: bulk CSV column: IncorporationDate
      previousStatuses: [              // from: API GET /company/{number}/filing-history (status change events)
        { status: 'Active', date: '12 Mar 2016' }
      ]
    },

    'company-age': {
      years: 8,                        // calculated: today minus IncorporationDate (bulk CSV)
      months: 10,                      // calculated: remainder months
      incorporatedDate: '12 Mar 2016', // from: bulk CSV column: IncorporationDate
      bracket: 'established',          // derived: <2 = 'new', 2-5 = 'growing', 5-10 = 'established', 10+ = 'mature'
      firstFilingDate: '12 Mar 2017'   // from: API filing-history, earliest confirmation statement
    },

    'address-changes': {
      changeCount: 3,                  // from: API GET /company/{number}/filing-history (count of AD01 forms)
      recentChanges: [                 // from: API filing-history, most recent AD01 events
        { date: 'Sep 2023', address: '14 High Street, Manchester' },
        { date: 'Jan 2021', address: '7 Park Lane, Leeds' },
        { date: 'Mar 2016', address: '22 Mill Road, Birmingham' }
      ],
      frequency: 'moderate',           // derived: 0 = 'none', 1-2 = 'low', 3-4 = 'moderate', 5+ = 'high'
      yearsAtCurrent: 1                // calculated: today minus most recent AD01 date
    },

    'previous-names': {
      nameCount: 2,                    // from: API GET /company/{number} → previous_company_names array length
      names: [                         // from: API previous_company_names array
        { name: 'Current Trading Ltd', date: 'Jan 2021', type: 'current' },
        { name: 'Old Brand Solutions Ltd', date: 'Mar 2019', type: 'previous' },
        { name: 'Original Startup Ltd', date: 'Mar 2016', type: 'previous' }
      ]
    }

  };

  // ============================================================================
  // SIGNAL DEFINITIONS — static metadata, doesn't change per company
  // ============================================================================

  const SIGNAL_DEFINITIONS = [
    {
      id: 'company-status',
      cardType: 'status-indicator',
      title: 'Company Status',
      description: 'Is the company active, dormant, or being struck off? We flag any status that isn\'t "Active".',
      icon: 'ph-prohibit',
      iconColor: 'red',
      weight: 'high'
    },
    {
      id: 'company-age',
      cardType: 'age-timeline',
      title: 'Company Age',
      description: 'Young companies without a filing track record carry more uncertainty. We factor in age with context.',
      icon: 'ph-clock-countdown',
      iconColor: 'amber',
      weight: 'medium',
      thresholds: { new: 2, growing: 5, established: 10 }
    },
    {
      id: 'address-changes',
      cardType: 'address-trail',
      title: 'Address Changes',
      description: 'Frequent registered office changes can indicate instability or an attempt to evade creditors.',
      icon: 'ph-map-pin',
      iconColor: 'amber',
      weight: 'medium'
    },
    {
      id: 'previous-names',
      cardType: 'name-history',
      title: 'Previous Names',
      description: 'Has the company rebranded multiple times? Name changes can be legitimate or a red flag.',
      icon: 'ph-textbox',
      iconColor: 'blue',
      weight: 'low'
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

  const StabilityPanel = {
    id: 'company-stability',
    label: 'Stability',
    shortLabel: 'Stability',
    icon: 'ph-buildings',
    color: 'amber',
    panelType: 'stability',

    hero: {
      headline: 'Stability indicators',
      subheadline: 'Signs of operational consistency and longevity that suggest reliable business practices',
      bullets: [
        'Company status and active trading verification',
        'Track record length and filing history',
        'Location stability and continuity signals'
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
      <div class="stab-card ${extraClass || ''} stab-card--no-data" data-signal="${signal.id}">
        <div class="stab-card__header">
          <div class="stab-card__icon stab-card__icon--muted">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="stab-card__titles">
            <h4 class="stab-card__name">${signal.title}</h4>
          </div>
        </div>
        <div class="stab-card__empty">
          <i class="ph ph-database"></i>
          <span>Data not yet available</span>
        </div>
      </div>
    `;
  }

  /**
   * Anchor card — Company Age
   * Big number display + bracket badge + timeline bar + meta footer
   */
  function renderAnchorCard(signal) {
    const { data } = signal;

    if (!signal.hasData || data.years === null) {
      return renderNoDataCard(signal, 'stab-card--anchor');
    }

    const thresholds = signal.thresholds || { new: 2, growing: 5, established: 10 };
    const totalYears = data.years + (data.months / 12);
    const maxYears = 15;
    const progressPercent = Math.min((totalYears / maxYears) * 100, 100);

    const bracketMap = {
      'new':         { class: 'danger',  label: 'New Company' },
      'growing':     { class: 'warning', label: 'Growing' },
      'established': { class: 'ok',      label: 'Established' },
      'mature':      { class: 'strong',  label: 'Mature' }
    };

    const bracketInfo = bracketMap[data.bracket] || bracketMap['new'];

    return `
      <div class="stab-card stab-card--anchor" data-signal="${signal.id}">
        <div class="stab-card__header">
          <div class="stab-card__icon stab-card__icon--amber">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="stab-card__titles">
            <h4 class="stab-card__name">${signal.title}</h4>
            <p class="stab-card__sub">How long have they been trading?</p>
          </div>
          <span class="stab-card__badge stab-card__badge--medium">Med</span>
        </div>

        <div class="stab-anchor__body">
          <div class="stab-anchor__age">
            <div class="stab-anchor__age-display">
              <span class="stab-anchor__age-value">${data.years}</span>
              <span class="stab-anchor__age-unit">years</span>
              <span class="stab-anchor__age-months">${data.months} months</span>
            </div>
            <div class="stab-anchor__bracket stab-anchor__bracket--${bracketInfo.class}">
              <i class="ph-fill ph-shield-check"></i>
              <span>${bracketInfo.label}</span>
            </div>
          </div>

          <div class="stab-anchor__timeline">
            <div class="stab-anchor__timeline-bar">
              <div class="stab-anchor__timeline-fill stab-anchor__timeline-fill--${bracketInfo.class}" style="width: ${progressPercent}%"></div>
              <div class="stab-anchor__timeline-marker" style="left: ${progressPercent}%"></div>
            </div>
            <div class="stab-anchor__timeline-milestones">
              <span class="stab-anchor__milestone" style="left: 0%">0</span>
              <span class="stab-anchor__milestone" style="left: ${(thresholds.new / maxYears) * 100}%">${thresholds.new}yr</span>
              <span class="stab-anchor__milestone" style="left: ${(thresholds.growing / maxYears) * 100}%">${thresholds.growing}yr</span>
              <span class="stab-anchor__milestone" style="left: ${(thresholds.established / maxYears) * 100}%">${thresholds.established}yr</span>
              <span class="stab-anchor__milestone" style="left: 100%">${maxYears}+</span>
            </div>
          </div>

          <div class="stab-anchor__meta">
            <div class="stab-anchor__meta-item">
              <i class="ph ph-calendar"></i>
              <span>Incorporated: ${data.incorporatedDate}</span>
            </div>
            ${data.firstFilingDate ? `
              <div class="stab-anchor__meta-item">
                <i class="ph ph-file-text"></i>
                <span>First filing: ${data.firstFilingDate}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — Company Status (top-right)
   * Traffic-light beacon + status label + since date
   */
  function renderStatusFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || data.status === null) {
      return renderNoDataCard(signal, 'stab-card--float-status');
    }

    const statusMap = {
      active:          { class: 'ok',       icon: 'ph-check-circle',   label: 'Active' },
      dormant:         { class: 'warning',  icon: 'ph-pause-circle',   label: 'Dormant' },
      'in-liquidation':{ class: 'danger',   icon: 'ph-warning-circle', label: 'In Liquidation' },
      'struck-off':    { class: 'critical', icon: 'ph-x-circle',      label: 'Struck Off' },
      dissolved:       { class: 'critical', icon: 'ph-x-circle',      label: 'Dissolved' }
    };

    const statusInfo = statusMap[data.statusCode] || statusMap['active'];

    return `
      <div class="stab-card stab-card--float-status" data-signal="${signal.id}">
        <div class="stab-card__header">
          <div class="stab-card__icon stab-card__icon--red">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="stab-card__titles">
            <h4 class="stab-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="stab-status__body">
          <div class="stab-status__beacon">
            <div class="stab-status__light stab-status__light--${statusInfo.class}">
              <i class="ph-fill ${statusInfo.icon}"></i>
            </div>
            <div class="stab-status__info">
              <span class="stab-status__label">${statusInfo.label}</span>
              <span class="stab-status__since">Since ${data.incorporatedDate}</span>
            </div>
          </div>

          <div class="stab-status__traffic">
            <div class="stab-status__dot stab-status__dot--ok ${statusInfo.class === 'ok' ? 'stab-status__dot--active' : ''}"></div>
            <div class="stab-status__dot stab-status__dot--warning ${statusInfo.class === 'warning' ? 'stab-status__dot--active' : ''}"></div>
            <div class="stab-status__dot stab-status__dot--danger ${statusInfo.class === 'danger' || statusInfo.class === 'critical' ? 'stab-status__dot--active' : ''}"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — Address Changes (bottom-left)
   * Change count + frequency badge + tenure line (no trail stops)
   */
  function renderAddressFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || data.changeCount === null) {
      return renderNoDataCard(signal, 'stab-card--float-address');
    }

    const frequencyMap = {
      'none':     { class: 'ok',      label: 'No changes' },
      'low':      { class: 'ok',      label: 'Low' },
      'moderate': { class: 'warning', label: 'Moderate' },
      'high':     { class: 'danger',  label: 'High' }
    };

    const freqInfo = frequencyMap[data.frequency] || frequencyMap['low'];

    return `
      <div class="stab-card stab-card--float-address" data-signal="${signal.id}">
        <div class="stab-card__header">
          <div class="stab-card__icon stab-card__icon--amber">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="stab-card__titles">
            <h4 class="stab-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="stab-address__body">
          <div class="stab-address__summary">
            <span class="stab-address__count">${data.changeCount}</span>
            <span class="stab-address__label">changes</span>
            <span class="stab-address__freq stab-address__freq--${freqInfo.class}">${freqInfo.label}</span>
          </div>

          <div class="stab-address__tenure">
            <i class="ph ph-clock"></i>
            <span>${data.yearsAtCurrent} year${data.yearsAtCurrent !== 1 ? 's' : ''} at current</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — Previous Names (bottom-right)
   * Compact pill: count or "no changes" indicator
   */
  function renderNamesFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || data.nameCount === null) {
      return renderNoDataCard(signal, 'stab-card--float-names');
    }

    const hasChanges = data.nameCount > 0;

    return `
      <div class="stab-card stab-card--float-names" data-signal="${signal.id}">
        <div class="stab-card__header">
          <div class="stab-card__icon stab-card__icon--blue">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="stab-card__titles">
            <h4 class="stab-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="stab-names__body">
          ${hasChanges ? `
            <div class="stab-names__count">
              <span class="stab-names__value">${data.nameCount}</span>
              <span class="stab-names__label">name change${data.nameCount !== 1 ? 's' : ''}</span>
            </div>
          ` : `
            <div class="stab-names__clear">
              <i class="ph ph-check-circle"></i>
              <span>No name changes</span>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ============================================================================
  // PANEL RENDERER — Composed Showcase
  // ============================================================================

  /**
   * Renders the full Stability panel as a composed illustration:
   * - Anchor card (Company Age) centred with timeline
   * - Float card top-right (Company Status)
   * - Float card bottom-left (Address Changes)
   * - Float card bottom-right (Previous Names)
   * - Depth card + blur accent for layered feel
   */
  function renderStabilityPanel(signals) {
    const age = signals.find(s => s.id === 'company-age');
    const status = signals.find(s => s.id === 'company-status');
    const address = signals.find(s => s.id === 'address-changes');
    const names = signals.find(s => s.id === 'previous-names');

    return `
      <div class="stab-showcase">
        <div class="stab-showcase__depth" aria-hidden="true"></div>
        ${age ? renderAnchorCard(age) : ''}
        ${status ? renderStatusFloat(status) : ''}
        ${address ? renderAddressFloat(address) : ''}
        ${names ? renderNamesFloat(names) : ''}
        <div class="stab-showcase__blur" aria-hidden="true"></div>
      </div>
    `;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.WWCPanels.StabilityPanel = StabilityPanel;
  window.WWCPanels.renderers.stability = renderStabilityPanel;

  // Re-assemble categories if the index has already loaded
  if (window.WWCPanels.assembleCategories) {
    window.WWCPanels.assembleCategories();
  }

})();
