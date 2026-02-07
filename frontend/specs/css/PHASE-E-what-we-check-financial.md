# Phase E — what-we-check.css, financial.css

**Hand this entire file to a fresh Claude Code session as the opening prompt.**

---

## Prerequisite

Phase 0 must be committed first. The `:root` in `main.css` already contains all tokens.

## Goal

These are the **two largest files** in the project and have the **heaviest hardcoding** — all Tailwind palette. Replace every Tailwind hex/rgba value with the equivalent GOV.UK design token. After this phase, these files should have ZERO hardcoded colour values.

## Files to Modify (ONLY these — do not touch any other files)

```
frontend/src/js/components/what-we-check/styles/what-we-check.css              (~1786 lines)
frontend/src/js/components/what-we-check/styles/components/financial.css        (~827 lines)
```

These files are in the same component directory and share colour patterns. Do them together.

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
| `#60a5fa` | `var(--primary-500)` |
| `#eff6ff` | `var(--primary-50)` |
| `#dbeafe` | `var(--primary-100)` |
| `rgba(59, 130, 246, 0.08)` | `var(--primary-a06)` *(nearest)* |
| `rgba(59, 130, 246, 0.1)` | `var(--primary-a10)` |
| `rgba(59, 130, 246, 0.12)` | `var(--primary-a12)` |
| `rgba(59, 130, 246, 0.15)` | `var(--primary-a15)` |
| `rgba(219, 234, 254, 0.5)` | `var(--primary-a06)` |

### Greens (Tailwind emerald → Green/Success tokens)

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
| `#f87171` | `var(--risk-high)` |
| `#fef2f2` | use `var(--red-a06)` in gradient context |
| `#fee2e2` | use `var(--red-a08)` in gradient context |
| `#fef7f7` | use `var(--red-a06)` |
| `#fff5f5` | use `var(--red-a06)` |
| `rgba(254, 226, 226, 0.5)` | `var(--red-a08)` |
| `rgba(239, 68, 68, 0.1)` | `var(--red-a10)` |
| `rgba(239, 68, 68, 0.12)` | `var(--red-a10)` *(nearest)* |
| `rgba(239, 68, 68, 0.15)` | `var(--red-a15)` |
| `rgba(239, 68, 68, 0.2)` | `var(--red-a20)` |
| `rgba(239, 68, 68, 0.3)` | `var(--red-a30)` |

### Ambers/Oranges (Tailwind amber/orange → Amber/Warning tokens)

| Tailwind Value | Token |
|---|---|
| `#d97706` | `var(--risk-medium)` |
| `#f59e0b` | `var(--risk-medium)` |
| `#fbbf24` | `var(--risk-medium)` |
| `#f97316` (orange) | `var(--risk-medium)` |
| `#fffbeb` | use `var(--amber-a06)` in gradient context |
| `#fef3c7` | use `var(--amber-a08)` in gradient context |
| `rgba(254, 243, 199, 0.5)` | `var(--amber-a08)` |
| `rgba(245, 158, 11, 0.1)` | `var(--amber-a10)` |
| `rgba(245, 158, 11, 0.15)` | `var(--amber-a15)` |
| `rgba(234, 88, 12, 0.04)` | `var(--amber-a06)` |

### Greys & Neutrals

| Tailwind Value | Token |
|---|---|
| `#fafbfc` | `var(--bg-subtle)` |
| `#fafafa` | `var(--bg-subtle)` |
| `#f8fafc` | `var(--bg-subtle)` |
| `#f1f5f9` | `var(--bg-slate)` |
| `#f5f5f5` | `var(--bg-slate)` |
| `#e5e5e5` | `var(--border-light)` |
| `#cbd5e1` | `var(--border-light)` |
| `#94a3b8` | `var(--text-400)` |
| `#9ca3af` | `var(--text-400)` |
| `#6b7280` | `var(--text-600)` |
| `#64748b` | `var(--text-600)` |
| `#475569` | `var(--text-700)` |

### Black overlays

| Tailwind Value | Token |
|---|---|
| `rgba(0, 0, 0, 0.04)` | `var(--black-a04)` |
| `rgba(0, 0, 0, 0.06)` | `var(--black-a06)` |
| `rgba(0, 0, 0, 0.08)` | `var(--black-a08)` |
| `rgba(107, 114, 128, 0.1)` | `var(--black-a08)` *(nearest neutral)* |

---

## Multi-Stop Gradient Replacements

These files contain unique multi-stop gradients for gauges, bars, and severity meters. Replace each colour stop with the appropriate token:

```css
/* Gauge fill gradient */
/* Before */ linear-gradient(90deg, #fbbf24 0%, #f59e0b 30%, #ef4444 70%, #dc2626 100%)
/* After  */ linear-gradient(90deg, var(--risk-medium) 0%, var(--risk-medium) 30%, var(--risk-high) 70%, var(--risk-high) 100%)

/* Green bar */
/* Before */ linear-gradient(90deg, #10b981, #34d399)
/* After  */ linear-gradient(90deg, var(--risk-low), var(--risk-low))

/* Red bar */
/* Before */ linear-gradient(90deg, #ef4444, #f87171)
/* After  */ linear-gradient(90deg, var(--risk-high), var(--risk-high))

/* Amber bar */
/* Before */ linear-gradient(90deg, #f59e0b, #fbbf24)
/* After  */ linear-gradient(90deg, var(--risk-medium), var(--risk-medium))

/* Blue info gradient */
/* Before */ linear-gradient(to bottom right, #eff6ff, rgba(219, 234, 254, 0.5))
/* After  */ linear-gradient(to bottom right, var(--primary-50), var(--primary-a06))

/* Green info gradient */
/* Before */ linear-gradient(to bottom right, #ecfdf5, rgba(209, 250, 229, 0.5))
/* After  */ linear-gradient(to bottom right, var(--green-a06), var(--green-a08))

/* Amber info gradient */
/* Before */ linear-gradient(to bottom right, #fffbeb, rgba(254, 243, 199, 0.5))
/* After  */ linear-gradient(to bottom right, var(--amber-a06), var(--amber-a08))

/* Red info gradient */
/* Before */ linear-gradient(to bottom right, #fef2f2, rgba(254, 226, 226, 0.5))
/* After  */ linear-gradient(to bottom right, var(--red-a06), var(--red-a08))

/* Severity meter gradient (180deg) */
/* Before */ linear-gradient(180deg, #ef4444 0%, #dc2626 100%)
/* After  */ linear-gradient(180deg, var(--risk-high) 0%, var(--risk-high) 100%)
```

### Radial gradients (glow effects)

```css
/* Before */ radial-gradient(ellipse at top left, rgba(239, 68, 68, 0.12), transparent 60%)
/* After  */ radial-gradient(ellipse at top left, var(--red-a10), transparent 60%)

/* Before */ radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.12), transparent 60%)
/* After  */ radial-gradient(ellipse at top left, var(--primary-a12), transparent 60%)
```

### Box-shadow glow colours

```css
/* Before */ box-shadow: 0 0 12px rgba(239, 68, 68, 0.3)
/* After  */ box-shadow: 0 0 12px var(--red-a30)

/* Before */ box-shadow: 0 0 12px rgba(59, 130, 246, 0.15)
/* After  */ box-shadow: 0 0 12px var(--primary-a15)
```

---

## financial.css Specific Patterns

### Gauge stroke colours (deadline tracker)

```css
/* Before */ stroke: #10b981  /* After */ stroke: var(--risk-low)
/* Before */ stroke: #f59e0b  /* After */ stroke: var(--risk-medium)
/* Before */ stroke: #f97316  /* After */ stroke: var(--risk-medium)
/* Before */ stroke: #dc2626  /* After */ stroke: var(--risk-high)
```

### Accounts metric fill bars

```css
/* Before */ background: linear-gradient(90deg, #10b981, #34d399)
/* After  */ background: linear-gradient(90deg, var(--risk-low), var(--risk-low))

/* Before */ background: linear-gradient(90deg, #f59e0b, #fbbf24)
/* After  */ background: linear-gradient(90deg, var(--risk-medium), var(--risk-medium))
```

### Background colours

```css
/* Before */ background: #fafbfc  /* After */ background: var(--bg-subtle)
/* Before */ background: #ffffff  /* After */ background: var(--bg-white)
```

---

## Verification

1. **What We Check section**: click through all 4 tabs, verify each panel renders.
2. **Signal cards**: accent bars (coloured left border), severity meters, glow effects, preview thumbnails.
3. **Weight bar** in footer of the section: high/medium/low segments with correct colours.
4. **Swipe gestures** on mobile viewport for tab navigation.
5. **Financial tab**: deadline gauge (circular + scale bar), legal record card (tabs, stacked files, total bar), accounts snapshot (metric bars, fill animations).
6. **All hover micro-interactions**: card lifts, glow intensification, severity meter tooltips.
7. Run a grep on both files for any remaining:
   - `rgba(` — should be zero
   - `#[0-9a-fA-F]` — should be zero (will match inside comments — that's OK to remove too)
   - `white` or `black` (as colour values) — should be zero
8. Commit with message: `Phase E: tokenize what-we-check, financial CSS`
