# Phase B — pricing.css, purchase-dialog.css, account-modal.css, header.css

**Hand this entire file to a fresh Claude Code session as the opening prompt.**

---

## Prerequisite

Phase 0 must be committed first. The `:root` in `main.css` already contains all tokens and backwards-compat aliases.

## Goal

Replace every hardcoded `rgba()` / hex colour value and rename every `var(--blue-*)` reference to `var(--primary-*)` in these four files. After this phase, these files should have ZERO hardcoded colour values.

## Files to Modify (ONLY these — do not touch any other files)

```
frontend/src/js/components/pricing/styles/pricing.css              (~509 lines)
frontend/src/js/components/purchase-dialog/styles/purchase-dialog.css  (~506 lines)
frontend/src/js/components/account-modal/styles/account-modal.css   (~279 lines)
frontend/src/js/components/header/styles/header.css                 (~219 lines)
```

**These files use the GOV.UK palette and are already partially converted.**

---

## Rules

1. **`transparent` and `currentColor` are allowed** — do not replace these.
2. **`white` keyword → `var(--bg-white)`**, **`#fff` → `var(--bg-white)`**
3. **No raw colour values** after you're done: no `#hex`, no `rgb()`, no `rgba()`, no named colours.
4. **Structural values stay raw**: px, rem, %, border-radius, border-width, z-index, opacity (standalone).

---

## Rename Table (find & replace across all 4 files)

| Old | New |
|---|---|
| `var(--blue-500)` | `var(--primary-500)` |
| `var(--blue-600)` | `var(--primary-600)` |
| `var(--blue-50)` | `var(--primary-50)` |
| `var(--blue-100)` | `var(--primary-100)` |
| `var(--bg-blue-tint)` | `var(--primary-100)` |
| `var(--green-glow)` | `var(--green-a12)` |

---

## Alpha Token Replacement Table

### Primary (blue base: 29, 112, 184)

| Hardcoded | Token |
|---|---|
| `rgba(29, 112, 184, 0.03)` | `var(--primary-a03)` |
| `rgba(29, 112, 184, 0.06)` | `var(--primary-a06)` |
| `rgba(29, 112, 184, 0.1)` or `0.10` | `var(--primary-a10)` |
| `rgba(29, 112, 184, 0.12)` | `var(--primary-a12)` |
| `rgba(29, 112, 184, 0.15)` | `var(--primary-a15)` |
| `rgba(29, 112, 184, 0.25)` | `var(--primary-a25)` |
| `rgba(29, 112, 184, 0.3)` | `var(--primary-a30)` |

### Green (base: 0, 112, 60)

| Hardcoded | Token |
|---|---|
| `rgba(0, 112, 60, 0.06)` | `var(--green-a06)` |
| `rgba(0, 112, 60, 0.08)` | `var(--green-a08)` |
| `rgba(0, 112, 60, 0.1)` | `var(--green-a10)` |
| `rgba(0, 112, 60, 0.2)` | `var(--green-a20)` |

### Amber/Warning (base: 244, 119, 56)

| Hardcoded | Token |
|---|---|
| `rgba(244, 119, 56, 0.06)` | `var(--amber-a06)` |
| `rgba(244, 119, 56, 0.08)` | `var(--amber-a08)` |
| `rgba(244, 119, 56, 0.2)` | `var(--amber-a20)` |

### Black overlays (base: 0, 0, 0)

| Hardcoded | Token |
|---|---|
| `rgba(0, 0, 0, 0.04)` | `var(--black-a04)` |
| `rgba(0, 0, 0, 0.05)` | `var(--black-a05)` |
| `rgba(0, 0, 0, 0.06)` | `var(--black-a06)` |
| `rgba(0, 0, 0, 0.12)` | `var(--black-a12)` |
| `rgba(0, 0, 0, 0.25)` | `var(--black-a25)` |
| `rgba(0, 0, 0, 0.5)` | `var(--black-a50)` |
| `rgba(0, 0, 0, 0.55)` | `var(--black-a55)` |

### Ink (GOV.UK text-derived base: 11, 12, 12)

| Hardcoded | Token |
|---|---|
| `rgba(11, 12, 12, 0.04)` | `var(--ink-a04)` |
| `rgba(11, 12, 12, 0.06)` | `var(--ink-a06)` |

### Tailwind green (purchase-dialog.css only)

| Hardcoded | Token |
|---|---|
| `#ecfdf5` (gradient start) | `var(--green-a06)` |
| `rgba(209, 250, 229, 0.5)` (gradient end) | `var(--green-a08)` |
| `rgba(16, 185, 129, 0.2)` (border) | `var(--green-a20)` |

---

## Composite Gradient Replacements

| Old | New |
|---|---|
| `linear-gradient(to bottom right, rgba(29, 112, 184, 0.06), rgba(29, 112, 184, 0.03))` | `var(--gradient-subtle)` |
| `linear-gradient(to bottom right, rgba(0, 112, 60, 0.06), rgba(0, 112, 60, 0.03))` | `var(--gradient-green-subtle)` |

For the Tailwind-style gradient in purchase-dialog.css:
```css
/* Before */
linear-gradient(to bottom right, #ecfdf5, rgba(209, 250, 229, 0.5))
/* After */
linear-gradient(to bottom right, var(--green-a06), var(--green-a08))
```

---

## Font Replacements (purchase-dialog.css only)

| Old | New |
|---|---|
| `'SF Mono', 'Consolas', 'Liberation Mono', monospace` | `var(--font-mono)` |
| `'SF Mono', 'Consolas', monospace` | `var(--font-mono)` |

---

## Verification

1. **Pricing section**: featured card glow, hover states, popular badge, per-check prices.
2. **Purchase dialog**: step through all 3 steps (tier select, payment, delivery). Verify monospace font on hash/code fields.
3. **Account modal**: balance card gradient, copy button border/shadow, credit display.
4. **Header**: scroll shadow transition, mobile menu, account button hover states, credit badge area.
5. Run a grep on these 4 files for any remaining:
   - `rgba(` — should be zero
   - `#[0-9a-fA-F]` — should be zero
   - `var(--blue-` — should be zero
   - `white` (as colour value) — should be zero
   - `'SF Mono'` or `'Consolas'` — should be zero
6. Commit with message: `Phase B: tokenize pricing, purchase-dialog, account-modal, header CSS`
