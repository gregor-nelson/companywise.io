# CSS Design Token Remediation — Session Prompt

**Purpose:** Hand this entire file to a fresh Claude Code session as the opening prompt.

---

## Goal

Make the site's visual design trivially changeable by ensuring **every colour, font, spacing, and easing value** in every component CSS file references a `var(--token)` defined in `frontend/src/styles/main.css :root`. **No hardcoded hex, rgb, rgba, named colours, or font names in component files.** The user has not finalised a design language yet — the system must be palette-agnostic so swapping the entire colour scheme means editing **only** `:root`.

Remove all references to "GOV.UK Design System" from code comments and specs. The palette should be treated as a generic, swappable set of tokens.

### What This Means in Practice

If a component currently has:
```css
background: linear-gradient(to bottom right, rgba(29, 112, 184, 0.06), rgba(29, 112, 184, 0.03));
border: 1px solid rgba(29, 112, 184, 0.15);
box-shadow: 0 4px 12px rgba(29, 112, 184, 0.3);
color: #1d70b8;
```

It should become:
```css
background: var(--blue-gradient-subtle);
border: 1px solid var(--blue-border-light);
box-shadow: 0 4px 12px var(--blue-shadow);
color: var(--blue-500);
```

With all those tokens defined in `:root`. **Every single colour-like value** — including rgba tints, gradient colours, shadow colours, border colours — must be a `var()` reference. The only raw values allowed in component files are structural ones: sizes, padding, border-radius, border-width, opacity (standalone), z-index, etc.

---

## Approach: Plan First, Then Execute in Phases

**Do NOT start editing files immediately.** This is a large task across 15+ CSS files. Use this approach:

### Step 1: Audit

1. Read `frontend/src/styles/main.css` to understand the current `:root` token block
2. Scan ALL component CSS files for every distinct hardcoded colour value (hex, rgb, rgba, named colours, gradients with colours, shadows with colours, borders with colours)
3. Build a complete inventory of every unique colour usage across the codebase

### Step 2: Design the Token System

1. Group the colour usages into semantic categories (e.g. blue tints, green tints, risk colours, text colours, borders, shadows, backgrounds)
2. Design a complete set of `:root` tokens that covers every usage found in the audit
3. Use a clear, consistent naming convention. Suggested structure:
   - `--blue-500`, `--blue-600` (base colours)
   - `--blue-tint-subtle`, `--blue-tint-medium` (light background tints)
   - `--blue-border`, `--blue-border-light` (border colours)
   - `--blue-shadow`, `--blue-shadow-strong` (shadow colours)
   - `--blue-gradient-subtle` (full gradient values including direction)
   - Same pattern for green, amber/orange, red, neutral/grey
4. Present the full proposed token list to the user for approval before writing any code

### Step 3: Implement in Phases

Once the token system is approved:
1. Add all new tokens to `:root` in `main.css`
2. Work through component files one at a time, replacing every hardcoded colour with the appropriate `var(--token)`
3. After each file, verify zero remaining hardcoded colours with a grep

---

## Current State of the Codebase

### Token definitions
`frontend/src/styles/main.css` — the `:root` block (roughly lines 10–50) already has some tokens defined. Some component files already use `var(--token)` for some values but still have hardcoded values for others.

### Prior remediation work (partially complete, partially misaligned)
A previous session made changes to some files but used the wrong approach — it replaced Tailwind hex values with different hardcoded `rgba()` values instead of `var()` tokens. These files have a mix of `var()` references and raw `rgba()` values:

- `main.css` — `:root` tokens defined, some `white` → `var(--bg-white)` done
- `header.css` — mostly converted to `var()` tokens
- `hero.css` — partially converted, has both `var()` and raw `rgba()`
- `modal.css` — partially converted
- `account-modal.css` — partially converted, has both `var()` and raw `rgba()`
- `premium-report.css` — partially converted, has both `var()` and raw `rgba()`
- `pricing.css` — partially converted, has both `var()` and raw `rgba()`

### Untouched files (still full of hardcoded Tailwind colours)
- `faq.css` — `frontend/src/js/components/faq/styles/faq.css`
- `purchase-dialog.css` — `frontend/src/js/components/purchase-dialog/styles/purchase-dialog.css`
- `credit-badge.css` — `frontend/src/js/components/credit-badge/styles/credit-badge.css`
- `upgrade-prompt.css` — `frontend/src/js/components/upgrade-prompt/styles/upgrade-prompt.css`
- `how-it-works.css` — `frontend/src/js/components/how-it-works/styles/how-it-works.css`
- `why-companywise.css` — `frontend/src/js/components/why-us/styles/why-companywise.css`
- `cta.css` — `frontend/src/js/components/call-to-action/styles/cta.css`
- `what-we-check.css` — `frontend/src/js/components/what-we-check/styles/what-we-check.css`
- `financial.css` — `frontend/src/js/components/what-we-check/styles/components/financial.css`

### Clean files (no changes needed)
- `footer.css` — already clean

### Docs to update
- `frontend/specs/css/CSS-DESIGN-SYSTEM.spec.md` — remove GOV.UK references, document final token system

---

## File Paths Quick Reference

```
frontend/src/styles/main.css                                              (token definitions)
frontend/src/js/components/header/styles/header.css
frontend/src/js/components/hero/styles/hero.css
frontend/src/js/components/modal/styles/modal.css
frontend/src/js/components/account-modal/styles/account-modal.css
frontend/src/js/components/premium-report/styles/premium-report.css
frontend/src/js/components/pricing/styles/pricing.css
frontend/src/js/components/faq/styles/faq.css
frontend/src/js/components/purchase-dialog/styles/purchase-dialog.css
frontend/src/js/components/credit-badge/styles/credit-badge.css
frontend/src/js/components/upgrade-prompt/styles/upgrade-prompt.css
frontend/src/js/components/how-it-works/styles/how-it-works.css
frontend/src/js/components/why-us/styles/why-companywise.css
frontend/src/js/components/call-to-action/styles/cta.css
frontend/src/js/components/what-we-check/styles/what-we-check.css
frontend/src/js/components/what-we-check/styles/components/financial.css
frontend/src/js/components/footer/styles/footer.css                       (already clean)
frontend/specs/css/CSS-DESIGN-SYSTEM.spec.md                              (docs — update last)
```

---

## Key Rules

1. **ZERO hardcoded colour values in component files.** Every colour must be `var(--token)`. This includes:
   - Hex values (`#1d70b8`)
   - rgb/rgba values (`rgba(29, 112, 184, 0.15)`)
   - Named colours (`white`, `black`, `transparent` is OK)
   - Colours inside gradients (`linear-gradient(... #hex ...)`)
   - Colours inside shadows (`box-shadow: ... rgba(...) ...`)
   - Colours inside borders (`border: 1px solid #hex`)

2. **Full gradients can be tokens.** If a gradient pattern repeats, make the whole gradient a token:
   ```css
   --blue-gradient-subtle: linear-gradient(to bottom right, rgba(29, 112, 184, 0.06), rgba(29, 112, 184, 0.03));
   ```
   Then component files just use `background: var(--blue-gradient-subtle);`

3. **Shadow colours should be tokens.** E.g. `--blue-shadow: rgba(29, 112, 184, 0.25);`

4. **Border colours should be tokens.** E.g. `--blue-border-light: rgba(29, 112, 184, 0.15);`

5. **Font references:** `var(--font)` with no fallback. The actual font (Overpass) is defined in `:root`. Remove any `'Jost'` fallbacks.

6. **`transparent` and `currentColor` are allowed** — these are CSS keywords, not hardcoded colours.

7. **`rgba(0, 0, 0, X)` for overlays/shadows** should also be tokenised (e.g. `--overlay-bg`, `--shadow-soft`, etc.)

8. **Work in phases** to avoid context window saturation. Group files by size/complexity.

9. **Present the full token system design for approval** before making any edits.

10. **Remove all GOV.UK Design System references** from comments and spec files.

---

## Validation

After all files are done, run a grep across all component CSS files for:
- Any `#` followed by 3-8 hex chars (hex colours)
- Any `rgb(` or `rgba(` (raw colour functions)
- Any colour keywords (`white`, `black`, `red`, `blue`, `green`, etc. used as values)
- Any `'Jost'` or font name strings

The only matches should be inside `main.css :root` (where the actual values are defined). Component files should have zero matches.
