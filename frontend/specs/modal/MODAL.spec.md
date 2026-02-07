# Free Report Modal — Implementation Spec

**Status:** Implemented
**Date:** 2026-02-07
**Scope:** Full-screen free report modal wired to live API data

---

## 1. Overview

The free report modal displays a company health check when a user clicks "Free Report" from the hero card. It answers: **"Should I be worried about this company?"**

The modal is self-contained — it owns its own data fetching, transformation, and rendering. It receives only a company number string from the hero and does everything else internally.

---

## 2. File Structure

```
modal/
  api.js            ← Fetch wrappers (window.CompanyWiseModalAPI)
  transformer.js    ← Raw facts → report-ready object (window.CompanyWiseTransformer)
  modal.js          ← Rendering + UX mechanics (window.CompanyWiseModal) — all visual styling via Tailwind
  styles/
    modal.css       ← Minimal CSS: overlay transitions, slide-up animation, scroll lock only
```

### Script Loading Order (home.html)

```html
<script src="../../js/components/modal/api.js"></script>
<script src="../../js/components/modal/transformer.js"></script>
<script src="../../js/components/modal/modal.js"></script>
```

`api.js` and `transformer.js` must load before `modal.js`. All three load after hero components and before payment flow components.

---

## 3. Data Flow

```
hero.js: user clicks "Free Report"
  → window.CompanyWiseModal.open(company.company_number)
    → renderShell(null, 'loading')     // skeleton shown immediately
    → show()                           // overlay fades in
    → CompanyWiseModalAPI.getCompany(companyNumber)
    → CompanyWiseModalAPI.getFilingFacts(filingId)  // if filings exist
    → CompanyWiseTransformer.transform(companyData, factsData)
    → renderReport(reportObject)       // HTML from transformed data
```

### Error Paths

- **Company fetch fails (404):** Modal stays open, body shows "Company not found."
- **Company fetch fails (network/500):** Modal stays open, body shows "Could not load report. Please try again."
- **Filing facts fetch fails:** Non-critical. Modal renders company overview + filing compliance without financials. Graceful degradation.

---

## 4. Component Details

### 4.1 api.js

**Global:** `window.CompanyWiseModalAPI`

Thin fetch wrapper, same pattern as `hero/api.js`. Own global to avoid collision.

| Method | Endpoint | Returns |
|--------|----------|---------|
| `getCompany(number)` | `GET /api/company/{number}` | `{ company, filings[] }` |
| `getFilingFacts(filingId)` | `GET /api/filing/{filingId}/facts` | `{ numeric_facts[], text_facts[], contexts[], units[] }` |

Internal `request(path)` function handles HTTP errors — thrown errors carry `.status` for caller-side handling (e.g. 404 vs 500).

### 4.2 transformer.js

**Global:** `window.CompanyWiseTransformer`

All business logic. Takes raw API responses, returns a single report object.

#### Exported Functions

| Function | Purpose |
|----------|---------|
| `transform(companyData, factsData)` | Main entry — produces the full report object |
| `formatGBP(value)` | Currency formatting (also used by modal for display) |

#### Internal Functions

| Function | Purpose |
|----------|---------|
| `parseDimensions(dimStr)` | Safely parses dimension JSON string, returns `[{ dimension, member }]` |
| `getNumericFact(facts, concept, periodStart, periodEnd, instantDate)` | Finds numeric fact by concept + period. Prefers `bus:Consolidated`, falls back to no-dimension |
| `getTextFact(facts, concept)` | Finds first text fact by concept name |
| `getTextFactByDimension(facts, concept, memberSubstring)` | Finds text fact filtered by dimension member |
| `buildAddress(facts)` | Builds full address from RegisteredOffice dimension text facts |
| `calcPeriodMonths(startStr, endStr)` | Calculates accounting period length in months |
| `formatDate(dateStr)` | Formats date as "7 Feb 2026" (en-GB locale) |
| `getCompanyAge(dateStr)` | Calculates company age as human-readable string |
| `buildSignals(financials, filing)` | Derives binary pass/fail health signals |
| `generateVerdict(signals, financials, filing)` | Generates dynamic verdict sentence from signal state |

#### Fact Extraction Logic

Replicated from `hero.js` (not imported — contained per component for MVP).

**Numeric facts** are matched by:
1. Exact `concept` string match
2. Period matching: `start_date` + `end_date` for duration facts, `instant_date` for instant facts
3. Dimension preference: prefer `bus:Consolidated` with no extra dimensions, fall back to `dimensions === null`

**Text facts** are matched by concept name, optionally filtered by dimension member substring.

#### Concepts Extracted

| Metric | Concept | Period Type |
|--------|---------|-------------|
| Revenue | `TurnoverRevenue` | duration |
| Profit / Loss | `ProfitLoss` | duration |
| Net Assets | `NetAssetsLiabilities` | instant |
| Cash | `CashCashEquivalents` | instant |
| Activity | `DescriptionPrincipalActivities` | text fact |
| Dormant status | `EntityDormantTruefalse` | text fact |
| Incorporation date | `EntityIncorporationDate` | text fact |
| Address components | `AddressLine1`, `AddressLine2`, `PrincipalLocation-CityOrTown`, `CountyRegion`, `PostalCodeZip` | text facts with `RegisteredOffice` dimension |

**No prior-year values.** Single-year figures only in the free report.

#### Health Signals

| Signal | Logic | Display |
|--------|-------|---------|
| Profitable | `ProfitLoss >= 0` | Green pass / Red fail |
| Positive net assets | `NetAssetsLiabilities >= 0` | Green pass / Red fail |
| Accounts filed | `balance_sheet_date` within ~18 months of today | Green pass / Red fail |

2-3 signals maximum. Only generated when underlying data exists.

#### Verdict Generation

Fully dynamic — one sentence based on signal state:

| Condition | Verdict |
|-----------|---------|
| All signals pass | "This company appears financially stable based on its latest filing." |
| Loss but positive assets | "This company reported a loss but maintains positive net assets." |
| Negative net assets | "This company has negative net assets — review the details carefully." |
| Any signal fails (general) | "Some concerns identified — review the signals above." |
| No financials or no filing | "Limited financial data available for this company." |
| Fallback | "Review the available data to form your own assessment." |

#### Report Object Shape

```javascript
{
  // Company overview (always available)
  name: "EDWARD BENTON & CO LTD",
  companyNumber: "00275446",
  jurisdiction: "england-wales",
  incorporationDate: "1933-05-20",      // text fact or null
  incorporationAge: "92 years",          // computed or null
  address: "123 High St, London, ...",   // built from text facts or null
  activity: "General trading...",         // text fact or null
  dormant: false,                         // derived from text fact

  // Filing compliance (null if no filings)
  filing: {
    balanceSheetDate: "2023-08-31",
    balanceSheetDateFormatted: "31 Aug 2023",
    periodStart: "2022-09-01",
    periodEnd: "2023-08-31",
    periodMonths: 12,
    totalFilings: 3
  },

  // Headline financials (null if no numeric facts)
  financials: {
    revenue: 1500000,                     // raw value or null
    revenueFormatted: "£1.5M",
    profitLoss: 75000,
    profitLossFormatted: "£75K",
    netAssets: 358439,
    netAssetsFormatted: "£358K",
    cash: 120000,
    cashFormatted: "£120K"
  },

  // Health signals (empty array if no data)
  signals: [
    { label: "Profitable", pass: true },
    { label: "Positive net assets", pass: true },
    { label: "Accounts filed", pass: true }
  ],

  // Verdict (always present)
  verdict: "This company appears financially stable based on its latest filing.",

  // Premium gating (set by modal.js based on wallet state)
  hasPremiumAccess: false,

  // Metadata
  dataAvailable: true,
  error: null
}
```

#### GBP Formatting

| Value Range | Format | Example |
|-------------|--------|---------|
| >= 1,000,000 | `£X.XM` | `£1.5M` |
| >= 1,000 | `£XXK` | `£358K` |
| < 1,000 | `£XX` | `£750` |
| Negative | Prefixed with `-` | `-£215K` |
| null/undefined | `—` (em dash) | `—` |

### 4.3 modal.js

**Global:** `window.CompanyWiseModal`

#### Public API

| Method | Signature | Purpose |
|--------|-----------|---------|
| `open` | `open(companyNumber: string)` | Opens modal, triggers fetch + skeleton + render |
| `close` | `close()` | Closes modal with fade animation |
| `isOpen` | `isOpen(): boolean` | Returns current open state |

#### Internal State

| Property | Type | Purpose |
|----------|------|---------|
| `container` | `HTMLElement` | Persistent `#report-modal-root` div appended to body |
| `isOpen` | `boolean` | Tracks open/closed state |
| `currentCompanyNumber` | `string\|null` | Company number for the current report |
| `currentReport` | `Object\|null` | Transformer output for the current report |

#### Modal States

The modal has three body states, managed by `renderShell(report, state, errorMessage)`:

| State | Trigger | Header | Body | Footer |
|-------|---------|--------|------|--------|
| **Loading** | `open()` called | Skeleton placeholders | Skeleton sections (overview grid, filing grid, financials grid) | Default (no upgrade CTA) |
| **Error** | API fetch fails | Skeleton placeholders | Error icon + message | Default |
| **Report** | Transform completes | Company name + number | Full report sections | Upgrade CTA or premium badge |

#### Rendering Architecture

`renderShell()` is the single point of DOM mutation. It:
1. Builds header, body, and footer HTML based on state
2. Sets `container.innerHTML` with the full overlay structure
3. Preserves `.active` class on the overlay when `this.isOpen` is true (fixes re-render visibility bug)
4. Calls `bindModalEvents()` after every render so close/backdrop/unlock buttons work in all states

#### Report Sections (in order)

1. **Company Overview** — Status (Active/Dormant), Company Age, Incorporated date, Business Activity, Registered Address
2. **Filing Compliance** — Latest Accounts date, Period length, Filings on Record. Shows "No filings on record" placeholder if no filings.
3. **Financial Snapshot** — Revenue, Profit/Loss, Net Assets, Cash as metric tiles. Shows "No financial data available" placeholder if no numeric facts. Negative values shown in red. Includes "Based on accounts dated..." notice.
4. **Health Signals** — Pass/fail pills (green/red) for each signal. Only rendered if signals exist.
5. **Verdict** — Highlighted section with dynamic sentence. Always rendered when verdict exists.
6. **Directors** (Premium-gated) — Blurred placeholder with "Unlock with Premium" button
7. **CCJs & Charges** (Premium-gated) — Blurred placeholder with "Unlock with Premium" button

#### UX Mechanics (Preserved from Original)

| Feature | Implementation |
|---------|---------------|
| Open animation | 300ms fade + slide via `.active` class + CSS `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Scroll lock | `body.modal-open { overflow: hidden }` |
| ESC key close | Global `keydown` listener checks `this.isOpen` |
| Backdrop click close | Click listener on `#report-modal-backdrop` |
| Premium gating | Tailwind `blur-sm select-none pointer-events-none` on content + absolute overlay with unlock button |
| Wallet integration | `creditWalletChanged` event re-renders with updated `hasPremiumAccess` |
| Purchase dialog | `[data-unlock]` buttons and `#report-footer-upgrade` trigger `window.CompanyWisePurchase.open()` |
| XSS prevention | `escapeHtml()` utility on all user-derived strings |
| Cleanup on close | `setTimeout(() => { container.innerHTML = '' }, 300)` after animation |

---

## 5. Styling Approach

### Philosophy

Tailwind is the default styling system. Vanilla CSS is reserved only for features that genuinely cannot be expressed as utility classes (state-based multi-property transitions, class-toggled animations).

### modal.css — Minimal (39 lines)

Only three concerns remain in CSS:

| Rule | Why CSS |
|------|---------|
| `.report-modal-overlay` / `.active` | Opacity + visibility transition triggered by JS class toggle — requires the paired hidden/visible states |
| `.report-modal-container` / `.active` parent | Slide-up `translateY(20px → 0)` with custom cubic-bezier easing, keyed to the parent's `.active` class |
| `body.modal-open` | Global scroll lock — needs to target `<body>` which isn't in the template |

Everything else is Tailwind utility classes inline in `modal.js` templates.

### Design System Alignment (Motorwise)

The modal adopts the same visual patterns used in the sister Motorwise app:

| Pattern | Tailwind Classes |
|---------|-----------------|
| Section cards | `bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5` |
| Section header icon boxes | `w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm` |
| Grid stat items | `bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md` |
| Labels | `text-[11px] font-medium text-neutral-400 uppercase tracking-wide` |
| Values | `text-sm font-medium text-neutral-800` |
| Financial values (large) | `text-lg font-semibold text-neutral-900` |
| Negative financial values | `text-red-600` |
| Dormant status | `text-amber-600` |
| Health signal pills (pass) | `bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 border-emerald-200/50 rounded-full` |
| Health signal pills (fail) | `bg-gradient-to-br from-red-50 to-red-100/50 text-red-600 border-red-200/50 rounded-full` |
| Verdict section | `bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/50` |
| Premium badge | `bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 text-[10px] font-bold uppercase tracking-wider text-blue-500 rounded-full` |
| Unlock buttons | `bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:-translate-y-0.5` |
| Skeleton loading | `bg-neutral-200 rounded animate-pulse` (Tailwind's native pulse, no custom keyframes) |
| Close button | `bg-neutral-100 border border-neutral-200/50 rounded-lg hover:text-neutral-900 transition-colors` |
| Backdrop | `bg-black/50 backdrop-blur-sm` |
| Empty state placeholders | Centered text with `text-neutral-400`, icon with `opacity-50` |

---

## 6. Integration Points

### Hero → Modal

**Before:** `window.CompanyWiseModal.open(company)` — passed a full company object
**After:** `window.CompanyWiseModal.open(company.company_number)` — passes only the company number string

Change location: `hero.js` line 579, inside `bindResultCardButtons()`.

### Modal → Credit Wallet

Unchanged. `window.CompanyWiseWallet.hasAccess(companyNumber)` for premium gating. `creditWalletChanged` event listener re-renders when credits change while modal is open.

### Modal → Purchase Dialog

`[data-unlock]` buttons and `#report-footer-upgrade` trigger `window.CompanyWisePurchase.open()`. Unlock buttons are now selected by data attribute rather than CSS class.

---

## 7. Edge Cases

### No Filings

- Company overview renders (name, number, jurisdiction always available from `/api/company`)
- Filing compliance: "No filings on record" placeholder
- Financial Snapshot: "No financial data available" placeholder
- Health signals: not rendered (empty array)
- Verdict: "Limited financial data available for this company."
- Premium sections: shown as locked normally

### No Numeric Facts (Micro-Entities)

- Company overview renders with available text facts (address, activity, dormant status)
- Filing compliance renders normally (filing metadata is always available)
- Financial Snapshot: "No financial data available" placeholder
- Health signals: only "Accounts filed" signal (no profit/assets signals)
- Verdict: "Limited financial data available for this company."

### Filing Facts Fetch Fails

- Company overview + filing compliance render normally
- Financial Snapshot: "No financial data available" (graceful degradation)
- Error is swallowed — no user-facing error message

---

## 8. Bug Fixes Applied During Implementation

### Skeleton → Report Transition Visibility Loss

**Problem:** `renderShell()` replaces `container.innerHTML`, which destroys the overlay DOM element. The new overlay was created without the `.active` CSS class, causing `opacity: 0; visibility: hidden` — the modal would vanish when transitioning from skeleton to report (or error).

**Fix:** The overlay template now bakes in the `.active` class when `this.isOpen` is true:
```javascript
<div class="report-modal-overlay${this.isOpen ? ' active' : ''}" ...>
```

### Close Button Non-Functional During Loading

**Problem:** `bindModalEvents()` was only called after the report rendered, not during skeleton or error states. The close button and backdrop click didn't work while loading.

**Fix:** `bindModalEvents()` is now called at the end of every `renderShell()` invocation, so events are bound in all states.

---

## 9. What's Reserved for Premium (Not Implemented)

| Feature | Why Premium |
|---------|-------------|
| Prior year comparisons | Shows direction/trend |
| YoY percentage changes + trend arrows | Analytical depth |
| Full balance sheet breakdown | Detailed financial view |
| Directors list + appointment dates | People intelligence |
| Detailed risk scoring | Quantified assessment |
| CCJs & charges | Legal risk data |
| Detailed recommendation | Actionable advice |
| Cash flow analysis | Operational insight |

---

## 10. Future Considerations

- **Shared API module:** `hero/api.js` and `modal/api.js` duplicate the same fetch pattern. Could extract to a shared utility when more components need API access.
- **Shared fact extraction:** `hero.js` and `transformer.js` duplicate the same extraction helpers. Future refactor target.
- **Retry mechanism:** Error state currently shows a static message. Could add a "Try again" button that re-triggers `open()`.
- **Premium unlocking inline:** When `creditWalletChanged` fires, premium sections could unlock in-place without a full re-render. Current approach re-renders everything.
