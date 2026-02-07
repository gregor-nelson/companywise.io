# CompanyWise CSS Design System Specification

**Status:** Active
**Last Updated:** 2026-02-07
**Source of Truth:** `frontend/src/styles/main.css`
**Colour Alignment:** GOV.UK Design System

---

## 1. Rule

**Every colour, font, spacing token, and easing function in any component CSS file MUST reference a `var(--token)` defined in `main.css :root`.** No hardcoded hex, rgb, rgba, hsl, or named colour values are permitted in component stylesheets.

### Allowed

```css
color: var(--text-900);
background: var(--risk-low-bg);
border-color: var(--border-light);
font-family: var(--font);
```

### Not Allowed

```css
color: #0b0c0c;
background: #f3f2f1;
border-color: rgb(177, 180, 182);
font-family: 'Overpass', sans-serif;
```

### Exception

`rgba()` derived from a token's base colour is acceptable ONLY for opacity variants (hover states, tinted backgrounds) where the base colour matches the token. Always add a comment referencing the source token.

```css
/* derived from --blue-500: #1d70b8 */
background: rgba(29, 112, 184, 0.06);
```

---

## 2. Design Tokens

All tokens are defined in `frontend/src/styles/main.css` under `:root`.

### 2.1 Backgrounds

| Token | Value | GOV.UK Source | Usage |
|---|---|---|---|
| `--bg-body` | `#f3f2f1` | light-grey | Page background |
| `--bg-white` | `#ffffff` | white | Cards, panels, surfaces |
| `--bg-slate` | `#f3f2f1` | light-grey | Subtle backgrounds, disabled inputs |
| `--bg-blue-tint` | `#d2e2f1` | blue 50% tint | Highlighted/selected backgrounds |

### 2.2 Borders

| Token | Value | GOV.UK Source | Usage |
|---|---|---|---|
| `--border-light` | `#b1b4b6` | mid-grey | Dividers, subtle borders, progress bars |
| `--border-card` | `#b1b4b6` | mid-grey | Card borders |

### 2.3 Primary (Brand)

| Token | Value | GOV.UK Source | Usage |
|---|---|---|---|
| `--blue-500` | `#1d70b8` | brand-colour | Primary buttons, links, icons, accents |
| `--blue-600` | `#003078` | dark-blue | Hover states, emphasis |
| `--blue-50` | `#d2e2f1` | blue 50% tint | Light blue backgrounds |
| `--blue-100` | `#d2e2f1` | blue 50% tint | Light blue tinted areas |

### 2.4 Text

| Token | Value | GOV.UK Source | Usage |
|---|---|---|---|
| `--text-900` | `#0b0c0c` | black | Headings, primary text |
| `--text-800` | `#0b0c0c` | black | Strong body text |
| `--text-700` | `#505a5f` | dark-grey | Default body text |
| `--text-500` | `#505a5f` | dark-grey | Secondary/supporting text |
| `--text-400` | `#b1b4b6` | mid-grey | Muted text, placeholders, disabled |

### 2.5 Risk / Status

| Token | Value | GOV.UK Source | Usage |
|---|---|---|---|
| `--risk-low` | `#00703c` | green / success | Low risk, good standing, active status |
| `--risk-low-bg` | gradient | derived from green | Low risk badge/card backgrounds |
| `--risk-low-border` | `rgba(0,112,60,0.2)` | derived from green | Low risk borders |
| `--risk-medium` | `#f47738` | orange | Medium risk, warnings, caution |
| `--risk-medium-bg` | gradient | derived from orange | Medium risk badge/card backgrounds |
| `--risk-medium-border` | `rgba(244,119,56,0.25)` | derived from orange | Medium risk borders |
| `--risk-high` | `#d4351c` | red / error | High risk, alerts, dissolved, CCJ |
| `--risk-high-bg` | gradient | derived from red | High risk badge/card backgrounds |
| `--risk-high-border` | `rgba(212,53,28,0.2)` | derived from red | High risk borders |

### 2.6 Green (General)

| Token | Value | GOV.UK Source | Usage |
|---|---|---|---|
| `--green-primary` | `#00703c` | green | Success icons, trust indicators, check marks |
| `--green-glow` | `rgba(0,112,60,0.12)` | derived from green | Glow/highlight effects |

### 2.7 Typography & Layout

| Token | Value | Usage |
|---|---|---|
| `--font` | `'Overpass', system-ui, sans-serif` | All text. Always use this, never hardcode a font name. |
| `--section-gap` | `clamp(3rem, 6vw, 6rem)` | Vertical padding between sections |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard easing for transitions |

---

## 3. Usage Guide

### When to use which text token

| Context | Token |
|---|---|
| Page headings (h1-h3) | `--text-900` |
| Card titles, strong labels | `--text-800` |
| Body copy, descriptions | `--text-700` |
| Subtitles, supporting text | `--text-500` |
| Muted labels, timestamps, disabled | `--text-400` |

### When to use which blue token

| Context | Token |
|---|---|
| Primary buttons, active links, icons | `--blue-500` |
| Hover states on primary elements | `--blue-600` |
| Light backgrounds (selected state, tints) | `--blue-50` or `--blue-100` |

### When to use which risk token

| Context | Token |
|---|---|
| Risk label text / icon colour | `--risk-low`, `--risk-medium`, `--risk-high` |
| Risk badge/card background | `--risk-low-bg`, `--risk-medium-bg`, `--risk-high-bg` |
| Risk badge/card border | `--risk-low-border`, `--risk-medium-border`, `--risk-high-border` |

### Green vs Risk-Low

`--green-primary` and `--risk-low` resolve to the same value (`#00703c`). Use:
- `--risk-low` when indicating a risk assessment result
- `--green-primary` when indicating general success, trust, or positive status (check marks, trust badges)

---

## 4. Remaining Remediation

The following files still contain hardcoded colour values that need converting to `var()` references.

### hero.css (skipped - pending redesign review)

| Hardcoded | Location | Suggested Token |
|---|---|---|
| `#fafafa` | `.hero-search-input:disabled` | `var(--bg-slate)` |
| `#facc15` / `#eab308` / `#fde68a` | `.hero-search-btn` | New yellow token needed (decision: keep or align to GOV.UK `#ffdd00`) |
| `#dc2626` | `.hero-search-error` | `var(--risk-high)` |
| `#10b981` | `.hero-checklist-item i` | `var(--green-primary)` |
| `#f3f4f6` | `.hero-unified-flags-count` | `var(--bg-slate)` |

### header.css

| Hardcoded | Location | Suggested Token |
|---|---|---|
| `rgb(239 246 255)` | `.hamburger-btn.drawer-open bg` | `var(--blue-50)` |
| `rgb(37 99 235)` | `.hamburger-btn.drawer-open color` | `var(--blue-500)` |
| `rgb(64 64 64)` | `[data-dropdown-toggle] color` | `var(--text-700)` |
| `rgb(37 99 235)` | `[data-dropdown-toggle]:hover color` | `var(--blue-500)` |
| `rgb(64 64 64)` | `[data-dropdown-item] color` | `var(--text-700)` |
| `rgb(249 250 251)` | `[data-dropdown-item]:hover bg` | `var(--bg-slate)` |
| `rgb(115 115 115)` | `[data-dropdown-item] i color` | `var(--text-500)` |

### main.css (low-level selectors)

| Hardcoded | Location | Suggested Token |
|---|---|---|
| `#f0f0f0` | `.faq-item`, `.footer` borders | `var(--border-light)` |
| `#f5f5f5` | `.comparison-table` row borders | `var(--border-light)` |
| `#e5e7eb` / `#d1d5db` | `.section-divider`, `.btn-secondary` | `var(--border-light)` |

### Other component files with minor hardcoded values

| File | Values | Notes |
|---|---|---|
| `faq.css` | `#f5f5f5` | Icon/chevron backgrounds |
| `what-we-check.css` | `#f1f5f9`, `#f8fafc`, `#64748b`, `#475569` | Tab colours - need new tokens or map to existing |
| `premium-report.css` | `#f0f0f0` | Score ring background stroke |

---

## 5. Adding New Tokens

If a component needs a colour that doesn't exist in the token list:

1. Check if an existing token covers the use case
2. If not, add the new token to `:root` in `main.css` with a comment noting its GOV.UK source
3. Use the GOV.UK colour palette as the primary reference
4. Name convention: `--{category}-{descriptor}` (e.g. `--bg-light`, `--border-mid`, `--yellow-accent`)
5. Update this document

---

## 6. Colour Source

All colours are derived from the [GOV.UK Design System colour palette](https://design-system.service.gov.uk/styles/colour/). Any deviation must be documented with rationale.

| GOV.UK Colour | Hex | Used As |
|---|---|---|
| black | `#0b0c0c` | `--text-900`, `--text-800` |
| dark-grey | `#505a5f` | `--text-700`, `--text-500` |
| mid-grey | `#b1b4b6` | `--text-400`, `--border-light`, `--border-card` |
| light-grey | `#f3f2f1` | `--bg-body`, `--bg-slate` |
| white | `#ffffff` | `--bg-white` |
| blue (brand) | `#1d70b8` | `--blue-500` |
| dark-blue | `#003078` | `--blue-600` |
| green (success) | `#00703c` | `--risk-low`, `--green-primary` |
| orange | `#f47738` | `--risk-medium` |
| red (error) | `#d4351c` | `--risk-high` |
