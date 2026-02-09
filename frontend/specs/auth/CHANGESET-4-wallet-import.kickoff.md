# Changeset 4 — Wallet Import (DISCUSSION — not ready for implementation)

> **Status:** Needs design decision on trust model before writing code
> **Depends on:** Changesets 1-3

---

## What we want

Users can **export** their wallet as a JSON file. We want a way to **import** it back — restoring credits after a browser data clear or device switch.

## The security problem

The export JSON contains a `remaining` field. The original plan clamped it to `[0, decoded.credits]` — but that's cosmetic. Here's why:

### Clamping doesn't help

The token inside the export encodes `{ seed, credits }` where `credits` = `totalPurchased`. Clamping `remaining` to that ceiling means a user who bought 25 credits and spent 20 can edit the JSON to set `remaining: 25` and get all their spent credits back. The clamp allows it because 25 <= 25.

### Token recovery already has the same hole

`recoverFromToken()` today sets `remaining = decoded.credits` — it gives back **all** credits regardless of how many were spent. So import-with-clamping is no worse than token recovery. But "no worse than an existing weakness" isn't a great bar.

### The fundamental tension

In a pure client-side system the user controls localStorage. A determined user can always edit `companywise_wallet` directly in DevTools and give themselves credits. The question is: **how much friction do we want to add?**

---

## Options

### Option A: Token-only import (simplest)

Ignore the `remaining` field entirely. Extract the token from the JSON and run it through the existing `recoverFromToken()`. Import becomes a UX convenience (file picker instead of paste), not a different trust path.

**Pros:**
- Zero new security surface — same behaviour as token recovery
- No new wallet method needed, just UI that calls `recoverFromToken(data.token)`
- Simplest to build and reason about

**Cons:**
- Loses the one advantage of import: accurate `remaining` count
- Users who exported with 3/25 remaining get 25 back — surprising

### Option B: HMAC-signed exports

At export time, compute an HMAC over the `remaining` + `totalPurchased` + `seed` using a key derived from the seed (e.g. `simpleHash('hmac_' + seed)`). Include the signature in the export. At import time, recompute and verify.

```
Export: { ..., remaining: 23, sig: hmac(seed, "23:25") }
Import: recompute hmac, reject if mismatch
```

**Pros:**
- Casual tampering (editing `remaining` in a text editor) is detected and rejected
- Preserves accurate `remaining` from the export
- Doesn't require a server

**Cons:**
- A determined user who reads the source can see the HMAC derivation and forge a valid signature
- Adds complexity to both export and import
- "Security through obscurity" flavour — the signing key is derived from data already in the file

### Option C: Don't build import at all

Token recovery and passphrase recovery (future) cover the restoration use case. The export file is a human-readable receipt, not a restoration mechanism. Keep it simple.

**Pros:**
- No new attack surface
- One fewer feature to maintain
- The export file already contains the token — a user can manually paste it into the recover UI

**Cons:**
- Worse UX for legitimate users (must open the JSON, find the token, copy-paste)
- The export having no corresponding import feels incomplete

### Option D: Server-side validation (future)

Record `(chainId, anchor, remaining)` on the server at purchase and spend time. Import sends the file to the server, which verifies `remaining` matches its records. Client can't inflate.

**Pros:**
- Actually secure — the server is the source of truth
- Enables cross-device sync as a bonus

**Cons:**
- Requires backend work, not applicable to the current client-only scaffold
- Adds a hard dependency on connectivity

---

## My take

**Option A is the pragmatic choice right now.** It adds the UX convenience (file picker) without pretending to solve a problem we can't solve client-side. The JSON export already contains the token, so all we're doing is making it easier to use. Option B adds complexity that a source-reading user can bypass in 5 minutes. Option D is the real answer but that's a different phase of work.

The remaining question is whether we update the empty-state copy ("Credits unlock premium reports...") in this changeset or skip it — it's conversion copy, not functionally related to import.

---

## Questions to resolve before implementation

1. **Which option?** A (token-only), B (HMAC), C (don't build it), or D (defer to backend phase)?
2. **If Option A:** should the UI say "Import wallet file" or "Recover from backup file" to set expectations that spend history is lost?
3. **Empty-state copy change** — bundle it here or skip it?
