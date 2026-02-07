# Phase 0 — Foundation (main.css)

**Hand this entire file to a fresh Claude Code session as the opening prompt.**

---

## Prerequisite

None. This phase must complete BEFORE any other phase begins.

## Goal

Replace the `:root` block in `main.css` with a comprehensive design token system, tokenize all remaining hardcoded colour values in main.css itself, and add backwards-compatibility aliases so existing `var(--blue-*)` references in other files keep working until those files are migrated.

## File to Modify

```
frontend/src/styles/main.css
```

**This is the ONLY file you should touch.**

---

## Step 1 — Replace the `:root` block

Replace the entire `:root { ... }` block (roughly lines 10–52) with this:

```css
:root {
  /* ── Primary (brand accent) ── */
  --primary-600: #003078;
  --primary-500: #1d70b8;
  --primary-100: #d2e2f1;
  --primary-50:  #d2e2f1;

  /* ── Success / Green ── */
  --green-primary: #00703c;

  /* ── Yellow (search button) ── */
  --yellow-500: #ffdd00;
  --yellow-600: #d4b600;

  /* ── Backgrounds ── */
  --bg-body:   #f3f2f1;
  --bg-white:  #ffffff;
  --bg-slate:  #f3f2f1;
  --bg-subtle: #f8fafc;

  /* ── Text ── */
  --text-900: #0b0c0c;
  --text-800: #0b0c0c;
  --text-700: #505a5f;
  --text-600: #505a5f;
  --text-500: #505a5f;
  --text-400: #b1b4b6;

  /* ── Borders ── */
  --border-light: #b1b4b6;
  --border-card:  #b1b4b6;

  /* ── Risk (multi-variant, semantic) ── */
  --risk-low:           #00703c;
  --risk-low-bg:        linear-gradient(to bottom right, #e7f4ed, rgba(0, 112, 60, 0.08));
  --risk-low-border:    rgba(0, 112, 60, 0.2);
  --risk-medium:        #f47738;
  --risk-medium-bg:     linear-gradient(to bottom right, #fef3ec, rgba(244, 119, 56, 0.08));
  --risk-medium-border: rgba(244, 119, 56, 0.25);
  --risk-high:          #d4351c;
  --risk-high-bg:       linear-gradient(to bottom right, #fbeae7, rgba(212, 53, 28, 0.08));
  --risk-high-border:   rgba(212, 53, 28, 0.2);

  /* ── Primary alpha scale ── */
  --primary-a03: rgba(29, 112, 184, 0.03);
  --primary-a06: rgba(29, 112, 184, 0.06);
  --primary-a10: rgba(29, 112, 184, 0.10);
  --primary-a12: rgba(29, 112, 184, 0.12);
  --primary-a15: rgba(29, 112, 184, 0.15);
  --primary-a25: rgba(29, 112, 184, 0.25);
  --primary-a30: rgba(29, 112, 184, 0.30);
  --primary-a45: rgba(29, 112, 184, 0.45);

  /* ── Green alpha scale ── */
  --green-a03: rgba(0, 112, 60, 0.03);
  --green-a06: rgba(0, 112, 60, 0.06);
  --green-a08: rgba(0, 112, 60, 0.08);
  --green-a10: rgba(0, 112, 60, 0.10);
  --green-a12: rgba(0, 112, 60, 0.12);
  --green-a15: rgba(0, 112, 60, 0.15);
  --green-a19: rgba(0, 112, 60, 0.19);
  --green-a20: rgba(0, 112, 60, 0.20);

  /* ── Amber alpha scale ── */
  --amber-a06: rgba(244, 119, 56, 0.06);
  --amber-a08: rgba(244, 119, 56, 0.08);
  --amber-a10: rgba(244, 119, 56, 0.10);
  --amber-a15: rgba(244, 119, 56, 0.15);
  --amber-a20: rgba(244, 119, 56, 0.20);
  --amber-a25: rgba(244, 119, 56, 0.25);
  --amber-a30: rgba(244, 119, 56, 0.30);

  /* ── Red alpha scale ── */
  --red-a06: rgba(212, 53, 28, 0.06);
  --red-a08: rgba(212, 53, 28, 0.08);
  --red-a10: rgba(212, 53, 28, 0.10);
  --red-a15: rgba(212, 53, 28, 0.15);
  --red-a20: rgba(212, 53, 28, 0.20);
  --red-a30: rgba(212, 53, 28, 0.30);

  /* ── Black overlay alpha scale ── */
  --black-a03: rgba(0, 0, 0, 0.03);
  --black-a04: rgba(0, 0, 0, 0.04);
  --black-a05: rgba(0, 0, 0, 0.05);
  --black-a06: rgba(0, 0, 0, 0.06);
  --black-a08: rgba(0, 0, 0, 0.08);
  --black-a10: rgba(0, 0, 0, 0.10);
  --black-a12: rgba(0, 0, 0, 0.12);
  --black-a15: rgba(0, 0, 0, 0.15);
  --black-a20: rgba(0, 0, 0, 0.20);
  --black-a25: rgba(0, 0, 0, 0.25);
  --black-a50: rgba(0, 0, 0, 0.50);
  --black-a55: rgba(0, 0, 0, 0.55);

  /* ── Ink (GOV.UK text-derived: rgb(11,12,12)) ── */
  --ink-a03: rgba(11, 12, 12, 0.03);
  --ink-a04: rgba(11, 12, 12, 0.04);
  --ink-a05: rgba(11, 12, 12, 0.05);
  --ink-a06: rgba(11, 12, 12, 0.06);
  --ink-a08: rgba(11, 12, 12, 0.08);
  --ink-a12: rgba(11, 12, 12, 0.12);
  --ink-a15: rgba(11, 12, 12, 0.15);
  --ink-a20: rgba(11, 12, 12, 0.20);

  /* ── Yellow alpha ── */
  --yellow-a45: rgba(255, 221, 0, 0.45);

  /* ── Composite gradients ── */
  --gradient-subtle:       linear-gradient(to bottom right, var(--primary-a06), var(--primary-a03));
  --gradient-green-subtle: linear-gradient(to bottom right, var(--green-a06), var(--green-a03));

  /* ── Typography ── */
  --font:      'Overpass', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'Consolas', 'Liberation Mono', monospace;

  /* ── Layout & Motion ── */
  --section-gap: clamp(3rem, 6vw, 6rem);
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);

  /* ── Backwards compat (remove in Phase F after all files migrated) ── */
  --blue-500: var(--primary-500);
  --blue-600: var(--primary-600);
  --blue-50:  var(--primary-50);
  --blue-100: var(--primary-100);
  --bg-blue-tint: var(--primary-100);
  --green-glow: var(--green-a12);
}
```

---

## Step 2 — Tokenize hardcoded values OUTSIDE `:root` in main.css

Replace every hardcoded rgba/hex outside the `:root` block with the corresponding token. Also rename all `var(--blue-*)` to `var(--primary-*)`.

### Replacement table

| Selector | Property | Old Value | New Value |
|---|---|---|---|
| `.icon-box` | background | `linear-gradient(to bottom right, rgba(29, 112, 184, 0.06), rgba(29, 112, 184, 0.03))` | `var(--gradient-subtle)` |
| `.icon-box` | box-shadow | `0 1px 2px rgba(11, 12, 12, 0.05)` | `0 1px 2px var(--ink-a05)` |
| `.icon-box` | border | `1px solid rgba(29, 112, 184, 0.15)` | `1px solid var(--primary-a15)` |
| `.icon-box i` | color | `var(--blue-500)` | `var(--primary-500)` |
| `.icon-box--emerald` | background | `linear-gradient(to bottom right, rgba(0, 112, 60, 0.06), rgba(0, 112, 60, 0.03))` | `var(--gradient-green-subtle)` |
| `.icon-box--emerald` | border-color | `rgba(0, 112, 60, 0.2)` | `var(--green-a20)` |
| `.card` | border | `1px solid rgba(11, 12, 12, 0.06)` | `1px solid var(--ink-a06)` |
| `.card` | box-shadow | `0 1px 3px rgba(11, 12, 12, 0.04)` | `0 1px 3px var(--ink-a04)` |
| `.card:hover` | box-shadow | `0 20px 25px -5px rgba(11, 12, 12, 0.08), 0 8px 10px -6px rgba(11, 12, 12, 0.04)` | `0 20px 25px -5px var(--ink-a08), 0 8px 10px -6px var(--ink-a04)` |
| `.section-label` | border | `1px solid rgba(29, 112, 184, 0.15)` | `1px solid var(--primary-a15)` |
| `.section-label` | background | `linear-gradient(to bottom right, rgba(29, 112, 184, 0.06), rgba(29, 112, 184, 0.03))` | `var(--gradient-subtle)` |
| `.section-label` | color | `var(--blue-500)` | `var(--primary-500)` |
| `.btn-primary` | background | `var(--blue-500)` | `var(--primary-500)` |
| `.btn-primary:hover` | background | `var(--blue-600)` | `var(--primary-600)` |
| `.btn-primary:hover` | box-shadow | `0 8px 20px rgba(29, 112, 184, 0.25)` | `0 8px 20px var(--primary-a25)` |
| `.step-number` | color | `var(--blue-500)` | `var(--primary-500)` |
| `.pricing-card.featured` | border-color | `var(--blue-500)` | `var(--primary-500)` |
| `.pricing-card.featured` | box-shadow | `0 0 0 1px var(--blue-500), 0 8px 32px rgba(29, 112, 184, 0.1)` | `0 0 0 1px var(--primary-500), 0 8px 32px var(--primary-a10)` |
| `.popular-badge` | background | `var(--blue-500)` | `var(--primary-500)` |
| `.trust-item i` | color | `var(--blue-500)` | `var(--primary-500)` |
| `.comparison-table` | box-shadow | `0 1px 3px rgba(0, 0, 0, 0.04)` | `0 1px 3px var(--black-a04)` |

### Global renames in main.css (any occurrences not covered above)

- `var(--blue-500)` → `var(--primary-500)`
- `var(--blue-600)` → `var(--primary-600)`
- `var(--blue-50)` → `var(--primary-50)`
- `var(--blue-100)` → `var(--primary-100)`

---

## Step 3 — Remove GOV.UK references

Remove any comments referencing "GOV.UK Design System" from main.css.

---

## Verification

1. Open the site — every page should render identically to before.
2. The backwards-compat aliases ensure zero breakage in files not yet migrated.
3. Spot-check visually: icon boxes, cards, section labels, pricing cards, buttons, comparison table.
4. Grep main.css outside `:root` for any remaining `rgba(`, `#` hex values — should be zero.
5. Commit this phase before starting any parallel phases.

---

## What Comes Next

After this phase is committed, Phases A through E can be started **simultaneously** by different sessions. Each has its own self-contained spec file.
