# Phase F — Cleanup & Final Validation

**Hand this entire file to a fresh Claude Code session as the opening prompt.**

---

## Prerequisite

ALL previous phases (0, A, B, C, D, E) must be committed first. Every component CSS file should already be fully tokenized.

## Goal

1. Remove backwards-compatibility aliases from `:root` in main.css
2. Run a final validation grep across ALL CSS files
3. Update the design system spec document
4. Remove any remaining GOV.UK Design System references from comments

## File to Modify

```
frontend/src/styles/main.css                          (remove compat aliases)
frontend/specs/css/CSS-DESIGN-SYSTEM.spec.md          (update documentation)
```

---

## Step 1 — Remove backwards-compat aliases from `:root`

In `frontend/src/styles/main.css`, find and DELETE the backwards-compatibility block at the bottom of `:root`:

```css
  /* ── Backwards compat (remove in Phase F after all files migrated) ── */
  --blue-500: var(--primary-500);
  --blue-600: var(--primary-600);
  --blue-50:  var(--primary-50);
  --blue-100: var(--primary-100);
  --bg-blue-tint: var(--primary-100);
  --green-glow: var(--green-a12);
```

Remove those 7 lines (comment + 6 aliases).

---

## Step 2 — Validate no orphaned references

Search ALL CSS files in the project for any remaining references to the removed aliases:

```
var(--blue-500)
var(--blue-600)
var(--blue-50)
var(--blue-100)
var(--bg-blue-tint)
var(--green-glow)
```

**Expected result: ZERO matches.** If any matches are found, replace them:
- `var(--blue-500)` → `var(--primary-500)`
- `var(--blue-600)` → `var(--primary-600)`
- `var(--blue-50)` → `var(--primary-50)`
- `var(--blue-100)` → `var(--primary-100)`
- `var(--bg-blue-tint)` → `var(--primary-100)`
- `var(--green-glow)` → `var(--green-a12)`

---

## Step 3 — Final validation across ALL component CSS files

Run these greps across all files EXCEPT the `:root` block in main.css:

### Files to check (all component CSS)

```
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
frontend/src/js/components/footer/styles/footer.css
```

Also check main.css OUTSIDE the `:root` block.

### Patterns to search for

1. **Hex colours**: `#[0-9a-fA-F]{3,8}` — should be ZERO matches
2. **Raw colour functions**: `rgb(` or `rgba(` — should be ZERO matches
3. **Named colours used as values**: `white`, `black` — should be ZERO matches (except `transparent` and `currentColor` which are OK)
4. **Font name strings**: `'Jost'` — should be ZERO matches
5. **Old token names**: `var(--blue-` — should be ZERO matches

### Expected outcome
The ONLY file containing raw hex/rgb/rgba values should be `main.css` inside the `:root` block. Every component file should exclusively use `var(--token)` references.

---

## Step 4 — Remove GOV.UK references

Search all CSS files and spec files for any comments referencing:
- "GOV.UK"
- "gov.uk"
- "Government Digital Service"
- "GDS"

Remove or replace those comments. The palette should be described as "CompanyWise design tokens" or similar.

---

## Step 5 — Update design system spec

Update `frontend/specs/css/CSS-DESIGN-SYSTEM.spec.md` to document:
1. The complete token system (copy from the `:root` block)
2. The naming convention (primary-*, green-*, amber-*, red-*, black-*, ink-*, text-*, bg-*, border-*)
3. The alpha scale pattern (e.g. `--primary-a06` = primary colour at 6% opacity)
4. The composite tokens (--gradient-subtle, --gradient-green-subtle)
5. The font tokens (--font, --font-mono)
6. Rules for contributors: no hardcoded colours in component files

---

## Verification

1. Open the site and scroll through EVERY section:
   - Header (scroll shadow)
   - Hero (search, cards, trust ticker)
   - How It Works (step cards, previews)
   - What We Check (all 4 tabs, financial sub-component)
   - Why CompanyWise (comparison cards)
   - Pricing (featured card, badges)
   - FAQ (expand/collapse)
   - CTA (float cards, avatars, button)
   - Footer
2. Open modal dialogs: free report, premium report, account modal, purchase dialog, upgrade prompt.
3. Check all risk badge states: low (green), medium (amber), high (red).
4. Check credit badge: normal, low, empty.
5. Test mobile responsive layout.
6. Browser DevTools: inspect `:root` to confirm a clean, well-organized token list.
7. Commit with message: `Phase F: remove compat aliases, final validation, update spec`
