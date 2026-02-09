# Changeset 3 — Informational UI + Accessibility

> **Scope:** 2 files · Both modal states
> **Depends on:** Changeset 2 (passphrase & token UX) should be landed first so line numbers are stable

---

## Problem

1. **Free checks are invisible.** `getFreeChecksRemaining()` exists but the UI never shows the count — users don't know they have a monthly free allowance.
2. **No recovery warnings.** When a wallet has `tier: 'recovered'`, users aren't told that previously unlocked reports are lost.
3. **No low balance signal.** Users can run out of credits mid-session with no advance notice.
4. **No ARIA attributes.** The dialog has no `role`, `aria-modal`, or label — screen readers can't identify it as a modal.

## Prompt

Paste the following into a fresh Claude Code session:

---

Read these files fully before making changes:
- `frontend/src/js/components/Handlers/account-modal/account-modal.js`
- `frontend/src/js/components/Handlers/account-modal/styles/account-modal.css`
- `frontend/src/js/components/Handlers/credit-wallet/credit-wallet.js` (read-only — for the `getFreeChecksRemaining()` API)

Then implement these four additions:

### A. Free Checks Counter (both states)

Below the balance card (after line 153 in the final `dialog.innerHTML`), add a free checks row that renders in **both** authed and non-authed states:
- Text: "X of 3 free checks remaining this month" with a Phosphor gift icon (`ph-gift`)
- Use `Wallet.getFreeChecksRemaining()` for the count
- New CSS class `.am-free-checks` — subtle, secondary text styling
- Only render if `Wallet` is available

### B. Recovered Wallet Warning (authed state only)

In the authed state, after the wallet info section and before the Recovery Token/Passphrase sections:
- When `wallet.tier === 'recovered'`, show a warning notice:
  "This wallet was recovered — previously unlocked reports may need to be re-purchased."
- New CSS class `.am-warning` — use `--warning-bg` and `--warning` design tokens if available, otherwise use a muted amber/yellow style with `color-mix`
- Include a Phosphor warning icon (`ph-warning`)

### C. Low Balance Nudge (authed state only)

After the balance card, when `balance <= 2 && balance > 0`:
- Show: "Running low on credits — top up to keep unlocking reports."
- New CSS class `.am-low-balance` — same secondary/muted treatment as `.am-free-checks`
- Include a Phosphor info icon (`ph-info`)

### D. Accessibility Attributes

In `ensureOverlay()` and `renderContent()`:
- Add `role="dialog"` and `aria-modal="true"` to the `.am-dialog` element
- Add `id="am-title"` to the `<h2>` title element
- Add `aria-labelledby="am-title"` to the `.am-dialog` element
- In `open()`, after the overlay becomes active, focus the close button

**Conventions to follow:**
- String concatenation for HTML, imperative event binding after innerHTML
- `am-` CSS prefix, design tokens from `frontend/src/styles/tokens.css`
- Free checks counter goes in the shared HTML (after balance card, before the `if (hasWallet)` branch), not duplicated in both branches

**Do not** modify credit-wallet.js. Do not add features beyond the four described above.

---

## Files

| File | Change |
|------|--------|
| `account-modal.js` | Free checks row, recovered warning, low balance nudge in HTML; ARIA attrs; focus management in `open()` |
| `account-modal.css` | `.am-free-checks`, `.am-warning`, `.am-low-balance` |

## New CSS Classes

| Class | Purpose |
|-------|---------|
| `.am-free-checks` | Subtle row showing monthly free check allowance |
| `.am-warning` | Amber/yellow notice for recovered wallets |
| `.am-low-balance` | Subtle nudge when credits are running low |
