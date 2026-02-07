# Phase C — faq.css, why-companywise.css, upgrade-prompt.css, credit-badge.css, footer.css

**Hand this entire file to a fresh Claude Code session as the opening prompt.**

---

## Prerequisite

Phase 0 must be committed first. The `:root` in `main.css` already contains all tokens.

## Goal

These files are **untouched** and use the **Tailwind CSS palette** (different hex values from the GOV.UK tokens). Replace every Tailwind hex/rgba value with the equivalent GOV.UK design token. After this phase, these files should have ZERO hardcoded colour values.

## Files to Modify (ONLY these — do not touch any other files)

```
frontend/src/js/components/faq/styles/faq.css                     (~406 lines)
frontend/src/js/components/why-us/styles/why-companywise.css       (~403 lines)
frontend/src/js/components/upgrade-prompt/styles/upgrade-prompt.css (~215 lines)
frontend/src/js/components/credit-badge/styles/credit-badge.css     (~54 lines)
frontend/src/js/components/footer/styles/footer.css                 (~20 lines)
```

---

## Rules

1. **`transparent` and `currentColor` are allowed** — do not replace these.
2. **`white` keyword → `var(--bg-white)`**, **`#fff` / `#ffffff` → `var(--bg-white)`**
3. **No raw colour values** after you're done: no `#hex`, no `rgb()`, no `rgba()`, no named colours.
4. **Structural values stay raw**: px, rem, %, border-radius, border-width, z-index, opacity (standalone).
5. **Font family replacements**: `'Jost', sans-serif` → `var(--font)`, remove Jost fallbacks from `var()`.

---

## Tailwind → Token Mapping Table

### Blues (Tailwind blue → Primary tokens)

| Tailwind Value | Token |
|---|---|
| `#3b82f6` | `var(--primary-500)` |
| `#2563eb` | `var(--primary-600)` |
| `#eff6ff` | `var(--primary-50)` |
| `#dbeafe` | `var(--primary-100)` |
| `#e5efff` | `var(--primary-100)` |
| `rgba(59, 130, 246, 0.02)` | `var(--primary-a03)` |
| `rgba(59, 130, 246, 0.1)` | `var(--primary-a10)` |
| `rgba(59, 130, 246, 0.15)` | `var(--primary-a15)` |
| `rgba(59, 130, 246, 0.25)` | `var(--primary-a25)` |
| `rgba(59, 130, 246, 0.3)` | `var(--primary-a30)` |
| `rgba(219, 234, 254, 0.5)` | `var(--primary-a06)` |
| `rgba(219, 234, 254, 0.8)` | `var(--primary-a10)` |
| `rgba(191, 219, 254, 0.5)` | `var(--primary-a15)` |

### Greens (Tailwind emerald → Green tokens)

| Tailwind Value | Token |
|---|---|
| `#059669` | `var(--green-primary)` |
| `#10b981` | `var(--risk-low)` |
| `#34d399` | `var(--risk-low)` |
| `#ecfdf5` | use `var(--green-a06)` in gradient context |
| `#d1fae5` | use `var(--green-a15)` in gradient context |
| `rgba(209, 250, 229, 0.5)` | `var(--green-a08)` |
| `rgba(16, 185, 129, 0.1)` | `var(--green-a10)` |
| `rgba(16, 185, 129, 0.15)` | `var(--green-a15)` |

### Reds (Tailwind red → Red/Danger tokens)

| Tailwind Value | Token |
|---|---|
| `#dc2626` | `var(--risk-high)` |
| `#ef4444` | `var(--risk-high)` |
| `#fef2f2` | use `var(--red-a06)` in gradient context |
| `#fee2e2` | use `var(--red-a08)` in gradient context |
| `rgba(254, 226, 226, 0.5)` | `var(--red-a08)` |
| `rgba(254, 202, 202, 0.5)` | `var(--red-a10)` |
| `rgba(239, 68, 68, 0.15)` | `var(--red-a15)` |
| `rgba(239, 68, 68, 0.3)` | `var(--red-a30)` |

### Ambers (Tailwind amber → Amber/Warning tokens)

| Tailwind Value | Token |
|---|---|
| `#d97706` | `var(--risk-medium)` |
| `#f59e0b` | `var(--risk-medium)` |
| `#fffbeb` | use `var(--amber-a06)` in gradient context |
| `#fef3c7` | use `var(--amber-a08)` in gradient context |
| `#fde68a` | use `var(--amber-a15)` in gradient context |
| `rgba(254, 243, 199, 0.5)` | `var(--amber-a08)` |
| `rgba(245, 158, 11, 0.15)` | `var(--amber-a15)` |

### Greys & Neutrals

| Tailwind Value | Token |
|---|---|
| `#f8fafc` | `var(--bg-subtle)` |
| `#f5f5f5` | `var(--bg-slate)` |
| `#f1f5f9` | `var(--bg-slate)` |
| `#e5e5e5` | `var(--border-light)` |
| `#171717` | `var(--text-900)` |
| `#404040` | `var(--text-700)` |
| `#737373` | `var(--text-500)` |

### Black overlays

| Tailwind Value | Token |
|---|---|
| `rgba(0, 0, 0, 0.03)` | `var(--black-a03)` |
| `rgba(0, 0, 0, 0.04)` | `var(--black-a04)` |
| `rgba(0, 0, 0, 0.06)` | `var(--black-a06)` |

---

## Gradient Pattern Replacements

These Tailwind gradient patterns appear frequently. Replace the full pattern:

```css
/* Tailwind blue gradient */
/* Before */ linear-gradient(to bottom right, #eff6ff, rgba(219, 234, 254, 0.5))
/* After  */ linear-gradient(to bottom right, var(--primary-50), var(--primary-a06))

/* Tailwind green gradient */
/* Before */ linear-gradient(to bottom right, #ecfdf5, rgba(209, 250, 229, 0.5))
/* After  */ linear-gradient(to bottom right, var(--green-a06), var(--green-a08))

/* Tailwind red gradient */
/* Before */ linear-gradient(to bottom right, #fef2f2, rgba(254, 226, 226, 0.5))
/* After  */ linear-gradient(to bottom right, var(--red-a06), var(--red-a08))

/* Tailwind amber gradient */
/* Before */ linear-gradient(to bottom right, #fffbeb, rgba(254, 243, 199, 0.5))
/* After  */ linear-gradient(to bottom right, var(--amber-a06), var(--amber-a08))
```

---

## Font Replacements

| File | Old | New |
|---|---|---|
| `credit-badge.css` | `'Jost', sans-serif` | `var(--font)` |
| `upgrade-prompt.css` | `'Jost', sans-serif` | `var(--font)` |
| `upgrade-prompt.css` | `var(--font, 'Jost', sans-serif)` | `var(--font)` |

---

## Verification

1. **FAQ section**: expand/collapse items, hover states on questions, category badge styling.
2. **Why CompanyWise section**: comparison cards, stat highlights, icon boxes.
3. **Upgrade prompt**: open a locked section in modal to trigger the prompt, verify it renders correctly.
4. **Credit badge**: check in header — normal state, empty state (0 credits), low credits warning state.
5. **Footer**: border and shadow render, link colours.
6. Run a grep on all 5 files for any remaining:
   - `rgba(` — should be zero
   - `#[0-9a-fA-F]` — should be zero
   - `var(--blue-` — should be zero
   - `white` (as colour value) — should be zero
   - `'Jost'` — should be zero
7. Commit with message: `Phase C: tokenize faq, why-companywise, upgrade-prompt, credit-badge, footer CSS`
