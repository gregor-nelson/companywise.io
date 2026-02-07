/* ============================================
   COMPANYWISE — What We Check Components Index
   Central registry for all panel components
   ============================================ */

(function() {
  'use strict';

  // Create namespace
  window.WWCPanels = window.WWCPanels || {};

  // ============================================================================
  // FINANCIAL HEALTH PANEL
  // Note: Full panel definition with unique card renderers is in panels/financial.js
  // This is kept for backwards compatibility - the panels/financial.js version takes precedence
  // ============================================================================

  // FinancialPanel is defined in panels/financial.js and will override this if loaded

  // ============================================================================
  // STABILITY PANEL
  // ============================================================================

  window.WWCPanels.StabilityPanel = {
    id: 'company-stability',
    label: 'Stability',
    shortLabel: 'Stability',
    icon: 'ph-buildings',
    color: 'amber',

    hero: {
      headline: 'Stability indicators',
      subheadline: 'Signs of operational consistency and longevity that suggest reliable business practices',
      bullets: [
        'Company status and active trading verification',
        'Track record length and filing history',
        'Location stability and continuity signals'
      ]
    },

    signals: [
      {
        id: 'company-status',
        title: 'Company Status',
        description: 'Is the company active, dormant, or being struck off? We flag any status that isn\'t "Active".',
        icon: 'ph-prohibit',
        iconColor: 'red',
        weight: 'high'
      },
      {
        id: 'company-age',
        title: 'Company Age',
        description: 'Young companies without a filing track record carry more uncertainty. We factor in age with context.',
        icon: 'ph-clock-countdown',
        iconColor: 'amber',
        weight: 'medium'
      },
      {
        id: 'address-changes',
        title: 'Address Changes',
        description: 'Frequent registered office changes can indicate instability or an attempt to evade creditors.',
        icon: 'ph-map-pin',
        iconColor: 'amber',
        weight: 'medium'
      },
      {
        id: 'previous-names',
        title: 'Previous Names',
        description: 'Has the company rebranded multiple times? Name changes can be legitimate or a red flag.',
        icon: 'ph-textbox',
        iconColor: 'blue',
        weight: 'low'
      }
    ]
  };

  // ============================================================================
  // DIRECTORS PANEL
  // ============================================================================

  window.WWCPanels.DirectorsPanel = {
    id: 'directors-control',
    label: 'Directors',
    shortLabel: 'Directors',
    icon: 'ph-users',
    color: 'blue',

    hero: {
      headline: 'Directors & control',
      subheadline: 'Who runs the company and what\'s their track record with previous ventures',
      bullets: [
        'Director history across multiple companies',
        'Persons with significant control transparency',
        'Patterns of dissolved companies in background'
      ]
    },

    signals: [
      {
        id: 'director-history',
        title: 'Director History',
        description: 'Has the director left a trail of dissolved companies? Frequent changes signal instability.',
        icon: 'ph-user-switch',
        iconColor: 'amber',
        weight: 'medium'
      },
      {
        id: 'psc-register',
        title: 'PSC Register',
        description: 'Who actually owns the company? We check the Persons with Significant Control register for transparency.',
        icon: 'ph-users-three',
        iconColor: 'blue',
        weight: 'low'
      }
    ]
  };

  // ============================================================================
  // OPERATIONS PANEL
  // ============================================================================

  window.WWCPanels.OperationsPanel = {
    id: 'operations',
    label: 'Operations',
    shortLabel: 'Ops',
    icon: 'ph-gear',
    color: 'emerald',

    hero: {
      headline: 'Operational context',
      subheadline: 'Business characteristics that help paint the full picture of how the company operates',
      bullets: [
        'Registered address verification and type',
        'Industry sector risk assessment',
        'Filing consistency and disclosure level'
      ]
    },

    signals: [
      {
        id: 'virtual-office',
        title: 'Virtual Office Check',
        description: 'Registered at a known formation agent address? Not always bad, but worth knowing about.',
        icon: 'ph-buildings',
        iconColor: 'blue',
        weight: 'low'
      },
      {
        id: 'sic-code',
        title: 'SIC Code Analysis',
        description: 'Industry sector matters. Some sectors have higher failure rates — we factor that into the risk score.',
        icon: 'ph-briefcase',
        iconColor: 'blue',
        weight: 'low'
      },
      {
        id: 'filing-consistency',
        title: 'Filing Consistency',
        description: 'Do they file regular accounts or just confirmation statements? Micro-entity filings reveal less.',
        icon: 'ph-file-text',
        iconColor: 'amber',
        weight: 'medium'
      }
    ]
  };

  // ============================================================================
  // ASSEMBLED CATEGORIES ARRAY
  // Uses panel components if available, falls back to inline definitions
  // ============================================================================

  // Defer assembly to allow panel files to load first
  function assembleCategories() {
    window.WWCPanels.CATEGORIES = [
      window.WWCPanels.FinancialPanel,
      window.WWCPanels.StabilityPanel,
      window.WWCPanels.DirectorsPanel,
      window.WWCPanels.OperationsPanel
    ].filter(Boolean); // Filter out any undefined panels
  }

  // Assemble now, but also expose for re-assembly after panel files load
  assembleCategories();
  window.WWCPanels.assembleCategories = assembleCategories;

  // Helper functions
  window.WWCPanels.getPanelById = function(id) {
    return window.WWCPanels.CATEGORIES.find(panel => panel.id === id) || null;
  };

  window.WWCPanels.getTotalSignalCount = function() {
    return window.WWCPanels.CATEGORIES.reduce((total, panel) => total + panel.signals.length, 0);
  };

})();
