/* ============================================
   COMPANYWISE — Stability Panel Component
   Unique visual cards for company stability signals
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
  // CARD RENDERERS
  // ============================================================================

  /**
   * Render a placeholder card when data isn't available yet
   */
  function renderNoDataCard(signal, message) {
    return `
      <div class="wwc-card wwc-card--stability wwc-card--no-data" data-signal="${signal.id}">
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
   * Render a status indicator card (for company status)
   * Visual: Traffic-light status badge with status history
   */
  function renderStatusIndicator(signal) {
    const { data } = signal;

    if (!signal.hasData || data.status === null) {
      return renderNoDataCard(signal, 'No company status found in dataset.');
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
      <div class="wwc-card wwc-card--stability wwc-card--status" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--status">
          <div class="status-beacon">
            <div class="status-beacon__light status-beacon__light--${statusInfo.class}">
              <i class="ph-fill ${statusInfo.icon}"></i>
            </div>
            <div class="status-beacon__info">
              <span class="status-beacon__label">${statusInfo.label}</span>
              <span class="status-beacon__since">Since ${data.incorporatedDate}</span>
            </div>
          </div>

          <div class="status-traffic">
            <div class="status-traffic__light status-traffic__light--ok ${statusInfo.class === 'ok' ? 'status-traffic__light--active' : ''}"></div>
            <div class="status-traffic__light status-traffic__light--warning ${statusInfo.class === 'warning' ? 'status-traffic__light--active' : ''}"></div>
            <div class="status-traffic__light status-traffic__light--danger ${statusInfo.class === 'danger' || statusInfo.class === 'critical' ? 'status-traffic__light--active' : ''}"></div>
          </div>

          ${data.previousStatuses && data.previousStatuses.length > 1 ? `
            <div class="status-history">
              <div class="status-history__label">
                <i class="ph ph-clock-counter-clockwise"></i>
                <span>Status history</span>
              </div>
              <div class="status-history__entries">
                ${data.previousStatuses.map(entry => `
                  <div class="status-history__entry">
                    <span class="status-history__date">${entry.date}</span>
                    <span class="status-history__status">${entry.status}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render an age timeline card (for company age)
   * Visual: Horizontal progress timeline with age bracket milestones
   */
  function renderAgeTimeline(signal) {
    const { data } = signal;

    if (!signal.hasData || data.years === null) {
      return renderNoDataCard(signal, 'No incorporation date found in dataset.');
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
      <div class="wwc-card wwc-card--stability wwc-card--age" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--age">
          <div class="age-display">
            <span class="age-display__value">${data.years}</span>
            <span class="age-display__unit">years</span>
            <span class="age-display__months">${data.months} months</span>
          </div>

          <div class="age-bracket age-bracket--${bracketInfo.class}">
            <i class="ph-fill ph-shield-check"></i>
            <span>${bracketInfo.label}</span>
          </div>

          <div class="age-timeline">
            <div class="age-timeline__bar">
              <div class="age-timeline__fill age-timeline__fill--${bracketInfo.class}" style="width: ${progressPercent}%"></div>
              <div class="age-timeline__marker" style="left: ${progressPercent}%"></div>
            </div>
            <div class="age-timeline__milestones">
              <span class="age-timeline__milestone" style="left: 0%">0</span>
              <span class="age-timeline__milestone" style="left: ${(thresholds.new / maxYears) * 100}%">${thresholds.new}yr</span>
              <span class="age-timeline__milestone" style="left: ${(thresholds.growing / maxYears) * 100}%">${thresholds.growing}yr</span>
              <span class="age-timeline__milestone" style="left: ${(thresholds.established / maxYears) * 100}%">${thresholds.established}yr</span>
              <span class="age-timeline__milestone" style="left: 100%">${maxYears}+</span>
            </div>
          </div>

          <div class="age-meta">
            <div class="age-meta__item">
              <i class="ph ph-calendar"></i>
              <span>Incorporated: ${data.incorporatedDate}</span>
            </div>
            ${data.firstFilingDate ? `
              <div class="age-meta__item">
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
   * Render an address trail card (for address changes)
   * Visual: Vertical location trail with pin markers
   */
  function renderAddressTrail(signal) {
    const { data } = signal;

    if (!signal.hasData || data.changeCount === null) {
      return renderNoDataCard(signal, 'No address change history available.');
    }

    const frequencyMap = {
      'none':     { class: 'ok',      label: 'No changes' },
      'low':      { class: 'ok',      label: 'Low frequency' },
      'moderate': { class: 'warning', label: 'Moderate frequency' },
      'high':     { class: 'danger',  label: 'High frequency' }
    };

    const freqInfo = frequencyMap[data.frequency] || frequencyMap['low'];

    return `
      <div class="wwc-card wwc-card--stability wwc-card--address" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--address">
          <div class="address-summary">
            <div class="address-summary__count">
              <span class="address-summary__value">${data.changeCount}</span>
              <span class="address-summary__label">changes</span>
            </div>
            <div class="address-summary__freq address-summary__freq--${freqInfo.class}">
              <i class="ph ph-map-pin"></i>
              <span>${freqInfo.label}</span>
            </div>
          </div>

          <div class="address-trail">
            ${data.recentChanges.map((change, idx) => `
              <div class="address-trail__stop ${idx === 0 ? 'address-trail__stop--current' : 'address-trail__stop--previous'}">
                <div class="address-trail__pin">
                  <i class="ph-fill ph-map-pin"></i>
                  ${idx < data.recentChanges.length - 1 ? '<div class="address-trail__line"></div>' : ''}
                </div>
                <div class="address-trail__detail">
                  <span class="address-trail__date">${change.date}</span>
                  <span class="address-trail__address">${change.address}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="address-tenure">
            <i class="ph ph-clock"></i>
            <span>${data.yearsAtCurrent} year${data.yearsAtCurrent !== 1 ? 's' : ''} at current address</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a name history card (for previous names)
   * Visual: Stacked name tags showing rebrand trail
   */
  function renderNameHistory(signal) {
    const { data } = signal;

    if (!signal.hasData || data.nameCount === null) {
      return renderNoDataCard(signal, 'No previous name data available.');
    }

    const hasChanges = data.nameCount > 0;

    return `
      <div class="wwc-card wwc-card--stability wwc-card--names" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--names">
          ${hasChanges ? `
            <div class="name-summary">
              <span class="name-summary__count">${data.nameCount}</span>
              <span class="name-summary__label">name change${data.nameCount !== 1 ? 's' : ''}</span>
            </div>

            <div class="name-stack">
              ${data.names.map((entry, idx) => `
                <div class="name-tag name-tag--${entry.type}" style="--stack-offset: ${idx}">
                  <div class="name-tag__icon">
                    <i class="ph ${entry.type === 'current' ? 'ph-check-circle' : 'ph-arrow-bend-up-left'}"></i>
                  </div>
                  <div class="name-tag__content">
                    <span class="name-tag__name">${entry.name}</span>
                    <span class="name-tag__date">${entry.type === 'current' ? 'Current' : entry.date}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="name-clear">
              <i class="ph ph-check-circle"></i>
              <span>No name changes on record</span>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ============================================================================
  // PANEL RENDERER
  // ============================================================================

  /**
   * Render all cards for the Stability panel
   */
  function renderStabilityPanel(signals) {
    return signals.map(signal => {
      switch (signal.cardType) {
        case 'status-indicator':
          return renderStatusIndicator(signal);
        case 'age-timeline':
          return renderAgeTimeline(signal);
        case 'address-trail':
          return renderAddressTrail(signal);
        case 'name-history':
          return renderNameHistory(signal);
        default:
          return renderNoDataCard(signal);
      }
    }).join('');
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
