# Payment Flow — Technical Specification

> Canonical reference for the CompanyWise credit-based payment system.
> Updated: 2026-02-07 (post-audit fixes applied).

---

## 1. System Overview

CompanyWise uses a **client-side hash-chain credit system**. Users buy credit packs, spend credits to unlock premium reports, and can recover wallets via token or passphrase. There is no server-side component yet — all state lives in `localStorage`.

### Components (load order)

```
credit-wallet.js    → Pure data/service layer (no DOM)
purchase-dialog.js  → 3-step checkout modal
credit-badge.js     → Header pill showing balance
upgrade-prompt.js   → Hero mini-dialog for premium gating
hero.js             → Search + verdict card with Free/Premium buttons
modal.js            → Free report modal with premium-gated sections
pricing.js          → Pricing section CTAs
header.js           → Nav "Get started" button + badge mount
premium-report.js   → Full-page premium report with access gate
```

All scripts are synchronous `<script>` tags. `DOMContentLoaded` fires after all are parsed.

---

## 2. Component APIs

### 2.1 Credit Wallet — `window.CompanyWiseWallet`

**File:** `frontend/src/js/components/credit-wallet/credit-wallet.js`

Hash-chain credit service. Registered synchronously (available before DOMContentLoaded).

| Method | Signature | Returns | Notes |
|---|---|---|---|
| `purchaseCredits` | `(count: number, tier: string)` | `{ token, passphrase, chainId }` | Generates hash chain, stores in localStorage |
| `spendCredit` | `(companyNumber: string)` | `boolean` | `false` if chain verification fails or no credits. Returns `true` if already unlocked (no double-spend). |
| `hasAccess` | `(companyNumber: string)` | `boolean` | `true` if company already in `spentOn[]` |
| `getBalance` | `()` | `number` | 0 if no wallet |
| `hasWallet` | `()` | `boolean` | |
| `recoverFromToken` | `(token: string)` | `boolean` | Rebuilds chain from base64 token |
| `exportWallet` | `()` | `Blob \| null` | JSON blob for download |
| `clearWallet` | `()` | `void` | Clears wallet + free checks from localStorage |
| `getFreeChecksRemaining` | `()` | `number` | 0–3, resets monthly |
| `useFreeCheck` | `()` | `boolean` | `false` if none remaining |
| `getHistory` | `()` | `Array<{ companyNumber, spentAt }>` | |

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

### 2.2 Purchase Dialog — `window.CompanyWisePurchase`

**File:** `frontend/src/js/components/purchase-dialog/purchase-dialog.js`
**CSS prefix:** `pd-`

3-step checkout modal.

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
3. **Delivery** — shows credits added, recovery passphrase, wallet token with copy button, download wallet file button. If `options.returnTo` is set, shows "Go to Report" button that spends a credit and navigates.

### 2.3 Credit Badge — `window.CompanyWiseCreditBadge`

**File:** `frontend/src/js/components/credit-badge/credit-badge.js`
**CSS prefix:** `cb-`

| Method | Signature | Notes |
|---|---|---|
| `create` | `(container: HTMLElement)` | Mounts badge, returns instance. Auto-hides when no wallet. Click opens purchase dialog. |
| `updateAll` | `()` | Re-renders all instances (called automatically on `creditWalletChanged`) |
| `destroy` | `(instance)` | Removes instance from array and removes badge DOM element |

Auto-listens to `creditWalletChanged` to keep all badge instances in sync.

### 2.4 Upgrade Prompt — `window.CompanyWiseUpgrade`

**File:** `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js`
**CSS prefix:** `up-`

| Method | Signature | Notes |
|---|---|---|
| `showMiniDialog` | `(company)` | Card below hero verdict card. Auto-removes previous dialog. "Buy Credits" opens purchase dialog with `returnTo: company`. |
| `hideMiniDialog` | `()` | Removes with 300ms fade-out |

Auto-listens to `creditWalletChanged`: if mini-dialog is visible and user now has credits, auto-dismisses it.

> **Note:** `renderInline()` and `removeInline()` were removed (dead code — modal uses its own gating pattern). The `up-inline-*` CSS classes in `upgrade-prompt.css` are now orphaned and can be cleaned up.

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

### 3.3 Modal — Premium-Gated Sections (`modal.js`)

The free report modal gates 3 sections behind premium access:
- Financial Snapshot
- Directors
- CCJs & Charges

**Gating pattern:** `renderPremiumGated(company, sectionType)` checks `hasPremiumAccess()`. If unlocked, renders full content. If locked, renders placeholder content with `.report-locked-blur` and a `.report-locked-overlay` with "Unlock with Premium" button that opens the purchase dialog.

**Live refresh:** A `creditWalletChanged` listener registered in `init()` re-renders the modal body + rebinds events if the modal is currently open. This means after an in-modal purchase, locked sections unlock immediately.

### 3.4 Header — Get Started + Badge (`header.js`)

- Desktop nav "Get started" button (`href="#"`) — intercepted by `handleNavigation()`, opens purchase dialog
- Mobile drawer "Get started" button (`href="#"`) — same interception
- Credit badge mounted in `#header-credit-badge` container on DOMContentLoaded

### 3.5 Pricing — Buy Credits CTAs (`pricing.js`)

Paid tier cards (starter, standard, pro) have `.prc-cta` links wired to `CompanyWisePurchase.open({ tier })`. Free tier CTA scrolls to hero search.

---

## 4. Event Flow

```
User purchases credits (via purchase dialog)
  → CompanyWiseWallet.purchaseCredits()
    → localStorage updated
    → "creditWalletChanged" { remaining, totalPurchased, lastAction: "purchase" }
      → CreditBadge.updateAll() — all badges re-render
      → UpgradePrompt — auto-dismisses mini-dialog if visible
      → Modal — re-renders body if open (locked sections unlock)

User spends a credit (via hero button or premium-report init)
  → CompanyWiseWallet.spendCredit(companyNumber)
    → hash chain verified, anchor updated, company added to spentOn[]
    → "creditWalletChanged" { lastAction: "spend" }
      → CreditBadge.updateAll()

User clears wallet (dev console)
  → CompanyWiseWallet.clearWallet()
    → localStorage cleared
    → "creditWalletChanged" { remaining: 0, lastAction: "clear" }
      → CreditBadge.updateAll() — all badges hide
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

### 5.2 Null Guards

`company.flags` is guarded with `(company.flags || [])` in both `hero.js` and `modal.js` to prevent crashes when flags are undefined.

---

## 6. Script Load Order

### home.html

```
mock-data.js → header.js → footer.js → hero.js → [page components] → modal.js
→ credit-wallet.js → purchase-dialog.js → credit-badge.js → upgrade-prompt.js
→ main.js
```

### premium-report.html

```
mock-data.js → header.js → footer.js
→ credit-wallet.js → purchase-dialog.js → credit-badge.js → upgrade-prompt.js
→ premium-report.js
```

**Key constraint:** `credit-wallet.js` registers `window.CompanyWiseWallet` synchronously (not in DOMContentLoaded), so it's available to all subsequent scripts during parse.

---

## 7. CSS Architecture

| Component | Prefix | File |
|---|---|---|
| Purchase Dialog | `pd-` | `purchase-dialog/styles/purchase-dialog.css` |
| Credit Badge | `cb-` | `credit-badge/styles/credit-badge.css` |
| Upgrade Prompt | `up-` | `upgrade-prompt/styles/upgrade-prompt.css` |
| Modal (gating) | `report-locked-*`, `report-premium-*`, `report-unlock-*` | `modal/styles/modal.css` |
| Premium Report | `pr-` | (inline/page-level styles) |

Design tokens from `frontend/src/styles/main.css` (`:root` vars: `--blue-500`, `--text-900`, `--risk-low`, `--font`, etc.).

---

## 8. Conventions

- **Pure vanilla JS** — self-initializing IIFEs, `window.CompanyWise*` globals
- **No build step** — scripts loaded directly via `<script>` tags
- **No external dependencies** — all code is self-contained
- **Modal pattern** — overlay with `.active` class toggle, backdrop click-to-close, ESC key, `document.body.classList.add('modal-open')` for scroll lock
- **Icons** — Phosphor Icons (`ph ph-star`, `ph-fill ph-shield-check`, etc.)
- **Font** — Jost (Google Fonts CDN), referenced as `var(--font)`

---

## 9. File Reference

| File | Path | Role |
|---|---|---|
| Credit Wallet | `frontend/src/js/components/credit-wallet/credit-wallet.js` | Hash-chain credit service |
| Purchase Dialog JS | `frontend/src/js/components/purchase-dialog/purchase-dialog.js` | 3-step checkout modal |
| Purchase Dialog CSS | `frontend/src/js/components/purchase-dialog/styles/purchase-dialog.css` | |
| Credit Badge JS | `frontend/src/js/components/credit-badge/credit-badge.js` | Header credit pill |
| Credit Badge CSS | `frontend/src/js/components/credit-badge/styles/credit-badge.css` | |
| Upgrade Prompt JS | `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js` | Mini-dialog for hero gating |
| Upgrade Prompt CSS | `frontend/src/js/components/upgrade-prompt/styles/upgrade-prompt.css` | |
| Hero | `frontend/src/js/components/hero/hero.js` | Search + verdict + premium button |
| Modal JS | `frontend/src/js/components/modal/modal.js` | Free report with gated sections |
| Modal CSS | `frontend/src/js/components/modal/styles/modal.css` | Includes `report-locked-*` classes |
| Premium Report | `frontend/src/js/components/premium-report/premium-report.js` | Full premium report page |
| Pricing | `frontend/src/js/components/pricing/pricing.js` | Pricing section CTAs |
| Header | `frontend/src/js/components/header/header.js` | Nav + badge mount |
| Home HTML | `frontend/src/pages/Home/home.html` | Script/link tags for home page |
| Premium Report HTML | `frontend/src/pages/Report/Premium/premium-report.html` | Script/link tags for report page |

---

## 10. Known Limitations & Future Work

1. **Client-side only** — wallet state in localStorage. Server integration needed for production (store chainId + anchor server-side, verify spends via API).
2. **Demo payment** — no real payment processing. Form data is not submitted anywhere.
3. **Hash function** — `simpleHash()` is FNV-1a based, not cryptographically secure. Production should use SHA-256 via SubtleCrypto.
4. **No wallet merge** — purchasing again overwrites the existing wallet. Should support accumulating credits across purchases.
5. **Inline gating mode** — `renderInline()` was removed from upgrade-prompt.js. The `up-inline-*` CSS classes remain orphaned in `upgrade-prompt.css` and can be cleaned up.
6. **Free checks** — `useFreeCheck()` is implemented but not wired into the hero/modal flow. Currently the free report is always accessible.
