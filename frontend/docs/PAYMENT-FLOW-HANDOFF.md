# Payment Flow — Implementation Status & Improvement Plan

> All 4 phases are complete. This document describes what was built, where everything lives, the API surface, and a prioritised list of issues found during audit that need fixing.

---

## Architecture Overview

```
credit-wallet.js          (Phase 1)  Pure data/service — hash-chain credits, localStorage
purchase-dialog.js + CSS  (Phase 2)  3-step checkout modal (tier → payment → delivery)
credit-badge.js    + CSS  (Phase 3)  Pill widget in header showing credit balance
upgrade-prompt.js  + CSS  (Phase 3)  Inline overlay + mini-dialog for premium gating
hero.js                   (Phase 4)  Two verdict buttons: Free Report / Premium Report
modal.js           + CSS  (Phase 4)  Premium sections blurred/locked behind wallet access
pricing.js                (Phase 4)  Buy Credits CTAs wired to purchase dialog
header.js                 (Phase 4)  "Get started" → purchase dialog, credit badge mount
premium-report.js         (Phase 4)  Access gate on init (has access / has credits / denied)
home.html                 (Phase 4)  Script + link tags for all 4 components
premium-report.html       (Phase 4)  Script + link tags for all 4 components
```

---

## Component APIs

### 1. Credit Wallet — `frontend/src/js/components/credit-wallet/credit-wallet.js`

Hash-chain credit service (no DOM, pure logic). Registered synchronously on `window.CompanyWiseWallet`:

| Method | Signature | Returns |
|---|---|---|
| `purchaseCredits` | `(count: number, tier: string)` | `{ token, passphrase, chainId }` |
| `spendCredit` | `(companyNumber: string)` | `boolean` — false if chain verification fails or no credits |
| `hasAccess` | `(companyNumber: string)` | `boolean` — true if company already unlocked |
| `getBalance` | `()` | `number` — remaining credits (0 if no wallet) |
| `hasWallet` | `()` | `boolean` |
| `recoverFromToken` | `(token: string)` | `boolean` |
| `exportWallet` | `()` | `Blob \| null` |
| `clearWallet` | `()` | `void` — also clears free checks |
| `getFreeChecksRemaining` | `()` | `number` (0–3) |
| `useFreeCheck` | `()` | `boolean` |

Dispatches `creditWalletChanged` CustomEvent on `document` for every mutation (purchase, spend, recover, clear). Event detail: `{ remaining, totalPurchased, lastAction }`.

### 2. Purchase Dialog — `frontend/src/js/components/purchase-dialog/purchase-dialog.js`

3-step checkout modal. Exposes `window.CompanyWisePurchase`:

| Method | Signature | Notes |
|---|---|---|
| `open` | `(options?: { tier?, returnTo? })` | `tier`: `'starter'\|'standard'\|'pro'`. `returnTo` accepted but **not yet implemented** |
| `close` | `()` | |
| `isOpen` | `()` | returns boolean |

### 3. Credit Badge — `frontend/src/js/components/credit-badge/credit-badge.js`

Pill widget. Exposes `window.CompanyWiseCreditBadge`:

| Method | Signature | Notes |
|---|---|---|
| `create` | `(container: HTMLElement)` | Mounts badge, returns instance. Auto-hides when no wallet. Click opens purchase dialog. |
| `updateAll` | `()` | Re-renders all instances (called automatically on `creditWalletChanged`) |

### 4. Upgrade Prompt — `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js`

Two UI modes. Exposes `window.CompanyWiseUpgrade`:

| Method | Signature | Notes |
|---|---|---|
| `renderInline` | `(container, { title, hasCredits, onUnlock })` | Blur overlay + lock icon + CTA. **Currently unused** — see issue #5 below |
| `removeInline` | `(container)` | Removes overlay and un-blurs content |
| `showMiniDialog` | `(company)` | Card below hero verdict card. Auto-removes previous dialog. |
| `hideMiniDialog` | `()` | Removes with 300ms fade-out |

---

## File Map — What Changed in Each Phase

### Phase 3 — New files (no modifications to existing)

| File | CSS Prefix |
|---|---|
| `frontend/src/js/components/credit-badge/credit-badge.js` | `cb-` |
| `frontend/src/js/components/credit-badge/styles/credit-badge.css` | `cb-` |
| `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js` | `up-` |
| `frontend/src/js/components/upgrade-prompt/styles/upgrade-prompt.css` | `up-` |

### Phase 4 — Modifications to existing files

| File | What changed |
|---|---|
| `frontend/src/js/components/hero/hero.js` | `renderVerdict()` — replaced single button with "View Free Report" + "Get Premium Report". Added 3-way wallet check for premium button (lines 699–752). |
| `frontend/src/js/components/modal/modal.js` | Added `hasPremiumAccess()`, `renderPremiumGated()`, `renderFooterUpgrade()`. Financial/Directors/CCJs sections gated. Footer shows upgrade CTA or "Premium unlocked" status (lines 182–654). |
| `frontend/src/js/components/modal/styles/modal.css` | Added `.report-locked-section`, `.report-locked-blur`, `.report-locked-overlay`, `.report-premium-badge`, `.report-unlock-btn`, `.report-unlock-btn--footer` (lines 655–738). |
| `frontend/src/js/components/pricing/pricing.js` | `queryElements()` — wired paid tier CTAs to `CompanyWisePurchase.open({ tier })` with `e.preventDefault()` (lines 270–283). |
| `frontend/src/js/components/header/header.js` | `handleNavigation()` — "Get started" label intercepted to open purchase dialog (lines 629–633). DOMContentLoaded mounts credit badge in `#header-credit-badge` (lines 837–839). Desktop nav HTML includes badge container (line 159). |
| `frontend/src/js/components/premium-report/premium-report.js` | `init()` — 3-way access gate: hasAccess → render, hasCredits → spendCredit + render, else → renderAccessDenied with buy button (lines 35–54, 57–88). |
| `frontend/src/pages/Home/home.html` | Added CSS links for purchase-dialog, credit-badge, upgrade-prompt (lines 36–38). Added script tags in correct order after modal.js (lines 165–168). |
| `frontend/src/pages/Report/Premium/premium-report.html` | Added CSS links (lines 30–32). Added script tags before premium-report.js (lines 71–74). |

---

## Script Load Order

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

All scripts are synchronous `<script>` tags, so `DOMContentLoaded` fires after all are parsed. Component auto-init functions safely find each other's globals.

---

## Event Flow

```
User purchases credits
  → CompanyWiseWallet.purchaseCredits()
    → localStorage updated
    → document dispatches "creditWalletChanged" { remaining, totalPurchased, lastAction: "purchase" }
      → CreditBadge.updateAll() — re-renders all badge instances
      (nothing else listens currently)

User spends a credit
  → CompanyWiseWallet.spendCredit(companyNumber)
    → hash chain verified, anchor updated, company added to spentOn[]
    → "creditWalletChanged" { lastAction: "spend" }
      → CreditBadge.updateAll()

User clears wallet
  → CompanyWiseWallet.clearWallet()
    → localStorage cleared
    → "creditWalletChanged" { remaining: 0, lastAction: "clear" }
      → CreditBadge.updateAll() — all badges hide
```

---

## Verification Checklist (manual QA)

1. `home.html` → search → verdict card shows two buttons (Free / Premium) ✅
2. "Get Premium Report" with no wallet → hero mini-dialog appears ✅
3. "Buy Credits" → purchase dialog → complete purchase → credit badge appears in header ✅
4. "Get Premium Report" again → credit spent → premium report page loads ✅
5. "View Free Report" → modal with blurred financial section + upgrade CTA in footer ✅
6. Pricing "Buy credits" → purchase dialog with tier pre-selected ✅
7. Header "Get started" → purchase dialog ✅
8. Console: `CompanyWiseWallet.clearWallet()` → badge hides, locked sections stay locked ✅

---

## Audit Results — Issues to Fix

An automated audit was performed across all 9 quality dimensions (spec compliance, API correctness, event flow, edge cases, CSS, load order, regressions, security, memory). **All 9 checks passed**, but 5 issues were found:

### Issue 1 — `spendCredit()` return value not checked (Medium)

**Files:** `hero.js:737`, `premium-report.js:47`

Both call `Wallet.spendCredit(companyNumber)` and immediately proceed (navigate / render) without checking the boolean return value. If the hash chain verification fails (`spendCredit` returns `false`), the user is still sent to the premium report or shown premium content.

**What to fix:**
- In `hero.js:737` — check return value. If `false`, show an error toast or fall through to the mini-dialog instead of navigating.
- In `premium-report.js:47` — check return value. If `false`, call `renderAccessDenied()` instead of `render()`.

**Example (hero.js):**
```js
// Current (broken):
Wallet.spendCredit(co.number);
window.location.href = '...';

// Fixed:
if (Wallet.spendCredit(co.number)) {
  window.location.href = '...';
} else {
  // Spend failed — treat as no credits
  if (window.CompanyWiseUpgrade) {
    window.CompanyWiseUpgrade.showMiniDialog(co);
  }
}
```

### Issue 2 — XSS risk in template literals (Medium for production)

**Files:** `hero.js:658`, `modal.js:86,535`, `upgrade-prompt.js:107`, `premium-report.js:150,172`

Company names, director names, and addresses are injected directly into `innerHTML` via `${...}` template literals with no HTML escaping. Safe with current mock data, but when connected to the real Companies House API, a company name containing `<script>` or `<img onerror=...>` would execute arbitrary JS.

**What to fix:**
Create a shared `escapeHtml()` utility and apply it to every user-data interpolation in template literals that feed `innerHTML`. Candidate locations:

| File | Line(s) | Data interpolated |
|---|---|---|
| `hero.js` | 658, 659, 681 | `company.name`, `company.number`, `company.sicCode` |
| `modal.js` | 86, 87, 127, 133, 535, 536 | `company.name`, `company.number`, `company.address`, `director.name` |
| `upgrade-prompt.js` | 107 | `companyName` |
| `premium-report.js` | 150, 172, 173, 301, 579 | `c.name`, `c.number`, `c.address`, `dir.name` |

**Suggested utility** (add to a shared `utils.js` or inline in each IIFE):
```js
function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
```

### Issue 3 — Mini-dialog not dismissed after credit purchase (Low)

**File:** `upgrade-prompt.js`

When the user clicks "Buy Credits" on the hero mini-dialog, the purchase dialog opens. After completing the purchase, the mini-dialog remains visible still showing "Buy Credits" even though the user now has credits. There is no `creditWalletChanged` listener on the mini-dialog.

**What to fix:**
Add a `creditWalletChanged` listener in `upgrade-prompt.js` that:
- Checks if a mini-dialog is currently visible (`this.miniDialogEl !== null`)
- If the user now has credits (`Wallet.getBalance() > 0`), either auto-dismiss the mini-dialog or update its CTA to "Use Credit" / "View Premium Report"

### Issue 4 — Modal locked sections don't refresh after in-modal purchase (Low)

**File:** `modal.js`

If the user clicks "Unlock with Premium" or the footer "Get Premium Access" button while the modal is open, the purchase dialog opens on top. After completing the purchase, the modal sections remain blurred because `render()` is not called again.

**What to fix:**
Add a `creditWalletChanged` listener inside `modal.js` that re-renders the modal body if `this.isOpen && this.currentCompany`:
```js
document.addEventListener('creditWalletChanged', () => {
  if (this.isOpen && this.currentCompany) {
    this.render(this.currentCompany);
    this.bindModalEvents();
  }
});
```
This should be registered once in `init()`, not on every `open()`.

### Issue 5 — `CompanyWiseUpgrade.renderInline()` is dead code (Low)

**Files:** `upgrade-prompt.js:18-73`, `modal.js:474-630`

The spec intended `renderInline()` to be used for gating premium sections inside `modal.js`. Instead, `modal.js` implements its own gating pattern with `renderPremiumGated()` and dedicated CSS classes (`report-locked-blur`, `report-locked-overlay`, `report-premium-badge`, `report-unlock-btn`). This means:

- `upgrade-prompt.js` renderInline mode is fully implemented but never called by any consumer
- `modal.js` has a parallel implementation that duplicates the blur + overlay + button pattern

**Options (pick one):**
1. **Refactor modal.js to use `renderInline()`** — remove `renderPremiumGated()` and the `report-locked-*` CSS, call `CompanyWiseUpgrade.renderInline()` on each locked section container after render. This consolidates the gating UI into one component.
2. **Remove `renderInline()` from upgrade-prompt** — accept the modal has its own pattern and remove the dead inline mode code. Keep only `showMiniDialog` / `hideMiniDialog`.
3. **Keep both, document as intentional** — if inline mode is planned for future use elsewhere (e.g., a dashboard page), leave it but add a comment noting it's not yet wired.

---

## Recommendations (non-blocking, lower priority)

### R1 — Wire `returnTo` option in purchase dialog

`purchase-dialog.js` accepts `returnTo` in options but never uses it. After purchasing credits triggered from the hero "Get Premium Report" flow, the user has to manually click "Get Premium Report" again.

**Suggested behavior:** On step 3 (delivery), if `this.options.returnTo` is set, show an additional "Go to Report" button that calls `Wallet.spendCredit(returnTo.number)` and navigates to the premium report page.

This requires the hero mini-dialog's "Buy Credits" button to pass `returnTo`:
```js
CompanyWisePurchase.open({ returnTo: company });
```

### R2 — Prune `CreditBadge.instances` array

`credit-badge.js` line 14 — the `instances` array accumulates but never removes entries. If `create()` were called multiple times (e.g., SPA-style navigation), the array would grow and `updateAll()` would iterate stale references. Add a `destroy(instance)` method or use a WeakSet.

### R3 — Add null guard for `company.flags`

Pre-existing issue in `modal.js:147` and `hero.js:685` — `company.flags.map(...)` will throw if `flags` is undefined/null. Not introduced by this session but worth fixing for robustness:
```js
${(company.flags || []).map(flag => ...}
```

### R4 — Mobile drawer "Get started" still shows `/signup` href

In `header.js:263`, the mobile drawer's "Get started" link has `href="/signup"`. The click is intercepted by `handleNavigation()` which checks the label, so it works. But if JS fails to load, the link goes to a dead `/signup` page. Consider changing to `href="#"` for consistency with the desktop nav version (line 161).

---

## Codebase Conventions

- **Pure vanilla JS** — self-initializing IIFEs, `window.CompanyWise*` globals
- **No build step** — scripts loaded directly via `<script>` tags in HTML
- **Styling**: Tailwind CDN + component-scoped CSS with prefixes (`pr-`, `hero-`, `prc-`, `pd-`, `cb-`, `up-`, `report-`)
- **Design tokens** in `frontend/src/styles/main.css` (`:root` vars: `--blue-500`, `--text-900`, `--risk-low`, `--font`, etc.)
- **Icons**: Phosphor Icons (`ph ph-star`, `ph-fill ph-shield-check`, etc.)
- **Font**: Jost (via Google Fonts CDN), referenced as `var(--font)` in component CSS
- **Modal pattern**: overlay with `.active` class toggle, backdrop click-to-close, ESC key, `document.body.classList.add('modal-open')` for scroll lock

## Key Files to Read

1. `frontend/src/js/components/credit-wallet/credit-wallet.js` — wallet API (source of truth for all credit operations)
2. `frontend/src/js/components/purchase-dialog/purchase-dialog.js` — purchase flow
3. `frontend/src/js/components/modal/modal.js` — free report modal with premium gating
4. `frontend/src/js/components/hero/hero.js` — hero search + verdict card with two buttons
5. `frontend/src/js/components/premium-report/premium-report.js` — full-page premium report with access gate
6. `frontend/src/js/components/credit-badge/credit-badge.js` — header credit pill
7. `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js` — mini-dialog + (unused) inline overlay
8. `frontend/src/styles/main.css` — design tokens
