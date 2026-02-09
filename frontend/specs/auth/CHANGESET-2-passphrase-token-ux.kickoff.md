# Changeset 2 — Passphrase & Token UX

> **Scope:** 2 files · Account modal authed state only
> **Depends on:** Changeset 1 (seed preservation) should be landed first

---

## Problem

The account modal's authed state shows a truncated recovery token with a Copy button, but:
- The **passphrase** (4-word mnemonic) is never shown — it's generated in `purchaseCredits()`, returned to the purchase dialog, then lost
- The **full token** can't be viewed in-place — users must copy and paste elsewhere to see it

The passphrase is deterministic: `hashToWords(simpleHash(seed))`. Since the seed is stored in the wallet, the passphrase can always be derived on the fly — no need to store it.

## Prompt

Paste the following into a fresh Claude Code session:

---

Read these files fully before making changes:
- `frontend/src/js/components/Handlers/account-modal/account-modal.js`
- `frontend/src/js/components/Handlers/account-modal/styles/account-modal.css`
- `frontend/src/js/components/Handlers/credit-wallet/credit-wallet.js` (read-only — for understanding the API, do not edit)

Then implement these two features in the **authed state** (`hasWallet === true` branch) of `renderContent()`:

### A. Show Recovery Passphrase

Above the existing "Recovery Token" section (lines 79-87), add a "Recovery Passphrase" section:
- Derive the passphrase on-the-fly: `Wallet._helpers.hashToWords(Wallet._helpers.simpleHash(wallet.seed))`
- Display the 4-word phrase (e.g. "amber-cliff-dawn-frost") in a styled row
- Add a Copy button that copies the passphrase to clipboard, same pattern as the existing token copy (lines 183-194)
- Use new CSS class `.am-passphrase-row` — follow the existing `.am-token-row` pattern
- Use `.am-passphrase` for the passphrase text — monospace, same sizing as `.am-token`

### B. Token Reveal/Hide Toggle

In the existing Recovery Token section:
- Keep the token truncated by default (24 chars + ellipsis — existing behaviour)
- Add a small toggle button (eye icon) after the truncated token, before the Copy button
- Clicking the toggle shows the full token / re-truncates it
- Use Phosphor icons: `ph-eye` (reveal) / `ph-eye-slash` (hide)
- New CSS class `.am-reveal-btn` — styled like `.am-copy-btn` but icon-only (no text label)
- When revealed, add class `.am-token--revealed` to the `<code>` element (remove ellipsis truncation)

**Conventions to follow:**
- String concatenation for HTML (existing pattern throughout the file)
- Imperative event binding after `innerHTML` assignment (existing pattern, lines 155-230)
- `am-` CSS prefix for all new classes
- Design tokens from `frontend/src/styles/tokens.css`
- `escapeHtml()` for any user-derived content

**Do not** modify credit-wallet.js. Do not add features beyond the two described above.

---

## Files

| File | Change |
|------|--------|
| `account-modal.js` | Passphrase section + token reveal toggle in authed state HTML and event binding |
| `account-modal.css` | `.am-passphrase-row`, `.am-passphrase`, `.am-reveal-btn`, `.am-token--revealed` |

## New CSS Classes

| Class | Purpose |
|-------|---------|
| `.am-passphrase-row` | Flex row for passphrase display + copy button (mirrors `.am-token-row`) |
| `.am-passphrase` | Monospace passphrase text (mirrors `.am-token`) |
| `.am-reveal-btn` | Icon-only toggle button for token visibility |
| `.am-token--revealed` | Applied to `.am-token` when full token is shown — disables truncation |
