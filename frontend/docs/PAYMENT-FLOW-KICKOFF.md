# Session 13 — Fix Payment Flow Audit Issues

Read `frontend/docs/PAYMENT-FLOW-HANDOFF.md` for full context. All 4 phases of the payment flow are implemented and working. An audit found 5 issues and 4 recommendations. Your job is to fix them.

## Fix these issues in order:

**Issue 1 (Medium):** `spendCredit()` return value is not checked in `hero.js:737` and `premium-report.js:47`. If the spend fails, the user still proceeds. Check the return value — if false, fall back to the mini-dialog (hero) or renderAccessDenied (premium-report). See the handoff doc for example code.

**Issue 2 (Medium):** XSS risk — company names, director names, and addresses are injected into innerHTML via template literals with no escaping. Create a shared `escapeHtml()` utility and apply it to all user-data interpolations in `hero.js`, `modal.js`, `upgrade-prompt.js`, and `premium-report.js`. The handoff doc has a table of every file and line that needs it.

**Issue 3 (Low):** The hero mini-dialog (`upgrade-prompt.js`) stays visible after the user buys credits through it. Add a `creditWalletChanged` listener that auto-dismisses or updates the mini-dialog when credits become available.

**Issue 4 (Low):** Modal locked sections don't refresh after an in-modal purchase. Add a `creditWalletChanged` listener in `modal.js` `init()` that re-renders the modal body if the modal is currently open.

**Issue 5 (Low):** `CompanyWiseUpgrade.renderInline()` is implemented but never called — the modal has its own duplicate gating pattern. Pick one approach: either refactor `modal.js` to use `renderInline()`, or remove the dead inline mode code from `upgrade-prompt.js`. Read both implementations in the handoff doc before deciding.

## Then address these recommendations if time allows:

**R1:** Wire the `returnTo` option in `purchase-dialog.js` so after purchasing credits from the hero flow, the user can go straight to the premium report.

**R2:** Add a `destroy()` method to `credit-badge.js` that removes an instance from the `instances` array.

**R3:** Add `(company.flags || [])` null guards in `modal.js:147` and `hero.js:685`.

**R4:** Change the mobile drawer "Get started" href from `/signup` to `#` in `header.js:263`.

## Constraints:

- Follow existing conventions: vanilla JS IIFEs, `window.CompanyWise*` globals, component CSS prefixes, design tokens from `main.css`.
- Do not add any new dependencies or build tools.
- Do not restructure files or rename existing APIs.
- Run no commands — this is a code-only session.
