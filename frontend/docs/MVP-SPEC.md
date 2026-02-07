# CompanyWise — Frontend MVP Spec

## What Exists

### File Structure
```
frontend/
├── src/
│   ├── js/
│   │   ├── components/
│   │   │   ├── call-to-action/
│   │   │   │   ├── cta.js                    ← Bottom CTA section component
│   │   │   │   └── styles/cta.css
│   │   │   ├── credit-badge/
│   │   │   │   ├── credit-badge.js            ← Credit pill widget (header + inline)
│   │   │   │   └── styles/credit-badge.css
│   │   │   ├── credit-wallet/
│   │   │   │   └── credit-wallet.js           ← Lamport hash-chain wallet (no CSS)
│   │   │   ├── faq/
│   │   │   │   ├── faq.js                     ← FAQ accordion section
│   │   │   │   └── styles/faq.css
│   │   │   ├── footer/
│   │   │   │   ├── footer.js                  ← Reusable footer component
│   │   │   │   └── styles/footer.css
│   │   │   ├── header/
│   │   │   │   ├── header.js                  ← Reusable header with nav + credit badge
│   │   │   │   └── styles/header.css
│   │   │   ├── hero/
│   │   │   │   ├── hero.js                    ← Hero search + verdict + illustration
│   │   │   │   └── styles/hero.css
│   │   │   ├── how-it-works/
│   │   │   │   ├── how-it-works.js            ← "How it Works" 3-step section
│   │   │   │   └── styles/how-it-works.css
│   │   │   ├── modal/
│   │   │   │   ├── modal.js                   ← Free report modal (premium-gated sections)
│   │   │   │   └── styles/modal.css
│   │   │   ├── premium-report/
│   │   │   │   ├── premium-report.js          ← Full premium report page component
│   │   │   │   └── styles/premium-report.css
│   │   │   ├── pricing/
│   │   │   │   ├── pricing.js                 ← Pricing tiers with purchase dialog integration
│   │   │   │   └── styles/pricing.css
│   │   │   ├── purchase-dialog/
│   │   │   │   ├── purchase-dialog.js         ← 3-step credit purchase flow
│   │   │   │   └── styles/purchase-dialog.css
│   │   │   ├── upgrade-prompt/
│   │   │   │   ├── upgrade-prompt.js          ← Mini-dialog for premium upsell
│   │   │   │   └── styles/upgrade-prompt.css
│   │   │   ├── what-we-check/
│   │   │   │   ├── index.js                   ← Entry point / barrel file
│   │   │   │   ├── what-we-check.js           ← Main 12-signal grid component
│   │   │   │   ├── components/financial.js    ← Financial sub-component
│   │   │   │   └── styles/
│   │   │   │       ├── what-we-check.css
│   │   │   │       └── components/financial.css
│   │   │   └── why-us/
│   │   │       ├── why-companywise.js         ← Comparison table + highlight cards
│   │   │       └── styles/why-companywise.css
│   │   ├── data/
│   │   │   └── mock-data.js                   ← 6 sample companies + filing history
│   │   └── main.js                            ← Scroll reveal, counters, header/footer init
│   ├── pages/
│   │   ├── Home/
│   │   │   └── home.html                      ← Landing page (all sections)
│   │   └── Report/
│   │       ├── Free/
│   │       │   └── free-report.html           ← Placeholder (modal-based, not a standalone page)
│   │       └── Premium/
│   │           └── premium-report.html        ← Full premium report page
│   └── styles/
│       └── main.css                           ← Design tokens, shared component styles
├── docs/
│   └── MVP-SPEC.md                            ← This file
└── specs/
    └── payment/
        └── PAYMENT-FLOW.spec.md               ← Payment flow specification
```

### Architecture Decisions
- **Static files only** — no build step, no framework, vanilla JS
- **Tailwind via CDN** — utility classes in HTML, custom CSS per component
- **Jost font** — loaded via Google Fonts
- **Phosphor Icons** — regular, fill, and bold weights via CDN (v2.1.1)
- **Component-folder structure** — each component lives in its own folder with co-located styles
- **Self-initializing components** — drop the container and include the script, they mount themselves:
  - `<div id="header-container"></div>` + `header.js`
  - `<div id="footer-container"></div>` + `footer.js`
  - `<div id="hero-container"></div>` + `hero.js`
  - `<div data-component="how-it-works"></div>` + `how-it-works.js`
  - `<div data-component="what-we-check"></div>` + `index.js` / `what-we-check.js` / `financial.js`
  - `<div data-component="pricing"></div>` + `pricing.js`
  - `<div data-component="why-companywise"></div>` + `why-companywise.js`
  - `<div data-component="faq"></div>` + `faq.js`
  - `<div data-component="cta"></div>` + `cta.js`
- **Global namespace** — components expose APIs via `window.CompanyWise*` (see Exposed APIs section)
- **Event-driven communication** — components communicate via custom DOM events (e.g. `creditWalletChanged`)
- **Design system** — CSS custom properties in `:root` of `main.css` (colours, risk states, typography, spacing)
- **Multi-page** — `home.html` is the landing page, `premium-report.html` is a separate page (full page loads, no SPA routing)

### Pages

| Page | Path | Purpose |
|------|------|---------|
| Landing | `src/pages/Home/home.html` | All marketing sections + search + free report modal |
| Premium Report | `src/pages/Report/Premium/premium-report.html` | Full unlocked report (requires credit) |
| Free Report | `src/pages/Report/Free/free-report.html` | Placeholder — free report is shown via modal on landing page |

---

## What's Working

### Header
- Fixed nav with scroll state (shrinks + shadow on scroll)
- Mobile hamburger drawer with swipe-to-close
- Company search action card in drawer
- Desktop nav links with smooth scroll to anchors
- **Credit badge** integrated in desktop nav (shows current balance, clickable to open purchase dialog)
- "Buy Credits" button opens purchase dialog
- Logo links to home page

### Hero
- **Two-column layout**: content left, animated card stack illustration right (desktop)
- **Chevron backgrounds**: desktop (3 chevrons) + mobile (single chevron)
- **Search form**: company name/number input with yellow CTA button
- **Dropdown**: filters mock companies with result highlighting
- **Verdict card** on company select:
  - Risk badge (low/medium/high) with colour coding
  - Meta row: company age, status, sector
  - Colour-coded flags (green/amber/red)
  - Recommendation text
  - **"View Free Report" button** → opens free report modal
  - **"Get Premium Report" button** → checks wallet, spends credit or shows upgrade prompt
- **Card stack illustration**:
  - Back card (depth shadow)
  - Middle card: filing history chart with animated SVG line draw + "Late" warning marker
  - Front card: risk engine score with animated ring + detected flags
- **Animated checklist**: feature items fade in with stagger
- **Blur accents**: animated gradient orbs

### Free Report Modal
- Triggered from hero "View Free Report" button
- Sections:
  1. **Company Overview** — status, age, address, SIC code
  2. **Risk Analysis** — all flags displayed with colour coding
  3. **Filing Compliance** — last accounts, next due dates, confirmation statement
  4. **Financial Snapshot** — turnover, profit, net assets, cash (if available)
  5. **Directors** — **locked** (blurred, shows "Unlock with premium" CTA)
  6. **CCJs & Charges** — **locked** (blurred, shows "Unlock with premium" CTA)
  7. **Recommendation** — detailed advice text
- Premium-gated sections have blur overlay with unlock buttons that open purchase dialog
- Footer with data source attribution + upgrade CTA
- Close on ESC key or backdrop click
- Locks body scroll when open

### Premium Report Page
- Full-page dedicated report at `premium-report.html`
- **Access control flow**:
  1. Already unlocked this company → shows report immediately
  2. Has credits → auto-spends 1 credit and shows report
  3. No credits/access → shows "access denied" placeholder with purchase CTA
- All sections visible (nothing locked):
  - Breadcrumb navigation
  - Risk score card with circular SVG progress ring
  - Company overview with detailed metadata
  - Risk analysis with all flags
  - Filing compliance with timeline
  - **Financial deep dive**: turnover, gross profit, net assets, cash, balance sheet, working capital ratio, YoY trends
  - Directors list with appointment dates
  - CCJs & charges
  - Recommendation with action items
  - Footer with "Export PDF" button (disabled/stub — "Coming soon")
- Scroll-reveal animations on each section
- Derives risk score from flag counts if not provided explicitly

### Credit Wallet System
- **Lamport hash-chain** based credit system (client-side)
- localStorage persistence across sessions
- Core operations:
  - `purchaseCredits(count, tier)` — generates wallet with hash chain
  - `spendCredit(companyNumber)` — verifies chain integrity, decrements balance
  - `hasAccess(companyNumber)` — check if company already unlocked
  - `recoverFromToken(token)` — restore wallet from base64 export
  - `exportWallet()` — download wallet as JSON blob
  - `getHistory()` — list of past spends
- **Free checks**: 3 per month, monthly auto-reset via `getFreeChecksRemaining()` / `useFreeCheck()`
- Dispatches `creditWalletChanged` custom event on state changes
- `clearWallet()` dev helper for testing

### Purchase Dialog
- **3-step modal flow**:
  1. **Tier Selection** — choose Starter / Standard / Pro
  2. **Payment Form** — email, name, card fields (**demo mode** — no real payment processing)
  3. **Delivery** — shows passphrase, wallet token (copyable), download button, warning to save
- Tiers:
  | Tier | Credits | Price | Per Check |
  |------|---------|-------|-----------|
  | Starter | 10 | £5 | £0.50 |
  | Standard | 25 | £10 | £0.40 |
  | Pro | 60 | £20 | £0.33 |
- "Most Popular" badge on Standard tier
- Step progress dots + back button on step 2
- Can open pre-selecting a tier: `open({ tier: 'standard' })`
- Can open with `returnTo` company for post-purchase navigation: `open({ returnTo: company })`

### Credit Badge
- Small pill widget: "X credits" with star icon
- Shows only when wallet exists (has credits)
- Clickable → opens purchase dialog
- Auto-updates on `creditWalletChanged` event
- "Empty" state CSS class when balance = 0
- Multiple instances supported on same page

### Upgrade Prompt
- Mini-dialog card that appears below hero verdict
- Shown when user tries to access premium content without credits
- Lists locked features: financial deep dive, director history, CCJs & charges
- Buttons: "Buy Credits" (opens purchase dialog) and "Learn More" (scrolls to pricing)
- Auto-dismisses when credits become available (listens to `creditWalletChanged`)

### How It Works
- **3 step cards** with polished visual previews:
  - Step 1: animated search bar preview with company suggestions + blinking cursor
  - Step 2: signal analysis preview (green/amber indicators) + animated progress bar
  - Step 3: verdict badge preview (Low/Medium/High risk) + recommendation
- Blur accent backgrounds + connector arrows between steps (desktop)
- IntersectionObserver staggered fade-in animations

### What We Check
- **12 signal cards** in responsive grid (3 cols desktop, 2 tablet, 1 mobile):
  - Overdue Accounts, Director History, CCJs & Charges, Virtual Office Check
  - Company Age, Financial Health, Company Status, SIC Code Analysis
  - Filing Consistency, PSC Register, Address Changes, Previous Names
- Weight indicators: High/Medium/Low badges (colour-coded)
- Icon colour coding: red (critical), amber (medium), blue (informational), emerald (positive)
- Summary panel with animated weight distribution bar
- **Financial sub-component** (`components/financial.js`) with balance sheet visualization
- IntersectionObserver staggered fade-in animations

### Pricing
- **4-tier grid**: Free, Starter, Standard (featured), Pro
  | Tier | Credits | Price | Per Check |
  |------|---------|-------|-----------|
  | Free | 3/month | £0 | Free |
  | Starter | 10 | £5 | £0.50 |
  | Standard | 25 | £10 | £0.40 |
  | Pro | 60 | £20 | £0.33 |
- Featured card: gradient border, "Most popular" badge, primary CTA
- "Save 20%" and "Save 34%" badges on Standard and Pro
- Trust note footer: credits never expire, 1 credit = 1 check, no recurring charges
- **CTA buttons open purchase dialog** with pre-selected tier
- IntersectionObserver staggered fade-in animations

### Why CompanyWise
- Polished comparison table: CompanyWise vs Enterprise tools vs Free check sites
- Feature rows with colour-coded check/cross/partial icons
- Row hover highlight + staggered row entrance animations
- Three highlight cards: Instant results, Official data source, Built for freelancers

### FAQ
- 6 FAQ items with smooth accordion expand/collapse
- Icon per question (database, target, gift, calendar-check, scales, buildings)
- Single-item expand (clicking another closes the current)
- **Bottom CTA card**: "Check a company" (not "Still have questions?" with email link)

### CTA (Bottom)
- Chevron backgrounds (3 stacked, right-aligned/mirrored from hero)
- Two-column layout: illustration cards (left), content (right)
- Floating illustration cards with stats, risk score preview, "First check free" badge
- Trust indicators row + social proof avatar stack
- Primary CTA scrolls to top + focuses search input

### Stats (Inline)
- 4-stat grid: 5.3M+ companies, Free, 12 flags, 3s check time
- Animated counters via IntersectionObserver
- Stays inline in `home.html` (not a standalone component)

### Footer
- Chevron background (mirrored), 3-column grid
- Nav links: How it works, What we check, Pricing, FAQ
- Legal links: Privacy, Terms, Cookies, Contact
- Companies House attribution

---

## What's Placeholder / Fake

- **All 6 sample companies** come from `data/mock-data.js` (accessed via `window.CompanyWiseMockData`)
- **Financial data** is included for some companies (mirrors backend `numeric_facts` table structure)
- **Risk scoring** is static data per company — no actual scoring logic
- **Filing history chart** in hero illustration is static demo data
- **Payment processing is demo mode** — purchase dialog collects card details but processes nothing
- **Credit wallet is client-side only** — no server validation of hash chains
- **Authentication** — "Log in" and "Get started" buttons are non-functional (`href="#"`)
- **Stats** (5.3M+ companies, 12 flags, 3s check time) are static values
- **No backend** — no API calls, no database, no Companies House integration
- **PDF export** button on premium report is disabled ("Coming soon")

---

## Exposed APIs (Global Namespace)

| Namespace | Source File | Key Methods |
|-----------|------------|-------------|
| `window.CompanyWiseHeader` | `header/header.js` | `initHeader({ container })` |
| `window.CompanyWiseFooter` | `footer/footer.js` | `initFooter({ container })` |
| `window.CompanyWiseHero` | `hero/hero.js` | `initHero({ container })`, `Hero.setLoading()`, `Hero.showError()` |
| `window.CompanyWiseModal` | `modal/modal.js` | `open(company)`, `close()`, `isOpen()` |
| `window.CompanyWisePremiumReport` | `premium-report/premium-report.js` | `init()` |
| `window.CompanyWiseWallet` | `credit-wallet/credit-wallet.js` | `purchaseCredits()`, `spendCredit()`, `hasAccess()`, `recoverFromToken()`, `exportWallet()`, `getFreeChecksRemaining()`, `useFreeCheck()`, `clearWallet()` |
| `window.CompanyWisePurchase` | `purchase-dialog/purchase-dialog.js` | `open({ tier?, returnTo? })`, `close()` |
| `window.CompanyWiseCreditBadge` | `credit-badge/credit-badge.js` | `create(container)` |
| `window.CompanyWiseUpgrade` | `upgrade-prompt/upgrade-prompt.js` | `showMiniDialog(company)` |
| `window.CompanyWiseHowItWorks` | `how-it-works/how-it-works.js` | `init()`, `getInstance()` |
| `window.CompanyWiseWhatWeCheck` | `what-we-check/what-we-check.js` | `init()`, `getInstance()` |
| `window.CompanyWisePricing` | `pricing/pricing.js` | `init()`, `getInstance()` |
| `window.CompanyWiseWhy` | `why-us/why-companywise.js` | `init()`, `getInstance()` |
| `window.CompanyWiseFAQ` | `faq/faq.js` | `init()`, `getInstance()` |
| `window.CompanyWiseCTA` | `call-to-action/cta.js` | `init()`, `getInstance()` |
| `window.CompanyWiseMockData` | `data/mock-data.js` | `companies`, `filingHistory`, `findCompany()`, `searchCompanies()` |

---

## Component Dependency Graph

```
home.html
 ├─ mock-data.js               (loaded first — data source for everything)
 ├─ header.js                   → credit-badge.js (embeds badge in nav)
 ├─ footer.js
 ├─ hero.js                     → modal.js (opens free report)
 │                              → credit-wallet.js (checks access for premium)
 │                              → upgrade-prompt.js (shows upsell if no credits)
 ├─ how-it-works.js
 ├─ what-we-check/index.js
 │   ├─ financial.js
 │   └─ what-we-check.js
 ├─ pricing.js                  → purchase-dialog.js (opens purchase on CTA click)
 ├─ why-companywise.js
 ├─ faq.js
 ├─ cta.js
 ├─ modal.js                    → purchase-dialog.js (unlock premium sections)
 │                              → credit-wallet.js (checks premium access)
 ├─ credit-wallet.js            (standalone — dispatches creditWalletChanged events)
 ├─ purchase-dialog.js          → credit-wallet.js (creates wallet on purchase)
 ├─ credit-badge.js             → credit-wallet.js (reads balance)
 │                              → purchase-dialog.js (opens on click)
 ├─ upgrade-prompt.js           → purchase-dialog.js (opens on "Buy Credits")
 │                              → credit-wallet.js (listens for changes)
 └─ main.js                     (scroll reveal, counters, header/footer init)

premium-report.html
 ├─ mock-data.js
 ├─ header.js → credit-badge.js
 ├─ footer.js
 ├─ premium-report.js           → credit-wallet.js (access check + spend)
 │                              → purchase-dialog.js (opens if no credits)
 ├─ credit-wallet.js
 ├─ purchase-dialog.js
 ├─ credit-badge.js
 └─ upgrade-prompt.js
```

---

## Mock Data

### Key File
- `src/js/data/mock-data.js` — all mock company data with financials

### Sample Companies
| Company | Risk | Has Financials | Notes |
|---------|------|----------------|-------|
| Davidson Brothers (Shotts) Limited | Low | Full | £56.7m turnover, well-established |
| Horizon Digital Solutions Ltd | Low | Full | Software company, £2.4m turnover |
| Fernwild Creative Agency Ltd | Medium | Partial | Creative agency, £485k turnover |
| PureFlow Logistics Ltd | High | Stale | Strike-off pending, 2022 data |
| Quantum Reach Marketing Ltd | Medium | None | Accounts overdue |
| Castle & Brook Construction Ltd | High | None | Never filed |

### Data Structure
Each company mirrors the expected backend response format:
```json
{
  "name": "...",
  "number": "12345678",
  "status": "Active",
  "incorporated": "2019-03-15",
  "type": "Private limited",
  "address": "...",
  "sicCode": "62012 - Business and domestic software development",
  "lastAccounts": "2024-06-30",
  "nextAccountsDue": "2025-03-31",
  "confirmationDue": "2025-04-02",
  "risk": "low",
  "flags": [
    { "type": "green", "icon": "ph-check-circle", "text": "..." }
  ],
  "recommendation": "...",
  "directors": [
    { "name": "...", "role": "Director", "appointed": "2019-03-15" }
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
**Financials**: optional — only present if company has filed detailed accounts (not micro-entity)

### Helpers
```javascript
window.CompanyWiseMockData.companies          // Array of all companies
window.CompanyWiseMockData.filingHistory       // Array of filing records
window.CompanyWiseMockData.findCompany(query)  // Find by number or name
window.CompanyWiseMockData.searchCompanies(q)  // Search by name/number
```

---

## User Journey (Current MVP)

1. **Land on home page** → hero search, marketing sections
2. **Search for company** → dropdown filters mock data, select a result
3. **See verdict card** → risk badge, flags, recommendation
4. **"View Free Report"** → modal opens with overview, risk, filing, financials (directors/CCJs locked)
5. **"Get Premium Report"** → if no credits, upgrade prompt appears below verdict
6. **"Buy Credits"** → purchase dialog opens (3-step: tier → payment form → delivery)
7. **Complete purchase** → wallet created, passphrase + token shown, credit badge updates in header
8. **"Get Premium Report" again** → credit spent, navigates to `premium-report.html` with full details
9. **Return visits** → wallet persists in localStorage, credit badge shows balance

---

## Next Steps for MVP

### 1. Real Search (Replace Mock Data)
The search currently filters `mock-data.js`. Replace with a backend call:

**Where to modify**: `hero/hero.js` — the `handleInput()` method

```javascript
// Replace mock data filter with:
const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
const results = await response.json();
this.renderDropdown(results);
```

### 2. Real Risk Scoring
Currently each company has hardcoded `risk`, `flags`, and `recommendation`. Backend should:
- Pull filing dates, accounts, status, officers, charges from Companies House
- Apply weighted scoring logic
- Return `{ risk, score, flags, recommendation }`

**Where to modify**: `hero/hero.js` — the `selectCompany()` method

### 3. Real Payment Processing
Purchase dialog currently runs in demo mode. Integrate a payment provider (Stripe, etc.):

**Where to modify**: `purchase-dialog/purchase-dialog.js` — the `processPayment()` method

### 4. Server-Side Wallet Validation
Credit wallet is fully client-side. For production:
- Server generates and stores wallet anchor hash
- Client sends hash chain proof with each spend
- Server validates proof before revealing premium data

**Where to modify**: `credit-wallet/credit-wallet.js` (client), new backend endpoint (server)

### 5. Authentication
- User accounts for persistent credit ownership
- Login / signup flows
- Session management

**Where to modify**: `header/header.js` (nav state), new auth components

### 6. PDF Export
- Premium report "Export PDF" button is currently disabled
- Needs PDF generation (server-side or client-side library)

**Where to modify**: `premium-report/premium-report.js` — export button handler

---

## Files You'll Touch for Backend Integration

| Task | File | Method/Section |
|------|------|----------------|
| Live company search | `src/js/components/hero/hero.js` | `handleInput()` |
| Real risk check | `src/js/components/hero/hero.js` | `selectCompany()` |
| Loading states | `src/js/components/hero/hero.js` | `setLoading()`, `showError()` |
| Free report data | `src/js/components/modal/modal.js` | `open()`, `renderFinancialSnapshot()` |
| Premium report data | `src/js/components/premium-report/premium-report.js` | `loadCompanyData()` |
| Payment processing | `src/js/components/purchase-dialog/purchase-dialog.js` | `processPayment()` |
| Wallet server sync | `src/js/components/credit-wallet/credit-wallet.js` | `purchaseCredits()`, `spendCredit()` |
| Auth UI | `src/js/components/header/header.js` | Nav button handlers |
| Mock data (dev only) | `src/js/data/mock-data.js` | Remove once backend is live |

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

*Last updated: 7 February 2026*
