# Payment Flow — Technical Specification

> Canonical reference for the CompanyWise credit-based payment system.
> Updated: 2026-02-07 (account modal documented, wallet merge confirmed, header double-init fix applied).

---

## 1. System Overview

CompanyWise uses a **client-side hash-chain credit system**. Users buy credit packs, spend credits to unlock premium reports, and can recover wallets via token or passphrase. There is no server-side component yet — all state lives in `localStorage`.

### Components (load order)

```
credit-wallet.js    → Pure data/service layer (no DOM)
purchase-dialog.js  → 3-step checkout modal
credit-badge.js     → Standalone pill widget showing balance
upgrade-prompt.js   → Hero mini-dialog card for premium gating
account-modal.js    → Account info modal (balance, history, recovery, export)
hero.js             → Search + verdict card with Free/Premium buttons
modal.js            → Free report modal with premium-gated sections
pricing.js          → Pricing section CTAs
header.js           → Nav account buttons + [data-credit-count] spans
premium-report.js   → Full-page premium report with access gate
```

All scripts are synchronous `<script>` tags. `DOMContentLoaded` fires after all are parsed.

---

## 2. Component APIs

### 2.1 Credit Wallet — `window.CompanyWiseWallet`

**File:** `frontend/src/js/components/credit-wallet/credit-wallet.js`

Hash-chain credit service. Registered synchronously via IIFE (available before DOMContentLoaded).

| Method | Signature | Returns | Notes |
|---|---|---|---|
| `purchaseCredits` | `(count: number, tier: string)` | `{ token, passphrase, chainId }` | Generates hash chain, stores in localStorage. Merges with existing wallet — carries over remaining credits and preserves `spentOn[]` history. |
| `spendCredit` | `(companyNumber: string)` | `boolean` | `false` if chain verification fails or no credits. Returns `true` if already unlocked (no double-spend). |
| `hasAccess` | `(companyNumber: string)` | `boolean` | `true` if company already in `spentOn[]` |
| `getBalance` | `()` | `number` | 0 if no wallet |
| `hasWallet` | `()` | `boolean` | |
| `recoverFromToken` | `(token: string)` | `boolean` | Rebuilds chain from base64 token. Resets `spentOn[]` to empty (spend history is lost on recovery). |
| `exportWallet` | `()` | `Blob \| null` | JSON blob for download |
| `clearWallet` | `()` | `void` | Clears wallet + free checks from localStorage |
| `getFreeChecksRemaining` | `()` | `number` | 0–3, resets monthly |
| `useFreeCheck` | `()` | `boolean` | `false` if none remaining |
| `getHistory` | `()` | `Array<{ companyNumber, spentAt }>` | |

**Internal helpers** exposed at `Wallet._helpers`:

| Helper | Signature | Notes |
|---|---|---|
| `simpleHash` | `(input: string) → string` | FNV-1a based 64-char hex hash |
| `generateChain` | `(seed: string, levels: number) → string[]` | Returns `[seed, H(seed), ..., Hⁿ(seed)]` |
| `hashToWords` | `(hex: string) → string` | 4-word passphrase from hex (e.g. `coral-drift-ember-quest`) |
| `encodeSeed` | `(seed: string, credits: number) → string` | Base64 wallet token |
| `decodeSeed` | `(token: string) → { seed, credits, version } \| null` | Decode base64 wallet token |

Used by `account-modal.js` to generate recovery tokens for display.

**Event:** Dispatches `creditWalletChanged` CustomEvent on `document` for every mutation.

```js
document.dispatchEvent(new CustomEvent('creditWalletChanged', {
  detail: {
    remaining: number,
    totalPurchased: number,
    lastAction: 'purchase' | 'spend' | 'recover' | 'clear'
  }
}));
```

**localStorage keys:**
- `companywise_wallet` — wallet state (chainId, seed, anchor, remaining, totalPurchased, tier, purchasedAt, spentOn[])
- `companywise_free_checks` — `{ month: "YYYY-MM", count: number }`

**Hash chain mechanics:**
1. On purchase: generate random seed, build chain `[seed, H(seed), H²(seed), ..., Hⁿ(seed)]`
2. Anchor = `Hⁿ(seed)` (top of chain)
3. On spend: present `H^(remaining-1)(seed)`, verify `H(presented) === anchor`, set new anchor = presented
4. Chain uses FNV-1a based `simpleHash()` (demo-grade, not cryptographically secure)

**Wallet merge on re-purchase:**
When `purchaseCredits()` is called with an existing wallet, the new wallet:
- Adds `creditCount` to existing `remaining` (carry-over)
- Accumulates `totalPurchased`
- Preserves `spentOn[]` history
- Generates a **new** seed and chain for the merged total (old seed/chain is discarded)

### 2.2 Purchase Dialog — `window.CompanyWisePurchase`

**File:** `frontend/src/js/components/purchase-dialog/purchase-dialog.js`
**CSS prefix:** `pd-`

3-step checkout modal. Self-initializes on DOMContentLoaded (creates `#pd-root` container in `<body>`).

| Method | Signature | Notes |
|---|---|---|
| `open` | `(options?: { tier?, returnTo? })` | `tier`: `'starter'\|'standard'\|'pro'`. `returnTo`: company object — shows "Go to Report" button on delivery step. |
| `close` | `()` | |
| `isOpen` | `()` | Returns boolean |

**Tiers:**

| Key | Name | Credits | Price | Per Check |
|---|---|---|---|---|
| `starter` | Starter | 10 | £5 | £0.50 |
| `standard` | Standard | 25 | £10 | £0.40 |
| `pro` | Pro | 60 | £20 | £0.33 |

**Steps:**
1. **Tier selection** — radio cards, pre-selects if `options.tier` provided (default: standard)
2. **Payment** — demo form (email, name, card, expiry, CVC), calls `Wallet.purchaseCredits()`
3. **Delivery** — shows credits added, recovery passphrase, wallet token with copy button, download wallet file button. If `options.returnTo` is set, shows "Go to Report" button that spends a credit and navigates to `premium-report.html`.

**"Go to Report" navigation:** spends a credit immediately then navigates via `window.location.href = '../Report/Premium/premium-report.html?company=...'` (relative URL from the current page).

### 2.3 Credit Badge — `window.CompanyWiseCreditBadge`

**File:** `frontend/src/js/components/credit-badge/credit-badge.js`
**CSS prefix:** `cb-`

Standalone pill widget. Must be explicitly mounted via `.create(container)`. Not used by the header directly — the header uses its own `[data-credit-count]` spans instead (see §3.4).

| Method | Signature | Notes |
|---|---|---|
| `create` | `(container: HTMLElement)` | Mounts badge, returns instance. Click opens purchase dialog. Adds `cb-badge--empty` class when balance is 0. |
| `updateAll` | `()` | Re-renders all instances (called automatically on `creditWalletChanged`) |
| `destroy` | `(instance)` | Removes instance from array and removes badge DOM element |

Auto-initializes `creditWalletChanged` listener synchronously (not in DOMContentLoaded).

### 2.4 Upgrade Prompt — `window.CompanyWiseUpgrade`

**File:** `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js`
**CSS prefix:** `up-`

| Method | Signature | Notes |
|---|---|---|
| `showMiniDialog` | `(company)` | Card below hero verdict card. Auto-removes previous dialog. "Buy Credits" opens purchase dialog with `returnTo: company`. "Learn More" scrolls to pricing section. |
| `hideMiniDialog` | `()` | Removes with 300ms fade-out |

Auto-listens to `creditWalletChanged`: if mini-dialog is visible and user now has credits, auto-dismisses it.

### 2.5 Account Modal — `window.CompanyWiseAccount`

**File:** `frontend/src/js/components/account-modal/account-modal.js`
**CSS prefix:** `am-`

Full account info modal. Lazily creates overlay on first `open()` call.

| Method | Signature | Notes |
|---|---|---|
| `open` | `()` | Creates overlay if needed, renders content, shows modal |
| `close` | `()` | Hides overlay |

**Content rendered:**
- **Balance card** — large credit count display
- **Wallet info** (if wallet exists):
  - Tier, purchase date, total purchased
  - Recovery token (truncated, with Copy button) — uses `Wallet._helpers.encodeSeed()` to generate
  - Unlocked reports list (company number + date)
  - "Buy More Credits" button → opens purchase dialog
  - "Export" button → downloads wallet JSON via `Wallet.exportWallet()`
- **No wallet state:**
  - "You haven't purchased any credits yet."
  - "Buy Credits" button → opens purchase dialog

**Live refresh:** Listens to `creditWalletChanged` — re-renders content if modal is currently open.

**Opened from:** Header account buttons (`#header-account-btn`, `#drawer-account-btn`) in header.js.

---

## 3. Integration Points

### 3.1 Hero — Premium Button Flow (`hero.js`)

The verdict card renders two buttons: "View Free Report" and "Get Premium Report".

**Premium button logic (3-way check):**

```
Has access (Wallet.hasAccess)?
  → Navigate to premium-report.html

Has credits (Wallet.getBalance > 0)?
  → spendCredit(company.number)
    → success: navigate to premium-report.html
    → failure: show mini-dialog (fallback)

No wallet / no credits?
  → CompanyWiseUpgrade.showMiniDialog(company)
```

### 3.2 Premium Report — Access Gate (`premium-report.js`)

On `init()`, reads `?company=` from URL params, resolves company data from mock data.

**3-way access gate:**

```
Has access (Wallet.hasAccess)?
  → render() + initScrollReveal()

Has credits (Wallet.getBalance > 0)?
  → spendCredit(companyNumber)
    → success: render() + initScrollReveal()
    → failure: renderAccessDenied()

No access, no credits?
  → renderAccessDenied()
```

`renderAccessDenied()` shows a lock icon, explanation text, "Buy Credits" button (opens purchase dialog), and "Back to search" link.

**Global API:** `window.CompanyWisePremiumReport`
- `init()` — auto-called on DOMContentLoaded
- `loadCompany(company)` — programmatic load (skips access gate)

### 3.3 Modal — Premium-Gated Sections (`modal.js`)

The free report modal gates 3 sections behind premium access:
- Financial Snapshot
- Directors
- CCJs & Charges

**Gating pattern:** `renderPremiumGated(company, sectionType)` checks `hasPremiumAccess()` (which calls `Wallet.hasAccess(company.number)`). If unlocked, renders full content. If locked, renders placeholder content with `.report-locked-blur` and a `.report-locked-overlay` with "Unlock with Premium" button that opens the purchase dialog.

**Footer upgrade CTA:** `renderFooterUpgrade(company)` shows either "Premium unlocked" with remaining credit count, or a "Get Premium Access" button.

**Live refresh:** A `creditWalletChanged` listener registered in `init()` re-renders the modal body + rebinds events if the modal is currently open. This means after an in-modal purchase, locked sections unlock immediately.

### 3.4 Header — Account Buttons + Credit Count (`header.js`)

The header renders account buttons on both desktop and mobile with `[data-credit-count]` spans:

- **Desktop:** `#header-account-btn` — pill button in nav bar showing `N credits`, click opens account modal
- **Mobile drawer:** `#drawer-account-btn` — same pill button in drawer, click closes drawer then opens account modal

**Credit count update mechanism:**

`updateCreditCounts()` is defined inside header.js's `DOMContentLoaded` handler. It:
1. Reads `window.CompanyWiseWallet.getBalance()`
2. Updates all `[data-credit-count]` elements via `document.querySelectorAll`
3. Called once on page load
4. Called again on every `creditWalletChanged` event

**Double-init guard (main.js):** `main.js` also has a `DOMContentLoaded` handler that calls `initHeader()`. To prevent it from re-rendering the header (which would reset `[data-credit-count]` spans back to "0 credits"), `main.js` checks `!headerContainer.hasChildNodes()` before calling `initHeader()`. The same guard exists in header.js's own auto-init block.

### 3.5 Pricing — Buy Credits CTAs (`pricing.js`)

Paid tier cards (starter, standard, pro) have `.prc-cta` links wired to `CompanyWisePurchase.open({ tier })`. Free tier CTA scrolls to hero search.

---

## 4. Event Flow

```
User purchases credits (via purchase dialog)
  → CompanyWiseWallet.purchaseCredits()
    → localStorage updated (merged with existing wallet)
    → "creditWalletChanged" { remaining, totalPurchased, lastAction: "purchase" }
      → Header updateCreditCounts() — all [data-credit-count] spans updated
      → CreditBadge.updateAll() — all standalone badge instances re-render
      → UpgradePrompt — auto-dismisses mini-dialog if visible
      → Modal — re-renders body if open (locked sections unlock)
      → AccountModal — re-renders content if open

User spends a credit (via hero button or premium-report init)
  → CompanyWiseWallet.spendCredit(companyNumber)
    → hash chain verified, anchor updated, company added to spentOn[]
    → "creditWalletChanged" { lastAction: "spend" }
      → Header updateCreditCounts()
      → CreditBadge.updateAll()
      → AccountModal — re-renders if open

User recovers wallet (via account modal or dev console)
  → CompanyWiseWallet.recoverFromToken(token)
    → chain rebuilt from decoded seed
    → "creditWalletChanged" { lastAction: "recover" }
      → all listeners fire

User clears wallet (dev console)
  → CompanyWiseWallet.clearWallet()
    → localStorage cleared
    → "creditWalletChanged" { remaining: 0, lastAction: "clear" }
      → Header updateCreditCounts() — shows "0 credits"
      → CreditBadge.updateAll() — adds cb-badge--empty class
```

---

## 5. Security

### 5.1 XSS Protection

All user-data interpolated into `innerHTML` template literals is escaped via a local `escapeHtml()` function in each IIFE:

```js
function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
```

**Escaped fields by file:**

| File | Fields escaped |
|---|---|
| `hero.js` | `company.name`, `company.number`, `company.type`, `company.sicCode` |
| `modal.js` | `company.name`, `company.number`, `company.type`, `company.sicCode`, `company.address`, `director.name`, `director.role` |
| `upgrade-prompt.js` | `companyName` |
| `premium-report.js` | `c.name`, `c.number`, `c.type`, `c.address`, `dir.name`, `dir.role` |
| `account-modal.js` | `tier`, `purchasedAt`, `token` (truncated), `entry.companyNumber` |

### 5.2 Null Guards

`company.flags` is guarded with `(company.flags || [])` in both `hero.js` and `modal.js` to prevent crashes when flags are undefined.

---

## 6. Script Load Order

### home.html

```
mock-data.js → header.js → footer.js → hero.js → [page components] → modal.js
→ credit-wallet.js → purchase-dialog.js → credit-badge.js → upgrade-prompt.js
→ account-modal.js → main.js
```

**header.js vs main.js init order:** Both register `DOMContentLoaded` handlers that can call `initHeader()`. header.js registers first (loads at line 152), main.js registers last (loads at line 172). Both handlers fire in registration order when DOMContentLoaded triggers. header.js's handler runs first, renders the header, and calls `updateCreditCounts()`. main.js's handler checks `!headerContainer.hasChildNodes()` and skips re-init since the header already exists.

### premium-report.html

```
mock-data.js → header.js → footer.js
→ credit-wallet.js → purchase-dialog.js → credit-badge.js → upgrade-prompt.js
→ account-modal.js → premium-report.js
```

**Key constraint:** `credit-wallet.js` registers `window.CompanyWiseWallet` synchronously (not in DOMContentLoaded), so it's available to all subsequent scripts during parse. Similarly, `credit-badge.js` registers its `creditWalletChanged` listener synchronously.

---

## 7. CSS Architecture

| Component | Prefix | File |
|---|---|---|
| Purchase Dialog | `pd-` | `purchase-dialog/styles/purchase-dialog.css` |
| Credit Badge | `cb-` | `credit-badge/styles/credit-badge.css` |
| Upgrade Prompt | `up-` | `upgrade-prompt/styles/upgrade-prompt.css` |
| Account Modal | `am-` | `account-modal/styles/account-modal.css` |
| Modal (gating) | `report-locked-*`, `report-premium-*`, `report-unlock-*` | `modal/styles/modal.css` |
| Premium Report | `pr-` | `premium-report/styles/premium-report.css` |

Design tokens from `frontend/src/styles/main.css` (`:root` vars: `--blue-500`, `--text-900`, `--risk-low`, `--font`, etc.).

---

## 8. Conventions

- **Pure vanilla JS** — self-initializing IIFEs, `window.CompanyWise*` globals
- **No build step** — scripts loaded directly via `<script>` tags
- **No external dependencies** — all code is self-contained
- **Modal pattern** — overlay with `.active` class toggle (purchase dialog, account modal) or custom class (`am-active`), backdrop click-to-close, ESC key, `document.body.classList.add('modal-open')` for scroll lock
- **Lazy overlay creation** — account-modal.js creates its overlay DOM on first `open()`, not on init
- **Icons** — Phosphor Icons (`ph ph-star`, `ph-fill ph-shield-check`, etc.)
- **Font** — Jost (Google Fonts CDN), referenced as `var(--font)`

---

## 9. File Reference

| File | Path | Role |
|---|---|---|
| Credit Wallet | `frontend/src/js/components/credit-wallet/credit-wallet.js` | Hash-chain credit service |
| Purchase Dialog JS | `frontend/src/js/components/purchase-dialog/purchase-dialog.js` | 3-step checkout modal |
| Purchase Dialog CSS | `frontend/src/js/components/purchase-dialog/styles/purchase-dialog.css` | |
| Credit Badge JS | `frontend/src/js/components/credit-badge/credit-badge.js` | Standalone credit pill widget |
| Credit Badge CSS | `frontend/src/js/components/credit-badge/styles/credit-badge.css` | |
| Upgrade Prompt JS | `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js` | Mini-dialog for hero gating |
| Upgrade Prompt CSS | `frontend/src/js/components/upgrade-prompt/styles/upgrade-prompt.css` | |
| Account Modal JS | `frontend/src/js/components/account-modal/account-modal.js` | Account info / wallet management modal |
| Account Modal CSS | `frontend/src/js/components/account-modal/styles/account-modal.css` | |
| Hero | `frontend/src/js/components/hero/hero.js` | Search + verdict + premium button |
| Modal JS | `frontend/src/js/components/modal/modal.js` | Free report with gated sections |
| Modal CSS | `frontend/src/js/components/modal/styles/modal.css` | Includes `report-locked-*` classes |
| Premium Report JS | `frontend/src/js/components/premium-report/premium-report.js` | Full premium report page |
| Premium Report CSS | `frontend/src/js/components/premium-report/styles/premium-report.css` | |
| Pricing | `frontend/src/js/components/pricing/pricing.js` | Pricing section CTAs |
| Header | `frontend/src/js/components/header/header.js` | Nav + account buttons + credit count |
| Main | `frontend/src/js/main.js` | Page init (FAQ, scroll reveal, counters) |
| Home HTML | `frontend/src/pages/Home/home.html` | Script/link tags for home page |
| Premium Report HTML | `frontend/src/pages/Report/Premium/premium-report.html` | Script/link tags for report page |

---

## 10. Known Limitations & Future Work

1. **Client-side only** — wallet state in localStorage. Server integration needed for production (store chainId + anchor server-side, verify spends via API).
2. **Demo payment** — no real payment processing. Form data is not submitted anywhere.
3. **Hash function** — `simpleHash()` is FNV-1a based, not cryptographically secure. Production should use SHA-256 via SubtleCrypto.
4. **Recovery loses spend history** — `recoverFromToken()` resets `spentOn[]` to empty. Previously unlocked companies will need to be re-spent after recovery. The token encodes seed + credit count but not spend history.
5. **Orphaned CSS** — `up-inline-*` classes remain in `upgrade-prompt.css` from a removed `renderInline()` feature and can be cleaned up.
6. **Free checks** — `useFreeCheck()` is implemented but not wired into the hero/modal flow. Currently the free report is always accessible.
7. **Credit badge unused by header** — `credit-badge.js` is loaded on both pages but the header uses its own `[data-credit-count]` spans + `updateCreditCounts()` instead of mounting badge instances. The badge component is available for other mount points but currently has no consumers.
8. **PDF export** — the premium report footer has a "Download PDF" button that is disabled with "Coming soon".
