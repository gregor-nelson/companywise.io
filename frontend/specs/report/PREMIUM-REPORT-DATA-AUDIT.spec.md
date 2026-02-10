# Premium Report — Data Completeness Audit & Spec

**Status:** In progress
**Date:** 2026-02-09
**Scope:** Ensure every piece of company data available from the DB is surfaced in the premium report UI

---

## 1. Context

A full audit was performed across the Python backend API, SQLite database schema, and all three frontend report surfaces (hero card, free modal, premium report). The goal: identify every data field the DB holds per company and make sure the premium report — the paid product — presents all of it.

The backend is a FastAPI app serving a normalised SQLite database (`companies_house.db`) containing ~3,630 unique financial/text concepts parsed from Companies House iXBRL filings.

---

## 2. Backend API — Complete Endpoint Inventory

### Framework
FastAPI on uvicorn (v0.1.0)

### All 9 Endpoints

| # | Method | Path | Purpose | Frontend uses? |
|---|--------|------|---------|----------------|
| 1 | GET | `/api/health` | DB stats (counts, date range) | No |
| 2 | GET | `/api/search?q=&limit=` | Company name search | Yes (hero) |
| 3 | GET | `/api/company/{number}` | Company profile + all filings | Yes (all 3 surfaces) |
| 4 | GET | `/api/filing/{id}/facts` | Complete filing: numeric_facts, text_facts, contexts, units | Yes (all 3 surfaces) |
| 5 | GET | `/api/batch/{batch_id}` | Batch import metadata | No |
| 6 | GET | `/api/concepts?limit=&offset=` | Browse all concepts (paginated) | No |
| 7 | GET | `/api/concepts/search?q=&limit=` | Search concepts by name | No |
| 8 | GET | `/api/filing/by-source/{filename}` | Lookup filing by original ZIP path | No |
| 9 | GET | `/api/facts/by-concept/{concept}?limit=` | Cross-company facts for one concept | No |

**The frontend only uses endpoints 2, 3, 4.** The rest are available but unused.

### All 15 Query Functions (`backend/db/queries.py`)

| Function | Has endpoint? | Used by frontend? |
|----------|---------------|-------------------|
| `get_company(number)` | Yes (#3) | Yes |
| `get_filings_for_company(number)` | Yes (#3) | Yes |
| `get_latest_filing(number)` | No endpoint | No |
| `get_numeric_facts(filing_id, concept?)` | Via #4 | Yes |
| `get_text_facts(filing_id, concept?)` | Via #4 | Yes |
| `get_contexts(filing_id)` | Via #4 | Yes |
| `get_units(filing_id)` | Via #4 | Yes |
| `get_filing_with_facts(filing_id)` | Yes (#4) | Yes |
| `get_filing_by_source(source_file)` | Yes (#8) | No |
| `search_companies(pattern, limit)` | Yes (#2) | Yes |
| `get_facts_by_concept(concept, limit)` | Yes (#9) | No |
| `get_batch(batch_id)` | Yes (#5) | No |
| `get_all_concepts(limit, offset)` | Yes (#6) | No |
| `search_concepts(pattern, limit)` | Yes (#7) | No |
| `get_database_stats()` | Yes (#1) | No |

---

## 3. Database Schema — Complete Field Reference

### companies
| Column | Type | Description |
|--------|------|-------------|
| company_number | TEXT PK | Companies House registration number |
| name | TEXT | Official registered name |
| jurisdiction | TEXT | `eng_wales`, `scotland`, `ni` |

### filings
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Filing ID |
| company_number | TEXT FK | References companies |
| batch_id | INTEGER FK | References batches (nullable) |
| source_file | TEXT UNIQUE | Original file path in ZIP |
| source_type | TEXT | `ixbrl_html`, `xbrl_xml`, `cic_zip` |
| balance_sheet_date | TEXT | YYYY-MM-DD |
| period_start_date | TEXT | YYYY-MM-DD (nullable) |
| period_end_date | TEXT | YYYY-MM-DD (nullable) |
| loaded_at | TEXT | ISO datetime |
| file_hash | TEXT | SHA256 for deduplication |

### concepts (lookup — ~3,630 rows)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Concept ID |
| concept_raw | TEXT UNIQUE | Raw XBRL name (e.g. `uk-core:Equity`) |
| concept | TEXT | Normalised name (e.g. `Equity`) |
| namespace | TEXT | `uk-core`, `ifrs-full`, etc. |

### numeric_facts
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Fact ID |
| filing_id | INTEGER FK | References filings |
| concept_id | INTEGER FK | References concepts |
| context_id | INTEGER FK | References context_definitions |
| unit | TEXT | `GBP`, `shares`, `pence_per_share` |
| value | REAL | Numeric value |

### text_facts
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Fact ID |
| filing_id | INTEGER FK | References filings |
| concept_id | INTEGER FK | References concepts |
| context_id | INTEGER FK | References context_definitions |
| value | TEXT | Text content |

### context_definitions (lookup — ~144,650 rows)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Context ID |
| period_type | TEXT | `instant`, `duration`, `forever` |
| instant_date | TEXT | YYYY-MM-DD (nullable) |
| start_date | TEXT | YYYY-MM-DD (nullable) |
| end_date | TEXT | YYYY-MM-DD (nullable) |
| dimension_pattern_id | INTEGER FK | References dimension_patterns (nullable) |
| definition_hash | TEXT UNIQUE | SHA256 |

### dimension_patterns (lookup — ~3,009 rows)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Pattern ID |
| dimensions | TEXT | JSON encoding of dimensional data |
| pattern_hash | TEXT UNIQUE | SHA256 |

### batches
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Batch ID |
| filename | TEXT UNIQUE | ZIP filename |
| source_url | TEXT | Download URL |
| downloaded_at | TEXT | ISO datetime |
| file_count | INTEGER | Files in batch |
| processed_at | TEXT | When loaded |

---

## 4. Concept Coverage — What the DB Actually Has

### Numeric Concepts by Filing Coverage

| Concept | Coverage | Period Type |
|---------|----------|-------------|
| `Equity` | **97%** | instant |
| `NetAssetsLiabilities` | 91% | instant |
| `AverageNumberEmployeesDuringPeriod` | **84%** | duration |
| `NetCurrentAssetsLiabilities` | **81%** | instant |
| `Creditors` | **77%** | instant |
| `TotalAssetsLessCurrentLiabilities` | **76%** | instant |
| `CurrentAssets` | 74% | instant |
| `FixedAssets` | **43%** | instant |
| `CashBankOnHand` / `CashCashEquivalents` | 34% | instant |
| `Debtors` / `DebtorsDueWithinOneYear` | 22% | instant |
| `CreditorsDueWithinOneYear` | ~20% | instant |
| `Stocks` | ~15% | instant |
| `ProfitLoss` | 3.7% | duration |
| `TurnoverRevenue` | 2.7% | duration |
| `GrossProfitLoss` | ~3% | duration |
| `OperatingProfitLoss` | ~3% | duration |

### Core Text Concepts (>95% coverage)

| Concept | Description |
|---------|-------------|
| `UKCompaniesHouseRegisteredNumber` | Company number |
| `EntityCurrentLegalOrRegisteredName` | Legal name |
| `BalanceSheetDate` | Balance sheet date |
| `StartDateForPeriodCoveredByReport` | Period start |
| `EndDateForPeriodCoveredByReport` | Period end |
| `EntityDormantTruefalse` | Dormancy status |
| `DirectorSigningFinancialStatements` | Director who signed |
| `NameEntityOfficer` | Officer names |
| `EntityIncorporationDate` | Incorporation date |
| `DescriptionPrincipalActivities` | Business activity |

### Address Text Concepts (with RegisteredOffice dimension)

| Concept |
|---------|
| `AddressLine1` |
| `AddressLine2` |
| `PrincipalLocation-CityOrTown` |
| `CountyRegion` |
| `PostalCodeZip` |

---

## 5. What Was Done (Session 1 — Easy Wins)

### Premium Transformer (`premium-report/transformer.js`)

`extractFinancials()` was expanded. New concepts added:

| New Field | Concept | Type | Notes |
|-----------|---------|------|-------|
| `profitLoss` | `ProfitLoss` | duration (cur+prior) | Fallback when no Gross/Operating Profit |
| `equity` | `Equity` | instant (cur+prior) | 97% coverage — highest in DB |
| `fixedAssets` | `FixedAssets` | instant (current only) | 43% coverage |
| `netCurrentAssets` | `NetCurrentAssetsLiabilities` | instant (current only) | 81% coverage |
| `totalAssetsLessCurrentLiabilities` | `TotalAssetsLessCurrentLiabilities` | instant (current only) | 76% coverage |
| `creditors` | `Creditors` | instant (current only) | 77% coverage |
| `creditorsAfterOneYear` | `CreditorsAmountsFallingDueAfterOneYear` | instant (current only) | Long-term creditors |
| `employees` | `AverageNumberEmployeesDuringPeriod` | duration (cur+prior) | 84% coverage |

Cash fallback: `CashBankOnHand` tried when `CashCashEquivalents` is undefined.

### Premium Report UI (`premium-report.js`)

| Section | Change |
|---------|--------|
| Key Metrics Grid | Added Shareholders' Equity card. Added Net Profit/Loss card as fallback when no Gross/Operating Profit. |
| Balance Sheet Table | Added rows: Fixed Assets, Net Current Assets, Total Assets Less Current Liabilities, Creditors: Due After One Year, Total Creditors. Renamed "Current Liabilities" to "Creditors: Due Within One Year". |
| Company Overview | Added Employees row (conditional). |

### Free Modal Transformer (`modal/transformer.js`)

Added: `GrossProfitLoss`, `OperatingProfitLoss`, `Equity`, `CashBankOnHand` fallback, `AverageNumberEmployeesDuringPeriod`.

Enhanced `buildSignals()`: cascading profitability signal (operating > gross > net), added equity signal, added cash reserves signal.

### Free Modal UI (`modal/modal.js`)

Added tiles: Gross Profit, Operating Profit (with P&L fallback), Equity, Cash. Added Employees to Company Overview.

---

## 6. What Remains — Prioritised

### Priority 1: Balance Sheet Items Need Prior-Year Data

Currently `fixedAssets`, `currentAssets`, `currentLiabilities`, `cash`, `debtors`, `stocks`, `netCurrentAssets`, `totalAssetsLessCurrentLiabilities`, `creditors`, `creditorsAfterOneYear` are extracted with `getInstant()` (current value only).

**Action:** Change these to use `getInstantPair()` to get current + prior year values. Then update each balance sheet row in `premium-report.js` to render YoY trend arrows (same pattern as the key metrics grid).

**Files:**
- `premium-report/transformer.js` — change `getInstant()` calls to `getInstantPair()`, update return shape
- `premium-report/premium-report.js` — update balance sheet rows to show prior + trend

### Priority 2: Additional Financial Ratios

The premium report currently calculates:
- Working Capital Ratio (`currentAssets / currentLiabilities`)
- Gross Margin (`grossProfit.current / turnover.current`)
- Cash Ratio (`cash / currentLiabilities`)

**Action:** Add these ratios:
- Net Profit Margin (`profitLoss.current / turnover.current`) — only when both available
- Debt-to-Equity (`creditors / equity.current`) — only when both available
- Current Ratio (`currentAssets / currentLiabilities`) — same as working capital but labelled differently if net current assets available

**Files:**
- `premium-report/premium-report.js` — `renderFinancials()` ratios grid section

### Priority 3: Hero Card Equity Fallback

Equity has **97%** coverage vs **3.7%** for Revenue and **2.7%** for ProfitLoss. For the vast majority of companies, Equity is the only substantial financial number available.

**Action:** In `hero.js:extractKeyFigures()`, add Equity extraction. In `renderFinancialSnapshot()`, show Equity as a tile when Revenue/ProfitLoss are unavailable. This makes the hero card informative for the ~95% of companies that have no P&L data.

**Files:**
- `hero/hero.js` — `extractKeyFigures()` + `renderFinancialSnapshot()`

### Priority 4: Multi-Year Filing History

The API returns ALL filings for a company, but only the latest filing's facts are fetched. Historical trend data across multiple years is never shown.

**Action:**
1. Fetch facts for the N most recent filings (e.g., 3-5 years)
2. Build a year-over-year trend table or mini chart for key metrics
3. Show a filing history timeline with selectable years

**Files:**
- `premium-report/api.js` — new `getMultiYearFacts(filings)` function
- `premium-report/transformer.js` — new `extractMultiYearFinancials()` function
- `premium-report/premium-report.js` — new `renderFinancialHistory()` section

**Complexity:** Medium-high. Needs new API calls (one per filing), new data structure, new UI section.

### Priority 5: Text Facts Not Yet Surfaced

These text concepts exist in the DB but are never displayed:

| Concept | Description | Potential Use |
|---------|-------------|---------------|
| `DirectorSigningFinancialStatements` | Name of signing director | Directors section |
| `NameEntityOfficer` | Officer names (with dimension data) | Directors section |
| `UKCompaniesHouseRegisteredNumber` | CH number from filing | Verification |
| `AccountsStatus` / `AccountsType` | Filing type info | Filing compliance |
| `DateApprovalAccounts` | When accounts were approved | Filing compliance |
| `DateSigningDirectorsReport` | When directors' report signed | Filing compliance |
| `CountryFormationOrIncorporation` | Country of formation | Company overview |
| `LegalFormEntity` | Legal form with dimension | Company type |

**Action:** Extract and display in appropriate sections (overview, filing compliance, directors).

**Files:**
- `premium-report/transformer.js` — extract in `transform()`
- `premium-report/premium-report.js` — render in `renderOverview()`, `renderFilingCompliance()`, `renderDirectors()`

### Priority 6: Cross-Company Benchmarking

The `/api/facts/by-concept/{concept}` endpoint exists but has no frontend. Could power industry comparison features.

**Action:** Build a comparison widget showing how a company's key metrics compare to the dataset average/median.

**Complexity:** High. Needs new UI component, new API calls, statistical calculations.

### Priority 7: Concept Browser / Data Explorer

Endpoints `/api/concepts` and `/api/concepts/search` exist but have no frontend. Could let power users explore what data is available for any company.

**Complexity:** Medium. Needs a new page/component.

---

## 7. Current Report Object Shape (After Session 1)

### Premium Transformer Output

```javascript
{
  // Company overview
  name: string,
  number: string,
  companyType: string | null,
  address: string | null,
  activity: string | null,
  dormant: boolean,
  incorporationDate: string | null,
  incorporationAge: string | null,

  // Filing compliance
  filing: {
    balanceSheetDate: string,
    balanceSheetDateFormatted: string,
    periodStart: string,
    periodEnd: string,
    periodMonths: number,
    totalFilings: number
  } | null,

  // Financials
  financials: {
    accountsDate: string,
    periodStart: string,
    periodEnd: string,

    // P&L (duration — current + prior)
    turnover: { current: number, previous: number } | null,
    grossProfit: { current: number, previous: number } | null,
    operatingProfit: { current: number, previous: number } | null,
    profitLoss: { current: number, previous: number } | null,

    // Balance sheet — key metrics (instant — current + prior)
    netAssets: { current: number, previous: number } | null,
    equity: { current: number, previous: number } | null,

    // Balance sheet — line items (instant — current only)
    fixedAssets: number | undefined,
    currentAssets: number | undefined,
    currentLiabilities: number | undefined,  // CreditorsDueWithinOneYear
    cash: number | undefined,                // CashCashEquivalents || CashBankOnHand
    debtors: number | undefined,             // DebtorsDueWithinOneYear
    stocks: number | undefined,
    netCurrentAssets: number | undefined,     // NetCurrentAssetsLiabilities
    totalAssetsLessCurrentLiabilities: number | undefined,
    creditors: number | undefined,           // Total Creditors
    creditorsAfterOneYear: number | undefined,

    // Workforce (duration — current + prior)
    employees: { current: number, previous: number } | null
  } | null,

  // Health signals
  signals: [{ label: string, pass: boolean }],
  verdict: string,

  // Metadata
  isDemo: boolean,
  dataAvailable: boolean,
  error: string | null
}
```

### Free Modal Transformer Output

```javascript
{
  name: string,
  companyNumber: string,
  jurisdiction: string,
  incorporationDate: string | null,
  incorporationAge: string | null,
  address: string | null,
  activity: string | null,
  dormant: boolean,

  filing: { /* same as premium */ } | null,

  financials: {
    revenue: number | null,
    revenueFormatted: string,
    profitLoss: number | null,
    profitLossFormatted: string,
    grossProfit: number | null,
    grossProfitFormatted: string,
    operatingProfit: number | null,
    operatingProfitFormatted: string,
    netAssets: number | null,
    netAssetsFormatted: string,
    equity: number | null,
    equityFormatted: string,
    cash: number | null,
    cashFormatted: string,
    employees: number | null
  } | null,

  signals: [{ label: string, pass: boolean }],
  verdict: string,
  hasPremiumAccess: boolean,
  dataAvailable: boolean,
  error: string | null
}
```

---

## 8. File Locations

| File | Purpose |
|------|---------|
| `backend/api/app.py` | FastAPI route definitions (9 endpoints) |
| `backend/db/queries.py` | SQLite query functions (15 functions) |
| `backend/db/schema.py` | Schema creation + migrations |
| `backend/parser/ixbrl.py` | iXBRL parser data classes |
| `backend/loader/bulk_loader.py` | Batch loading + normalisation |
| `frontend/src/js/components/Report/premium-report/api.js` | Premium API wrapper |
| `frontend/src/js/components/Report/premium-report/transformer.js` | Premium data transformer |
| `frontend/src/js/components/Report/premium-report/premium-report.js` | Premium report renderer |
| `frontend/src/js/components/Handlers/modal/api.js` | Free modal API wrapper |
| `frontend/src/js/components/Handlers/modal/transformer.js` | Free modal data transformer |
| `frontend/src/js/components/Handlers/modal/modal.js` | Free modal renderer |
| `frontend/src/js/components/Home/hero/api.js` | Hero API wrapper |
| `frontend/src/js/components/Home/hero/hero.js` | Hero card renderer |

---

## 9. Key Architecture Notes for Next Session

1. **Three duplicate API layers.** `hero/api.js`, `modal/api.js`, `premium-report/api.js` all wrap the same two endpoints (`/api/company/{n}` and `/api/filing/{id}/facts`). They exist as separate globals (`CompanyWiseAPI`, `CompanyWiseModalAPI`, `CompanyWisePremiumAPI`) to avoid namespace collision across pages.

2. **Three duplicate transformers.** `hero.js` has inline extraction logic, `modal/transformer.js` and `premium-report/transformer.js` are separate files. All three replicate `parseDimensions()`, `getNumericFact()`, `getTextFact()`, `getTextFactByDimension()`. Refactoring to a shared module is deferred.

3. **Dimension-aware fact lookup.** `getNumericFact()` prefers `bus:Consolidated` facts with no extra dimensions, falls back to no-dimension facts. This is critical for getting the right "headline" number from group companies.

4. **Prior period derivation.** Scans `facts.contexts` for a duration context whose `end_date` is within 5 days of the current period's `start_date`. Same logic in all three surfaces.

5. **Only latest filing fetched.** The company endpoint returns all filings, but only `filings[0]` (most recent by `balance_sheet_date DESC`) has its facts loaded. Multi-year support requires fetching facts for additional filings.

6. **Demo mode is inline.** The `DEMO_COMPANY` constant in `transformer.js` contains the full Castle & Brook demo data including risk, flags, directors, charges. No separate mock file.

7. **Wallet gating.** Premium report checks `CompanyWiseWallet.hasAccess(companyNumber)` or `spendCredit(companyNumber)` before fetching. The free modal has no wallet gate.
