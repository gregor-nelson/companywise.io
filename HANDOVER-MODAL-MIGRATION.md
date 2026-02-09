# Handover: Migrate modal.js from Tailwind to Vanilla CSS

## Goal

Remove **all** Tailwind utility classes from `frontend/src/js/components/Handlers/modal/modal.js` and replace them with vanilla CSS class names using a `rm-` prefix (report modal). Write the corresponding CSS rules in `frontend/src/js/components/Handlers/modal/styles/modal.css`.

---

## Key Files

| File | Role |
|------|------|
| `frontend/src/js/components/Handlers/modal/modal.js` | The JS component — contains all the Tailwind classes inline in template literals |
| `frontend/src/js/components/Handlers/modal/styles/modal.css` | The CSS file — currently only has overlay/transition rules (39 lines). All new classes go here |
| `frontend/src/styles/tokens.css` | Design tokens — colours, spacing, typography, shadows, radii, etc. Use `var(--token-name)` everywhere |

---

## Project Conventions (follow these exactly)

### Class Naming
- Every component uses a **short prefix** in BEM-style: `hero-*`, `pr-*`, `pd-*`, `faq-*`, etc.
- For the modal, use the prefix **`rm-`** (report modal) since `modal-*` is too generic.
- Modifiers use double-dash: `rm-signal--pass`, `rm-signal--fail`
- Child elements use single-dash: `rm-section-header`, `rm-section-icon`

### CSS Conventions
- **Mobile-first**: base styles are mobile, use `@media (min-width: 640px)` for `sm:` breakpoints
- **Use design tokens** from `tokens.css` — never hardcode colours, spacing, or font sizes:
  - Colours: `var(--blue-500)`, `var(--neutral-800)`, `var(--emerald-50)`, `var(--red-600)`, etc.
  - Spacing: `var(--space-3)` = 0.75rem, `var(--space-5)` = 1.25rem, etc.
  - Font sizes: `var(--text-sm)` = 0.875rem, `var(--text-xs)` = 0.75rem, etc.
  - Font weights: `var(--font-semibold)` = 600, `var(--font-medium)` = 500, etc.
  - Radii: `var(--rounded-xl)` = 0.75rem, `var(--rounded-lg)` = 0.5rem, etc.
  - Shadows: `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)`, etc.
  - Leading: `var(--leading-tight)` = 1.25, `var(--leading-relaxed)` = 1.625, etc.
  - Tracking: `var(--tracking-wide)` = 0.025em, `var(--tracking-wider)` = 0.05em
- **File header** pattern:
  ```css
  /* ============================================
     COMPANYWISE — modal.css
     Report modal styles · Mobile-first
     Colour palette: design tokens
     ============================================ */
  ```
- **Section comments**: `/* ---- Section Name ---- */`

---

## What Needs Migrating

The modal.js file has Tailwind utility classes in every render method. Here's a section-by-section breakdown:

### 1. Shell Structure (renderShell, lines 127-142)
Tailwind classes to replace:
- Backdrop: `absolute inset-0 bg-black/50 backdrop-blur-sm`
- Container: `relative w-full h-full z-[1]`
- Inner wrapper: `bg-white flex flex-col h-full overflow-hidden`
- Scroll body: `flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col gap-6`
- Content wrapper: `w-full max-w-3xl mx-auto flex flex-col gap-5`

### 2. Header (renderHeader, renderHeaderSkeleton, lines 155-190)
- Header bar: `flex justify-between items-start gap-4 px-5 sm:px-8 py-5 border-b border-neutral-200/50 shrink-0`
- Inner: `w-full max-w-3xl mx-auto flex justify-between items-start gap-4`
- Title area: `min-w-0 flex-1`
- Title: `text-lg sm:text-xl font-semibold text-neutral-900 mb-1 leading-tight m-0`
- Subtitle: `text-sm text-neutral-400 m-0`
- Close button: `w-8 h-8 flex items-center justify-center bg-neutral-100 border border-neutral-200/50 rounded-lg cursor-pointer text-neutral-500 hover:text-neutral-900 transition-colors`
- Skeleton bars: `h-5 w-3/5 bg-neutral-200 rounded animate-pulse mb-1.5` (and similar)

### 3. Section Pattern (used by Overview, Filing, Financials, Health, Verdict)
Every section repeats:
- Section wrapper: `bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5`
- Section title: `text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2.5 m-0`
- Icon box: `w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm`
- Icon: `text-blue-500 text-base`

### 4. Data Cards (used in Overview, Filing, Financials)
- Card: `bg-white rounded-xl p-3 border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md`
- Label: `text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5`
- Value: `text-sm font-medium text-neutral-800`
- Grid: `grid grid-cols-2 gap-3` (or `grid-cols-2 sm:grid-cols-3`, `grid-cols-2 sm:grid-cols-4`)

### 5. Financial Snapshot (renderFinancials, lines 343-405)
- Financial card (centred): `bg-white rounded-xl p-3 border border-neutral-100/50 text-center transition-all hover:-translate-y-0.5 hover:shadow-md`
- Financial value: `text-lg font-semibold leading-tight text-neutral-900` or `text-red-600` when negative
- Accounts notice: `flex items-center gap-1.5 text-xs text-neutral-400 pt-3`

### 6. Health Signals (renderHealthSignals, lines 409-435)
- Pill container: `flex flex-wrap gap-2`
- Pass pill: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 border-emerald-200/50`
- Fail pill: same but `from-red-50 to-red-100/50 text-red-600 border-red-200/50`

### 7. Verdict (renderVerdict, lines 439-453)
- Section: `bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/50 p-4 sm:p-5`
- Icon box variant: `w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shadow-sm`
- Text: `text-sm text-neutral-700 leading-relaxed m-0`

### 8. Premium Gated Sections (renderPremiumGated, lines 462-536)
- Section: `bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5 relative overflow-hidden`
- Premium badge: `inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 text-[10px] font-bold uppercase tracking-wider text-blue-500`
- Blur wrapper: `blur-sm select-none pointer-events-none`
- Director row: `flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-100/50`
- Avatar circle: `w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shrink-0`
- Unlock overlay: `absolute inset-0 flex items-center justify-center z-[2]`
- Unlock button: `inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-blue-600 text-white text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-600/25`

### 9. Footer (renderFooter, renderFooterDefault, lines 540-568)
- Footer bar: `px-5 sm:px-8 py-3.5 border-t border-neutral-200/50 flex justify-center items-center shrink-0 bg-slate-50`
- Inner: `w-full max-w-3xl flex justify-between items-center`
- Source text: `text-xs text-neutral-400 m-0 flex items-center gap-1.5`
- Upgrade button: `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-none bg-blue-600 text-white text-xs font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-0.5`
- Premium status: `text-xs text-emerald-600 flex items-center gap-1.5`

### 10. Error State (renderError, lines 225-234)
- Wrapper: `text-center py-8 px-4`
- Icon: `block text-3xl mb-3 text-amber-500`
- Text: `text-sm text-neutral-600 m-0`

### 11. Skeleton States (renderSkeleton, lines 194-223)
- Skeleton bars: various `h-*`, `w-*`, `bg-neutral-200`, `rounded`, `animate-pulse` combinations
- Note: keep `animate-pulse` as a CSS keyframe in modal.css

---

## Suggested Class Mapping (starting point)

| Tailwind in JS | Vanilla class name |
|---|---|
| Backdrop div | `rm-backdrop` |
| Container div | `rm-container` |
| Inner wrapper | `rm-panel` |
| Scroll body | `rm-body` |
| Content wrapper | `rm-body-inner` |
| Header bar | `rm-header` |
| Header inner | `rm-header-inner` |
| Header title area | `rm-header-info` |
| Title h2 | `rm-title` |
| Subtitle p | `rm-subtitle` |
| Close button | `rm-close-btn` |
| Section wrapper | `rm-section` |
| Section (verdict variant) | `rm-section rm-section--verdict` |
| Section (locked variant) | `rm-section rm-section--locked` |
| Section title h3 | `rm-section-title` |
| Section icon box | `rm-section-icon` |
| Data grid | `rm-grid` / `rm-grid--2` / `rm-grid--3` / `rm-grid--4` |
| Data card | `rm-card` |
| Data card (centred) | `rm-card rm-card--center` |
| Card label | `rm-card-label` |
| Card value | `rm-card-value` / `rm-card-value--negative` / `rm-card-value--amber` |
| Signal pill | `rm-signal` / `rm-signal--pass` / `rm-signal--fail` |
| Signal container | `rm-signals` |
| Premium badge | `rm-premium-badge` |
| Blur wrapper | `rm-locked-blur` |
| Director row | `rm-director-row` |
| Director avatar | `rm-director-avatar` |
| Unlock overlay | `rm-unlock-overlay` |
| Unlock button | `rm-unlock-btn` |
| Footer bar | `rm-footer` |
| Footer inner | `rm-footer-inner` |
| Footer source text | `rm-footer-source` |
| Footer upgrade btn | `rm-footer-upgrade` |
| Premium unlocked text | `rm-footer-premium` |
| Accounts notice | `rm-accounts-notice` |
| Empty state wrapper | `rm-empty` |
| Empty state icon | `rm-empty-icon` |
| Empty state text | `rm-empty-text` |
| Error wrapper | `rm-error` |
| Skeleton bar | `rm-skel` / `rm-skel--title` / `rm-skel--text` / `rm-skel--wide` etc. |

---

## Existing CSS to Preserve

The current `modal.css` already has these rules that should be kept:

```css
.report-modal-overlay { /* fixed overlay with fade transition */ }
.report-modal-overlay.active { /* visible state */ }
.report-modal-container { /* slide-up animation */ }
.report-modal-overlay.active .report-modal-container { /* landed state */ }
body.modal-open { overflow: hidden; }
```

These class names (`report-modal-overlay`, `report-modal-container`) are referenced in JS for show/hide logic — keep them as-is.

---

## Reference: Already-Migrated Components

Look at these as examples of the target pattern:
- `frontend/src/js/components/Home/hero/hero.js` + `hero/styles/hero.css` — `hero-*` prefix
- `frontend/src/js/components/Handlers/purchase-dialog/purchase-dialog.js` + `styles/purchase-dialog.css` — `pd-*` prefix
- `frontend/src/js/components/Report/premium-report/premium-report.js` + `styles/premium-report.css` — `pr-*` prefix

---

## Checklist

- [ ] Create all `rm-*` classes in `modal.css`, using design tokens from `tokens.css`
- [ ] Replace every Tailwind utility string in `modal.js` with the corresponding `rm-*` class(es)
- [ ] Add `@keyframes pulse` animation in `modal.css` for skeleton loading states
- [ ] Keep existing `report-modal-overlay` and `report-modal-container` classes untouched
- [ ] Responsive: use `@media (min-width: 640px)` for `sm:` breakpoint equivalents
- [ ] Hover/transition effects: replicate `hover:-translate-y-0.5`, `hover:shadow-md`, `transition-all` etc. in CSS
- [ ] Test: visually the modal should look identical before and after
- [ ] Do NOT touch any JS logic — only change class strings in template literals
