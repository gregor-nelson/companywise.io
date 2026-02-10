# Wallet Security Review & Next Steps

> **Status:** Discussion summary — decisions needed before implementation
> **Date:** 2026-02-09
> **Context:** Conversation reviewing the wallet trust model, recovery system, and low-effort security improvements

---

## 1. How the Wallet Works Today

### The short version

The wallet is a **client-side hash chain** stored in `localStorage`. There is no server. The recovery token **is** the account — whoever holds it can restore the wallet on any machine. There is no client/server secret split.

### The pieces

| Piece | What it is | Where it lives |
|-------|-----------|----------------|
| **Seed** | Random string generated at first purchase (`cw_<timestamp>_<random>`) | `localStorage` under `companywise_wallet` |
| **Hash chain** | `[seed, H(seed), H(H(seed)), ... H^n(seed)]` — one link per credit | Regenerated in memory on demand, never stored |
| **Anchor** | The top of the chain (`H^n(seed)`) — moves down one step per spend | `localStorage` |
| **Recovery token** | Base64 of `{ s: seed, n: totalCredits, v: 1 }` | Shown to user at purchase; included in export file |
| **Passphrase** | 4-word mnemonic derived deterministically from the seed | Derived on the fly, never stored |

### Purchase

1. Generate random seed
2. Build hash chain: `seed -> H(seed) -> H^2(seed) -> ... -> H^25(seed)`
3. Anchor = top of chain (`H^25`)
4. Encode token = `btoa({ s: seed, n: 25, v: 1 })`
5. Derive passphrase = `hashToWords(simpleHash(seed))`
6. Save wallet to `localStorage`

### Spending

1. Rebuild chain from seed
2. Present hash one step below anchor: `H^24(seed)`
3. Verify: `H(H^24) === anchor`? Yes — valid spend
4. Move anchor down: `anchor = H^24`, `remaining = 24`

Each spend moves the anchor one step down the chain. Without the seed, you can't compute the next hash to present (one-way function).

### Recovery (new machine)

1. User pastes token
2. Decode: extract seed and credit count
3. Regenerate the exact same chain from the seed
4. Set anchor = top of chain, remaining = totalCredits
5. Save fresh wallet to `localStorage`

**Key consequence:** Recovery always restores **full credits**. If the user bought 25 and spent 22, recovery gives back 25. The token only encodes `totalPurchased`, not `remaining`. Spend history is lost.

---

## 2. The Trust Model

The recovery token is a **bearer credential** — like a gift card number. Possession equals access. There is no second factor, no server handshake, no PIN.

This is a deliberate trade-off. The system is client-only scaffolding. The owner's position:

- Infra costs per report are low enough that a technical user getting free reports is acceptable
- Abuse/scraping can be handled at the server level, external to the app
- Keeping things maximally simple is the priority for this phase

---

## 3. The Security Weakness: `simpleHash`

The current hash function is a custom FNV-1a variant with linear congruential expansion:

```
Input -> FNV-1a (32-bit state) -> expand to 64 hex chars
```

The problem: **32-bit internal state**. There are only ~4 billion possible intermediate values. The expansion step stretches them into longer strings but doesn't add entropy. Given a hash output, an attacker can brute-force the input in seconds on a modern CPU.

This means the hash chain — the thing that makes spending work — is reversible. An attacker who reads the anchor from `localStorage` could compute the previous chain link and manufacture credits without the seed.

---

## 4. Proposed Improvements (Cheapest to Most Involved)

### 4a. Replace `simpleHash` with SHA-256 via Web Crypto

**Effort:** Medium (async refactor) | **Impact:** High

Swap the custom hash for the browser's built-in SHA-256:

```js
async function sha256(input) {
  var buf = new TextEncoder().encode(input);
  var hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(function(b) { return b.toString(16).padStart(2, '0'); })
    .join('');
}
```

**What changes:**
- `simpleHash(x)` becomes `await sha256(x)`
- `generateChain`, `spendCredit`, `purchaseCredits`, `recoverFromToken` become `async`
- All call sites add `await`

**What stays the same:**
- Chain structure (still `[seed, H(seed), H^2(seed), ...]`)
- Token format (still base64 of seed + credits)
- Passphrase derivation (same logic, just uses SHA-256 internally)
- localStorage shape (same fields)
- Recovery flow (same steps)
- Spend flow (same steps)

**Why it matters:**
- SHA-256 has 256 bits of internal state, not 32. Reversing it is computationally infeasible.
- The hash chain becomes genuinely one-way. Knowing the anchor reveals nothing about the previous link.
- Zero dependencies — `crypto.subtle` ships in every modern browser.
- Upgrades everything that uses the hash: chain proofs, passphrase derivation, any future HMAC.

**The trade-off:**
- Everything becomes `async`. This is a mechanical refactor — no new logic, just `async/await` propagation through the call chain.
- Existing wallets generated with `simpleHash` would be incompatible. Need a migration path or version flag.

### 4b. Wallet integrity HMAC

**Effort:** Low (~5 lines) | **Impact:** Medium

Compute a signature over the mutable wallet fields using the seed:

```js
wallet.sig = await sha256(seed + ':' + remaining + ':' + totalPurchased);
```

On every `loadWallet()`, recompute and verify. If someone opens DevTools and edits `remaining: 25`, the sig check fails.

**Limitation:** A user who reads the source can recompute the sig. But it's the difference between "edit one JSON field" and "understand the signing scheme and compute a hash." Real friction for casual tampering.

**Depends on:** 4a (should use SHA-256, not simpleHash, for the HMAC).

### 4c. PIN-encrypted recovery token

**Effort:** Medium (UI + Web Crypto) | **Impact:** High

At purchase time, ask the user for a 4-digit PIN. Encrypt the token with AES-GCM using a key derived from the PIN. Recovery requires token + PIN.

This adds a **genuinely new factor** — the PIN is not in the export file and not in `localStorage`. A screenshot or shoulder-surf of the token is useless without it.

**Depends on:** UI work in the purchase dialog and recovery form.

### 4d. Encrypt seed at rest in localStorage

**Effort:** Low | **Impact:** Low-Medium

Generate a random encryption key via `crypto.getRandomValues`, store it in a separate `localStorage` key, and encrypt the seed with it. Copy-pasting the `companywise_wallet` blob to another browser doesn't work without also copying the key.

**Limitation:** Both keys live in the same browser. This only stops the "copy one JSON blob" attack, not a determined DevTools user.

---

## 5. Priority Recommendation

| Priority | Change | Why |
|----------|--------|-----|
| **1** | SHA-256 swap (4a) | Single highest-impact change. Makes the chain cryptographically sound. Everything else builds on it. |
| **2** | Wallet integrity HMAC (4b) | Cheap to add once SHA-256 is in. Stops casual localStorage edits. |
| **3** | PIN-encrypted token (4c) | Only change that adds a real second factor. Do this if token leakage is a concern. |
| **4** | Encrypted seed at rest (4d) | Nice-to-have. Small friction addition. |

---

## 6. Decision: Wallet Import (Changeset 4)

The wallet export file contains a recovery token. The question was whether to build a file-based import feature and how to handle the `remaining` field.

### Decision

**Option A: Token-only import.** Extract the token from the JSON and run it through `recoverFromToken()`. Import is a UX convenience (file picker instead of paste), not a different trust path. The `remaining` field in the export is ignored.

### Rationale

- Infra costs are low — credit inflation by technical users is acceptable
- Clamping `remaining` to `[0, decoded.credits]` is cosmetic (user can set it to max purchased)
- HMAC-signed exports (Option B) add complexity a source-reader bypasses in minutes
- Server-side validation (Option D) is the real answer but belongs to a different phase
- No import at all (Option C) punishes legitimate users for an unsolvable client-side problem

### UX note

Label it "Recover from backup file" (not "Import wallet") to set expectations that spend history is lost and full credits are restored.

---

## 7. Existing Changeset Dependencies

For reference, the changesets already specced out:

```
Changeset 1: Seed preservation bug fix (reuse seed on top-up)
    ↓
Changeset 2: Passphrase + token UX in account modal
    ↓
Changeset 3: Info UI + accessibility polish
    ↓
Changeset 4: Wallet import (Option A — token-only, per above)
    ↓
Changeset 5 (NEW): SHA-256 migration + wallet integrity HMAC
```

**Changeset 5** (the SHA-256 work) should come after the existing changesets are landed. It touches the same core function (`simpleHash` in `credit-wallet.js`) and makes everything async, so it's cleaner to do it on a stable base.

---

## 8. Open Questions

1. **SHA-256 migration path** — When the hash function changes, existing wallets (generated with `simpleHash`) become unverifiable. Options:
   - **Version flag:** Add `hashVersion: 2` to the wallet. `loadWallet()` checks the version and uses the correct hash function. Old wallets continue working; new purchases use SHA-256.
   - **Force re-derive:** On first load after the update, decode the token (which has the seed), regenerate the chain with SHA-256, and overwrite the wallet. Seamless but requires the seed to still be present.
   - **Break cleanly:** Since this is scaffold-phase, accept that existing test wallets are invalidated. Simplest if there are no real paying users yet.

2. **Async ripple scope** — How many call sites need to become async? The main ones are `spendCredit`, `purchaseCredits`, `recoverFromToken`, `exportWallet`, and `hashToWords`. Any component that calls these directly (account modal, purchase dialog, premium report) will need minor updates.

3. **PIN for token encryption (4c)** — Is this worth the UX cost? Adds a "remember your PIN" burden. May not be justified if the threat model is "casual tampering is fine, determined users are accepted."
