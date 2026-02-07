# Hero Component Specification

**Version:** 0.3.0
**Status:** Implemented
**Last Updated:** 2026-02-07

---

## 1. What This Is

The hero section is the top-of-page landing area. It has two jobs: sell the product (marketing copy + demo card) and let users search for a company (live search against the API). Desktop shows a two-column layout (copy left, card right); mobile stacks to single column with the card hidden.

**Pattern:** Self-initializing IIFE, singleton `Hero` object, exported on `window.CompanyWiseHero`.

---

## 2. Files

| File | Purpose | Depends On |
|------|---------|------------|
| `hero/api.js` | Fetch wrapper for backend endpoints | Nothing |
| `hero/search.js` | Debounced search input, dropdown, selection | `api.js` (`window.CompanyWiseAPI`) |
| `hero/hero.js` | Layout rendering, card templates, fact extraction, animations, orchestration | `api.js`, `search.js` |
| `hero/styles/hero.css` | All hero styling | CSS variables from `main.css` |

**Load order matters:** `api.js` -> `search.js` -> `hero.js`

```html
<script src="../../js/components/hero/api.js"></script>
<script src="../../js/components/hero/search.js"></script>
<script src="../../js/components/hero/hero.js"></script>
```

---

## 3. API Client (`api.js`)

Thin async wrapper over `fetch`. All functions return parsed JSON or throw an `Error` with a `.status` property.

**Global:** `window.CompanyWiseAPI`

| Function | Endpoint | Params | Returns |
|----------|----------|--------|---------|
| `searchCompanies(query, limit?)` | `GET /api/search?q={query}&limit={limit}` | `query`: string, `limit`: int (default 20) | `[{ company_number, name, jurisdiction }]` |
| `getCompany(number)` | `GET /api/company/{number}` | `number`: string | `{ company: {...}, filings: [...] }` |
| `getFilingFacts(filingId)` | `GET /api/filing/{filingId}/facts` | `filingId`: int | Full filing object with `numeric_facts`, `text_facts`, `contexts` |

**Base URL:** `/api` (hardcoded constant, top of file).

**Error handling:** Non-2xx responses throw `Error` with `.status` set to the HTTP status code and `.message` set to the response body text. Callers handle UI.

**No retry, no caching, no auth headers.**

---

## 4. Search Module (`search.js`)

Manages the search input, debounced API calls, dropdown rendering, and result selection.

**Global:** `window.CompanyWiseSearch`

### 4.1 Initialisation

```js
CompanyWiseSearch.init({
  inputEl:    HTMLInputElement,  // the search text input
  dropdownEl: HTMLElement,       // dropdown container
  errorEl:    HTMLElement,       // error message container
  onSelect:   Function           // callback: receives { company_number, name, jurisdiction }
});
```

Called by `hero.js` after DOM rendering. The `onSelect` callback is the bridge to the card.

### 4.2 Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `DEBOUNCE_MS` | 300 | Milliseconds to wait after last keystroke before firing API call |
| `MIN_CHARS` | 2 | Minimum input length before searching |

### 4.3 Search Flow

```
User types -> input event fires
  -> clear previous debounce timer
  -> if < 2 chars: close dropdown, stop
  -> set new timer (300ms)
     -> on fire: call CompanyWiseAPI.searchCompanies(query)
        -> success: cache results in lastResults, render dropdown
        -> error: show "Could not reach server" error
```

### 4.4 Form Submit

| Condition | Behaviour |
|-----------|-----------|
| Input < 2 chars | Show error: "Please enter at least 2 characters" |
| 1 cached result | Auto-select it (fires `onSelect`) |
| Multiple cached results | Re-render dropdown |
| 0 cached results | Fire `executeSearch()` immediately |

### 4.5 Dropdown Rendering

Each item shows:
- **Company name** with search term highlighted (`<mark>` tag, green glow)
- **Company number** with optional jurisdiction after middot
- Right arrow icon

Items have `data-number` attribute. Click fires `onSelect(company)`.

### 4.6 Dropdown Dismissal

| Trigger | Action |
|---------|--------|
| Click outside `.hero-search-wrapper` | Close |
| Escape key | Close |
| Selection made | Close |

### 4.7 XSS Prevention

All user-provided strings pass through `escapeHtml()` (DOM-based text node escaping) before insertion. The `highlight()` function escapes the text first, then applies regex replacement on the escaped output.

---

## 5. Hero Component (`hero.js`)

Orchestrates layout, card rendering, fact extraction, animations, and wires the search module.

**Global:** `window.CompanyWiseHero`

### 5.1 State

| Property | Type | Purpose |
|----------|------|---------|
| `container` | `HTMLElement` | Root container (`#hero-container`) |
| `isLoading` | `boolean` | Whether an API call is in progress |
| `currentCompany` | `object \| null` | Last successfully fetched company data (includes `.facts`) |
| `cardState` | `'demo' \| 'skeleton' \| 'result'` | Current card display state |
| `unifiedCard` | `HTMLElement` | The card wrapper |
| `unifiedCardInner` | `HTMLElement` | The card content area (swapped on state change) |

### 5.2 Initialisation

```
DOMContentLoaded
  -> Hero.init({ container })
     -> render()        // inject hero HTML into container
     -> initSearch()    // wire CompanyWiseSearch with onSelect callback
     -> startAnimations()
```

Auto-initialises on `DOMContentLoaded` if `#hero-container` exists.

### 5.3 Layout Structure

```
section.hero
  div.hero-chevron-mobile          (mobile background)
  div.hero-chevrons                (desktop chevrons: primary, secondary, tertiary)
  div.hero-blur-accent--top        (decorative blur)
  div.hero-blur-accent--bottom     (decorative blur)
  div.hero-grid-pattern            (dot grid background)
  div.hero-container
    div.hero-grid                  (2-col desktop, 1-col mobile)
      div.hero-content             (left: headline, search, checklist)
      div.hero-illustration        (right: card stack, desktop only)
```

**Key DOM IDs:**

| ID | Element |
|----|---------|
| `hero-container` | Root injection target |
| `hero-search-form` | Search form |
| `hero-search-input` | Text input |
| `hero-search-dropdown` | Dropdown results container |
| `hero-search-error` | Error message element |
| `hero-search-btn` | Submit button |
| `hero-card-back` | Back card (depth effect) |
| `hero-unified-card` | Front card wrapper |
| `hero-unified-card-inner` | Card content (swapped per state) |

### 5.4 Card States

Three states with a shared visual structure. All three use the same section layout so transitions are seamless:

```
Activity pill -> Header -> Financial snapshot (2x2 grid) -> Vitals row (3-col)
  -> Health signal pills -> Report teasers -> Dual CTA buttons
```

#### `demo` — Marketing showcase (`renderDemoCard()`)

Hardcoded `DEMO_COMPANY` data (Castle & Brook Construction Ltd). Never calls the API.

Shows the same enriched layout as the result card, using hardcoded financial figures to give users an immediate preview of what a company check looks like.

#### `skeleton` — Loading (`renderSkeletonCard()`)

Shimmer placeholders matching the full enriched card layout: activity pill, header, 2x2 snapshot grid, 3-col vitals, signal pills, teaser lines, dual CTA buttons.

#### `result` — Real API data (`renderResultCard(data)`)

Receives response from `GET /api/company/{number}` enriched with filing facts from `GET /api/filing/{id}/facts`.

### 5.5 Card Section Anatomy (shared by all three states)

Both the demo and result cards render the following sections in order:

| # | Section | CSS Class | Data Source (demo) | Data Source (result) |
|---|---------|-----------|-------------------|---------------------|
| 1 | Demo label pill | `.hero-unified-demo-label` | Hardcoded "Sample Company Check" | Not shown |
| 2 | Activity pill | `.hero-result-activity` | `DEMO_COMPANY.activity` | `DescriptionPrincipalActivities` text fact |
| 3 | Header | `.hero-unified-header` | Name, number, type, location | Name, number, company type (from `LegalFormEntity` dimension), registered address city/county |
| 4 | Financial snapshot | `.hero-result-snapshot` (2x2 grid of `.hero-snapshot-tile`) | Hardcoded revenue, P&L, net assets, cash | Extracted from numeric facts (see 5.7) |
| 5 | Vitals row | `.hero-unified-meta-row` (3 items) | Employees, "Never filed", period | `AverageNumberEmployeesDuringPeriod`, `balance_sheet_date`, derived period |
| 6 | Health signals | `.hero-result-signals` | Hardcoded signal array | Computed from financials (see 5.8) |
| 7 | Report teasers | `.hero-result-teasers` | Same copy | Same copy |
| 8 | Actions | `.hero-unified-actions` | Free Report + Premium Report | Free Report + Premium Report |

### 5.6 Company Selection Flow

```
onSelect({ company_number, name, jurisdiction })    <- from search.js
  -> transitionToState('skeleton')
  -> setLoading(true)
  -> await CompanyWiseAPI.getCompany(company_number)
     -> success:
        -> fetch filing facts for latest filing (non-blocking failure)
           -> await CompanyWiseAPI.getFilingFacts(filings[0].id)
        -> attach facts to data object as data.facts
        -> setLoading(false)
        -> transitionToState('result', data)
     -> error:
        -> setLoading(false)
        -> transitionToState('demo')
        -> show error: "Company not found" (404) or "Could not reach server"
```

Filing facts fetch is wrapped in a try/catch — if it fails, the card still renders with whatever data is available from the company endpoint. Financial sections simply won't appear.

### 5.7 Financial Snapshot (Fact Extraction)

The `extractKeyFigures(data)` method pulls headline financials from the filing facts response. It returns an object with current and prior period values for each metric.

**Metrics extracted:**

| Metric | Concept | Period Type | Tile Label |
|--------|---------|-------------|------------|
| Revenue | `TurnoverRevenue` | duration | "Revenue" |
| Profit/Loss | `ProfitLoss` | duration | "Profit" or "Loss" (dynamic) |
| Net Assets | `NetAssetsLiabilities` | instant | "Net Assets" |
| Cash | `CashCashEquivalents` | instant | "Cash" |
| Employees | `AverageNumberEmployeesDuringPeriod` | duration | (vitals row, not a tile) |

**Dimension filtering:**

Facts are filtered to find consolidated figures (dimension `bus:GroupCompanyDataDimension` with member `bus:Consolidated`) with no extra dimensional breakdowns. Falls back to no-dimension facts if consolidated not found.

**Prior period derivation:**

`derivePriorPeriod(facts, cur)` scans context definitions for a duration context whose `end_date` is within +-5 days of the current period's `start_date`. This catches standard year-end-to-year-start gaps (e.g. 2022-02-28 -> 2022-03-01 = 1 day).

**Each snapshot tile shows:**
- Label (uppercase, muted)
- Value (formatted with `formatGBP()`: £27.1M, £820K, £12K)
- YoY trend arrow with percentage (green up = good, red down = bad)

**Trend arrow logic (`renderTrendArrow`):**

For most metrics, an increase is good (green) and a decrease is bad (red). For losses, this is inverted via `invertLogic` parameter — a decreasing loss magnitude is coloured green.

### 5.8 Health Signal Pills

`buildHealthSignals(figures)` computes up to 4 traffic-light indicators:

| Signal | Condition for `good` | Condition for `warning` | Condition for `danger` |
|--------|---------------------|------------------------|----------------------|
| Revenue trend | YoY >= 0% | YoY < 0% | — |
| Profitability | ProfitLoss >= 0 | — | ProfitLoss < 0 |
| Balance sheet | Net assets >= 0 | — | Net assets < 0 |
| Cash trend | YoY >= 0% | YoY < 0% | — |

Each pill renders with icon + label. Styling uses existing `--risk-low-*`, `--risk-medium-*`, `--risk-high-*` design tokens.

### 5.9 Text Fact Extraction

| Data Point | Concept | Fallback |
|------------|---------|----------|
| Activity description | `DescriptionPrincipalActivities` | Not shown |
| Company type | `LegalFormEntity` (dimension member substring match for `PrivateLimited` / `PublicLimited`) | Falls back to `company.jurisdiction` |
| Registered city | `PrincipalLocation-CityOrTown` (dimension contains `RegisteredOffice`) | — |
| Registered county | `CountyRegion` (dimension contains `RegisteredOffice`) | — |

Address parts are joined with comma for the meta line (e.g. "Glastonbury, Somerset").

### 5.10 Card Transitions

```
transitionToState(state, data)
  -> remove 'hero-unified-card-inner--visible' class (fade out, 250ms CSS)
  -> setTimeout(250ms)
     -> call renderDemoCard() / renderSkeletonCard() / renderResultCard(data)
        -> each method sets innerHTML + re-adds visible class (fade in)
```

### 5.11 Button Binding

| Button | ID | Action |
|--------|----|--------|
| Free Report | `hero-view-free-btn` | Opens `window.CompanyWiseModal.open(company)` |
| Premium Report | `hero-view-premium-btn` | Calls `window.CompanyWisePricing.scrollTo()`, falls back to `document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })` |

### 5.12 Loading State (`setLoading`)

| Loading = true | Loading = false |
|----------------|-----------------|
| Input disabled | Input enabled |
| Button disabled, shows spinner + "Checking..." | Button enabled, shows "Check company" |

### 5.13 Demo Card Data

Hardcoded in `hero.js` as `DEMO_COMPANY` constant. Uses the same visual structure as the result card with realistic sample financials.

```js
{
  name: 'Castle & Brook Construction Ltd',
  number: '14523678',
  activity: 'Residential building construction',
  type: 'Private Limited',
  location: 'Manchester',
  revenue: { current: 820000, prior: 1450000 },
  profitLoss: { current: -215000, prior: 42000 },
  netAssets: { current: -68000, prior: 180000 },
  cash: { current: 12400, prior: 95000 },
  employees: 6,
  accountsDate: null,
  period: '12 months',
  signals: [
    { label: 'Revenue ↓', status: 'warning', icon: 'ph-trend-down' },
    { label: 'Loss-making', status: 'danger', icon: 'ph-x-circle' },
    { label: 'Negative assets', status: 'danger', icon: 'ph-shield-warning' },
    { label: 'Cash ↓', status: 'warning', icon: 'ph-trend-down' }
  ]
}
```

### 5.14 Inter-Component Communication

| Target | Method | When |
|--------|--------|------|
| `window.CompanyWiseModal` | `.open(company)` | Free Report button clicked |
| `window.CompanyWisePricing` | `.scrollTo()` | Premium Report button clicked (fallback: scroll to `#pricing`) |
| `window.CompanyWiseSearch` | `.init(opts)` | Hero init |
| `window.CompanyWiseAPI` | `.getCompany(number)` | Company selected from search |
| `window.CompanyWiseAPI` | `.getFilingFacts(id)` | After company loaded, for latest filing |

### 5.15 Helpers

| Function | Input | Output |
|----------|-------|--------|
| `formatGBP(value)` | Number | Formatted string: `£27.1M`, `£820K`, `£12`, or em-dash for null |
| `calcYoY(current, prior)` | Two numbers | Percentage change, or null if prior is 0/missing |
| `renderTrendArrow(current, prior, invertLogic)` | Numbers + boolean | HTML span with coloured arrow + percentage |
| `buildHealthSignals(figures)` | Extracted figures object | Array of `{ label, status, icon }` |
| `extractKeyFigures(data)` | Full API response with facts | Object with current/prior values per metric |
| `derivePriorPeriod(facts, cur)` | Facts + current period dates | Prior period `{ start, end, instant }` or null |
| `getNumericFact(facts, concept, start, end, instant)` | Fact search params | Best matching fact object or null |
| `getTextFact(facts, concept)` | Concept name | First non-null value string or null |
| `getTextFactByDimension(facts, concept, memberSubstring)` | Concept + dimension filter | Matching value or null |
| `parseDimensions(dimStr)` | JSON string or null | Array of `{ dimension, member }` objects |
| `buildAddressSummary(facts)` | Facts object | "City, County" string or null |
| `getPeriodLabel(filing)` | Filing object | "12 months" or em-dash |
| `escapeHtml(str)` | Any string | HTML-safe string (DOM-based escaping) |

---

## 6. Animations

All entrance animations fire on `startAnimations()` after init.

| Element | Animation | Delay | Duration |
|---------|-----------|-------|----------|
| `.hero-blur-accent` | Opacity 0 -> 1 | 100ms | 1s (CSS transition) |
| `.hero-checklist-item` | Opacity 0 + translateX(-20px) -> visible | 400ms + staggered `data-delay` (0, 80, 160, 240, 320, 400ms) | 400ms (CSS transition) |
| `#hero-card-back` | Opacity 0 -> 1 | 0ms | 400ms (CSS transition) |
| `#hero-unified-card` | Opacity 0 -> 1 | 300ms | 500ms cubic-bezier bounce (CSS transition) |
| Card content crossfade | Opacity toggle via `--visible` class | 250ms fade-out, then swap + fade-in | 250ms (CSS transition) |

---

## 7. CSS Architecture

**File:** `hero/styles/hero.css`
**Dependencies:** CSS custom properties from `main.css` (`--text-900`, `--blue-500`, `--risk-high`, `--risk-low`, `--risk-medium`, `--risk-high-bg`, `--risk-low-bg`, `--risk-medium-bg`, `--risk-high-border`, `--risk-low-border`, `--risk-medium-border`, `--bg-slate`, `--border-light`, `--green-primary`, `--green-glow`, `--font`, etc.)

### 7.1 Key Layout

| Breakpoint | Layout |
|------------|--------|
| < 768px | Single column, mobile chevron, card hidden |
| 768px - 1023px | Single column, desktop chevrons visible |
| >= 1024px | Two-column grid (1fr 1fr), card visible |

### 7.2 CSS Class Groups

| Group | Prefix | Purpose |
|-------|--------|---------|
| Section layout | `hero-`, `hero-container`, `hero-grid` | Overall section positioning |
| Background | `hero-chevron-*`, `hero-blur-accent-*`, `hero-grid-pattern` | Decorative backgrounds |
| Content | `hero-headline`, `hero-subheadline`, `hero-checklist-*`, `hero-check-types-*` | Left column text |
| Search | `hero-search-*` | Form, input, button, dropdown, error |
| Card | `hero-unified-*`, `hero-card-*`, `hero-shadow-accent` | Right column card stack |
| Result enrichment | `hero-result-*`, `hero-snapshot-*`, `hero-signal-*`, `hero-trend-*` | Enriched card sections |
| Skeleton | `hero-skel--*` | Loading shimmer placeholders |

### 7.3 Result Card CSS Classes (added in v0.3.0)

| Class | Purpose |
|-------|---------|
| `.hero-result-activity` | Activity/sector pill (blue gradient bg, pill shape) |
| `.hero-result-snapshot` | 2x2 CSS grid container for financial tiles |
| `.hero-snapshot-tile` | Individual stat tile (slate bg, rounded) |
| `.hero-snapshot-label` | Tile label (tiny uppercase) |
| `.hero-snapshot-value` | Tile headline number (bold) |
| `.hero-snapshot-value--negative` | Red text for negative financial values |
| `.hero-trend` | YoY trend arrow base |
| `.hero-trend--good` | Green colour (risk-low token) |
| `.hero-trend--bad` | Red colour (risk-high token) |
| `.hero-result-signals` | Flex container for health signal pills |
| `.hero-signal` | Individual health pill (pill shape) |
| `.hero-signal--good` | Green variant (risk-low tokens) |
| `.hero-signal--warning` | Amber variant (risk-medium tokens) |
| `.hero-signal--danger` | Red variant (risk-high tokens) |
| `.hero-result-teasers` | Report teaser container (slate bg) |
| `.hero-result-teaser` | Individual teaser line (icon + text) |

### 7.4 Skeleton Variants (added in v0.3.0)

| Class | Shape |
|-------|-------|
| `.hero-skel--pill` | Activity pill placeholder (1.25rem tall, rounded) |
| `.hero-skel--text-lg` | Larger text placeholder for snapshot values |
| `.hero-skel--signal` | Health signal pill placeholder (5.5rem wide, rounded) |

### 7.5 Card Hover

Desktop only: `transform: rotate(-1deg) scale(1.01)` on `.hero-unified-card:hover`.

### 7.6 Shimmer Animation

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```
Applied to `.hero-skel` elements. 1.5s infinite ease-in-out.

---

## 8. Error Handling

| Scenario | Source | User Sees |
|----------|--------|-----------|
| API unreachable during search | `search.js` `executeSearch()` | "Could not reach server -- try again" below search |
| Search returns 0 results | `search.js` `renderDropdown()` | Dropdown with "No companies found" message |
| Input < 2 chars on submit | `search.js` `handleSubmit()` | "Please enter at least 2 characters" below search |
| Company fetch 404 | `hero.js` `handleCompanySelected()` | "Company not found" below search, card reverts to demo |
| Company fetch network error | `hero.js` `handleCompanySelected()` | "Could not reach server -- try again" below search, card reverts to demo |
| Filing facts fetch failure | `hero.js` `handleCompanySelected()` | Silent — card renders without financial sections |

---

## 9. What This Does NOT Include

| Area | Status | Notes |
|------|--------|-------|
| Risk scoring algorithm | Not implemented | Planned for premium tier |
| Automated flag detection | Not implemented | Health signals are data-derived but not scored |
| Full report rendering | Separate component | `CompanyWiseModal` handles free report display |
| Premium report | Not implemented | Premium button scrolls to pricing section |
| Keyboard navigation in dropdown | Not implemented | Arrow key navigation through results |
| Result caching | Not implemented | Every selection re-fetches from API |
| Mobile card | Hidden | Card stack only renders on desktop (>= 1024px) |
| Parallel fetch optimisation | Sequential | Company profile fetched first, then facts; could be parallelised if API supported batch |

---

## 10. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.3.0 | 2026-02-07 | **Enriched result card.** `handleCompanySelected` now fetches filing facts via `getFilingFacts()` after loading company profile. New `extractKeyFigures()` system parses consolidated numeric/text facts from iXBRL data. Result card shows: activity pill, enriched meta line (company type + address from facts), 2x2 financial snapshot grid (revenue, P&L, net assets, cash) with YoY trend arrows, employee count, health signal pills (revenue trend, profitability, balance sheet, cash trend), report tier teasers, dual CTA buttons (Free Report opens modal, Premium scrolls to pricing). **Demo card aligned.** `DEMO_COMPANY` restructured with financial data matching the result card layout. Demo card now uses identical section structure (activity pill, snapshot grid, vitals, signals, teasers, dual CTAs) for seamless demo-to-skeleton-to-result transitions. **Skeleton updated.** Shimmer placeholders now match the enriched card shape (pill, 2x2 grid, signals, teasers, dual buttons). **New CSS.** Added `.hero-result-activity`, `.hero-result-snapshot`, `.hero-snapshot-tile`, `.hero-snapshot-value--negative`, `.hero-trend--good/--bad`, `.hero-result-signals`, `.hero-signal--good/--warning/--danger`, `.hero-result-teasers`, `.hero-skel--pill/--text-lg/--signal`. **Removed** `getCompanyAge()` helper (no longer used). Removed old demo card structure (flags, recommendation, risk badge). |
| 0.2.0 | 2026-02-07 | Split into 3 files (`api.js`, `search.js`, `hero.js`). Replaced mock data search with live API calls (`/api/search`, `/api/company/{number}`). Added debounced search (300ms). New result card template showing API fields only. Demo card now uses hardcoded `DEMO_COMPANY` const instead of `mock-data.js`. Removed all `getMockCompanies()` references. |
| 0.1.0 | 2026-02-07 | Initial implementation. Single `hero.js` file. Mock data search. Card template with risk badges, flags, recommendations from `mock-data.js`. |
