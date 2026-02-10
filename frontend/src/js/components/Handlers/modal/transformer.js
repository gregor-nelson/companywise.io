/* ============================================
   COMPANYWISE — modal/transformer.js
   Raw API responses → report-ready object
   All business logic lives here
   ============================================ */

(function () {
  'use strict';

  // ---- Dimension Parsing ----

  function parseDimensions(dimStr) {
    if (!dimStr) return [];
    try {
      const d = typeof dimStr === 'string' ? JSON.parse(dimStr) : dimStr;
      return d.explicit || [];
    } catch (_) {
      return [];
    }
  }

  // ---- Fact Extraction ----

  /**
   * Find a single numeric fact by concept + period.
   * Prefers consolidated (bus:Consolidated) with no extra dimensions.
   * Falls back to no-dimension facts.
   */
  function getNumericFact(facts, concept, periodStart, periodEnd, instantDate) {
    if (!facts || !facts.numeric_facts) return null;

    var best = null;
    for (var i = 0; i < facts.numeric_facts.length; i++) {
      var f = facts.numeric_facts[i];
      if (f.concept !== concept) continue;

      // Match period
      if (periodStart && periodEnd) {
        if (f.start_date !== periodStart || f.end_date !== periodEnd) continue;
      } else if (instantDate) {
        if (f.instant_date !== instantDate) continue;
      }

      var dims = parseDimensions(f.dimensions);
      var members = dims.map(function (d) { return d.member; });
      var hasConsolidated = members.indexOf('bus:Consolidated') !== -1;
      var extraDims = dims.filter(function (d) { return d.dimension !== 'bus:GroupCompanyDataDimension'; });

      // Best: consolidated with no extra dimensions
      if (hasConsolidated && extraDims.length === 0) return f;
      // Fallback: no dimensions at all
      if (dims.length === 0 && !best) best = f;
    }
    return best;
  }

  function getTextFact(facts, concept) {
    if (!facts || !facts.text_facts) return null;
    for (var i = 0; i < facts.text_facts.length; i++) {
      var f = facts.text_facts[i];
      if (f.concept === concept && f.value) return f.value;
    }
    return null;
  }

  function getTextFactByDimension(facts, concept, memberSubstring) {
    if (!facts || !facts.text_facts) return null;
    for (var i = 0; i < facts.text_facts.length; i++) {
      var f = facts.text_facts[i];
      if (f.concept !== concept || !f.value) continue;
      if (memberSubstring && f.dimensions && f.dimensions.indexOf(memberSubstring) !== -1) return f.value;
      if (!memberSubstring && !f.dimensions) return f.value;
    }
    return null;
  }

  // ---- Value Formatting ----

  function formatGBP(value) {
    if (value == null) return '\u2014';
    var abs = Math.abs(value);
    var sign = value < 0 ? '-' : '';
    if (abs >= 1000000) return sign + '\u00A3' + (abs / 1000000).toFixed(1) + 'M';
    if (abs >= 1000) return sign + '\u00A3' + (abs / 1000).toFixed(0) + 'K';
    return sign + '\u00A3' + abs.toFixed(0);
  }

  // ---- Address Builder ----

  function buildAddress(facts) {
    var line1 = getTextFactByDimension(facts, 'AddressLine1', 'RegisteredOffice');
    var line2 = getTextFactByDimension(facts, 'AddressLine2', 'RegisteredOffice');
    var city = getTextFactByDimension(facts, 'PrincipalLocation-CityOrTown', 'RegisteredOffice');
    var county = getTextFactByDimension(facts, 'CountyRegion', 'RegisteredOffice');
    var postcode = getTextFactByDimension(facts, 'PostalCodeZip', 'RegisteredOffice');
    var parts = [line1, line2, city, county, postcode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  // ---- Period Helpers ----

  function calcPeriodMonths(startStr, endStr) {
    if (!startStr || !endStr) return null;
    var s = new Date(startStr);
    var e = new Date(endStr);
    return Math.round((e - s) / (1000 * 60 * 60 * 24 * 30.44));
  }

  function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // ---- Company Age ----

  function getCompanyAge(dateStr) {
    if (!dateStr) return null;
    var inc = new Date(dateStr);
    var now = new Date();
    var years = now.getFullYear() - inc.getFullYear();
    var months = now.getMonth() - inc.getMonth();
    var totalMonths = years * 12 + months;

    if (totalMonths < 12) return totalMonths + ' months';
    if (totalMonths < 24) return '1 year, ' + (totalMonths - 12) + ' months';
    return Math.floor(totalMonths / 12) + ' years';
  }

  // ---- Health Signals ----

  function buildSignals(financials, filing) {
    var signals = [];

    if (financials) {
      if (financials.operatingProfit != null) {
        signals.push({
          label: 'Profitable',
          pass: financials.operatingProfit >= 0
        });
      } else if (financials.grossProfit != null) {
        signals.push({
          label: 'Gross profit positive',
          pass: financials.grossProfit >= 0
        });
      } else if (financials.profitLoss != null) {
        signals.push({
          label: 'Profitable',
          pass: financials.profitLoss >= 0
        });
      }

      if (financials.netAssets != null) {
        signals.push({
          label: 'Positive net assets',
          pass: financials.netAssets >= 0
        });
      }

      if (financials.equity != null) {
        signals.push({
          label: 'Positive equity',
          pass: financials.equity >= 0
        });
      }

      if (financials.cash != null) {
        signals.push({
          label: 'Cash reserves',
          pass: financials.cash > 0
        });
      }
    }

    if (filing) {
      // Check if balance sheet date is within ~18 months
      var bsDate = new Date(filing.balanceSheetDate);
      var now = new Date();
      var monthsAgo = (now.getFullYear() - bsDate.getFullYear()) * 12 + (now.getMonth() - bsDate.getMonth());
      signals.push({
        label: 'Accounts filed',
        pass: monthsAgo <= 18
      });
    }

    return signals;
  }

  // ---- Verdict Generation ----

  function generateVerdict(signals, financials, filing) {
    if (!filing) {
      return 'Limited financial data available for this company.';
    }

    if (!financials || (financials.profitLoss == null && financials.netAssets == null && financials.revenue == null && financials.cash == null)) {
      return 'Limited financial data available for this company.';
    }

    var allPass = signals.length > 0 && signals.every(function (s) { return s.pass; });
    var anyFail = signals.some(function (s) { return !s.pass; });

    if (allPass) {
      return 'This company appears financially stable based on its latest filing.';
    }

    // Specific combinations
    var profitSignal = signals.find(function (s) { return s.label === 'Profitable'; });
    var assetsSignal = signals.find(function (s) { return s.label === 'Positive net assets'; });

    if (profitSignal && !profitSignal.pass && assetsSignal && assetsSignal.pass) {
      return 'This company reported a loss but maintains positive net assets.';
    }

    if (assetsSignal && !assetsSignal.pass) {
      return 'This company has negative net assets \u2014 review the details carefully.';
    }

    if (anyFail) {
      return 'Some concerns identified \u2014 review the signals above.';
    }

    return 'Review the available data to form your own assessment.';
  }

  // ---- Main Transform Function ----

  /**
   * Transform raw API responses into the report object consumed by modal.js.
   *
   * @param {Object} companyData - Response from GET /api/company/{number}
   * @param {Object|null} factsData - Response from GET /api/filing/{id}/facts (or null)
   * @returns {Object} Report object (see plan section 8)
   */
  function transform(companyData, factsData) {
    var company = companyData.company;
    var filings = companyData.filings || [];
    var latest = filings[0] || null;

    // -- Company overview (always available) --
    var incorporationDate = factsData ? getTextFact(factsData, 'EntityIncorporationDate') : null;
    var dormantRaw = factsData ? getTextFact(factsData, 'EntityDormantTruefalse') : null;
    var dormant = dormantRaw === 'true';
    var activity = factsData ? getTextFact(factsData, 'DescriptionPrincipalActivities') : null;
    var address = factsData ? buildAddress(factsData) : null;

    // -- Filing compliance --
    var filing = null;
    if (latest) {
      filing = {
        balanceSheetDate: latest.balance_sheet_date,
        balanceSheetDateFormatted: formatDate(latest.balance_sheet_date),
        periodStart: latest.period_start_date,
        periodEnd: latest.period_end_date,
        periodMonths: calcPeriodMonths(latest.period_start_date, latest.period_end_date),
        totalFilings: filings.length
      };
    }

    // -- Headline financials (current year only) --
    var financials = null;
    if (factsData && latest) {
      var pStart = latest.period_start_date;
      var pEnd = latest.period_end_date;
      var bsDate = latest.balance_sheet_date;

      var revFact = getNumericFact(factsData, 'TurnoverRevenue', pStart, pEnd, null);
      var plFact = getNumericFact(factsData, 'ProfitLoss', pStart, pEnd, null);
      var gpFact = getNumericFact(factsData, 'GrossProfitLoss', pStart, pEnd, null);
      var opFact = getNumericFact(factsData, 'OperatingProfitLoss', pStart, pEnd, null);
      var naFact = getNumericFact(factsData, 'NetAssetsLiabilities', null, null, bsDate);
      var eqFact = getNumericFact(factsData, 'Equity', null, null, bsDate);
      var cashFact = getNumericFact(factsData, 'CashCashEquivalents', null, null, bsDate);
      if (!cashFact) cashFact = getNumericFact(factsData, 'CashBankOnHand', null, null, bsDate);
      var empFact = getNumericFact(factsData, 'AverageNumberEmployeesDuringPeriod', pStart, pEnd, null);

      var rev = revFact ? revFact.value : null;
      var pl = plFact ? plFact.value : null;
      var gp = gpFact ? gpFact.value : null;
      var op = opFact ? opFact.value : null;
      var na = naFact ? naFact.value : null;
      var eq = eqFact ? eqFact.value : null;
      var cash = cashFact ? cashFact.value : null;
      var emp = empFact ? empFact.value : null;

      // Only build financials object if at least one metric exists
      if (rev != null || pl != null || gp != null || op != null || na != null || eq != null || cash != null || emp != null) {
        financials = {
          revenue: rev,
          revenueFormatted: formatGBP(rev),
          profitLoss: pl,
          profitLossFormatted: formatGBP(pl),
          grossProfit: gp,
          grossProfitFormatted: formatGBP(gp),
          operatingProfit: op,
          operatingProfitFormatted: formatGBP(op),
          netAssets: na,
          netAssetsFormatted: formatGBP(na),
          equity: eq,
          equityFormatted: formatGBP(eq),
          cash: cash,
          cashFormatted: formatGBP(cash),
          employees: emp
        };
      }
    }

    // -- Health signals --
    var signals = buildSignals(financials, filing);

    // -- Verdict --
    var verdict = generateVerdict(signals, financials, filing);

    // -- Data availability --
    var dataAvailable = !!(filing || financials);

    return {
      // Company overview
      name: company.name,
      companyNumber: company.company_number,
      jurisdiction: company.jurisdiction,
      incorporationDate: incorporationDate,
      incorporationAge: getCompanyAge(incorporationDate),
      address: address,
      activity: activity,
      dormant: dormant,

      // Filing compliance
      filing: filing,

      // Headline financials
      financials: financials,

      // Health signals
      signals: signals,

      // Verdict
      verdict: verdict,

      // Premium gating flag
      hasPremiumAccess: false,

      // Metadata
      dataAvailable: dataAvailable,
      error: null
    };
  }

  // ---- Export ----
  window.CompanyWiseTransformer = { transform: transform, formatGBP: formatGBP };
})();
