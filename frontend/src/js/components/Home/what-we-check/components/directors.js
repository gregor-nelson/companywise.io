/* ============================================
   COMPANYWISE — Directors Panel Component
   Composed illustration: anchor card + floating data widget
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

    'director-history': {
      totalDirectors: 3,               // from: API GET /company/{number}/officers (count all roles = director)
      activeDirectors: 2,              // from: API officers (count where resigned_on is null)
      resignedCount: 1,                // from: API officers (count where resigned_on is not null)
      directors: [                     // from: API officers list
        {
          name: 'J. Smith',
          role: 'Director',
          appointedDate: 'Mar 2016',
          status: 'active',
          otherCompanies: 4,           // from: API GET /officers/{id}/appointments (count)
          dissolvedCompanies: 1        // from: API appointments (count where company_status = dissolved)
        },
        {
          name: 'A. Johnson',
          role: 'Director',
          appointedDate: 'Jun 2020',
          status: 'active',
          otherCompanies: 7,
          dissolvedCompanies: 3
        },
        {
          name: 'R. Williams',
          role: 'Director',
          appointedDate: 'Jan 2018',
          resignedDate: 'Dec 2022',
          status: 'resigned',
          otherCompanies: 2,
          dissolvedCompanies: 0
        }
      ],
      totalDissolved: 4,               // derived: sum of dissolvedCompanies across all directors
      avgTenureYears: 5                // derived: average years in post across active directors
    },

    'psc-register': {
      pscCount: 2,                     // from: API GET /company/{number}/persons-with-significant-control
      entries: [                       // from: API PSC list
        {
          name: 'J. Smith',
          ownership: '50-75%',         // from: natures_of_control array (ownership-of-shares-*)
          controlType: 'shares',       // derived: from natures_of_control prefix
          notifiedDate: 'Apr 2016'     // from: notified_on field
        },
        {
          name: 'A. Johnson',
          ownership: '25-50%',
          controlType: 'shares',
          notifiedDate: 'Jul 2020'
        }
      ],
      hasExemptions: false,            // from: API PSC (check for exemptions or super-secure persons)
      totalControl: '100%'             // derived: sum / validation of ownership bands
    }

  };

  // ============================================================================
  // SIGNAL DEFINITIONS — static metadata, doesn't change per company
  // ============================================================================

  const SIGNAL_DEFINITIONS = [
    {
      id: 'director-history',
      cardType: 'director-network',
      title: 'Director History',
      description: 'Has the director left a trail of dissolved companies? Frequent changes signal instability.',
      icon: 'ph-user-switch',
      iconColor: 'amber',
      weight: 'medium'
    },
    {
      id: 'psc-register',
      cardType: 'ownership-chart',
      title: 'PSC Register',
      description: 'Who actually owns the company? We check the Persons with Significant Control register for transparency.',
      icon: 'ph-users-three',
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

  const DirectorsPanel = {
    id: 'directors-control',
    label: 'Directors',
    shortLabel: 'Directors',
    icon: 'ph-users',
    color: 'blue',
    panelType: 'directors',

    hero: {
      headline: 'Directors & control',
      subheadline: 'Who runs the company and what\'s their track record with previous ventures',
      bullets: [
        'Director history across multiple companies',
        'Persons with significant control transparency',
        'Patterns of dissolved companies in background'
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
      <div class="dir-card ${extraClass || ''} dir-card--no-data" data-signal="${signal.id}">
        <div class="dir-card__header">
          <div class="dir-card__icon dir-card__icon--muted">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="dir-card__titles">
            <h4 class="dir-card__name">${signal.title}</h4>
          </div>
        </div>
        <div class="dir-card__empty">
          <i class="ph ph-database"></i>
          <span>Data not yet available</span>
        </div>
      </div>
    `;
  }

  /**
   * Anchor card — Director History
   * Primary showcase card with stats row + director roster + tenure footer
   */
  function renderAnchorCard(signal) {
    const { data } = signal;

    if (!signal.hasData || data.totalDirectors === null) {
      return renderNoDataCard(signal, 'dir-card--anchor');
    }

    const hasConcern = data.totalDissolved > 2;
    const rosterRows = data.directors.slice(0, 2);

    return `
      <div class="dir-card dir-card--anchor" data-signal="${signal.id}">
        <div class="dir-card__header">
          <div class="dir-card__icon dir-card__icon--amber">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="dir-card__titles">
            <h4 class="dir-card__name">${signal.title}</h4>
            <p class="dir-card__sub">Track record across companies</p>
          </div>
          <span class="dir-card__badge dir-card__badge--medium">Med</span>
        </div>

        <div class="dir-anchor__body">
          <div class="dir-anchor__stats">
            <div class="dir-anchor__stat">
              <span class="dir-anchor__stat-value">${data.activeDirectors}</span>
              <span class="dir-anchor__stat-label">Active</span>
            </div>
            <div class="dir-anchor__stat dir-anchor__stat--muted">
              <span class="dir-anchor__stat-value">${data.resignedCount}</span>
              <span class="dir-anchor__stat-label">Resigned</span>
            </div>
            <div class="dir-anchor__stat ${hasConcern ? 'dir-anchor__stat--alert' : ''}">
              <span class="dir-anchor__stat-value">${data.totalDissolved}</span>
              <span class="dir-anchor__stat-label">Dissolved cos.</span>
            </div>
          </div>

          <div class="dir-anchor__roster">
            ${rosterRows.map(dir => `
              <div class="dir-anchor__row dir-anchor__row--${dir.status}">
                <div class="dir-anchor__row-avatar">
                  <i class="ph-fill ph-user-circle"></i>
                </div>
                <div class="dir-anchor__row-info">
                  <span class="dir-anchor__row-name">${dir.name}</span>
                  <span class="dir-anchor__row-meta">${dir.role} · ${dir.appointedDate}${dir.resignedDate ? ' – ' + dir.resignedDate : ''}</span>
                </div>
                <div class="dir-anchor__row-flags">
                  <span class="dir-anchor__row-companies" title="Other company appointments">
                    <i class="ph ph-buildings"></i>
                    <span>${dir.otherCompanies}</span>
                  </span>
                  ${dir.dissolvedCompanies > 0 ? `
                    <span class="dir-anchor__row-dissolved" title="Dissolved companies linked">
                      <i class="ph ph-warning"></i>
                      <span>${dir.dissolvedCompanies}</span>
                    </span>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <div class="dir-anchor__tenure">
            <i class="ph ph-clock"></i>
            <span>Avg. tenure: <strong>${data.avgTenureYears} years</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Float card — PSC Register
   * Compact ownership entries with percentage bars + transparency indicator
   */
  function renderPSCFloat(signal) {
    const { data } = signal;

    if (!signal.hasData || data.pscCount === null) {
      return renderNoDataCard(signal, 'dir-card--float-psc');
    }

    const ownershipToPercent = {
      '75-100%': 87,
      '50-75%':  62,
      '25-50%':  37,
      '25%':     25
    };

    return `
      <div class="dir-card dir-card--float-psc" data-signal="${signal.id}">
        <div class="dir-card__header">
          <div class="dir-card__icon dir-card__icon--blue">
            <i class="ph ${signal.icon}"></i>
          </div>
          <div class="dir-card__titles">
            <h4 class="dir-card__name">${signal.title}</h4>
          </div>
        </div>

        <div class="dir-psc__body">
          <div class="dir-psc__count">
            <span class="dir-psc__count-value">${data.pscCount}</span>
            <span class="dir-psc__count-label">person${data.pscCount !== 1 ? 's' : ''} with significant control</span>
          </div>

          <div class="dir-psc__entries">
            ${data.entries.map(psc => {
              const barWidth = ownershipToPercent[psc.ownership] || 50;
              return `
                <div class="dir-psc__entry">
                  <div class="dir-psc__entry-person">
                    <div class="dir-psc__entry-avatar">
                      <i class="ph-fill ph-user-circle"></i>
                    </div>
                    <div class="dir-psc__entry-info">
                      <span class="dir-psc__entry-name">${psc.name}</span>
                      <span class="dir-psc__entry-since">Since ${psc.notifiedDate}</span>
                    </div>
                  </div>
                  <div class="dir-psc__entry-control">
                    <div class="dir-psc__entry-track">
                      <div class="dir-psc__entry-fill" style="width: ${barWidth}%"></div>
                    </div>
                    <div class="dir-psc__entry-detail">
                      <span class="dir-psc__entry-percent">${psc.ownership}</span>
                      <span class="dir-psc__entry-type">
                        <i class="ph ${psc.controlType === 'shares' ? 'ph-chart-pie-slice' : 'ph-key'}"></i>
                        ${psc.controlType}
                      </span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="dir-psc__footer dir-psc__footer--${data.hasExemptions ? 'warning' : 'clear'}">
            <i class="ph ${data.hasExemptions ? 'ph-warning' : 'ph-check-circle'}"></i>
            <span>${data.hasExemptions ? 'Exemptions or super-secure persons present' : 'Full transparency — no exemptions'}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // PANEL RENDERER — Composed Showcase
  // ============================================================================

  /**
   * Renders the full Directors panel as a composed illustration:
   * - Anchor card (Director History) centred with stats + roster
   * - Float card bottom-right (PSC Register)
   * - Depth card + blur accent for layered feel
   */
  function renderDirectorsPanel(signals) {
    const directorHistory = signals.find(s => s.id === 'director-history');
    const pscRegister = signals.find(s => s.id === 'psc-register');

    return `
      <div class="dir-showcase">
        <div class="dir-showcase__depth" aria-hidden="true"></div>
        ${directorHistory ? renderAnchorCard(directorHistory) : ''}
        ${pscRegister ? renderPSCFloat(pscRegister) : ''}
        <div class="dir-showcase__blur" aria-hidden="true"></div>
      </div>
    `;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.WWCPanels.DirectorsPanel = DirectorsPanel;
  window.WWCPanels.renderers.directors = renderDirectorsPanel;

  // Re-assemble categories if the index has already loaded
  if (window.WWCPanels.assembleCategories) {
    window.WWCPanels.assembleCategories();
  }

})();
