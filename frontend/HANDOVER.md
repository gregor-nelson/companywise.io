# CompanyWise — Frontend MVP Handover

## What Exists

### File Structure
```
frontend/
├── index.html              ← Landing page (single page, all sections)
├── js/
│   ├── mock-data.js        ← Sample company data for development (NEW)
│   ├── header.js           ← Reusable header component (auto-inits)
│   ├── footer.js           ← Reusable footer component (auto-inits)
│   ├── hero.js             ← Reusable hero component (auto-inits)
│   ├── modal.js            ← Full report modal component (NEW)
│   ├── how-it-works.js     ← "How it Works" section component (auto-inits)
│   ├── what-we-check.js    ← "What We Check" section component (auto-inits)
│   ├── pricing.js          ← "Pricing" section component (auto-inits)
│   ├── why-companywise.js  ← "Why CompanyWise" comparison section (auto-inits)
│   ├── faq.js              ← "FAQ" accordion section (auto-inits)
│   ├── cta.js              ← "CTA" call-to-action section (auto-inits)
│   └── main.js             ← Page-specific: scroll reveal, counters
└── styles/
    ├── header.css          ← Header/drawer/dropdown/hamburger styles
    ├── footer.css          ← Footer pill card + chevron styles
    ├── hero.css            ← Hero section styles
    ├── modal.css           ← Full report modal styles (NEW)
    ├── how-it-works.css    ← "How it Works" section styles
    ├── what-we-check.css   ← "What We Check" section styles
    ├── pricing.css         ← "Pricing" section styles
    ├── why-companywise.css ← "Why CompanyWise" comparison section styles
    ├── faq.css             ← "FAQ" accordion section styles
    ├── cta.css             ← "CTA" call-to-action section styles
    └── main.css            ← Design tokens, shared component styles
```

### Architecture Decisions
- **Static files only** — served via nginx, no build step, no framework
- **Tailwind via CDN** — utility classes in HTML, custom CSS for component-specific styles
- **Jost font** — loaded via Google Fonts, matches Motorwise
- **Phosphor Icons** — regular, fill, and bold weights loaded via CDN
- **Reusable components** — All section components are self-initializing. Drop the container element and include the script, they mount themselves:
  - `<div id="header-container"></div>` + `header.js`
  - `<div id="footer-container"></div>` + `footer.js`
  - `<div id="hero-container"></div>` + `hero.js`
  - `<div data-component="how-it-works"></div>` + `how-it-works.js`
  - `<div data-component="what-we-check"></div>` + `what-we-check.js`
  - `<div data-component="pricing"></div>` + `pricing.js`
  - `<div data-component="why-companywise"></div>` + `why-companywise.js`
  - `<div data-component="faq"></div>` + `faq.js`
  - `<div data-component="cta"></div>` + `cta.js`
- **Design system** — CSS custom properties in `:root` of main.css (colours, risk states, typography, spacing)
- **Motorwise visual parity** — chevron backgrounds, blue primary, two-column hero layout, card stack illustration, animated risk score ring

### What's Working

#### Header
- Fixed nav, scroll state, mobile drawer with swipe-to-close
- Company search action card in drawer
- Smooth scroll to anchors

#### Hero (Refactored — Motorwise Design)
- **Two-column layout**: Content left, animated card stack illustration right (desktop)
- **Chevron backgrounds**: Desktop (3 chevrons) + mobile (single chevron)
- **Blur accents**: Animated gradient orbs
- **Search form**: Company name/number input with yellow CTA button
- **Dropdown**: Filters placeholder companies, renders with highlighting
- **Verdict card**: Risk badge (low/medium/high), meta row, colour-coded flags, recommendation
- **Card stack illustration**:
  - Back card (depth shadow)
  - Middle card: Filing history chart with animated line draw + "Late" warning marker
  - Front card: Risk Engine score with animated ring + detected flags
- **Animated checklist**: Feature items fade in with stagger

#### How It Works (Refactored — Motorwise Design)
- **Self-initializing component**: Uses `data-component="how-it-works"` pattern
- **3 step cards** with polished visual previews:
  - Step 1: Animated search bar preview with company suggestions
  - Step 2: Signal analysis preview (green/amber indicators) + progress bar
  - Step 3: Verdict badge preview (Low/Medium/High risk) + recommendation
- **Blur accent backgrounds**: Gradient orbs on left/right
- **Connector arrows**: Dashed lines between steps (desktop only)
- **IntersectionObserver**: Animations trigger when section scrolls into view
- **Staggered fade-in**: Header, cards, and CTA animate in sequence

#### What We Check (Refactored — Motorwise Design)
- **Self-initializing component**: Uses `data-component="what-we-check"` pattern
- **12 signal cards** in responsive grid (3 cols desktop, 2 tablet, 1 mobile):
  - Overdue Accounts, Director History, CCJs & Charges, Virtual Office Check
  - Company Age, Financial Health, Company Status, SIC Code Analysis
  - Filing Consistency, PSC Register, Address Changes, Previous Names
- **Weight indicators**: Each card shows High/Medium/Low weight badge (colour-coded)
- **Icon colour coding**: Red (critical), amber (medium), blue (informational), emerald (positive)
- **Summary panel**: Animated weight distribution bar showing signal weighting
- **Blur accent backgrounds**: Gradient orbs, dot pattern
- **IntersectionObserver**: Staggered fade-in animations on scroll

#### Pricing (Refactored — Motorwise Design)
- **Self-initializing component**: Uses `data-component="pricing"` pattern
- **4-tier grid**: Free, Starter, Standard (featured), Pro
- **Featured card**: Gradient border, "Most popular" badge, primary CTA
- **Per-check breakdown**: Shows price per check for each tier
- **Blur accent backgrounds**: Consistent with other sections
- **IntersectionObserver**: Staggered fade-in animations

#### Why CompanyWise (Refactored — Motorwise Design)
- **Self-initializing component**: Uses `data-component="why-companywise"` pattern
- **Polished comparison table**: CompanyWise vs Enterprise tools vs Free check sites
  - Branded header column with icon
  - Feature rows with icons (gift, chat, prohibit, user, lightbulb)
  - Colour-coded check icons (green/red/amber)
  - Staggered row entrance animations
  - Row hover highlight
- **Three highlight cards**: Instant results, Official data source, Built for freelancers
- **Blur accent backgrounds**: Consistent with other sections
- **IntersectionObserver**: Staggered fade-in animations

#### FAQ (Refactored — Motorwise Design)
- **Self-initializing component**: Uses `data-component="faq"` pattern
- **6 FAQ items** with smooth accordion expand/collapse
- **Icon per question**: Each FAQ has a relevant Phosphor icon (database, target, gift, etc.)
- **Animated chevron**: Rotates on expand, colour changes to blue
- **Answer reveal**: Smooth max-height transition with left border accent
- **Contact CTA card**: "Still have questions?" with email link
- **Blur accent backgrounds**: Consistent with other sections
- **IntersectionObserver**: Staggered fade-in animations

#### CTA (Refactored — Motorwise Hero Design)
- **Self-initializing component**: Uses `data-component="cta"` pattern
- **Chevron backgrounds**: 3 stacked chevrons (mirrored/right-aligned on desktop)
- **Two-column layout**: Illustration cards (left), content (right) on desktop
- **Floating illustration cards**:
  - Anchor card: Stats with animated progress bars (companies indexed, signals, check time)
  - Float card (top): Risk verdict preview with score ring
  - Float card (bottom): "First check free" with badge
- **Trust indicators**: No credit card, no account, 3-second results
- **Social proof**: Avatar stack with "Trusted by freelancers" text
- **Blur accent backgrounds**: Gradient orbs matching other sections
- **IntersectionObserver**: Staggered fade-in and bar animations

#### Other Sections
- **Stats**: Animated counters on scroll intersection
- **Footer**: Chevron background (mirrored), 3-column grid, Companies House attribution
- **Scroll reveal**: IntersectionObserver on all `.fade-up` elements

### What's Placeholder / Fake
- **All 6 sample companies** are in `mock-data.js` (separate file, accessed via `window.CompanyWiseMockData`)
- **Financial data** is included for some companies (matching backend `numeric_facts` table structure)
- **Risk scoring** is just static data per company — no actual logic
- **Filing history chart** in hero illustration is static demo data
- **All buttons** (Get started, Log in, Buy credits) are `href="#"` — no auth, no payment
- **Stats** (5.3M+ companies, 12 flags, 3s check time) are static values
- **No backend** — no API calls, no database, no Companies House integration yet

---

## Hero Component — Architecture

### Self-Initializing Pattern
The hero follows the same pattern as header/footer:

```html
<!-- In index.html -->
<div id="hero-container"></div>

<!-- Scripts -->
<script src="./js/hero.js"></script>
```

hero.js auto-initializes on DOMContentLoaded and renders into the container.

### Key Files
- `js/hero.js` — All hero logic: render, search, animations, verdict display
- `styles/hero.css` — All hero-specific styles

### Animation Sequence
1. Blur accents fade in (100ms delay)
2. Checklist items stagger in (400ms + 80ms per item)
3. Back card appears (0ms)
4. Middle card appears (150ms)
5. Chart line draws (400ms, 1000ms duration)
6. Data points appear (staggered 140ms each)
7. Warning marker pops in (1200ms)
8. Front card appears (1400ms)
9. Risk score ring animates (1600ms)

### Exposed API
```javascript
// Manual initialization (if needed)
window.CompanyWiseHero.initHero({ container: element });

// Access hero instance
window.CompanyWiseHero.Hero.setLoading(true);
window.CompanyWiseHero.Hero.showError('message');
```

---

## How It Works Component — Architecture

### Self-Initializing Pattern
The component follows the Motorwise pattern with `data-component` attribute:

```html
<!-- In index.html -->
<div data-component="how-it-works"></div>

<!-- Scripts -->
<script src="./js/how-it-works.js"></script>
```

how-it-works.js auto-initializes on DOMContentLoaded and renders into the container.

### Key Files
- `js/how-it-works.js` — Component class, render, animations
- `styles/how-it-works.css` — All section-specific styles

### Animation Sequence
1. Blur accents fade in (staggered 150ms)
2. Header elements fade in (staggered 80ms)
3. Step cards fade in (staggered 100ms per card)
4. Progress bars animate to target width (800ms delay)
5. Search cursor starts blinking

### Visual Previews
Each step card includes an interactive preview:
- **Step 1 (Search)**: Mock search bar with blinking cursor, company suggestions
- **Step 2 (Analysis)**: Signal indicators (green checks, amber warnings), animated progress bar
- **Step 3 (Verdict)**: Risk badge (Low/Medium/High), recommendation text

### Exposed API
```javascript
// Manual initialization (if needed)
window.CompanyWiseHowItWorks.init();

// Access component instance
window.CompanyWiseHowItWorks.getInstance();
```

---

## What We Check Component — Architecture

### Self-Initializing Pattern
```html
<!-- In index.html -->
<div data-component="what-we-check"></div>

<!-- Scripts -->
<script src="./js/what-we-check.js"></script>
```

### Key Files
- `js/what-we-check.js` — Component class, render, animations
- `styles/what-we-check.css` — All section-specific styles

### Animation Sequence
1. Blur accents fade in (staggered 150ms)
2. Header elements fade in (staggered 80ms)
3. Signal cards fade in (staggered 60ms per card, 12 cards total)
4. Summary panel fades in (600ms delay)
5. Weight bar segments animate to target widths (800ms delay)

### Signal Card Structure
Each of the 12 cards follows this pattern:
- **Icon**: Colour-coded by severity (red/amber/blue/emerald)
- **Title**: Signal name (e.g., "Overdue Accounts")
- **Description**: Plain-English explanation
- **Weight badge**: High/Medium/Low indicator

### Exposed API
```javascript
// Manual initialization (if needed)
window.CompanyWiseWhatWeCheck.init();

// Access component instance
window.CompanyWiseWhatWeCheck.getInstance();
```

---

## Pricing Component — Architecture

### Self-Initializing Pattern
```html
<!-- In index.html -->
<div data-component="pricing"></div>

<!-- Scripts -->
<script src="./js/pricing.js"></script>
```

### Key Files
- `js/pricing.js` — Component class, render, animations
- `styles/pricing.css` — All section-specific styles

### Tier Structure
| Tier | Credits | Price | Per Check |
|------|---------|-------|-----------|
| Free | 3/month | £0 | Free |
| Starter | 10 | £5 | £0.50 |
| Standard | 25 | £10 | £0.40 |
| Pro | 60 | £20 | £0.33 |

### Exposed API
```javascript
// Manual initialization (if needed)
window.CompanyWisePricing.init();

// Access component instance
window.CompanyWisePricing.getInstance();
```

---

## Why CompanyWise Component — Architecture

### Self-Initializing Pattern
```html
<!-- In index.html -->
<div data-component="why-companywise"></div>

<!-- Scripts -->
<script src="./js/why-companywise.js"></script>
```

### Key Files
- `js/why-companywise.js` — Component class, render, animations
- `styles/why-companywise.css` — All section-specific styles (prefix: `why-`)

### Animation Sequence
1. Blur accents fade in (staggered 150ms)
2. Header elements fade in (staggered 80ms)
3. Table wrapper fades in (200ms delay)
4. Table rows slide in from left (staggered 60ms per row)
5. Highlight cards fade in (staggered 80ms, starting at 400ms)

### Table Structure
| Feature | CompanyWise | Enterprise | Free Sites |
|---------|-------------|------------|------------|
| Actually free tier | ✓ | ✗ | ~ |
| Plain English verdicts | ✓ | ✗ | ✗ |
| No subscription required | ✓ | ✗ | ✓ |
| Freelancer pricing | ✓ | ✗ | ~ |
| Actionable recommendations | ✓ | ~ | ✗ |

### Exposed API
```javascript
// Manual initialization (if needed)
window.CompanyWiseWhy.init();

// Access component instance
window.CompanyWiseWhy.getInstance();
```

---

## FAQ Component — Architecture

### Self-Initializing Pattern
```html
<!-- In index.html -->
<div data-component="faq"></div>

<!-- Scripts -->
<script src="./js/faq.js"></script>
```

### Key Files
- `js/faq.js` — Component class, render, accordion logic, animations
- `styles/faq.css` — All section-specific styles (prefix: `faq-`)

### Animation Sequence
1. Blur accents fade in (staggered 150ms)
2. Header elements fade in (staggered 80ms)
3. FAQ items fade in (staggered 60ms per item)
4. Contact CTA card fades in (400ms delay)

### FAQ Items
| ID | Question | Icon |
|----|----------|------|
| data-source | Where does the data come from? | ph-database |
| accuracy | How accurate is the risk verdict? | ph-target |
| free-check | Is the first check really free? | ph-gift |
| credits-expire | Do credits expire? | ph-calendar-check |
| vs-creditsafe | What's the difference between this and Creditsafe? | ph-scales |
| any-company | Can I check any UK company? | ph-buildings |

### Accordion Behaviour
- Single-item expand (clicking another item closes the current one)
- Smooth max-height transition for answer reveal
- Chevron rotates 180° on expand
- Question icon background changes to blue when active
- Left border accent on answer content

### Exposed API
```javascript
// Manual initialization (if needed)
window.CompanyWiseFAQ.init();

// Access component instance
window.CompanyWiseFAQ.getInstance();
```

---

## CTA Component — Architecture

### Self-Initializing Pattern
```html
<!-- In index.html -->
<div data-component="cta"></div>

<!-- Scripts -->
<script src="./js/cta.js"></script>
```

### Key Files
- `js/cta.js` — Component class, render, animations
- `styles/cta.css` — All section-specific styles (prefix: `cta-`)

### Animation Sequence
1. Chevrons slide in from right (staggered 100ms)
2. Blur accents fade in (staggered 150ms)
3. Fade elements animate in (staggered 80ms)
4. Stats bars animate to target widths (after 400ms, staggered 150ms)

### Visual Features
| Element | Description |
|---------|-------------|
| Chevrons | 3 stacked, right-aligned, mirrored from hero pattern |
| Anchor Card | Stats with animated progress bars |
| Float Card (top) | Risk verdict with score ring (85/100) |
| Float Card (bottom) | "First check free" badge with CTA |
| Trust Row | 3 trust indicators (no CC, no account, 3s results) |
| Social Proof | Avatar stack + "Trusted by freelancers" |

### Exposed API
```javascript
// Manual initialization (if needed)
window.CompanyWiseCTA.init();

// Access component instance
window.CompanyWiseCTA.getInstance();
```

---

## Report Modal Component — Architecture

### Overview
The full report modal displays detailed company information when the user clicks "View full report" from the verdict card. It includes company overview, risk analysis, filing compliance, **financial snapshot**, directors, and recommendations.

### Key Files
- `js/modal.js` — Modal component with render logic, Financial Snapshot section
- `styles/modal.css` — Modal styles including new financial section styles

### Financial Snapshot Section
The modal includes a **Financial Snapshot** section that displays data from the backend's `numeric_facts` table:

| UI Element | Backend Source | Context Type |
|------------|----------------|--------------|
| Turnover | `numeric_facts.concept = 'Turnover'` | duration |
| Gross Profit | `numeric_facts.concept = 'GrossProfit'` | duration |
| Net Assets | `numeric_facts.concept = 'Equity'` | instant |
| Cash Position | `numeric_facts.concept = 'CashBankInHand'` | instant |
| Current Assets | `numeric_facts.concept = 'CurrentAssets'` | instant |
| Current Liabilities | `numeric_facts.concept = 'CreditorsDueWithinOneYear'` | instant |
| Trade Debtors | `numeric_facts.concept = 'Debtors'` | instant |
| Stock | `numeric_facts.concept = 'Stocks'` | instant |

### Features
- **YoY trends**: Automatically calculates and displays year-over-year change percentages
- **Working capital ratio**: Calculated from currentAssets / currentLiabilities with colour coding:
  - Green (≥1.5x): Healthy
  - Amber (1.0-1.5x): Adequate
  - Red (<1.0x): Concerning
- **Currency formatting**: Automatic £m/£k formatting for large values
- **Graceful fallback**: Shows placeholder message if no financial data available (micro-entity filings)

### Exposed API
```javascript
// Open modal with company data
window.CompanyWiseModal.open(company);

// Close modal
window.CompanyWiseModal.close();

// Check if modal is open
window.CompanyWiseModal.isOpen();
```

---

## Mock Data — Architecture

### Overview
Sample company data is now in a separate file (`mock-data.js`) for cleaner organization and easier maintenance during development.

### Key File
- `js/mock-data.js` — All mock company data with financials

### Data Structure
The mock data structure mirrors the expected backend response format, including the new `financials` object that maps to the database schema.

### Sample Companies
| Company | Risk | Has Financials | Notes |
|---------|------|----------------|-------|
| Davidson Brothers | Low | Full | Based on example_content.txt (£56.7m turnover) |
| Horizon Digital | Low | Full | Software company (£2.4m turnover) |
| Fernwild Creative | Medium | Partial | Creative agency (£485k turnover) |
| PureFlow Logistics | High | Stale | Strike-off pending, 2022 data |
| Quantum Reach | Medium | None | Accounts overdue |
| Castle & Brook | High | None | Never filed |

### Exposed API
```javascript
// Access all companies
window.CompanyWiseMockData.companies

// Access filing history data
window.CompanyWiseMockData.filingHistory

// Find company by number or name
window.CompanyWiseMockData.findCompany('12345678')

// Search companies
window.CompanyWiseMockData.searchCompanies('horizon')
```

---

## Hero — Next Steps for MVP

### 1. Real Search (Replace Placeholder)
The search input needs to hit a real backend. Two approaches:

**Option A — API proxy (simpler, rate-limited)**
- Frontend sends query to your backend
- Backend calls Companies House search API: `GET https://api.company-information.service.gov.uk/search/companies?q={query}`
- Backend returns top 5-10 results
- Frontend renders dropdown from live results
- Rate limit: 600 requests per 5 minutes (shared across all users)

**Option B — Local database (better, per the project brief)**
- Import Companies House bulk CSV (~5M companies) into your database
- Frontend sends query to your backend
- Backend does a local DB search (name + number)
- No rate limit concerns, faster response
- Needs monthly bulk data refresh job

**Where to modify**: In `hero.js`, the `handleInput()` method currently filters `PLACEHOLDER_COMPANIES`. Replace with a `fetch()` call:

```javascript
// In hero.js handleInput()
async handleInput(query) {
  if (query.length < 2) {
    this.closeDropdown();
    return;
  }

  // Replace this placeholder filter:
  // const results = PLACEHOLDER_COMPANIES.filter(...);

  // With API call:
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const results = await response.json();

  this.renderDropdown(results);
}
```

### 2. Real Risk Scoring (Replace Static Flags)
Currently each company has hardcoded `risk`, `flags`, and `recommendation` fields. For MVP:

- Backend receives a company number
- Backend pulls/checks: accounts due dates, confirmation statement dates, company age, status, officer history (via API), charges
- Backend applies weighted scoring logic (per the project brief's red/green flag list)
- Backend returns: `{ risk: 'low'|'medium'|'high', score: number, flags: [...], recommendation: string }`

**Where to modify**: In `hero.js`, the `selectCompany()` method currently uses static data. Add a fetch call to get real risk data:

```javascript
async selectCompany(company) {
  this.searchInput.value = company.name;
  this.closeDropdown();
  this.setLoading(true);

  try {
    const response = await fetch(`/api/check/${company.number}`);
    const fullData = await response.json();
    this.renderVerdict(fullData);
  } catch (err) {
    this.showError('Failed to check company. Please try again.');
  } finally {
    this.setLoading(false);
  }
}
```

### 3. Loading & Error States
The hero already has loading/error state methods built in:
- `Hero.setLoading(true/false)` — disables input, shows spinner on button
- `Hero.showError(message)` — displays error below search form
- `Hero.hideError()` — clears error message

Add a skeleton/spinner state for the verdict card area while backend processes.

### 4. Free Check Gating
Per the brief: first check free with no account, then 3/month with account. For MVP frontend:
- After first check, show a soft prompt: "Create a free account for 2 more checks this month"
- Track check count in localStorage (easy to bypass, but fine for MVP)
- Don't block aggressively — the goal is conversion, not enforcement

### 5. Mobile Search UX
- Dropdown items could be slightly taller for tap targets
- Consider auto-scrolling the viewport so the dropdown doesn't get cut off by the keyboard

---

## Data Shape Reference

### Search Endpoint Response
Frontend expects this shape for dropdown:
```json
[
  {
    "name": "Horizon Digital Solutions Ltd",
    "number": "12345678",
    "status": "Active"
  }
]
```

### Full Check Endpoint Response
Frontend expects this shape for verdict card and full report modal:
```json
{
  "name": "Horizon Digital Solutions Ltd",
  "number": "12345678",
  "status": "Active",
  "incorporated": "2019-03-15",
  "type": "Private limited",
  "address": "71 Kingsway, London, WC2B 6ST",
  "sicCode": "62012 - Business and domestic software development",
  "lastAccounts": "2024-06-30",
  "nextAccountsDue": "2025-03-31",
  "confirmationDue": "2025-04-02",
  "risk": "low",
  "flags": [
    {
      "type": "green",
      "icon": "ph-check-circle",
      "text": "Accounts filed on time — last 3 filings all within deadline"
    }
  ],
  "recommendation": "This company looks financially responsible. Standard payment terms should be fine.",
  "directors": [
    { "name": "Sarah Mitchell", "role": "Director", "appointed": "2019-03-15" }
  ],
  "financials": {
    "accountsDate": "2024-06-30",
    "periodStart": "2023-07-01",
    "periodEnd": "2024-06-30",
    "turnover": { "current": 2450000, "previous": 2180000 },
    "grossProfit": { "current": 890000, "previous": 756000 },
    "netAssets": { "current": 1240000, "previous": 985000 },
    "currentAssets": 892000,
    "currentLiabilities": 485000,
    "cash": 623000,
    "debtors": 245000,
    "stocks": 24000
  }
}
```

**Flag types**: `green`, `amber`, `red`
**Risk levels**: `low`, `medium`, `high`
**Financials**: Optional — only present if company has filed detailed accounts (not micro-entity)

---

## Design Tokens Quick Reference

```css
--blue-500: #3b82f6        /* Primary actions, links, logo accent */
--blue-600: #2563eb        /* Hover state */
--risk-low: #059669        /* Green — low risk */
--risk-medium: #d97706     /* Amber — medium risk */
--risk-high: #dc2626       /* Red — high risk */
--text-900: #171717        /* Headings */
--text-700: #404040        /* Body text */
--text-500: #737373        /* Secondary text */
--text-400: #a3a3a3        /* Muted/placeholder */
--font: 'Jost'             /* Everything */
```

---

## Files You'll Touch for Backend Integration

| Task | File | Method/Section |
|------|------|----------------|
| Live company search | `js/hero.js` | `handleInput()` |
| Real risk check | `js/hero.js` | `selectCompany()` |
| Loading states | `js/hero.js` | `setLoading()`, `showError()` |
| Verdict card styling | `styles/hero.css` | `.hero-verdict-*` classes |
| Check gating UI | `js/hero.js` | Add after `renderVerdict()` |
| Full report modal | `js/modal.js` | `open()`, `renderFinancialSnapshot()` |
| Financial data display | `js/modal.js` | `renderFinancialSnapshot()` |
| Mock data (dev only) | `js/mock-data.js` | `MOCK_COMPANIES` array |

---

---

## Session Log

### Session: 5 Feb 2026 — Report Modal & Mock Data Refactor
**Focus**: Add Financial Snapshot section to report modal, align with backend database schema, extract mock data to separate file

**Completed**:
- **Report Modal — Financial Snapshot section** (`modal.js`, `modal.css`):
  - Added `renderFinancialSnapshot()` method to display financial data
  - Key metrics grid: Turnover, Gross Profit, Net Assets, Cash Position
  - YoY trend calculations with colour-coded indicators (green up, red down)
  - Balance sheet summary: Current Assets, Current Liabilities, Working Capital Ratio
  - Additional line items: Trade Debtors, Stock
  - Accounts date notice showing when data is from
  - Graceful fallback for companies without financial data (micro-entities)
  - Working capital ratio colour coding: ≥1.5x green, 1-1.5x amber, <1x red
  - Currency formatting: automatic £m/£k for large values
  - Responsive design: 4-col → 2-col grid on mobile

- **Mock Data Extraction** (`mock-data.js`):
  - Moved all sample company data from `hero.js` to dedicated `mock-data.js`
  - Added `financials` object to companies with filed accounts
  - Structure mirrors backend `numeric_facts` table (concepts, contexts)
  - Added Davidson Brothers with full financial data from `example_content.txt`
  - Exposed via `window.CompanyWiseMockData` with helper functions
  - Updated `hero.js` to reference external mock data

- **Updated `index.html`**:
  - Added `mock-data.js` script before `hero.js`

**Data structure alignment**:
- `financials.accountsDate` → `filings.balance_sheet_date`
- `financials.turnover` → `numeric_facts WHERE concept = 'Turnover'` (duration context)
- `financials.netAssets` → `numeric_facts WHERE concept = 'Equity'` (instant context)
- `financials.currentAssets` → `numeric_facts WHERE concept = 'CurrentAssets'`
- etc.

**Test the Financial Snapshot**: Search for "Davidson" or "Horizon" to see companies with full financial data.

---

### Session: 5 Feb 2026 (late night) — CTA component
**Focus**: Bottom CTA section componentization with Motorwise hero-style design

**Completed**:
- Created `cta.js` — self-initializing "CTA" section component
  - Chevron backgrounds (3 stacked, right-aligned/mirrored from hero)
  - Two-column layout: illustration cards (left), content (right)
  - Anchor card with animated stats bars (companies indexed, signals, check time)
  - Float card (top-left): Risk verdict with score ring preview
  - Float card (bottom-right): "First check free" badge with CTA hint
  - Trust indicators row (no CC, no account, 3s results)
  - Social proof avatars with "Trusted by freelancers"
  - Primary CTA button scrolling to top + focusing search
- Created `cta.css` — dedicated styles with `cta-` prefix
  - Chevron backgrounds matching hero pattern but mirrored
  - Floating card positioning and hover effects
  - Progress bar animations
  - Responsive layout (cards hidden on mobile, content centered)
- Updated `index.html`:
  - Replaced inline "Bottom CTA" section with `data-component="cta"`
  - Added CSS/JS links
- Updated HANDOVER.md with CTA architecture documentation

**All landing page sections now componentized**:
- Header, Hero, How It Works, What We Check, Pricing, Why CompanyWise, FAQ, CTA, Footer

**Only inline section remaining**: Stats (simple enough to leave as-is)

---

### Session: 5 Feb 2026 (night) — FAQ component
**Focus**: FAQ section componentization

**Completed**:
- Created `faq.js` — self-initializing "FAQ" accordion section component
  - 6 FAQ items with relevant icons (database, target, gift, calendar-check, scales, buildings)
  - Single-item accordion expand/collapse behaviour
  - Smooth max-height + opacity transitions
  - Chevron rotation and colour changes on expand
  - Active state: icon background turns blue, question text turns blue
  - Answer content with left border accent
  - Contact CTA card at bottom ("Still have questions?")
- Created `faq.css` — dedicated styles with `faq-` prefix
  - Blur accent backgrounds consistent with other sections
  - Card styling matching Motorwise design system
  - Hover effects on FAQ items
  - Responsive design
- Updated `index.html`:
  - Replaced inline "FAQ" section with `data-component="faq"`
  - Added CSS/JS links
- Updated HANDOVER.md with FAQ architecture documentation

**All major sections now componentized**:
- Hero, How It Works, What We Check, Pricing, Why CompanyWise, FAQ

**Remaining**: Stats section is inline (simple enough to leave as-is)

---

### Session: 5 Feb 2026 (evening) — Why CompanyWise component
**Focus**: Comparison table section componentization

**Completed**:
- Created `why-companywise.js` — self-initializing "Why CompanyWise" comparison section
  - Polished comparison table with branded CompanyWise column header
  - Feature rows with descriptive icons
  - Colour-coded check/cross/partial icons (green/red/amber)
  - Row hover effects with subtle highlight
  - Staggered row entrance animations (slide in from left)
- Created `why-companywise.css` — dedicated styles with `why-` prefix
  - Table with branded header styling
  - Highlight column background for CompanyWise
  - Three highlight cards below table (Instant results, Official data, Built for freelancers)
  - Responsive design with horizontal scroll on mobile
- Updated `index.html`:
  - Replaced inline "Comparison" section with `data-component="why-companywise"`
  - Added CSS/JS links

**Next up**: FAQ section to be componentized

---

### Session: 5 Feb 2026 (afternoon) — Pricing component
**Focus**: Pricing section componentization

**Completed**:
- Created `pricing.js` — self-initializing "Pricing" section component
  - 4-tier structure: Free, Starter, Standard (featured), Pro
  - Tier icons with colour variants (gift, rocket, star, crown)
  - "Save 20%" and "Save 34%" badges on Standard and Pro tiers
  - Feature lists under each pricing tier
  - Trust note bar at bottom (credits never expire, no recurring charges)
- Created `pricing.css` — dedicated styles with `prc-` prefix
  - Blur accent backgrounds matching other sections
  - Featured card with blue border + "Most popular" badge
  - Responsive grid: 1 col mobile → 2 col tablet → 4 col desktop
- Fixed badge clipping: removed `overflow: hidden` from card, added `margin-top` to featured card
- Updated `index.html`:
  - Replaced inline "Pricing" section with `data-component="pricing"`
  - Added CSS/JS links

**In parallel (other dev)**: "What We Check" component

**Next up**: Comparison table, FAQ, Stats sections to be componentized

---

### Session: 5 Feb 2026 (morning) — What We Check component
**Focus**: What We Check section componentization

**Completed**:
- Created `what-we-check.js` — self-initializing "What We Check" section component
  - 12 signal cards (expanded from original 6) with weight indicators
  - Colour-coded icons: red (critical), amber (medium), blue (info), emerald (positive)
  - Summary panel with animated weight distribution bar
  - Staggered fade-in animations via IntersectionObserver
- Created `what-we-check.css` — dedicated styles matching Motorwise design system
- Updated `index.html`:
  - Replaced inline "What we check" section with `data-component="what-we-check"`
  - Added CSS/JS links

---

### Session: 5 Feb 2026
**Focus**: Frontend component scaffolding

**Completed**:
- Created `how-it-works.js` — self-initializing "How it Works" section component following Motorwise patterns
- Created `how-it-works.css` — dedicated styles with blur accents, polished step cards, visual previews
- Updated `index.html` to use the new component (replaced inline HTML with `data-component` container)
- Each step card now has interactive visual previews (search bar, signal analysis, verdict badge)
- IntersectionObserver triggers animations when section scrolls into view

---

*Last updated: 5 February 2026*
