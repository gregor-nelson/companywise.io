# CSS Token Alignment — Design Reference

> **Goal:** Every component CSS file uses global tokens from `tokens.css` so that changing a single token value updates the entire app. This makes theme-swapping and style consolidation trivial.
>
> **Reference implementation:** `hero.css` — fully migrated, use as the pattern for all other components.

---

## Architecture

```
tokens.css          ← single source of truth (primitives + semantics)
  ↓
component.css       ← consumes tokens only, zero hardcoded values where avoidable
```

Change a token → every component updates. That's the contract.

### Files

| File | Role |
|---|---|
| `frontend/src/styles/tokens.css` | Token definitions — **do not modify per-component** |
| `frontend/src/styles/main.css` | Global layout styles |
| `frontend/src/js/components/hero/styles/hero.css` | Reference implementation (fully migrated) |

### Components to migrate

| Component | CSS file |
|---|---|
| Header | `header/styles/header.css` |
| How It Works | `how-it-works/styles/how-it-works.css` |
| What We Check | `what-we-check/styles/what-we-check.css` |
| Pricing | `pricing/styles/pricing.css` |
| Why Us | `why-us/styles/why-companywise.css` |
| FAQ | `faq/styles/faq.css` |
| Call to Action | `call-to-action/styles/cta.css` |
| Footer | `footer/styles/footer.css` |
| Premium Report | `premium-report/styles/premium-report.css` |
| Upgrade Prompt | `upgrade-prompt/styles/upgrade-prompt.css` |
| Credit Badge | `credit-badge/styles/credit-badge.css` |
| Purchase Dialog | `purchase-dialog/styles/purchase-dialog.css` |
| Account Modal | `account-modal/styles/account-modal.css` |
| Modal | `modal/styles/modal.css` |

---

## Token Quick-Reference

Use this lookup when migrating values. Snap to the **nearest** token — don't invent new ones.

### Colour (semantic — use these, not primitives)

| Token | Purpose |
|---|---|
| `--brand`, `--brand-hover`, `--brand-bg` | Primary brand colour + states |
| `--cta`, `--cta-hover`, `--cta-disabled` | Call-to-action button |
| `--success`, `--success-bg` | Positive / green |
| `--warning`, `--warning-bg` | Caution / amber |
| `--danger`, `--danger-bg` | Error / red |
| `--text`, `--text-strong`, `--text-secondary`, `--text-muted`, `--text-faint` | Text hierarchy |
| `--surface`, `--page`, `--muted`, `--border` | Surfaces + borders |

### Spacing (`--space-*`)

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--space-px` | 1px | | `--space-8` | 2rem (32px) |
| `--space-0-5` | 0.125rem (2px) | | `--space-10` | 2.5rem (40px) |
| `--space-1` | 0.25rem (4px) | | `--space-12` | 3rem (48px) |
| `--space-1-5` | 0.375rem (6px) | | `--space-14` | 3.5rem (56px) |
| `--space-2` | 0.5rem (8px) | | `--space-16` | 4rem (64px) |
| `--space-2-5` | 0.625rem (10px) | | `--space-20` | 5rem (80px) |
| `--space-3` | 0.75rem (12px) | | `--space-24` | 6rem (96px) |
| `--space-3-5` | 0.875rem (14px) | | `--space-32` | 8rem (128px) |
| `--space-4` | 1rem (16px) | | `--space-48` | 12rem (192px) |
| `--space-5` | 1.25rem (20px) | | `--space-64` | 16rem (256px) |
| `--space-6` | 1.5rem (24px) | | `--space-80` | 20rem (320px) |
| `--space-7` | 1.75rem (28px) | | `--space-96` | 24rem (384px) |

### Typography

| Category | Tokens |
|---|---|
| Font size | `--text-xs` (12px) · `--text-sm` (14px) · `--text-base` (16px) · `--text-lg` (18px) · `--text-xl` (20px) · `--text-2xl` (24px) · `--text-3xl` (30px) · `--text-4xl` (36px) · `--text-5xl`+ |
| Font weight | `--font-light` (300) · `--font-normal` (400) · `--font-medium` (500) · `--font-semibold` (600) · `--font-bold` (700) · `--font-extrabold` (800) |
| Line height | `--leading-none` (1) · `--leading-tight` (1.25) · `--leading-snug` (1.375) · `--leading-normal` (1.5) · `--leading-relaxed` (1.625) · `--leading-loose` (2) |
| Letter spacing | `--tracking-tighter` · `--tracking-tight` · `--tracking-normal` · `--tracking-wide` · `--tracking-wider` · `--tracking-widest` |
| Font family | `--font` · `--font-mono` |

### Border radius

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--rounded-sm` | 2px | | `--rounded-xl` | 12px |
| `--rounded` | 4px | | `--rounded-2xl` | 16px |
| `--rounded-md` | 6px | | `--rounded-3xl` | 24px |
| `--rounded-lg` | 8px | | `--rounded-full` | 9999px |

### Border width

`--border-0` (0) · `--border-1` (1px) · `--border-2` (2px) · `--border-4` (4px) · `--border-8` (8px)

### Box shadow

`--shadow-2xs` · `--shadow-xs` · `--shadow-sm` · `--shadow-md` · `--shadow-lg` · `--shadow-xl` · `--shadow-2xl` · `--shadow-none`

### Opacity

Full scale from `--opacity-0` (0) to `--opacity-100` (1) in steps of 5.

### Blur

`--blur-none` (0) · `--blur-xs` (4px) · `--blur-sm` (8px) · `--blur-md` (12px) · `--blur-lg` (16px) · `--blur-xl` (24px) · `--blur-2xl` (40px) · `--blur-3xl` (64px)

### Z-index

`--z-0` · `--z-10` · `--z-20` · `--z-30` · `--z-40` · `--z-50`

### Motion

| Category | Tokens |
|---|---|
| Duration | `--duration-75` · `--duration-100` · `--duration-150` · `--duration-200` · `--duration-300` · `--duration-500` · `--duration-700` · `--duration-1000` |
| Easing | `--ease-linear` · `--ease-in` · `--ease-out` · `--ease-in-out` · `--ease-out-expo` |

### Max-width

`--max-w-3xs` (256px) · `--max-w-xs` (320px) · `--max-w-sm` (384px) · `--max-w-md` (448px) · `--max-w-lg` (512px) · `--max-w-xl` (576px) · `--max-w-2xl` (672px) · `--max-w-3xl` (768px) · `--max-w-4xl` (896px) · `--max-w-5xl` (1024px) · `--max-w-6xl` (1152px) · `--max-w-7xl` (1280px)

---

## Migration Rules

### What to tokenise — be aggressive

Use tokens for **everything** that has a match. Snap to the nearest stop; don't leave hardcoded values just because they're "close enough". The goal is maximum token coverage.

| Property | Action |
|---|---|
| `padding`, `margin`, `gap`, `width`, `height`, `top`, `left`, `right`, `bottom` | → `--space-*` |
| `font-size` | → `--text-*` |
| `font-weight` | → `--font-*` |
| `font-family` | → `--font` or `--font-mono` |
| `line-height` | → `--leading-*` |
| `letter-spacing` | → `--tracking-*` |
| `border-radius` | → `--rounded-*` |
| `border-width` | → `--border-*` |
| `z-index` | → `--z-*` |
| `opacity` | → `--opacity-*` (nearest step of 5) |
| `filter: blur(…)` | → `blur(var(--blur-*))` |
| `max-width` | → `--max-w-*` |
| `box-shadow` (without `color-mix`) | → `--shadow-*` |
| `transition-duration`, `animation-duration` | → `--duration-*` |
| `transition-timing-function`, `animation-timing-function` | → `--ease-*` |
| All colours (hex, rgb, hsl, named) | → semantic tokens (`--brand`, `--text`, `--surface`, etc.) |
| Old/legacy token vars (`--bg-*`, `--ink-*`, `--risk-*`, etc.) | → current semantic tokens |
| Negative offsets (e.g. `-2.5rem`) | → `calc(-1 * var(--space-*))` |
| Values inside `calc()` that are standalone (e.g. `calc(100% + 6px)`) | → `calc(100% + var(--space-1-5))` — tokenise the constant part |

### Snapping — nearest wins

When a hardcoded value falls between two token stops:

1. Pick the nearest token
2. If equidistant, round to the smaller value for spacing/sizing, larger for timing
3. Don't add new tokens to `tokens.css` — work with what exists

**Examples from the hero migration:**

| Original | Nearest | Token |
|---|---|---|
| `0.8125rem` (13px) | 14px | `var(--text-sm)` |
| `1.375rem` (22px) | 24px | `var(--space-6)` |
| `1.1` line-height | 1 | `var(--leading-none)` |
| `0.015` opacity | 0.05 | `var(--opacity-5)` |
| `0.6s` animation | 500ms | `var(--duration-500)` |
| `-0.02em` tracking | -0.025em | `var(--tracking-tight)` |

### What to leave hardcoded

These genuinely cannot be tokenised:

| Category | Why | Examples |
|---|---|---|
| `@media` breakpoints | CSS forbids `var()` in media queries | `@media (min-width: 768px)` |
| `clip-path` values | Structural geometry — changing breaks shapes | `polygon(… 80px …)` |
| Viewport / fluid units | Responsive by nature | `85vh`, `55vw` |
| `clamp()` expressions | Fluid sizing, leave whole expression | `clamp(2.25rem, 5vw, 3.5rem)` |
| `calc()` structure | Leave the formula, but tokenise constants inside | `calc(100% - 3.75rem)` |
| `transform` rotation/scale factors | Visual tuning, no token scale | `rotate(2deg)`, `scale(1.02)` |
| `@keyframes` internals | Animation specifics | `rotate(360deg)`, `background-position: 200%` |
| Custom `cubic-bezier()` | No token equivalent | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `color-mix()` expressions | Dynamic blending, leave intact | `color-mix(in srgb, var(--brand) 15%, transparent)` |
| `box-shadow` with `color-mix` colours | Custom shadow colours, can't use `--shadow-*` | `0 20px 40px color-mix(…)` |
| `background-size`, `background-position` | Layout-specific | `24px 24px` |
| `border-radius: 50%` | Circle — not `--rounded-full` (different intent) | `border-radius: 50%` |
| One-off sizing with no nearby token | No token within reasonable range | `480px` (30rem — nothing close) |
| Percentages for widths/positions | Proportional, not fixed | `width: 75%` |

---

## Migration Workflow (per component)

### Step 1 — Audit

Scan the component CSS for all hardcoded values:
- Hex colours, `rgb()`, `hsl()`, named colours
- Pixel/rem/em values for spacing, sizing, typography
- Numeric `font-weight`, `line-height`, `letter-spacing`, `opacity`, `z-index`
- Raw `border-radius`, `border-width` values
- Hardcoded `box-shadow` values
- Transition/animation `duration` and `easing` values
- Any old/legacy custom property names

### Step 2 — Replace exact matches

Swap every value that has a direct token equivalent. This is the bulk of the work.

```css
/* BEFORE */
padding: 1rem 1.5rem;
font-size: 0.875rem;
font-weight: 600;
border-radius: 0.5rem;
border: 1px solid #e5e5e5;
color: #171717;
z-index: 10;
opacity: 0;
transition: all 0.2s ease;

/* AFTER */
padding: var(--space-4) var(--space-6);
font-size: var(--text-sm);
font-weight: var(--font-semibold);
border-radius: var(--rounded-lg);
border: var(--border-1) solid var(--border);
color: var(--text);
z-index: var(--z-10);
opacity: var(--opacity-0);
transition: all var(--duration-200) var(--ease-in-out);
```

### Step 3 — Snap remaining values

For values without an exact match, snap to nearest:

```css
/* BEFORE — 13px has no exact token */
font-size: 0.8125rem;

/* AFTER — snap to 14px */
font-size: var(--text-sm);
```

### Step 4 — Tokenise inside calc/transforms

Don't skip values just because they're inside `calc()` or `translate*()`:

```css
/* BEFORE */
top: calc(100% + 6px);
bottom: -2.5rem;
transform: translateX(-20px);

/* AFTER */
top: calc(100% + var(--space-1-5));
bottom: calc(-1 * var(--space-10));
transform: translateX(calc(-1 * var(--space-5)));
```

### Step 5 — Verify

- No visual regressions (especially snapped values)
- No broken layouts from spacing changes
- Hover/focus/active states still work
- Animations still feel right
- Only values from the "leave hardcoded" list remain as literals

---

## hero.css — Final Token Coverage

After full migration, `hero.css` has **27 remaining hardcoded values**, all from the "leave hardcoded" categories above:

- 10 × `@media` breakpoints (CSS limitation)
- 4 × `clip-path` geometry
- 5 × viewport/fluid units
- 3 × `calc()` internals
- 3 × `box-shadow` with `color-mix`
- 3 × `transform` rotation/scale
- 2 × `background-image`/`background-size`
- 1 × gradient stops
- 1 × one-off sizing (`480px`)
- 1 × focus ring spread (`3px`, between `--border-2` and `--border-4`)

Everything else — spacing, colour, typography, radius, borders, z-index, opacity, blur, shadows, motion — uses tokens.

---

## Why This Matters

With full token alignment across all components:

- **Theme swap** — change `--brand` from blue to purple and the entire app updates
- **Spacing rhythm** — adjust the scale in one place, every component stays consistent
- **Typography** — change `--text-base` from 16px to 18px, all body text updates
- **Dark mode** — override semantic colour tokens in a `[data-theme="dark"]` selector
- **White-label** — ship the same app with different brand tokens per client
- **Design QA** — every value traces back to a named token, no magic numbers to audit
