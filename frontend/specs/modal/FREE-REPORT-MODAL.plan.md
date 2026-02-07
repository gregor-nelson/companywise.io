# Free Report Modal — Feature Plan

**Status:** Final — Ready for Implementation
**Date:** 2026-02-07
**Scope:** Wire up the free report full-screen modal with live API data

---

## 1. Context

The free report modal (`frontend/src/js/components/modal/`) currently contains placeholder scaffolding built before the backend existed. It expects a pre-shaped company object with properties like `risk`, `flags`, `financials`, `directors`, `incorporated`, `status`, `sicCode`, etc. — none of which come from the API directly.

The backend API is now implemented as a pure data pass-through (see `backend/specs/api/API_LAYER.md`). All business logic — fact extraction, period detection, risk derivation — must live in the frontend.

### Current State

- **`hero/api.js`** — thin fetch wrapper exposing `window.CompanyWiseAPI` with three methods: `searchCompanies(query, limit)`, `getCompany(number)`, `getFilingFacts(filingId)`. Base URL `/api`, error objects carry `.status` for caller-side handling.
- **`hero/hero.js`** — fetches company + filing facts, extracts key figures via proven helper functions, renders hero card. Currently passes `{ company_number, name, jurisdiction }` to `modal.open()`.
- **`modal/modal.js`** — well-built rendering scaffolding that expects a rich company object. Has working: open/close with 300ms fade/slide animation, scroll-lock via `body.modal-open`, ESC key close, backdrop click close, premium gating with blur + unlock overlay, wallet integration via `creditWalletChanged` event listener. The UX mechanics and CSS are reusable — it's the data input layer that needs to change.

### Design Decisions (Resolved)

- The modal will own its own data fetching and transformation rather than receiving data from hero. Self-contained and decoupled.
- Each component keeps its own contained fetch logic for MVP. No shared API module — duplication is acceptable, refactor later if needed.
- Skeleton loading is self-contained inside the modal.
- Verdict generation is fully dynamic (not templated) given the variety across 30k+ companies.

---

## 2. Architecture

### File Structure

```
modal/
  api.js            ← Fetch wrappers (thin, contained, same pattern as hero/api.js)
  transformer.js    ← Raw facts → report-ready object (all business logic)
  modal.js          ← Renders the report (rewrite rendering, keep UX mechanics)
  styles/
    modal.css       ← Existing, adjust to match new section structure
```

### Data Flow

```
hero.js: user clicks "Free Report"
  → modal.open(companyNumber)              // just a company number string
    → show skeleton loading state          // self-contained in modal
    → api.js: getCompany(companyNumber)    // → { company, filings[] }
    → api.js: getFilingFacts(filingId)     // → { numeric_facts[], text_facts[], contexts[] }
    → transformer.js: transform(company, filings, facts)
       → structured report object
    → modal.js: render(reportObject)       // HTML from transformed data
```

### Component Responsibilities

**`api.js`** — Fetch layer only. Own contained fetch logic, same pattern as `hero/api.js`:
- Generic `request(path)` function handling HTTP errors with `.status` on error objects
- `getCompany(number)` → `GET /api/company/{number}` → `{ company, filings }`
- `getFilingFacts(filingId)` → `GET /api/filing/{filingId}/facts` → `{ numeric_facts[], text_facts[], contexts[], units[] }`
- Exposed as `window.CompanyWiseModalAPI` or similar (avoid collision with hero's global)

**`transformer.js`** — All business logic. Takes raw API responses, returns a single report object:
- Fact extraction (concept matching by name, period matching by dates, dimension-aware with consolidation preference)
- Current period detection from filing metadata (`period_start_date`, `period_end_date`, `balance_sheet_date`)
- Value formatting (GBP: £X.XM / £XXK / £XX)
- Health signal derivation (binary pass/fail)
- Verdict generation (fully dynamic based on available signals)
- No prior-year logic for free tier

**`modal.js`** — Rendering + UX. Receives the transformed report object, builds HTML:
- Keep existing: open/close animation, scroll-lock, ESC handler, backdrop click, premium gating, wallet integration
- Rewrite: `render()` method to consume the new report object shape
- Add: skeleton loading state, error state, no-data state

---

## 3. Free Report Content — What's Included

The free report answers: **"Should I be worried about this company?"**

### 3.1 Company Overview

| Field | Source | Notes |
|-------|--------|-------|
| Company name | `company.name` from `/api/company` | Always available |
| Company number | `company.company_number` from `/api/company` | Always available |
| Jurisdiction | `company.jurisdiction` from `/api/company` | Always available, may be null |
| Incorporation date + age | Text fact `EntityIncorporationDate`, fallback to company profile `date_of_creation` if available | If neither available, show "Not available" |
| Registered address | Text facts with `RegisteredOffice` dimension: `AddressLine1`, `AddressLine2`, `PrincipalLocation-CityOrTown`, `CountyRegion`, `PostalCodeZip` | Use `getTextFactByDimension()` pattern from hero.js |
| Principal activity / SIC | Text fact: `DescriptionPrincipalActivities` | May be empty for micro-entities |
| Company status | Text fact: `EntityDormantTruefalse` | "false" = active, "true" = dormant |

### 3.2 Filing Compliance

| Field | Source | Notes |
|-------|--------|-------|
| Latest accounts date | `filings[0].balance_sheet_date` | Filings pre-sorted descending by API |
| Accounting period | `filings[0].period_start_date` → `filings[0].period_end_date` | Calculate period length in months |
| Filing count | `filings.length` | Total filings on record |
| Overdue indicator | Derived: is `balance_sheet_date` significantly old? | Simple age check, not prescriptive |

### 3.3 Headline Financials — Current Year Only

| Metric | Concept | Period Type | Matching Logic |
|--------|---------|-------------|----------------|
| Revenue | `TurnoverRevenue` | duration | Match `start_date` + `end_date` from latest filing |
| Profit / Loss | `ProfitLoss` | duration | Same period matching |
| Net Assets | `NetAssetsLiabilities` | instant | Match `instant_date` = `balance_sheet_date` |
| Cash | `CashCashEquivalents` | instant | Same instant matching |

**No prior year values. No YoY trends. No percentage changes.** Single-year figures only.

**Dimension handling:** Prefer facts with `bus:Consolidated` dimension member and no extra dimensions. Fall back to facts with no dimensions (base-level). Same logic as `getNumericFact()` in hero.js.

### 3.4 Basic Health Signals (Pass/Fail)

Simple binary flags derived from the headline financials:

| Signal | Logic | Display |
|--------|-------|---------|
| Profitable | `ProfitLoss >= 0` | Green pass / Red fail |
| Positive net assets | `NetAssetsLiabilities >= 0` | Green pass / Red fail |
| Accounts filed | Latest filing exists and balance_sheet_date is within ~18 months | Green pass / Amber warning |

2-3 signals maximum. No weighting, no scoring, no detailed analysis.

### 3.5 Dynamic Verdict

One short sentence generated from the health signals. Fully dynamic — not a fixed template lookup. The verdict should read naturally and reflect the specific combination of signals present.

Examples of possible outputs:
- "This company appears financially stable based on its latest filing."
- "Some concerns identified — review the signals above."
- "Limited financial data available for this company."
- "This company reported a loss but maintains positive net assets."

No detailed recommendation. No actionable advice. The verdict is informational only.

---

## 4. No-Data & Edge Case Handling

### Companies with No Filings

- Show company overview section (name, number, jurisdiction — always available from `/api/company`)
- Filing compliance section: "No filings on record"
- Financials section: "No financial data available"
- Health signals: Skip entirely or show single "No data" indicator
- Verdict: "Limited financial data available for this company."
- Premium sections: Show as locked with normal gating, but add "not enough data" messaging where relevant

### Companies with No Numeric Facts (Micro-Entities)

Same approach — render the full layout, show text facts that are available (address, activity, dormant status), show "No financial data available" for metrics that don't exist. Never hide sections; always show the structure with appropriate empty-state messaging.

### API Errors

- **Network error / 500:** Show error state in modal body — "Could not load report. Please try again."
- **404 (company not found):** Show error state — "Company not found."
- **Filing facts fail but company loads:** Show company overview + filing compliance, show "Financial data unavailable" for metrics sections. Degrade gracefully.
- **Structure:** Error handling should be basic but extensible — catch errors cleanly, display user-friendly messages, but design the error flow so retries, specific error types, or richer messaging can be layered in later without rewriting.

---

## 5. What's Reserved for Premium

Everything that provides **depth, trend, or actionable insight**:

| Feature | Why Premium |
|---------|-------------|
| Prior year comparisons | Shows direction/trend |
| YoY percentage changes + trend arrows | Analytical depth |
| Full balance sheet (current assets, liabilities, working capital ratio, debtors, stock, creditors) | Detailed breakdown |
| Directors list + appointment dates | People intelligence |
| Detailed risk scoring (weighted signals) | Quantified assessment |
| CCJs & charges | Legal risk |
| Detailed recommendation with specific advice | Actionable output |
| Cash flow analysis | Operational insight |
| Sector benchmarks (future) | Comparative context |

### Gating UX

Premium sections appear in the modal as blurred/locked placeholders with an unlock CTA. The existing modal CSS already implements this pattern (`.report-locked-section` with blur filter + `.report-locked-overlay`). Reuse as-is.

---

## 6. API Endpoints & Response Shapes

Only two endpoints needed (both already implemented):

### `GET /api/company/{number}`

```json
{
  "company": {
    "company_number": "00275446",
    "name": "EDWARD BENTON & CO LTD",
    "jurisdiction": null
  },
  "filings": [
    {
      "id": 9,
      "company_number": "00275446",
      "balance_sheet_date": "2023-08-31",
      "period_start_date": "2022-09-01",
      "period_end_date": "2023-08-31",
      "source_file": "...",
      "source_type": "ixbrl_html",
      "loaded_at": "2026-02-07T09:24:58.122707",
      "file_hash": "..."
    }
  ]
}
```

Filings sorted by `balance_sheet_date` descending. Latest filing is `filings[0]`.

### `GET /api/filing/{id}/facts`

```json
{
  "id": 9,
  "company_number": "00275446",
  "company_name": "EDWARD BENTON & CO LTD",
  "balance_sheet_date": "2023-08-31",
  "period_start_date": "2022-09-01",
  "period_end_date": "2023-08-31",
  "contexts": [
    {
      "id": 1,
      "period_type": "instant",
      "instant_date": "2023-08-31",
      "start_date": null,
      "end_date": null,
      "dimensions": null
    }
  ],
  "units": ["GBP", "shares"],
  "numeric_facts": [
    {
      "id": 1,
      "filing_id": 9,
      "value": 358439.0,
      "unit": "GBP",
      "concept": "Equity",
      "concept_raw": "ns5:Equity",
      "namespace": "ns5",
      "period_type": "instant",
      "instant_date": "2023-08-31",
      "start_date": null,
      "end_date": null,
      "dimensions": null
    }
  ],
  "text_facts": [
    {
      "id": 1,
      "filing_id": 9,
      "value": "false",
      "concept": "EntityDormantTruefalse",
      "concept_raw": "ns5:EntityDormantTruefalse",
      "namespace": "ns5",
      "period_type": "instant",
      "instant_date": "2023-08-31",
      "start_date": null,
      "end_date": null,
      "dimensions": null
    }
  ]
}
```

Key data points for extraction:
- `numeric_facts[].concept` — match by concept name (e.g., `"TurnoverRevenue"`)
- `numeric_facts[].period_type` — `"instant"` or `"duration"` determines matching strategy
- `numeric_facts[].start_date` / `end_date` — match duration facts to filing period
- `numeric_facts[].instant_date` — match instant facts to balance sheet date
- `numeric_facts[].dimensions` — nullable JSON string, prefer consolidated, fall back to null
- `text_facts[]` — same structure minus `value` being text and no `unit` field

---

## 7. Fact Extraction — Reference Implementation

Hero.js contains proven extraction logic. The modal's `transformer.js` should replicate the same patterns (not import from hero — contained per component for MVP).

### `getNumericFact(facts, concept, periodStart, periodEnd, instantDate)`

Finds a single numeric value by concept + period. Logic:
1. Iterate `facts.numeric_facts`
2. Match `concept` string exactly
3. Match period: if `periodStart + periodEnd` → match duration; if `instantDate` → match instant
4. **Dimension preference:** Parse dimensions JSON → prefer facts with `bus:Consolidated` member and no extra dimensions → fall back to facts with `dimensions === null`
5. Return first match or null

### `getTextFact(facts, concept)`

Finds first text fact by concept name. Returns `value` string or null.

### `getTextFactByDimension(facts, concept, memberSubstring)`

Finds text fact filtered by dimension member. If `memberSubstring` provided, only match if dimensions string includes it. If no substring, only match if no dimensions. Used for address components with `RegisteredOffice` dimension.

### `parseDimensions(dimStr)`

Safely parses dimension JSON string. Try-catch, returns `[]` on failure. Extracts `d.explicit` array → returns `[{ dimension, member }]`.

### `extractKeyFigures(data)` — Adapted for Free Report

Subset of hero's version. No `derivePriorPeriod()` call. Extracts:
- `revenue`: `TurnoverRevenue` (duration, current period)
- `profitLoss`: `ProfitLoss` (duration, current period)
- `netAssets`: `NetAssetsLiabilities` (instant, balance sheet date)
- `cash`: `CashCashEquivalents` (instant, balance sheet date)
- `activity`: `DescriptionPrincipalActivities` (text fact)
- `dormant`: `EntityDormantTruefalse` (text fact)
- `address`: Built from text facts with `RegisteredOffice` dimension

Returns current values only — no `.prior` property.

### `formatGBP(value)`

Same as hero: `>= £1M` → "£X.XM", `>= £1K` → "£XXK", `< £1K` → "£XX". Returns "—" for null/undefined.

---

## 8. Transformer Output Shape

`transformer.js` should return a single object consumed by `modal.js`:

```javascript
{
  // Company overview (always available)
  name: "EDWARD BENTON & CO LTD",
  companyNumber: "00275446",
  jurisdiction: "england-wales",
  incorporationDate: "1933-05-20",    // text fact or null
  address: "London, England",          // built from text facts or null
  activity: "General trading...",       // text fact or null
  dormant: false,                       // derived from text fact

  // Filing compliance (available if filings exist)
  filing: {
    balanceSheetDate: "2023-08-31",
    periodStart: "2022-09-01",
    periodEnd: "2023-08-31",
    periodMonths: 12,
    totalFilings: 3
  },                                    // or null if no filings

  // Headline financials (available if numeric facts exist)
  financials: {
    revenue: 1500000,                   // or null
    profitLoss: 75000,                  // or null
    netAssets: 358439,                  // or null
    cash: 120000                        // or null
  },                                    // or null if no numeric facts at all

  // Health signals (derived from financials + filing)
  signals: [
    { label: "Profitable", pass: true },
    { label: "Positive net assets", pass: true },
    { label: "Accounts filed", pass: true }
  ],                                    // empty array if no data

  // Verdict (dynamically generated string)
  verdict: "This company appears financially stable based on its latest filing.",

  // Premium gating flag
  hasPremiumAccess: false,

  // Metadata
  dataAvailable: true,                  // false if no filings/facts at all
  error: null                           // error string if fetch failed
}
```

---

## 9. Integration Points

### Hero → Modal

**Current:** `CompanyWiseModal.open(companyObject)` where companyObject = `{ company_number, name, jurisdiction }`
**New:** `CompanyWiseModal.open(companyNumber)` where companyNumber = `"00275446"`

**Change in hero.js:** The Free Report button handler (`#hero-view-free-btn` click, around line 574-595) changes from:
```javascript
window.CompanyWiseModal.open(company)
```
to:
```javascript
window.CompanyWiseModal.open(company.company_number)
```

Minimal change. Everything else in hero stays the same.

### Modal → Credit Wallet

Unchanged. `window.CompanyWiseWallet.hasAccess(companyNumber)` for premium gating. `creditWalletChanged` event listener for live re-render.

### Modal → Purchase Dialog

Unchanged. `.report-unlock-btn` and `#report-footer-upgrade` trigger `window.CompanyWisePurchase.open()`.

---

## 10. Modal UX — What to Keep, What to Rewrite

### Keep As-Is

- Open/close animation (300ms fade + slide with cubic-bezier easing)
- Scroll-lock (`body.modal-open { overflow: hidden }`)
- ESC key close handler
- Backdrop click close
- Premium locked section pattern (`.report-locked-section` + blur + overlay)
- Wallet integration and `creditWalletChanged` event re-render
- Purchase dialog integration
- Footer with premium CTA / credit balance display
- CSS variables and responsive breakpoints (640px)
- `escapeHtml()` utility for XSS prevention

### Rewrite

- `open(company)` → `open(companyNumber)` — trigger fetch + skeleton, then render
- `render(company)` → `render(reportObject)` — consume transformer output shape instead of raw company object
- All section rendering (overview, filing, financials, signals, verdict) — new HTML generators for the free report structure
- Loading state — add skeleton UI shown while API calls are in flight
- Error state — add error UI for failed fetches
- No-data state — graceful messaging when sections have no data

### Add New

- Skeleton loading state (self-contained in modal, shown immediately on open)
- Error state rendering
- Empty-state messaging per section ("No financial data available", etc.)

---

## 11. Implementation Order

1. **`modal/api.js`** — Contained fetch wrappers. Small file, standalone, testable immediately.
2. **`transformer.js`** — Business logic. Replicate hero's extraction helpers, build the report object shape. Testable with raw API responses.
3. **`modal.js` rewrite** — Rendering. Wire up the new data flow: open → skeleton → fetch → transform → render. Keep existing UX mechanics, replace section HTML generators.
4. **Hero integration** — Change `modal.open(company)` to `modal.open(company.company_number)`. One-line change.
5. **CSS adjustments** — Tweak `modal.css` if new sections need layout changes. Likely minimal given existing grid patterns.

---

## 12. Out of Scope

- Premium report page (`premium-report.js`) — separate effort, same pattern
- Backend changes — API is sufficient as-is
- Credit wallet or purchase dialog changes
- Search or hero card changes (beyond the one-line `companyNumber` handoff)
- Shared/common API module extraction — future refactor
- Shared fact extraction utilities — future refactor
