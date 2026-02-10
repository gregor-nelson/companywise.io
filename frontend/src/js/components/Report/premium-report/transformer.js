/* ============================================
   COMPANYWISE — premium-report/transformer.js
   Raw API responses → premium report object
   All business logic lives here
   ============================================ */

(function () {
  'use strict';

  // ---- Inline Demo Constant ----
  // Full mock shape for the Castle & Brook demo company
  // Eliminates dependency on mock-data.js

  var DEMO_COMPANY = {
    name: 'Castle & Brook Construction Ltd',
    number: '14523678',
    status: 'Active',
    incorporated: '2023-06-22',
    incorporationDate: '2023-06-22',
    incorporationAge: null, // computed at runtime
    type: 'Private limited',
    companyType: 'Private limited',
    address: '45 Park Lane, Birmingham, B3 1SH',
    activity: 'Construction of domestic buildings',
    dormant: false,
    sicCode: '41201 - Construction of domestic buildings',

    // Filing compliance
    lastAccounts: null,
    nextAccountsDue: '2025-03-22',
    confirmationDue: '2025-07-06',
    filing: {
      balanceSheetDate: null,
      balanceSheetDateFormatted: null,
      periodStart: null,
      periodEnd: null,
      periodMonths: null,
      totalFilings: 0
    },

    // Risk assessment
    risk: 'high',
    riskScore: null,
    flags: [
      { type: 'red', icon: 'ph-warning-circle', text: 'No accounts ever filed \u2014 company is less than 2 years old' },
      { type: 'red', icon: 'ph-warning-circle', text: 'Director has 3 previously dissolved companies (2019, 2021, 2023)' },
      { type: 'amber', icon: 'ph-warning', text: 'Construction sector has high insolvency rates \u2014 2024 saw a 14% increase in sector failures' }
    ],
    recommendation: 'High risk. Request full payment upfront or avoid entirely. Multiple dissolved companies in the director\'s history is a serious concern.',
    detailedRecommendation: 'This company presents multiple high-risk indicators. The director has a history of 3 dissolved companies in the past 5 years, which is a serious red flag suggesting either poor business management or potential phoenix company behaviour. The construction sector is currently experiencing elevated insolvency rates, adding additional risk. As a new company with no filed accounts, there\'s no financial history to assess. We strongly recommend either avoiding this client entirely or requiring 100% payment upfront before any work begins. Do not extend credit under any circumstances.',

    // Directors
    directors: [
      { name: 'Robert Castle', role: 'Director', appointed: '2023-06-22' }
    ],

    // Charges
    charges: [],

    // Financials (none — never filed)
    financials: null,

    // Health signals
    signals: [],
    verdict: 'No financial data available \u2014 this company has never filed accounts.',

    // Metadata
    isDemo: true,
    dataAvailable: false,
    error: null
  };

  // Compute incorporationAge at runtime
  DEMO_COMPANY.incorporationAge = getCompanyAge(DEMO_COMPANY.incorporated);

  // ---- Dimension Parsing ----

  function parseDimensions(dimStr) {
    if (!dimStr) return [];
    try {
      var d = typeof dimStr === 'string' ? JSON.parse(dimStr) : dimStr;
      return d.explicit || [];
    } catch (_) {
      return [];
    }
  }

  // ---- Fact Extraction ----

  function getNumericFact(facts, concept, periodStart, periodEnd, instantDate) {
    if (!facts || !facts.numeric_facts) return null;

    var best = null;
    for (var i = 0; i < facts.numeric_facts.length; i++) {
      var f = facts.numeric_facts[i];
      if (f.concept !== concept) continue;

      if (periodStart && periodEnd) {
        if (f.start_date !== periodStart || f.end_date !== periodEnd) continue;
      } else if (instantDate) {
        if (f.instant_date !== instantDate) continue;
      }

      var dims = parseDimensions(f.dimensions);
      var members = dims.map(function (d) { return d.member; });
      var hasConsolidated = members.indexOf('bus:Consolidated') !== -1;
      var extraDims = dims.filter(function (d) { return d.dimension !== 'bus:GroupCompanyDataDimension'; });

      if (hasConsolidated && extraDims.length === 0) return f;
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

  // ---- Prior Period Derivation ----
  // Same logic as hero.js:derivePriorPeriod

  function derivePriorPeriod(facts, cur) {
    if (!facts.contexts) return null;
    for (var i = 0; i < facts.contexts.length; i++) {
      var ctx = facts.contexts[i];
      if (ctx.period_type === 'duration' && ctx.end_date && ctx.end_date !== cur.end && ctx.start_date !== cur.start) {
        var priorEnd = new Date(ctx.end_date);
        var curStart = new Date(cur.start);
        var diffDays = (curStart - priorEnd) / (1000 * 60 * 60 * 24);
        if (diffDays >= -5 && diffDays <= 5) {
          return { start: ctx.start_date, end: ctx.end_date, instant: ctx.end_date };
        }
      }
    }
    return null;
  }

  // ---- Financial Extraction ----

  function extractFinancials(facts, filing) {
    if (!facts || !filing) return null;

    var pStart = filing.period_start_date;
    var pEnd = filing.period_end_date;
    var bsDate = filing.balance_sheet_date;

    var cur = { start: pStart, end: pEnd, instant: bsDate };
    var prior = derivePriorPeriod(facts, cur);

    // Helper: get duration-based current/previous pair
    function getDuration(concept) {
      var curFact = getNumericFact(facts, concept, pStart, pEnd, null);
      var priFact = prior ? getNumericFact(facts, concept, prior.start, prior.end, null) : null;
      var curVal = curFact ? curFact.value : null;
      var priVal = priFact ? priFact.value : null;
      if (curVal == null && priVal == null) return null;
      return { current: curVal, previous: priVal };
    }

    // Helper: get instant-based current/previous pair
    function getInstantPair(concept) {
      var curFact = getNumericFact(facts, concept, null, null, bsDate);
      var priFact = prior ? getNumericFact(facts, concept, null, null, prior.instant) : null;
      var curVal = curFact ? curFact.value : null;
      var priVal = priFact ? priFact.value : null;
      if (curVal == null && priVal == null) return null;
      return { current: curVal, previous: priVal };
    }

    // Helper: get single instant value
    function getInstant(concept) {
      var f = getNumericFact(facts, concept, null, null, bsDate);
      return f ? f.value : undefined;
    }

    var turnover = getDuration('TurnoverRevenue');
    var grossProfit = getDuration('GrossProfitLoss');
    var operatingProfit = getDuration('OperatingProfitLoss');
    var profitLoss = getDuration('ProfitLoss');
    var netAssets = getInstantPair('NetAssetsLiabilities');
    var equity = getInstantPair('Equity');

    var currentAssets = getInstant('CurrentAssets');
    var currentLiabilities = getInstant('CreditorsDueWithinOneYear');
    var cash = getInstant('CashCashEquivalents');
    if (cash === undefined) cash = getInstant('CashBankOnHand');
    var debtors = getInstant('DebtorsDueWithinOneYear');
    var stocks = getInstant('Stocks');
    var fixedAssets = getInstant('FixedAssets');
    var netCurrentAssets = getInstant('NetCurrentAssetsLiabilities');
    var totalAssetsLessCurrentLiabilities = getInstant('TotalAssetsLessCurrentLiabilities');
    var creditors = getInstant('Creditors');
    var creditorsAfterOneYear = getInstant('CreditorsAmountsFallingDueAfterOneYear');

    var employees = getDuration('AverageNumberEmployeesDuringPeriod');

    // Only build financials if at least one metric exists
    var hasAnything = turnover || grossProfit || operatingProfit || profitLoss || netAssets || equity ||
      currentAssets !== undefined || currentLiabilities !== undefined ||
      cash !== undefined || debtors !== undefined || stocks !== undefined ||
      fixedAssets !== undefined || netCurrentAssets !== undefined ||
      totalAssetsLessCurrentLiabilities !== undefined || creditors !== undefined ||
      creditorsAfterOneYear !== undefined || employees;

    if (!hasAnything) return null;

    return {
      accountsDate: bsDate,
      periodStart: pStart,
      periodEnd: pEnd,
      turnover: turnover,
      grossProfit: grossProfit,
      operatingProfit: operatingProfit,
      profitLoss: profitLoss,
      netAssets: netAssets,
      equity: equity,
      currentAssets: currentAssets,
      currentLiabilities: currentLiabilities,
      cash: cash,
      debtors: debtors,
      stocks: stocks,
      fixedAssets: fixedAssets,
      netCurrentAssets: netCurrentAssets,
      totalAssetsLessCurrentLiabilities: totalAssetsLessCurrentLiabilities,
      creditors: creditors,
      creditorsAfterOneYear: creditorsAfterOneYear,
      employees: employees
    };
  }

  // ---- Health Signals ----

  function buildSignals(financials, filing) {
    var signals = [];

    if (financials) {
      // Revenue trend
      if (financials.turnover && financials.turnover.current != null && financials.turnover.previous != null) {
        var revChange = financials.turnover.current - financials.turnover.previous;
        signals.push({
          label: revChange >= 0 ? 'Revenue growing' : 'Revenue declining',
          pass: revChange >= 0
        });
      }

      // Profitability (use operatingProfit if available, fallback to turnover minus costs proxy via netAssets)
      if (financials.operatingProfit && financials.operatingProfit.current != null) {
        signals.push({
          label: 'Profitable',
          pass: financials.operatingProfit.current >= 0
        });
      } else if (financials.grossProfit && financials.grossProfit.current != null) {
        signals.push({
          label: 'Gross profit positive',
          pass: financials.grossProfit.current >= 0
        });
      }

      // Net assets
      if (financials.netAssets && financials.netAssets.current != null) {
        signals.push({
          label: 'Positive net assets',
          pass: financials.netAssets.current >= 0
        });
      }

      // Cash position
      if (financials.cash !== undefined && financials.cash != null) {
        signals.push({
          label: 'Cash reserves',
          pass: financials.cash > 0
        });
      }
    }

    if (filing) {
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

    if (!financials) {
      return 'Limited financial data available for this company.';
    }

    var allPass = signals.length > 0 && signals.every(function (s) { return s.pass; });
    var anyFail = signals.some(function (s) { return !s.pass; });

    if (allPass) {
      return 'This company appears financially stable based on its latest filing.';
    }

    var profitSignal = signals.find(function (s) { return s.label === 'Profitable' || s.label === 'Gross profit positive'; });
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

    // -- Financials (current + prior year) --
    var financials = factsData ? extractFinancials(factsData, latest) : null;

    // -- Health signals --
    var signals = buildSignals(financials, filing);

    // -- Verdict --
    var verdict = generateVerdict(signals, financials, filing);

    // -- Data availability --
    var dataAvailable = !!(filing || financials);

    return {
      // Company overview
      name: company.name,
      number: company.company_number,
      companyType: company.jurisdiction || null,
      address: address,
      activity: activity,
      dormant: dormant,
      incorporationDate: incorporationDate,
      incorporationAge: getCompanyAge(incorporationDate),

      // Filing compliance
      filing: filing,

      // Financials
      financials: financials,

      // Health signals
      signals: signals,

      // Verdict
      verdict: verdict,

      // Metadata
      isDemo: false,
      dataAvailable: dataAvailable,
      error: null
    };
  }

  // ---- Public API ----

  function getDemoCompany() {
    // Recompute age each time in case of long-lived sessions
    DEMO_COMPANY.incorporationAge = getCompanyAge(DEMO_COMPANY.incorporated);
    return DEMO_COMPANY;
  }

  window.CompanyWisePremiumTransformer = {
    transform: transform,
    getDemoCompany: getDemoCompany,
    formatGBP: formatGBP
  };
})();
