# Premium Report — API Integration Spec

**Status:** Implemented
**Date:** 2026-02-09
**Scope:** Wire premium report page to live API data, replace mock-data dependency

---

## 1. Overview

The premium report page (`premium-report.html` + `premium-report.js`) renders a full-page company risk report with financials, directors, charges, and recommendations. Previously it only worked with hardcoded mock data via `mock-data.js`.

This change adds its own API wrapper and transformer (same modular pattern as the free report modal), routes between demo and live modes via URL params, and guards all renderer methods so they degrade gracefully when fields like `risk`, `flags`, `directors`, or `charges` are absent from API data.

---

## 2. File Structure

```
premium-report/
  api.js            ← Fetch wrappers (window.CompanyWisePremiumAPI)
  transformer.js    ← Raw facts → premium report object + inline demo data (window.CompanyWisePremiumTransformer)
  premium-report.js ← Rendering + routing + UX (window.CompanyWisePremiumReport)
  styles/
    premium-report.css ← Unchanged
```

### Script Loading Order (premium-report.html)

```html
<script src="premium-report/api.js"></script>
<script src="premium-report/transformer.js"></script>
<script src="premium-report/premium-report.js"></script>
```

`api.js` and `transformer.js` must load before `premium-report.js`. All three load after payment flow components.

### Removed Scripts

- `Report/mock/mock-data.js` — no longer loaded on the premium report page
- `Home/hero/api.js` — wrong API namespace; replaced by the page's own `api.js`

---

## 3. Data Flow

### Demo Route (`?demo=true`)

```
hero.js: user clicks "Premium Report" on demo card
  → navigates to premium-report.html?demo=true
    → init() reads URL params
    → CompanyWisePremiumTransformer.getDemoCompany()
    → render(demoCompany)            // full demo report with risk, flags, directors
    → initScrollReveal()
```

No wallet check. No API call.

### API Route (`?company=XXXX`)

```
hero.js: user clicks "Premium Report" on result card
  → navigates to premium-report.html?company=XXXX
    → init() reads URL params
    → wallet gate (hasAccess or spendCredit)
    → fetchAndRender(companyNumber)
      → renderLoading()              // skeleton shown immediately
      → CompanyWisePremiumAPI.getCompany(companyNumber)
      → CompanyWisePremiumAPI.getFilingFacts(filingId)  // if filings exist
      → CompanyWisePremiumTransformer.transform(companyData, factsData)
      → render(reportObject)
      → initScrollReveal()
```

### No Params

Shows empty state with "Back to search" link.

### Error Paths

- **Company fetch fails (404):** Shows error state — "Company not found."
- **Company fetch fails (network/500):** Shows error state — "Could not load company data."
- **Filing facts fetch fails:** Non-critical. Report renders without financials.
- **No wallet credits:** Shows access denied with "Buy Credits" button.

---

## 4. Component Details

### 4.1 api.js (NEW)

**Global:** `window.CompanyWisePremiumAPI`

Direct copy of the `modal/api.js` pattern. Own global to avoid namespace collision.

| Method | Endpoint | Returns |
|--------|----------|---------|
| `getCompany(number)` | `GET /api/company/{number}` | `{ company, filings[] }` |
| `getFilingFacts(filingId)` | `GET /api/filing/{filingId}/facts` | `{ numeric_facts[], text_facts[], contexts[], units[] }` |

Internal `request(path)` handles HTTP errors — thrown errors carry `.status`.

### 4.2 transformer.js (NEW)

**Global:** `window.CompanyWisePremiumTransformer`

Extended version of `modal/transformer.js` with prior-year extraction and balance sheet line items.

#### Exported Functions

| Function | Purpose |
|----------|---------|
| `transform(companyData, factsData)` | Main entry — produces the full report object |
| `getDemoCompany()` | Returns the inline DEMO_COMPANY constant (Castle & Brook) |
| `formatGBP(value)` | Currency formatting |

#### Internal Functions

| Function | Purpose |
|----------|---------|
| `parseDimensions(dimStr)` | Parses dimension JSON string |
| `getNumericFact(facts, concept, periodStart, periodEnd, instantDate)` | Finds numeric fact by concept + period, prefers consolidated |
| `getTextFact(facts, concept)` | Finds first text fact by concept |
| `getTextFactByDimension(facts, concept, memberSubstring)` | Text fact filtered by dimension member |
| `buildAddress(facts)` | Full address from RegisteredOffice text facts |
| `calcPeriodMonths(startStr, endStr)` | Period length in months |
| `formatDate(dateStr)` | Formats as "7 Feb 2026" |
| `getCompanyAge(dateStr)` | Human-readable company age |
| `derivePriorPeriod(facts, cur)` | Scans contexts for prior-year period (same logic as `hero.js:755-771`) |
| `extractFinancials(facts, filing)` | Extracts current + prior year values for all P&L and balance sheet items |
| `buildSignals(financials, filing)` | Extended health signals including revenue trend, cash position |
| `generateVerdict(signals, financials, filing)` | Dynamic verdict sentence |

#### Prior Period Derivation

Scans `facts.contexts` for a duration context whose `end_date` is within 5 days of the current period's `start_date`. Returns `{ start, end, instant }` for the prior period, enabling YoY comparisons.

#### Concepts Extracted

| Metric | Concept | Period Type | Current + Prior |
|--------|---------|-------------|-----------------|
| Turnover | `TurnoverRevenue` | duration | Yes |
| Gross Profit | `GrossProfitLoss` | duration | Yes |
| Operating Profit | `OperatingProfitLoss` | duration | Yes |
| Net Assets | `NetAssetsLiabilities` | instant | Yes |
| Current Assets | `CurrentAssets` | instant | Current only |
| Current Liabilities | `CreditorsDueWithinOneYear` | instant | Current only |
| Cash | `CashCashEquivalents` | instant | Current only |
| Debtors | `DebtorsDueWithinOneYear` | instant | Current only |
| Stock | `Stocks` | instant | Current only |

Text facts: same as modal transformer (activity, dormant, incorporation date, address components).

#### Health Signals

| Signal | Logic |
|--------|-------|
| Revenue growing/declining | `turnover.current` vs `turnover.previous` |
| Profitable / Gross profit positive | `operatingProfit.current >= 0` or fallback to `grossProfit.current >= 0` |
| Positive net assets | `netAssets.current >= 0` |
| Cash reserves | `cash > 0` |
| Accounts filed | `balance_sheet_date` within 18 months |

#### Report Object Shape

```javascript
{
  name, number, companyType, address, activity, dormant,
  incorporationDate, incorporationAge,

  filing: {
    balanceSheetDate, balanceSheetDateFormatted,
    periodStart, periodEnd, periodMonths, totalFilings
  },

  financials: {
    accountsDate, periodStart, periodEnd,
    turnover: { current, previous },
    grossProfit: { current, previous },
    operatingProfit: { current, previous },
    netAssets: { current, previous },
    currentAssets, currentLiabilities, cash, debtors, stocks
  },

  signals: [{ label, pass }],
  verdict: "...",
  isDemo: false,
  dataAvailable: true,
  error: null
}
```

Key field naming: uses `.number` (not `.company_number`) and `.previous` (not `.prior`) so the renderer's field accesses work without modification.

#### Inline Demo Constant (DEMO_COMPANY)

The Castle & Brook Construction company with the full mock shape embedded directly in the transformer:

- Includes `risk`, `flags`, `directors`, `charges`, `recommendation`, `detailedRecommendation`
- `incorporationAge` recomputed at runtime via `getDemoCompany()`
- Eliminates the dependency on `mock-data.js`

### 4.3 premium-report.js (MODIFIED)

**Global:** `window.CompanyWisePremiumReport`

#### Public API

| Method | Signature | Purpose |
|--------|-----------|---------|
| `init` | `init()` | Auto-called on DOMContentLoaded. Routes by URL params |
| `loadCompany` | `loadCompany(company)` | Programmatic render of a company object |

#### URL Routing (init)

| URL Params | Behaviour |
|------------|-----------|
| `?demo=true` | Renders `getDemoCompany()` immediately, no wallet check |
| `?company=XXXX` | Wallet gate then `fetchAndRender(companyNumber)` |
| No params | `renderEmpty()` |

#### Page States

| State | Trigger | Content |
|-------|---------|---------|
| **Loading** | `fetchAndRender()` called | Skeleton matching report layout |
| **Error** | API fetch fails | Warning icon + message + "Back to search" link |
| **Access Denied** | No wallet credits | Lock icon + "Buy Credits" button + "Back to search" link |
| **Empty** | No URL params | "No company data available" + "Back to search" link |
| **Report** | Transform completes or demo | Full report sections |

#### Deleted Methods

| Method | Replacement |
|--------|-------------|
| `getCompanyFromContext()` | URL param routing in `init()` |

#### Added Methods

| Method | Purpose |
|--------|---------|
| `fetchAndRender(companyNumber)` | Loading skeleton → API call → transform → render |
| `renderLoading()` | Full-page skeleton matching report layout |
| `renderError(message)` | Error state with icon and back link |

#### Renderer Guards

Every renderer method now handles missing fields gracefully:

| Method | Guard |
|--------|-------|
| `renderHeader(c)` | `c.risk` — if missing, omits risk badge. Uses `c.companyType \|\| c.type \|\| ''` for meta |
| `renderScoreCard(c)` | `c.flags` — if missing/empty, shows verdict-only card or returns empty |
| `renderOverview(c)` | `c.incorporationDate \|\| c.incorporated` for age. `c.activity` fallback for business activity. 'N/A' for missing SIC/status |
| `renderRiskAnalysis(c)` | `c.flags` — if missing/empty, returns empty string |
| `renderFilingCompliance(c)` | Supports both mock shape (`c.lastAccounts`) and API shape (`c.filing`). Shows extra stats (total filings, period) from `c.filing` |
| `renderDirectors(c)` | `c.directors` — placeholder if missing |
| `renderCharges(c)` | `c.charges` — placeholder if missing |
| `renderRecommendation(c)` | Uses `c.detailedRecommendation \|\| c.recommendation \|\| c.verdict`. Returns empty if all missing |
| `buildTimeline(c)` | Builds from `c.filing` data (API) or `c.lastAccounts`/`c.nextAccountsDue` (demo). No `CompanyWiseMockData` reference |
| `getActionItems(c)` | `c.risk` — if missing, returns generic advice |
| `deriveScore(c)` | `c.flags` — guards with baseline score of 70 |

---

## 5. hero.js Change

### Demo Card Button Handler (ADDED)

At the end of `renderDemoCard()`, after the card inner becomes visible:

```javascript
const demoPremiumBtn = document.getElementById('hero-view-premium-btn');
if (demoPremiumBtn) {
  demoPremiumBtn.addEventListener('click', () => {
    window.location.href = '../Report/Premium/premium-report.html?demo=true';
  });
}
```

Navigates directly to the premium report in demo mode. No wallet check — the demo route on the premium report page handles this.

The existing `bindResultCardButtons()` method for real company result cards is unchanged — it still navigates with `?company=XXXX` and performs the wallet gate before navigation.

---

## 6. Edge Cases

### Demo Mode

- Full report renders with risk score ring, flags, directors, charges, recommendation
- All sections populated from the inline DEMO_COMPANY constant
- No API calls, no wallet interaction

### API Mode — No Filings

- Company overview renders (name, number, jurisdiction always available)
- Filing compliance: "Never filed" / "N/A" values
- Financials: "Financial data not available" placeholder
- Score card: verdict-only (no ring, no flags)
- Recommendation: generic advice (no risk-based actions)

### API Mode — No Numeric Facts (Micro-Entities)

- Company overview renders with text facts
- Filing compliance renders normally
- Financials: placeholder
- Health signals: only "Accounts filed"
- Verdict: "Limited financial data available"

### API Mode — Filing Facts Fetch Fails

- Company overview + filing compliance render normally
- Financials: placeholder (graceful degradation)
- Error swallowed silently

### Invalid Company Number

- Error state: "Company not found. Please check the company number and try again."

---

## 7. GBP Formatting

Two formatters coexist:

| Formatter | Location | Format | Example |
|-----------|----------|--------|---------|
| `transformer.formatGBP()` | transformer.js | `£1.5M`, `£358K`, `£750` | Used by transformer signals |
| `PremiumReport.formatCurrency()` | premium-report.js | `£1.5m`, `£358k`, `£750` | Used by financial deep dive renderer |

Both handle null/undefined as `—` (em dash) and prefix negatives with `-`.

---

## 8. Future Considerations

- **Shared API module:** `hero/api.js`, `modal/api.js`, and `premium-report/api.js` duplicate the same fetch pattern. Extract to shared utility when a fourth consumer appears.
- **Shared fact extraction:** `hero.js`, `modal/transformer.js`, and `premium-report/transformer.js` replicate the same extraction helpers. Future refactor target.
- **Directors from API:** Currently only demo data includes directors. When the backend exposes director data, the transformer should extract it.
- **Charges from API:** Same as directors — awaiting backend support.
- **Risk scoring from API:** Currently only demo data has `risk` and `flags`. Future backend enrichment would populate these for real companies.
