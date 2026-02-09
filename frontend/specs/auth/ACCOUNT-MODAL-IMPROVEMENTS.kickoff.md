# Kickoff — Account Modal Improvements

> **Superseded.** This was originally a single monolithic prompt. It has been split into 4 focused changesets for better context window management and reviewability.

---

## Changesets (execute in order)

| # | File | Scope | Depends on |
|---|------|-------|------------|
| 1 | `CHANGESET-1-seed-preservation.kickoff.md` | Bug fix: reuse seed across top-ups (credit-wallet.js only) | — |
| 2 | `CHANGESET-2-passphrase-token-ux.kickoff.md` | Show passphrase + token reveal toggle (account-modal) | CS-1 |
| 3 | `CHANGESET-3-info-ui-a11y.kickoff.md` | Free checks, warnings, low balance, ARIA (account-modal) | CS-2 |
| 4 | `CHANGESET-4-wallet-import.kickoff.md` | **DISCUSSION** — trust model needs decision before code | CS-1–3 |

## Design decisions vs. original plan

- **Passphrase is derived, not stored.** `hashToWords(simpleHash(seed))` is deterministic — no need to add a `passphrase` field to the wallet object or handle migration of legacy wallets.
- **Import security is unresolved.** The original plan clamped `remaining` to `[0, credits]` but this doesn't actually prevent credit inflation. CS-4 presents four options (token-only, HMAC, skip, server-side) for discussion before any code is written.
- **Each changeset is independently committable** and testable. CS-1 through CS-3 can ship regardless of the CS-4 decision.

## Reference files

- Implementation plan: `C:\Users\gregor\.claude\plans\dazzling-pondering-wigderson.md`
- Recovery token spec: `frontend/specs/auth/RECOVERY-TOKEN.spec.md`
