/* ============================================
   COMPANYWISE — What We Check Components Index
   Central registry for all panel components
   ============================================ */

(function() {
  'use strict';

  // Create namespace
  window.WWCPanels = window.WWCPanels || {};

  // ============================================================================
  // PANEL COMPONENTS
  // Each panel is defined in its own file under components/
  //   - components/financial.js   → FinancialPanel
  //   - components/stability.js   → StabilityPanel
  //   - components/directors.js   → DirectorsPanel
  //   - components/operations.js  → OperationsPanel
  // ============================================================================

  // ============================================================================
  // ASSEMBLED CATEGORIES ARRAY
  // Uses panel components loaded from individual files
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
