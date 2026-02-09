/* ============================================
   COMPANYWISE — Directors Panel Component
   Unique visual cards for directors & control signals
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
  // CARD RENDERERS
  // ============================================================================

  /**
   * Render a placeholder card when data isn't available yet
   */
  function renderNoDataCard(signal, message) {
    return `
      <div class="wwc-card wwc-card--directors wwc-card--no-data" data-signal="${signal.id}">
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
   * Render a director network card (for director history)
   * Visual: Director profile rows with dissolved company indicators
   */
  function renderDirectorNetwork(signal) {
    const { data } = signal;

    if (!signal.hasData || data.totalDirectors === null) {
      return renderNoDataCard(signal, 'No director data available from Companies House.');
    }

    const hasConcern = data.totalDissolved > 2;

    return `
      <div class="wwc-card wwc-card--directors wwc-card--network" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--network">
          <div class="director-stats">
            <div class="director-stat">
              <span class="director-stat__value">${data.activeDirectors}</span>
              <span class="director-stat__label">Active</span>
            </div>
            <div class="director-stat director-stat--muted">
              <span class="director-stat__value">${data.resignedCount}</span>
              <span class="director-stat__label">Resigned</span>
            </div>
            <div class="director-stat ${hasConcern ? 'director-stat--alert' : ''}">
              <span class="director-stat__value">${data.totalDissolved}</span>
              <span class="director-stat__label">Dissolved cos.</span>
            </div>
          </div>

          <div class="director-roster">
            ${data.directors.map(dir => `
              <div class="director-row director-row--${dir.status}">
                <div class="director-row__avatar">
                  <i class="ph-fill ph-user-circle"></i>
                </div>
                <div class="director-row__info">
                  <span class="director-row__name">${dir.name}</span>
                  <span class="director-row__meta">${dir.role} · ${dir.appointedDate}${dir.resignedDate ? ' – ' + dir.resignedDate : ''}</span>
                </div>
                <div class="director-row__flags">
                  <span class="director-row__companies" title="Other company appointments">
                    <i class="ph ph-buildings"></i>
                    <span>${dir.otherCompanies}</span>
                  </span>
                  ${dir.dissolvedCompanies > 0 ? `
                    <span class="director-row__dissolved" title="Dissolved companies linked">
                      <i class="ph ph-warning"></i>
                      <span>${dir.dissolvedCompanies}</span>
                    </span>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <div class="director-tenure">
            <i class="ph ph-clock"></i>
            <span>Avg. tenure: <strong>${data.avgTenureYears} years</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render an ownership chart card (for PSC register)
   * Visual: Ownership percentage bars with control type indicators
   */
  function renderOwnershipChart(signal) {
    const { data } = signal;

    if (!signal.hasData || data.pscCount === null) {
      return renderNoDataCard(signal, 'No PSC register data available.');
    }

    // Map ownership band text to approximate percentage for bar widths
    const ownershipToPercent = {
      '75-100%': 87,
      '50-75%':  62,
      '25-50%':  37,
      '25%':     25
    };

    return `
      <div class="wwc-card wwc-card--directors wwc-card--ownership" data-signal="${signal.id}">
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

        <div class="wwc-card__visual wwc-card__visual--ownership">
          <div class="ownership-header">
            <span class="ownership-header__count">${data.pscCount} person${data.pscCount !== 1 ? 's' : ''}</span>
            <span class="ownership-header__control">with significant control</span>
          </div>

          <div class="ownership-entries">
            ${data.entries.map(psc => {
              const barWidth = ownershipToPercent[psc.ownership] || 50;
              return `
                <div class="ownership-entry">
                  <div class="ownership-entry__person">
                    <div class="ownership-entry__avatar">
                      <i class="ph-fill ph-user-circle"></i>
                    </div>
                    <div class="ownership-entry__info">
                      <span class="ownership-entry__name">${psc.name}</span>
                      <span class="ownership-entry__since">Since ${psc.notifiedDate}</span>
                    </div>
                  </div>
                  <div class="ownership-entry__control">
                    <div class="ownership-entry__bar-track">
                      <div class="ownership-entry__bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                    <div class="ownership-entry__detail">
                      <span class="ownership-entry__percent">${psc.ownership}</span>
                      <span class="ownership-entry__type">
                        <i class="ph ${psc.controlType === 'shares' ? 'ph-chart-pie-slice' : 'ph-key'}"></i>
                        ${psc.controlType}
                      </span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="ownership-footer">
            <i class="ph ${data.hasExemptions ? 'ph-warning' : 'ph-check-circle'}"></i>
            <span>${data.hasExemptions ? 'Exemptions or super-secure persons present' : 'Full transparency — no exemptions'}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // PANEL RENDERER
  // ============================================================================

  /**
   * Render all cards for the Directors panel
   */
  function renderDirectorsPanel(signals) {
    return signals.map(signal => {
      switch (signal.cardType) {
        case 'director-network':
          return renderDirectorNetwork(signal);
        case 'ownership-chart':
          return renderOwnershipChart(signal);
        default:
          return renderNoDataCard(signal);
      }
    }).join('');
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
