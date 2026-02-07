# Phase D — how-it-works.css, cta.css

**Hand this entire file to a fresh Claude Code session as the opening prompt.**

---

## Prerequisite

Phase 0 must be committed first. The `:root` in `main.css` already contains all tokens.

## Goal

These files are **untouched** and use the **Tailwind CSS palette**. Replace every Tailwind hex/rgba value with the equivalent GOV.UK design token. After this phase, these files should have ZERO hardcoded colour values.

## Files to Modify (ONLY these — do not touch any other files)

```
frontend/src/js/components/how-it-works/styles/how-it-works.css    (~583 lines)
frontend/src/js/components/call-to-action/styles/cta.css           (~857 lines)
```

---

## Rules

1. **`transparent` and `currentColor` are allowed** — do not replace these.
2. **`white` keyword → `var(--bg-white)`**, **`#fff` / `#ffffff` → `var(--bg-white)`**
3. **No raw colour values** after you're done: no `#hex`, no `rgb()`, no `rgba()`, no named colours.
4. **Structural values stay raw**: px, rem, %, border-radius, border-width, z-index, opacity (standalone).

---

## Tailwind → Token Mapping Table

### Blues (Tailwind blue → Primary tokens)

| Tailwind Value | Token |
|---|---|
| `#3b82f6` | `var(--primary-500)` |
| `#2563eb` | `var(--primary-600)` |
| `#eff6ff` | `var(--primary-50)` |
| `#dbeafe` | `var(--primary-100)` |
| `#6366f1` (indigo) | `var(--primary-600)` |
| `rgba(59, 130, 246, 0.04)` | `var(--primary-a03)` |
| `rgba(59, 130, 246, 0.06)` | `var(--primary-a06)` |
| `rgba(59, 130, 246, 0.1)` | `var(--primary-a10)` |
| `rgba(59, 130, 246, 0.12)` | `var(--primary-a12)` |
| `rgba(59, 130, 246, 0.15)` | `var(--primary-a15)` |
| `rgba(59, 130, 246, 0.25)` | `var(--primary-a25)` |
| `rgba(219, 234, 254, 0.5)` | `var(--primary-a06)` |
| `rgba(191, 219, 254, 0.5)` | `var(--primary-a15)` |
| `rgba(99, 102, 241, 0.04)` (indigo) | `var(--primary-a03)` |
| `rgba(99, 102, 241, 0.05)` (indigo) | `var(--primary-a06)` |

### Greens (Tailwind emerald → Green tokens)

| Tailwind Value | Token |
|---|---|
| `#059669` | `var(--green-primary)` |
| `#10b981` | `var(--risk-low)` |
| `#34d399` | `var(--risk-low)` |
| `#ecfdf5` | use `var(--green-a06)` in gradient context |
| `#d1fae5` | use `var(--green-a15)` in gradient context |
| `rgba(209, 250, 229, 0.5)` | `var(--green-a08)` |
| `rgba(16, 185, 129, 0.08)` | `var(--green-a08)` |
| `rgba(16, 185, 129, 0.1)` | `var(--green-a10)` |
| `rgba(16, 185, 129, 0.12)` | `var(--green-a12)` |
| `rgba(16, 185, 129, 0.15)` | `var(--green-a15)` |

### Ambers (Tailwind amber → Amber/Warning tokens)

| Tailwind Value | Token |
|---|---|
| `#d97706` | `var(--risk-medium)` |
| `#f59e0b` | `var(--risk-medium)` |
| `#fffbeb` | use `var(--amber-a06)` in gradient context |
| `#fef3c7` | use `var(--amber-a08)` in gradient context |
| `#fde68a` | use `var(--amber-a15)` in gradient context |
| `rgba(254, 243, 199, 0.5)` | `var(--amber-a08)` |
| `rgba(245, 158, 11, 0.2)` | `var(--amber-a20)` |

### Reds (Tailwind red → Red/Danger tokens)

| Tailwind Value | Token |
|---|---|
| `#dc2626` | `var(--risk-high)` |
| `#ef4444` | `var(--risk-high)` |
| `#fef2f2` | use `var(--red-a06)` in gradient context |
| `rgba(254, 226, 226, 0.5)` | `var(--red-a08)` |
| `rgba(239, 68, 68, 0.15)` | `var(--red-a15)` |

### Greys & Neutrals

| Tailwind Value | Token |
|---|---|
| `#f8fafc` | `var(--bg-subtle)` |
| `#f1f5f9` | `var(--bg-slate)` |
| `#f5f5f5` | `var(--bg-slate)` |
| `#e5e5e5` | `var(--border-light)` |
| `#cbd5e1` | `var(--border-light)` |
| `#94a3b8` | `var(--text-400)` |
| `#64748b` | `var(--text-600)` |
| `#475569` | `var(--text-700)` |

### Black overlays

| Tailwind Value | Token |
|---|---|
| `rgba(0, 0, 0, 0.03)` | `var(--black-a03)` |
| `rgba(0, 0, 0, 0.04)` | `var(--black-a04)` |
| `rgba(0, 0, 0, 0.05)` | `var(--black-a05)` |
| `rgba(0, 0, 0, 0.06)` | `var(--black-a06)` |
| `rgba(0, 0, 0, 0.08)` | `var(--black-a08)` |

---

## Gradient Pattern Replacements

```css
/* Tailwind blue gradient */
/* Before */ linear-gradient(to bottom right, #eff6ff, rgba(219, 234, 254, 0.5))
/* After  */ linear-gradient(to bottom right, var(--primary-50), var(--primary-a06))

/* Tailwind green gradient */
/* Before */ linear-gradient(to bottom right, #ecfdf5, rgba(209, 250, 229, 0.5))
/* After  */ linear-gradient(to bottom right, var(--green-a06), var(--green-a08))

/* Tailwind amber gradient */
/* Before */ linear-gradient(to bottom right, #fffbeb, rgba(254, 243, 199, 0.5))
/* After  */ linear-gradient(to bottom right, var(--amber-a06), var(--amber-a08))

/* Avatar gradients (cta.css) */
/* Before */ linear-gradient(135deg, #fef3c7, #fde68a)
/* After  */ linear-gradient(135deg, var(--amber-a08), var(--amber-a15))

/* Before */ linear-gradient(135deg, #dbeafe, #eff6ff)
/* After  */ linear-gradient(135deg, var(--primary-100), var(--primary-50))

/* Before */ linear-gradient(135deg, #d1fae5, #ecfdf5)
/* After  */ linear-gradient(135deg, var(--green-a15), var(--green-a06))
```

For any gradient not in this list, replace each colour stop individually with the appropriate token from the mapping table above.

---

## Verification

1. **How It Works section**: all 3 step cards render with correct backgrounds, borders, shadows.
2. Check search preview animation panel, analysis preview panel, verdict badge.
3. Check connector lines between cards on desktop viewport.
4. **CTA section**: chevron background gradient, anchor card styling.
5. Check float cards (top and bottom), blur accent effects.
6. Check avatar circles with gradient backgrounds.
7. Check proof text, button shadows, hover states.
8. Test mobile responsive layout for both sections.
9. Run a grep on both files for any remaining:
   - `rgba(` — should be zero
   - `#[0-9a-fA-F]` — should be zero
   - `white` (as colour value) — should be zero
10. Commit with message: `Phase D: tokenize how-it-works, cta CSS`
