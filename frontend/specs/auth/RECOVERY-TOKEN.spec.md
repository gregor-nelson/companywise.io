# Recovery Token Input — Technical Specification

> Token-based wallet recovery UI for the account modal.
> Updated: 2026-02-09 (initial implementation — client-side only, no backend).

---

## 1. Overview

Users who purchased credits receive a Base64 recovery token (shown in the purchase dialog and account modal). If they clear their browser data or visit from a new session, their localStorage wallet is gone. This feature adds a **token input form** to the account modal so returning users can paste their token and restore their credits.

**No backend required.** Recovery is entirely client-side — the token encodes the wallet seed and credit count. `CompanyWiseWallet.recoverFromToken()` decodes it, rebuilds the hash chain, and saves the wallet to localStorage.

---

## 2. Files Modified

| File | Change |
|---|---|
| `frontend/src/js/components/Handlers/account-modal/account-modal.js` | Added recovery HTML template + event binding in `renderContent()` |
| `frontend/src/js/components/Handlers/account-modal/styles/account-modal.css` | Added `.am-recover-*` CSS rules |

**No new files created.** No changes to `credit-wallet.js`, `purchase-dialog.js`, `header.js`, or any HTML pages.

---

## 3. UI Specification

### 3.1 Location

The recovery section renders inside the account modal's **no-wallet state** (when `Wallet.hasWallet()` returns `false`). It appears below the existing "Buy Credits" button, separated by an "or" divider.

### 3.2 Layout

```
┌─────────────────────────────────┐
│  Your Account              [X]  │
│                                 │
│  ★ 0 credits remaining         │
│                                 │
│  You haven't purchased any      │
│  credits yet.                   │
│                                 │
│  [ Buy Credits ]                │
│                                 │
│  ──────── or ────────           │
│                                 │
│  RECOVER ACCOUNT                │
│  Paste your recovery token to   │
│  restore your credits.          │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Paste recovery token…   │    │
│  └─────────────────────────┘    │
│                                 │
│  [ ↺ Recover ]                  │
│                                 │
└─────────────────────────────────┘
```

### 3.3 Elements

| Element | CSS Class | Description |
|---|---|---|
| Container | `.am-recover` | Wraps the entire recovery section |
| Divider | `.am-recover-divider` | Flex row: line + "or" text + line |
| Divider lines | `.am-recover-divider-line` | Horizontal rule segments |
| Divider text | `.am-recover-divider-text` | Uppercase "or" label |
| Section title | `.am-section-title` | Reuses existing class — "Recover Account" |
| Hint text | `.am-recover-hint` | "Paste your recovery token to restore your credits." |
| Input wrapper | `.am-recover-field` | Margin wrapper |
| Token input | `.am-recover-input` | Monospace text input, mirrors `.pd-input` styling |
| Error message | `.am-recover-message` | Hidden when empty, red text on error |
| Recover button | `.am-btn .am-btn-secondary` | Reuses existing button class with Phosphor icon |

### 3.4 Input Styling

The token input uses `font-family: var(--font-mono)` since recovery tokens are Base64 strings — monospace makes them easier to visually verify (consistent with `.am-token` display). Focus state uses the same brand-coloured ring as `.pd-input` in the purchase dialog.

---

## 4. Behaviour

### 4.1 Recovery Flow

```
User clicks "Recover" (or presses Enter in input)
  → trim input value
  → empty?
      → show error: "Please paste your recovery token."
      → focus input
      → stop

  → CompanyWiseWallet available?
      → no: show error: "Wallet system unavailable. Try refreshing."
      → stop

  → Wallet.recoverFromToken(token)
      → returns false (invalid Base64, bad JSON, missing seed/credits):
          → show error: "Invalid token. Please check and try again."
      → returns true:
          → wallet saved to localStorage
          → dispatchChange(wallet, 'recover') fires creditWalletChanged
          → account modal's existing listener (line 40) catches event
          → renderContent() re-renders modal → now shows full wallet view
          → header credit count updates via its own creditWalletChanged listener
```

### 4.2 Auto-Transition on Success

No explicit success state is needed. When `recoverFromToken()` succeeds, it fires `creditWalletChanged`, which triggers `renderContent()`. Since `hasWallet()` is now `true`, the modal re-renders with the full wallet view (tier, balance, recovery token display, unlocked reports, action buttons). This provides instant visual confirmation.

### 4.3 Error States

| Condition | Message | Class |
|---|---|---|
| Empty input | "Please paste your recovery token." | `.am-recover-message--error` |
| Wallet unavailable | "Wallet system unavailable. Try refreshing." | `.am-recover-message--error` |
| Invalid token | "Invalid token. Please check and try again." | `.am-recover-message--error` |

Error message element uses `display: none` when empty (via `:empty` pseudo-class) to avoid layout shift.

### 4.4 Keyboard Support

- **Enter** key in the input triggers recovery (prevents form submission default)
- **Escape** key closes the modal (existing behaviour)

---

## 5. Token Format Reference

Tokens are generated by `Wallet._helpers.encodeSeed(seed, credits)`:

```js
// Encoding
btoa(JSON.stringify({ s: seed, n: credits, v: 1 }))
// → "eyJzIjoiYWJjMTIzIiwibiI6MjUsInYiOjF9"

// Decoding (inside recoverFromToken)
JSON.parse(atob(token))
// → { s: "abc123", n: 25, v: 1 }
```

The token encodes:
- `s` — wallet seed (random string)
- `n` — total purchased credits
- `v` — version (always 1)

On recovery, `recoverFromToken()`:
1. Decodes the token
2. Regenerates the full hash chain from the seed
3. Creates a new wallet with `tier: 'recovered'`, empty `spentOn[]`
4. Saves to localStorage and dispatches `creditWalletChanged`

**Limitation:** Spend history (`spentOn[]`) is not encoded in the token. Previously unlocked companies will need to be re-spent after recovery.

---

## 6. CSS Classes Added

All classes use the `am-` prefix (account-modal convention).

```css
.am-recover                    /* Container */
.am-recover-divider            /* Flex row for "or" divider */
.am-recover-divider-line       /* Horizontal line segments */
.am-recover-divider-text       /* "or" text */
.am-recover-hint               /* Helper text */
.am-recover-field              /* Input wrapper */
.am-recover-input              /* Token text input */
.am-recover-input::placeholder /* Placeholder styling */
.am-recover-input:focus        /* Focus ring */
.am-recover-message            /* Error message container */
.am-recover-message:empty      /* Hidden state */
.am-recover-message--error     /* Error colour */
```

Design tokens used: `--space-*`, `--text-*`, `--font-mono`, `--font`, `--border`, `--border-1`, `--surface`, `--brand`, `--text-muted`, `--text-faint`, `--danger`, `--rounded-lg`, `--tracking-wider`, `--duration-150`, `--ease-in-out`.

---

## 7. Edge Cases

| Scenario | Handling |
|---|---|
| User already has a wallet | Recovery section doesn't render — it's only in the `!hasWallet` branch |
| Token with leading/trailing whitespace | `token.trim()` handles it |
| Multiple rapid clicks | Harmless — `recoverFromToken()` is synchronous and idempotent |
| Modal re-render during recovery | `creditWalletChanged` triggers `renderContent()`, which rebuilds the dialog innerHTML and re-binds all event listeners (existing pattern) |

---

## 8. Future Considerations

1. **Passphrase recovery** — `hashToWords()` generates a 4-word passphrase at purchase time, but there's no `recoverFromPassphrase()` method. Implementing this would require storing a mapping or using the passphrase as a key derivation input.
2. **Backend token validation** — in production, the server could store `(chainId, anchor, remaining)` and validate recovery tokens server-side before restoring credits.
3. **Email-based recovery** — link wallet to an email address for passwordless recovery via magic link.
4. **Cross-device sync** — server-side wallet storage would enable accessing credits from any device without manual token transfer.
5. **Wallet import from JSON** — the export button produces a JSON file; an import button could complement the token input as an alternative recovery method.
