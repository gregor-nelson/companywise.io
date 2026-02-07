# CSS Token Remediation — Session Handover

**Created:** 2026-02-07
**Purpose:** Hand off to a fresh Claude Code session to plan and implement CSS design token remediation.

---

## Goal

Make the site's visual design trivially changeable by ensuring **every colour, font, spacing, and easing value** in every component CSS file references a `var(--token)` defined in `frontend/src/styles/main.css :root`. No hardcoded hex, rgb, rgba, named colours, or font names in component files. The user has **not finalised a design language** yet — the system must be palette-agnostic so swapping the entire colour scheme means editing only `:root`.

Remove all references to "GOV.UK Design System" from the spec and code comments. The palette should be treated as a generic, swappable set of tokens.

---

## Source of Truth

- **Design system spec:** `frontend/specs/css/CSS-DESIGN-SYSTEM.spec.md`
- **Token definitions:** `frontend/src/styles/main.css` (`:root` block, lines 10–47)
- **This audit:** `frontend/specs/css/CSS-TOKEN-REMEDIATION.handover.md` (this file)

---

## Current `:root` Tokens (all correct, may need additions)

```
--bg-body, --bg-white, --bg-slate, --bg-blue-tint
--border-light, --border-card
--blue-500, --blue-600, --blue-50, --blue-100
--text-900, --text-800, --text-700, --text-500, --text-400
--risk-low, --risk-low-bg, --risk-low-border
--risk-medium, --risk-medium-bg, --risk-medium-border
--risk-high, --risk-high-bg, --risk-high-border
--green-primary, --green-glow
--font, --section-gap, --ease-out
```

---

## Issues Found (Priority Order)

### 1. Non-existent token `--text-600` used in 7 places

Referenced in cta.css (lines 329, 644), how-it-works.css (351), what-we-check.css (410), faq.css (261), pricing.css (348), premium-report.css (619). Either add `--text-600` to `:root` or replace all references with `--text-500` or `--text-700`.

### 2. ~100+ rgba() values use WRONG base colour (Tailwind blue #3b82f6 instead of token blue #1d70b8)

Affects: how-it-works.css, why-companywise.css, cta.css, faq.css, what-we-check.css, financial.css, pricing.css. Also applies to green (Tailwind #10b981/#059669 vs token #00703c) and red (Tailwind #ef4444/#dc2626 vs token #d4351c). All rgba() tints must derive from the actual token value.

### 3. ~150+ hardcoded hex/rgb values that should be var() references

Full breakdown by file below.

### 4. Named colour `white` used in main.css (lines 82, 113, 122)

Should be `var(--bg-white)`.

### 5. No rgba() source comments anywhere

Spec requires `/* derived from --token */` on every rgba() opacity variant. Zero files comply.

### 6. New tokens likely needed

- `--yellow-500` / `--yellow-600` for hero search button (#ffdd00 / #d4b600)
- `--text-600` (if decided to keep as distinct shade)
- Consider: `--bg-subtle` for #f8fafc / #fafafa patterns used in card interiors
- Consider: tint tokens for the gradient backgrounds (blue-tint-light, emerald-tint-light, amber-tint-light) so card/icon backgrounds also use tokens

---

## File-by-File Violation Map

### Files with ZERO violations (no changes needed)
- `footer.css` — clean

### `main.css` — 3 minor fixes
- Lines 82, 113, 122: `white` → `var(--bg-white)`
- Remove "GOV.UK" from file header comment

### `header.css` — 7 violations (straightforward swaps)
- Line 134: `rgb(239 246 255)` → `var(--blue-50)`
- Line 135: `rgb(37 99 235)` → `var(--blue-500)`
- Line 172: `rgb(64 64 64)` → `var(--text-700)`
- Line 176: `rgb(37 99 235)` → `var(--blue-500)`
- Line 194: `rgb(64 64 64)` → `var(--text-700)`
- Line 199: `rgb(249 250 251)` → `var(--bg-slate)`
- Line 205: `rgb(115 115 115)` → `var(--text-500)`

### `hero.css` — 4 remaining (pending yellow token decision)
- Line 262: `#ffdd00` → `var(--yellow-500)` (new token)
- Line 284: `#d4b600` → `var(--yellow-600)` (new token)
- Line 289: `rgba(255, 221, 0, 0.45)` → derived from yellow token
- Line 769: `#f3f2f1`/`#e6e5e3` in skeleton shimmer → token-based
- Previously flagged items (disabled bg, error color, checklist icon, flags count) are ALREADY FIXED.

### `how-it-works.css` — ~25 violations
- Wrong blue family throughout (Tailwind #3b82f6 instead of GOV.UK #1d70b8)
- `#eff6ff`, `#f8fafc`, `#ecfdf5`, `#fffbeb` used as card/icon backgrounds
- `#6366f1` (Tailwind indigo) on line 407 — no token equivalent, needs decision
- `var(--text-600)` on line 351

### `why-companywise.css` — ~15 violations
- Same wrong-blue-family issue
- `#fafafa`/`#f5f5f5` table header gradients (lines 145)
- `#eff6ff`/`#e5efff` highlight header (line 156)
- Emerald/amber tint backgrounds using Tailwind values

### `cta.css` — ~20 violations
- Wrong blue family throughout
- `var(--text-600)` on lines 329, 644
- `#eff6ff`, `#dbeafe`, `#ecfdf5`, `#d1fae5`, `#fef3c7`, `#fde68a` backgrounds

### `faq.css` — ~15 violations
- `#f5f5f5` / `#e5e5e5` icon/chevron backgrounds (lines 170, 219, 285)
- Wrong blue family in tints
- `var(--text-600)` on line 261

### `what-we-check.css` — ~40+ violations (HEAVY)
- `#d97706`, `#dc2626`, `#059669` used directly instead of risk/green tokens
- `#f1f5f9`, `#f8fafc`, `#64748b`, `#475569` (Tailwind slate colours)
- `#cbd5e1`, `#94a3b8` for dots
- `var(--text-600)` on line 410

### `financial.css` — ~30+ violations (HEAVY)
- Almost entirely Tailwind palette: `#dc2626`, `#d97706`, `#059669`, `#3b82f6`, `#10b981`, `#f97316`, `#f59e0b`
- Gauge strokes, scale zones, file tabs, metric fills — all hardcoded

### `premium-report.css` — ~8 violations
- `#f0f0f0` (lines 133, 178) → `var(--border-light)`
- `#f5f5f5` (line 300) → `var(--border-light)`
- `#059669` (line 326) → `var(--green-primary)`
- `#e5e7eb` (lines 455, 477, 900) → `var(--border-light)`
- `#fffbeb`, `#fef2f2` (lines 523, 528) → need amber/red bg tokens

### `pricing.css` — ~8 violations
- `#059669` (×5) → `var(--green-primary)` or `var(--risk-low)`
- `#d97706` (×2) → `var(--risk-medium)`
- `#e5e7eb` (×2), `#d1d5db` (×1) → `var(--border-light)`

### `modal.css` — 3 violations
- `#f0f0f0` (lines 63, 427) → `var(--border-light)`
- `#f0f0f0` (line 156) → `var(--bg-slate)`

### `account-modal.css` — ~25 violations (WORST OFFENDER)
- Barely uses ANY design tokens
- All Tailwind greys: `#111827`→`--text-900`, `#374151`→`--text-700`, `#6b7280`→`--text-500`, `#9ca3af`→`--text-400`, `#f9fafb`→`--bg-slate`, `#f3f4f6`→`--bg-slate`, `#e5e7eb`→`--border-light`
- `#2563eb` → `var(--blue-600)`
- Needs near-complete rewrite to use tokens

### `purchase-dialog.css` — ~8 violations
- `#e5e7eb` (lines 106, 240) → token
- `#d1d5db` (line 151) → token
- `#92400e` / `#fffbeb` (warning box) → need amber tokens
- Fallback values in `var(--token, #fallback)` use Tailwind hex — cosmetic but should match actual token values

### `credit-badge.css` / `upgrade-prompt.css` — minor
- Use `var(--token, #fallback)` pattern — fallback hex values should match the actual token values (#1d70b8 not #3b82f6)

---

## Recommended Implementation Order

1. **Decide on new tokens** — add `--text-600`, `--yellow-500`, `--yellow-600`, and any tint/bg tokens needed for card interiors
2. **Fix `main.css`** — named `white` → `var(--bg-white)`, update comments
3. **Fix `header.css`** — 7 clean swaps, no ambiguity
4. **Fix `account-modal.css`** — worst offender, needs full token migration
5. **Fix `modal.css`** and `premium-report.css`** — small files, clear mappings
6. **Fix `pricing.css`** — small count, clear mappings
7. **Fix `hero.css`** — after yellow tokens are added
8. **Fix `faq.css`** — moderate count
9. **Fix `how-it-works.css`** and `why-companywise.css`** — moderate count, same pattern
10. **Fix `cta.css`** — moderate count
11. **Fix `what-we-check.css`** and `financial.css`** — largest files, most violations, save for last
12. **Fix `purchase-dialog.css`**, `credit-badge.css`, `upgrade-prompt.css`** — minor cleanup
13. **Update `CSS-DESIGN-SYSTEM.spec.md`** — remove GOV.UK references, document new tokens, clear remediation section
14. **Add rgba() comments** across all files

---

## Key Rule for Implementation

Every `rgba()` value in a component file MUST:
1. Derive from the ACTUAL hex value of a named token (e.g., `--blue-500: #1d70b8` means `rgba(29, 112, 184, 0.15)`, NOT `rgba(59, 130, 246, 0.15)`)
2. Include a comment: `/* derived from --blue-500 */`

---

## Files to Read First in New Session

1. `frontend/specs/css/CSS-DESIGN-SYSTEM.spec.md` — the spec
2. `frontend/specs/css/CSS-TOKEN-REMEDIATION.handover.md` — this handover
3. `frontend/src/styles/main.css` — the token source (read lines 1–50 for `:root`)
