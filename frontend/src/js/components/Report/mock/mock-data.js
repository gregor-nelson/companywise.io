/* ============================================
   COMPANYWISE — mock-data.js
   Sample company data for development/testing
   Structure aligned with backend database schema
   ============================================ */

(function() {
  'use strict';

  // ---- Mock Company Data ----
  // This data structure maps to the backend:
  // - Basic fields from companies table
  // - Filing dates from filings table
  // - financials from numeric_facts table (concept field)
  // - directors from text_facts or Companies House API

  const MOCK_COMPANIES = [
    {
      // Company basics (companies table)
      name: 'Horizon Digital Solutions Ltd',
      number: '12345678',
      status: 'Active',
      incorporated: '2019-03-15',
      type: 'Private limited',
      address: '71 Kingsway, London, WC2B 6ST',
      sicCode: '62012 - Business and domestic software development',

      // Filing compliance (filings table)
      lastAccounts: '2024-06-30',
      nextAccountsDue: '2025-03-31',
      confirmationDue: '2025-04-02',

      // Risk assessment
      risk: 'low',
      flags: [
        { type: 'green', icon: 'ph-check-circle', text: 'Accounts filed on time — last 3 filings all within deadline' },
        { type: 'green', icon: 'ph-check-circle', text: 'Trading for 6 years with stable directorship' },
        { type: 'green', icon: 'ph-check-circle', text: 'No CCJs, charges, or insolvency actions on record' },
      ],
      recommendation: 'This company looks financially responsible. Standard payment terms should be fine.',
      detailedRecommendation: 'This company demonstrates strong financial responsibility with a consistent filing history over 6 years. All accounts have been submitted on time, and there are no adverse indicators such as CCJs, charges, or insolvency proceedings. The stable directorship suggests good governance. Standard payment terms of 30 days should be appropriate. Consider offering repeat client discounts to build a long-term relationship.',

      // Directors (from text_facts or API)
      directors: [
        { name: 'Sarah Mitchell', role: 'Director', appointed: '2019-03-15' },
        { name: 'James Chen', role: 'Director', appointed: '2020-06-01' },
      ],

      // Financial data (from numeric_facts table)
      // Maps to concepts: Turnover, GrossProfit, NetAssets, CurrentAssets, etc.
      financials: {
        accountsDate: '2024-06-30',        // filings.balance_sheet_date
        periodStart: '2023-07-01',         // filings.period_start_date
        periodEnd: '2024-06-30',           // filings.period_end_date

        // Duration context metrics (P&L items)
        turnover: { current: 2450000, previous: 2180000 },
        grossProfit: { current: 890000, previous: 756000 },
        operatingProfit: { current: 312000, previous: 289000 },

        // Instant context metrics (Balance sheet items)
        netAssets: { current: 1240000, previous: 985000 },
        currentAssets: 892000,
        currentLiabilities: 485000,
        cash: 623000,
        debtors: 245000,
        stocks: 24000,
      },
    },
    {
      name: 'Quantum Reach Marketing Ltd',
      number: '09876543',
      status: 'Active',
      incorporated: '2020-11-08',
      type: 'Private limited',
      address: '20-22 Wenlock Road, London, N1 7GU',
      sicCode: '73110 - Advertising agencies',
      lastAccounts: '2023-11-30',
      nextAccountsDue: '2024-08-31',
      confirmationDue: '2024-12-08',
      risk: 'medium',
      flags: [
        { type: 'red', icon: 'ph-warning-circle', text: 'Accounts are 6 months overdue — were due August 2024' },
        { type: 'amber', icon: 'ph-warning', text: 'Registered at a known formation agent address (Wenlock Road, N1)' },
        { type: 'green', icon: 'ph-check-circle', text: 'Company has been trading for 4 years' },
      ],
      recommendation: 'Request upfront payment or milestone billing. Overdue accounts are a significant red flag — ask the client directly why their filings are late.',
      detailedRecommendation: 'While this company has been trading for 4 years, the overdue accounts are a significant concern. Late filings can indicate cash flow problems, administrative neglect, or both. The virtual office address at Wenlock Road is commonly used by formation agents, which isn\'t inherently problematic but means less transparency about actual operations. We recommend requesting 50% upfront payment before starting work, with the remainder due on delivery. Ask the client directly about their filing situation — their response will tell you a lot about how they manage their business.',
      directors: [
        { name: 'Marcus Webb', role: 'Director', appointed: '2020-11-08' },
      ],
      // No financials - accounts overdue, data stale
      financials: null,
    },
    {
      name: 'Castle & Brook Construction Ltd',
      number: '14523678',
      status: 'Active',
      incorporated: '2023-06-22',
      type: 'Private limited',
      address: '45 Park Lane, Birmingham, B3 1SH',
      sicCode: '41201 - Construction of domestic buildings',
      lastAccounts: null,
      nextAccountsDue: '2025-03-22',
      confirmationDue: '2025-07-06',
      risk: 'high',
      flags: [
        { type: 'red', icon: 'ph-warning-circle', text: 'No accounts ever filed — company is less than 2 years old' },
        { type: 'red', icon: 'ph-warning-circle', text: 'Director has 3 previously dissolved companies (2019, 2021, 2023)' },
        { type: 'amber', icon: 'ph-warning', text: 'Construction sector has high insolvency rates — 2024 saw a 14% increase in sector failures' },
      ],
      recommendation: 'High risk. Request full payment upfront or avoid entirely. Multiple dissolved companies in the director\'s history is a serious concern.',
      detailedRecommendation: 'This company presents multiple high-risk indicators. The director has a history of 3 dissolved companies in the past 5 years, which is a serious red flag suggesting either poor business management or potential phoenix company behaviour. The construction sector is currently experiencing elevated insolvency rates, adding additional risk. As a new company with no filed accounts, there\'s no financial history to assess. We strongly recommend either avoiding this client entirely or requiring 100% payment upfront before any work begins. Do not extend credit under any circumstances.',
      directors: [
        { name: 'Robert Castle', role: 'Director', appointed: '2023-06-22' },
      ],
      // No financials - never filed accounts
      financials: null,
    },
    {
      name: 'Fernwild Creative Agency Ltd',
      number: '11234567',
      status: 'Active',
      incorporated: '2017-02-14',
      type: 'Private limited',
      address: '8 Brewery Place, Leeds, LS10 1NE',
      sicCode: '74100 - Specialised design activities',
      lastAccounts: '2024-02-29',
      nextAccountsDue: '2024-11-30',
      confirmationDue: '2025-02-14',
      risk: 'medium',
      flags: [
        { type: 'amber', icon: 'ph-warning', text: 'Confirmation statement is overdue by 3 weeks' },
        { type: 'green', icon: 'ph-check-circle', text: '7 years trading with consistent filing history' },
        { type: 'amber', icon: 'ph-warning', text: 'Two director changes in the past 12 months' },
      ],
      recommendation: 'Likely fine, but the recent director turnover is worth noting. Standard terms with a clear contract should suffice.',
      detailedRecommendation: 'This company has a solid 7-year track record with consistent filing history, which is reassuring. However, the recent director changes warrant attention — two new directors in 12 months could indicate internal restructuring, ownership changes, or departures due to disagreements. The overdue confirmation statement is a minor administrative issue but should be resolved soon. Standard 30-day payment terms are appropriate, but ensure you have a clear written contract. Consider asking about the recent changes to understand the company\'s current direction.',
      directors: [
        { name: 'Emma Thornton', role: 'Director', appointed: '2024-01-15' },
        { name: 'David Park', role: 'Director', appointed: '2024-03-20' },
      ],
      // Partial financials - smaller company
      financials: {
        accountsDate: '2024-02-29',
        periodStart: '2023-03-01',
        periodEnd: '2024-02-29',
        turnover: { current: 485000, previous: 412000 },
        netAssets: { current: 156000, previous: 132000 },
        currentAssets: 98000,
        currentLiabilities: 67000,
        cash: 45000,
        debtors: 52000,
      },
    },
    {
      name: 'PureFlow Logistics Ltd',
      number: '08765432',
      status: 'Active - Proposal to Strike Off',
      incorporated: '2016-09-01',
      type: 'Private limited',
      address: '12 Industrial Estate, Manchester, M12 4WD',
      sicCode: '49410 - Freight transport by road',
      lastAccounts: '2022-09-30',
      nextAccountsDue: '2023-06-30',
      confirmationDue: '2023-09-01',
      risk: 'high',
      flags: [
        { type: 'red', icon: 'ph-warning-circle', text: 'Companies House has proposed this company for strike off' },
        { type: 'red', icon: 'ph-warning-circle', text: 'Accounts are over 18 months overdue' },
        { type: 'red', icon: 'ph-warning-circle', text: 'Confirmation statement is 16 months overdue' },
      ],
      recommendation: 'Do not take on work with this company. Strike off action means they may cease to exist as a legal entity imminently. Any invoices would likely go unpaid.',
      detailedRecommendation: 'This company is in critical condition and should be avoided entirely. Companies House has initiated strike-off proceedings, which means the company may cease to exist as a legal entity within weeks. With accounts over 18 months overdue and confirmation statement 16 months overdue, the company has effectively abandoned its statutory obligations. If you\'ve already done work for this company, pursue payment immediately through formal channels. Do not take on any new work — even with upfront payment, there\'s no guarantee the company will exist long enough to receive the work, and any warranty or support obligations would be unenforceable.',
      directors: [
        { name: 'Michael Barnes', role: 'Director', appointed: '2016-09-01' },
      ],
      // Stale financials - last filed 2022
      financials: {
        accountsDate: '2022-09-30',
        periodStart: '2021-10-01',
        periodEnd: '2022-09-30',
        turnover: { current: 1890000, previous: 2340000 },
        grossProfit: { current: 234000, previous: 412000 },
        netAssets: { current: 89000, previous: 156000 },
        currentAssets: 312000,
        currentLiabilities: 445000,
        cash: 23000,
        debtors: 278000,
      },
    },
    {
      // Example with full financials like Davidson Brothers from example_content.txt
      name: 'Davidson Brothers (Shotts) Limited',
      number: 'SC025270',
      status: 'Active',
      incorporated: '1990-01-15',
      type: 'Private limited',
      address: '3 Gray Street, Shotts, Lanarkshire, ML7 5EZ',
      sicCode: '10910 - Manufacture of prepared feeds for farm animals',
      lastAccounts: '2025-07-31',
      nextAccountsDue: '2026-04-30',
      confirmationDue: '2026-01-29',
      risk: 'low',
      flags: [
        { type: 'green', icon: 'ph-check-circle', text: 'Established company trading for 35+ years' },
        { type: 'green', icon: 'ph-check-circle', text: 'Strong cash position with no external borrowings' },
        { type: 'green', icon: 'ph-check-circle', text: 'Consistent year-on-year revenue growth' },
        { type: 'green', icon: 'ph-check-circle', text: 'Healthy working capital ratio of 4.1x' },
      ],
      recommendation: 'Excellent client. This is a well-established, financially stable company. Standard or extended payment terms are appropriate.',
      detailedRecommendation: 'Davidson Brothers demonstrates exceptional financial stability with over 35 years of trading history in the agricultural sector. The company shows consistent year-on-year revenue growth (£56.7m turnover, up 3.7% YoY) and maintains a strong balance sheet with £14.1m in net assets. With £7.1m cash on hand and zero external borrowings, liquidity is excellent. The working capital ratio of 4.1x indicates the company can easily meet its short-term obligations. This is a low-risk client suitable for standard 30-day terms or even extended terms for larger projects.',
      directors: [
        { name: 'Mr W M Davidson', role: 'Director', appointed: '1990-01-15' },
        { name: 'Mr W G Davidson', role: 'Director', appointed: '1995-06-01' },
        { name: 'Mr G G S Dow', role: 'Director', appointed: '2025-08-01' },
        { name: 'Ms S O\'Hara', role: 'Director', appointed: '2025-08-01' },
      ],
      financials: {
        accountsDate: '2025-07-31',
        periodStart: '2024-08-01',
        periodEnd: '2025-07-31',

        // P&L items (duration context)
        turnover: { current: 56737000, previous: 54722000 },
        grossProfit: { current: 16542000, previous: 15700000 },
        operatingProfit: { current: 2798000, previous: 4141000 },

        // Balance sheet items (instant context)
        netAssets: { current: 14088000, previous: 12960000 },
        currentAssets: 11876000,
        currentLiabilities: 2900000,
        cash: 7113000,
        debtors: 3285000,
        stocks: 1478000,

        // Derived metrics
        workingCapitalRatio: 4.1,
        grossMargin: 0.29,
      },
    },
  ];

  // ---- Filing History Chart Data ----
  const FILING_HISTORY_DATA = [
    { year: 2019, status: 100 },
    { year: 2020, status: 100 },
    { year: 2021, status: 100 },
    { year: 2022, status: 85 },
    { year: 2023, status: 45 },
    { year: 2024, status: 70 },
    { year: 2025, status: 90 },
  ];

  // ---- Export to global scope ----
  window.CompanyWiseMockData = {
    companies: MOCK_COMPANIES,
    filingHistory: FILING_HISTORY_DATA,

    // Helper to find company by number or name
    findCompany(query) {
      const q = query.toLowerCase();
      return MOCK_COMPANIES.find(c =>
        c.number.toLowerCase() === q ||
        c.name.toLowerCase().includes(q)
      );
    },

    // Helper to search companies
    searchCompanies(query) {
      const q = query.toLowerCase();
      return MOCK_COMPANIES.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.number.includes(q)
      );
    },
  };

})();
