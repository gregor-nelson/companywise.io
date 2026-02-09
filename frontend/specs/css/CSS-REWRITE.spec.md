# CSS Rewrite Specification — Mobile-First Token-Driven

**Version:** 1.0.0
**Status:** In progress
**Last Updated:** 2026-02-09

---

## 1. Intent

Every component CSS file across the site is being rewritten from scratch to achieve:

1. **Mobile-first responsive design** — base styles define the mobile view; `min-width` breakpoints layer on tablet and desktop.
2. **Exclusive use of `tokens.css` variables** — no raw `px`, `rem`, hex, or numeric values outside of `0`, `100%`, SVG path data, and `calc()` expressions that combine tokens.
3. **Consistent visual language** — every component draws from the same palette, spacing scale, typography, and motion tokens so the site reads as one cohesive product.
4. **Clean, modern CSS** — no legacy tokens, no vendor prefixes for well-supported properties, no unnecessary nesting or overrides.

The CTA component (`cta.css`) is the **reference implementation**. All subsequent rewrites must match its conventions exactly.

---

## 2. Rules (non-negotiable)

### 2.1 Mobile-First Breakpoints

```
Base styles        →  mobile (< 640px)
@media (min-width: 640px)   →  small / large-mobile
@media (min-width: 768px)   →  tablet
@media (min-width: 1024px)  →  desktop
@media (min-width: 1280px)  →  wide (only if needed)
```

- Base selectors define the **mobile** layout. Never write a base style that only makes sense at desktop width.
- Each breakpoint only adds or overrides what changes at that width — no repeating unchanged values.

### 2.2 Token Usage

Every value must reference a `var(--*)` token from `tokens.css`:

| Property category | Token family | Example |
|---|---|---|
| Color | `--brand`, `--cta`, `--success`, `--danger`, `--warning`, `--text-*`, `--surface`, `--page`, `--muted`, `--border`, primitives (`--blue-500` etc.) | `color: var(--text-secondary)` |
| Spacing / sizing | `--space-*` | `padding: var(--space-4)` |
| Font size | `--text-*` | `font-size: var(--text-sm)` |
| Font weight | `--font-*` | `font-weight: var(--font-medium)` |
| Letter spacing | `--tracking-*` | `letter-spacing: var(--tracking-tight)` |
| Line height | `--leading-*` | `line-height: var(--leading-relaxed)` |
| Border radius | `--rounded-*` | `border-radius: var(--rounded-xl)` |
| Border width | `--border-*` | `border: var(--border-1) solid var(--border)` |
| Box shadow | `--shadow-*` | `box-shadow: var(--shadow-lg)` |
| Opacity | `--opacity-*` | `opacity: var(--opacity-0)` |
| Blur | `--blur-*` | `filter: blur(var(--blur-3xl))` |
| Z-index | `--z-*` | `z-index: var(--z-10)` |
| Duration | `--duration-*` | `transition: ... var(--duration-200) ...` |
| Easing | `--ease-*` | `transition: ... var(--ease-in-out)` |
| Max-width | `--max-w-*` | `max-width: var(--max-w-7xl)` |
| Section rhythm | `--section-gap` | `padding: var(--section-gap) 0` |
| Font family | `--font`, `--font-mono` | `font-family: var(--font)` |

**Allowed raw values:** `0`, `none`, `100%`, `auto`, `inherit`, `currentColor`, `transparent`, SVG `d` attributes, and numbers inside `calc()` that combine tokens (e.g. `calc(100% - var(--space-14))`).

**Forbidden:** Any raw `px`, `rem`, `em`, `#hex`, `rgb()`, numeric opacity, numeric z-index, or hardcoded duration/easing. If a needed value doesn't exist in `tokens.css`, flag it — don't invent a raw fallback.

### 2.3 Legacy Token Ban

The following legacy tokens from older CSS files are **not valid** and must not be carried over:

- `--black-a04`, `--black-a06`, `--black-a10` (use `color-mix()` with `--text` or primitives)
- `--green-a10`, `--primary-a06`, `--primary-a12` (use semantic tokens `--success`, `--brand`, `--brand-bg`)
- Any `--*-a{XX}` alpha tokens not defined in `tokens.css`

### 2.4 File Header

```css
/* ============================================
   COMPANYWISE — {filename}.css
   {Component name} styles · Mobile-first
   Colour palette: design tokens
   ============================================ */
```

### 2.5 Section Comments

Group rules by DOM order with clear section headers:

```css
/* ---- Section Name ---- */
```

Use `/* === Block Name === */` for major structural divisions.

### 2.6 Class Naming

- Preserve all existing class names from the component's JS file. Do not rename.
- Component prefix pattern: `.cta-*`, `.prc-*`, `.faq-*`, `.hiw-*`, etc.
- BEM-style modifiers: `.cta-button--primary`, `.cta-card-icon--blue`
- State classes driven by JS: `.is-visible`, `.active`, `.visible`

### 2.7 Animation Pattern

```css
.fade-in-up {
  opacity: var(--opacity-0);
  transform: translateY(var(--space-5));
  transition:
    opacity var(--duration-500) var(--ease-out),
    transform var(--duration-500) var(--ease-out);
}

.fade-in-up.is-visible {
  opacity: var(--opacity-100);
  transform: translateY(0);
}
```

All animated elements start hidden and transition in when JS adds `.is-visible`. Duration and easing use tokens.

### 2.8 Responsive Container Pattern

Every section uses a consistent container:

```css
.{prefix}-container {
  max-width: var(--max-w-7xl);
  margin: 0 auto;
  padding: 0 var(--space-4);
  width: 100%;
  position: relative;
  z-index: var(--z-10);
}

@media (min-width: 768px) {
  .{prefix}-container { padding: 0 var(--space-6); }
}

@media (min-width: 1024px) {
  .{prefix}-container { padding: 0 var(--space-8); }
}
```

---

## 3. Component Inventory

### 3.1 Home Page Components

| Component | CSS File | Current State | Action |
|---|---|---|---|
| Hero | `Home/hero/styles/hero.css` | Has content, uses tokens, **not mobile-first** | Rewrite mobile-first |
| Call to Action | `Home/call-to-action/styles/cta.css` | **Done — reference implementation** | None |
| How It Works | `Home/how-it-works/styles/how-it-works.css` | Empty | Write from scratch |
| What We Check | `Home/what-we-check/styles/what-we-check.css` | Has content, legacy tokens, not mobile-first | Rewrite |
| What We Check — Financial | `Home/what-we-check/styles/components/financial.css` | Has content, legacy tokens | Rewrite |
| Why Us | `Home/why-us/styles/why-companywise.css` | Has content, likely legacy tokens | Rewrite |
| Pricing | `Home/pricing/styles/pricing.css` | Has content, raw values + legacy tokens | Rewrite |
| FAQ | `Home/faq/styles/faq.css` | Empty | Write from scratch |

### 3.2 Global Components

| Component | CSS File | Current State | Action |
|---|---|---|---|
| Header | `Global/header/styles/header.css` | Has content, raw values + legacy tokens | Rewrite |
| Footer | `Global/footer/styles/footer.css` | Has content, minimal | Rewrite |

### 3.3 Handler Components

| Component | CSS File | Current State | Action |
|---|---|---|---|
| Modal | `Handlers/modal/styles/modal.css` | Has content | Rewrite |
| Upgrade Prompt | `Handlers/upgrade-prompt/styles/upgrade-prompt.css` | Has content | Rewrite |
| Purchase Dialog | `Handlers/purchase-dialog/styles/purchase-dialog.css` | Has content | Rewrite |
| Account Modal | `Handlers/account-modal/styles/account-modal.css` | Has content | Rewrite |
| Credit Badge | `Handlers/credit-badge/styles/credit-badge.css` | Has content | Rewrite |

### 3.4 Report Components

| Component | CSS File | Current State | Action |
|---|---|---|---|
| Premium Report | `Report/premium-report/styles/premium-report.css` | Has content | Rewrite |

---

## 4. Suggested Order of Work

Priority is user-facing page flow, top to bottom:

1. **Header** — visible on every page
2. **Hero** — already has tokens, needs mobile-first flip
3. ~~CTA~~ — done
4. **How It Works** — empty, write fresh
5. **What We Check** + **Financial** sub-component
6. **Why Us**
7. **Pricing**
8. **FAQ** — empty, write fresh
9. **Footer** — visible on every page
10. **Handlers** (modal, upgrade-prompt, purchase-dialog, account-modal, credit-badge)
11. **Premium Report**

---

## 5. Process Per Component

1. Read the component's JS file to extract every class name and DOM structure.
2. Write CSS mobile-first, grouped by DOM order.
3. Use only `tokens.css` variables — zero raw values.
4. Preserve all existing class names and JS-driven state classes.
5. Verify at mobile, tablet (768px), and desktop (1024px) viewports.
6. Confirm all animations trigger correctly via IntersectionObserver / JS.

---

## 6. Reference Implementation

`frontend/src/js/components/Home/call-to-action/styles/cta.css`

This file is the canonical example of the target approach. When in doubt, match its conventions.
