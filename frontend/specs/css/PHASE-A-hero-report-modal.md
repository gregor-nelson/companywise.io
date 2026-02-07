# Phase A — hero.css, premium-report.css, modal.css

**Hand this entire file to a fresh Claude Code session as the opening prompt.**

---

## Prerequisite

Phase 0 must be committed first. The `:root` in `main.css` already contains all tokens and backwards-compat aliases.

## Goal

Replace every hardcoded `rgba()` colour value and rename every `var(--blue-*)` reference to `var(--primary-*)` in these three files. After this phase, these files should have ZERO hardcoded colour values.

## Files to Modify (ONLY these — do not touch any other files)

```
frontend/src/js/components/hero/styles/hero.css           (~987 lines)
frontend/src/js/components/premium-report/styles/premium-report.css  (~1018 lines)
frontend/src/js/components/modal/styles/modal.css          (~743 lines)
```

**These files use the GOV.UK palette and are already partially converted.** Many values already use `var(--blue-500)` etc. — those just need renaming. The remaining hardcoded `rgba()` values need replacing with alpha tokens.

---

## Rules

1. **`transparent` and `currentColor` are allowed** — do not replace these.
2. **`white` keyword → `var(--bg-white)`**, **`#fff` → `var(--bg-white)`**
3. **No raw colour values** after you're done: no `#hex`, no `rgb()`, no `rgba()`, no named colours.
4. **Structural values stay raw**: px, rem, %, border-radius, border-width, z-index, opacity (standalone).

---

## Rename Table (find & replace across all 3 files)

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

Replace every hardcoded `rgba(...)` with the corresponding `var(--token)`:

### Primary (blue base: 29, 112, 184)

| Hardcoded | Token |
|---|---|
| `rgba(29, 112, 184, 0.03)` | `var(--primary-a03)` |
| `rgba(29, 112, 184, 0.04)` | `var(--primary-a03)` *(nearest step)* |
| `rgba(29, 112, 184, 0.06)` | `var(--primary-a06)` |
| `rgba(29, 112, 184, 0.1)` or `0.10` | `var(--primary-a10)` |
| `rgba(29, 112, 184, 0.12)` | `var(--primary-a12)` |
| `rgba(29, 112, 184, 0.15)` | `var(--primary-a15)` |
| `rgba(29, 112, 184, 0.2)` | `var(--primary-a25)` *(nearest step)* |
| `rgba(29, 112, 184, 0.25)` | `var(--primary-a25)` |
| `rgba(29, 112, 184, 0.3)` | `var(--primary-a30)` |
| `rgba(29, 112, 184, 0.45)` | `var(--primary-a45)` |

### Green (base: 0, 112, 60)

| Hardcoded | Token |
|---|---|
| `rgba(0, 112, 60, 0.03)` | `var(--green-a03)` |
| `rgba(0, 112, 60, 0.06)` | `var(--green-a06)` |
| `rgba(0, 112, 60, 0.08)` | `var(--green-a08)` |
| `rgba(0, 112, 60, 0.1)` | `var(--green-a10)` |
| `rgba(0, 112, 60, 0.12)` | `var(--green-a12)` |
| `rgba(0, 112, 60, 0.19)` | `var(--green-a19)` |
| `rgba(0, 112, 60, 0.2)` | `var(--green-a20)` |

### Ink (GOV.UK text-derived base: 11, 12, 12)

| Hardcoded | Token |
|---|---|
| `rgba(11, 12, 12, 0.04)` | `var(--ink-a04)` |
| `rgba(11, 12, 12, 0.05)` | `var(--ink-a05)` |
| `rgba(11, 12, 12, 0.06)` | `var(--ink-a06)` |
| `rgba(11, 12, 12, 0.08)` | `var(--ink-a08)` |
| `rgba(11, 12, 12, 0.12)` | `var(--ink-a12)` |
| `rgba(11, 12, 12, 0.15)` | `var(--ink-a15)` |
| `rgba(11, 12, 12, 0.2)` | `var(--ink-a20)` |

### Black overlays (base: 0, 0, 0)

| Hardcoded | Token |
|---|---|
| `rgba(0, 0, 0, 0.04)` | `var(--black-a04)` |
| `rgba(0, 0, 0, 0.05)` | `var(--black-a05)` |
| `rgba(0, 0, 0, 0.06)` | `var(--black-a06)` |
| `rgba(0, 0, 0, 0.5)` | `var(--black-a50)` |

### Amber/Warning (base: 244, 119, 56)

| Hardcoded | Token |
|---|---|
| `rgba(244, 119, 56, 0.06)` | `var(--amber-a06)` |
| `rgba(244, 119, 56, 0.3)` | `var(--amber-a30)` |

### Red/Danger (base: 212, 53, 28)

| Hardcoded | Token |
|---|---|
| `rgba(212, 53, 28, 0.06)` | `var(--red-a06)` |
| `rgba(212, 53, 28, 0.3)` | `var(--red-a30)` |

### Yellow (base: 255, 221, 0)

| Hardcoded | Token |
|---|---|
| `rgba(255, 221, 0, 0.45)` | `var(--yellow-a45)` |

---

## Composite Gradient Replacements

| Old | New |
|---|---|
| `linear-gradient(to bottom right, rgba(29, 112, 184, 0.06), rgba(29, 112, 184, 0.03))` | `var(--gradient-subtle)` |
| `linear-gradient(to bottom right, rgba(0, 112, 60, 0.06), rgba(0, 112, 60, 0.03))` | `var(--gradient-green-subtle)` |

For gradients that don't match the exact pattern above (e.g. different direction or different alpha stops), replace each colour stop individually with the alpha token:
```css
/* Before */
linear-gradient(135deg, rgba(29, 112, 184, 0.06) 0%, rgba(29, 112, 184, 0.15) 100%)
/* After */
linear-gradient(135deg, var(--primary-a06) 0%, var(--primary-a15) 100%)
```

---

## Verification

1. Navigate to home page — hero search bar, card stack animation, trust ticker should all render correctly.
2. Open the free report modal — all sections, risk badges (low/medium/high) should render correctly.
3. Navigate to a premium report — score ring, flags, timeline, all sections should render correctly.
4. Run a grep on these 3 files for any remaining:
   - `rgba(` — should be zero
   - `#[0-9a-fA-F]` — should be zero
   - `var(--blue-` — should be zero
   - `white` (used as a colour value, not inside a comment) — should be zero
5. Commit with message: `Phase A: tokenize hero, premium-report, modal CSS`
