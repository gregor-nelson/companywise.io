# Changeset 1 — Seed Preservation (Bug Fix)

> **Scope:** 1 file · ~5 lines changed · No UI changes

---

## The Bug

`purchaseCredits()` in `credit-wallet.js` generates a **new seed on every call** (line 162), including top-ups. This means each purchase invalidates all previously issued recovery tokens and passphrases — the user's backup becomes worthless the moment they buy more credits.

## The Fix

When a wallet already exists, **reuse its seed** instead of generating a fresh one. Only generate a new seed for the very first purchase.

## Prompt

Paste the following into a fresh Claude Code session:

---

Read `frontend/src/js/components/Handlers/credit-wallet/credit-wallet.js` fully, then make this single change:

**In `purchaseCredits()` (around line 162):** When `existing` wallet is not null, reuse `existing.seed` instead of generating a new seed. Only generate a fresh seed when there is no existing wallet (first purchase).

Current code:
```js
var seed = 'cw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
```

Should become conditional:
```js
var seed = existing
  ? existing.seed
  : 'cw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
```

This is the only change. Do not modify any other code. Do not add new methods, fields, or UI changes.

**Verify:** After the change, `purchaseCredits()` called twice in sequence should produce tokens that decode to the same `s` (seed) value. You can confirm by checking that `Wallet._helpers.decodeSeed(token1).seed === Wallet._helpers.decodeSeed(token2).seed`.

---

## Files

| File | Change |
|------|--------|
| `frontend/src/js/components/Handlers/credit-wallet/credit-wallet.js` | Conditional seed generation in `purchaseCredits()` |

## Why This Is Changeset 1

This is a correctness fix with zero UI impact. It must land first because Changesets 2-4 assume the seed is stable across top-ups (passphrase display, token reveal, and wallet import all rely on tokens staying valid).
