# Hero Component — CSS Token Migration Handover

## Phase 1: Colour migration — DONE

All hardcoded hex values, old `var(--bg-*)`, `var(--text-N00)`, `var(--ink-*)`, `var(--risk-*)`, and `var(--border-light)` tokens have been replaced with the semantic colour tokens from `tokens.css`. No colour work remains.

---

## Phase 2: Constants migration (exact-match pass) — DONE

All hardcoded values in `hero.css` that had an **exact token match** in `tokens.css` have been migrated. This covered:

| Category | Examples of what was tokenised |
|---|---|
| Spacing | `padding`, `margin`, `gap`, `width`, `height`, `top`, `left` — e.g. `4rem` → `var(--space-16)` |
| Font size | `1rem` → `var(--text-base)`, `0.875rem` → `var(--text-sm)`, `0.75rem` → `var(--text-xs)`, `1.25rem` → `var(--text-xl)` |
| Font weight | `500` → `var(--font-medium)`, `600` → `var(--font-semibold)` |
| Line height | `1.5` → `var(--leading-normal)` |
| Border radius | `1rem` → `var(--rounded-2xl)`, `0.75rem` → `var(--rounded-xl)`, `0.5rem` → `var(--rounded-lg)`, `0.375rem` → `var(--rounded-md)`, `0.25rem` → `var(--rounded)`, `24px` → `var(--rounded-3xl)`, `100px` / `9999px` → `var(--rounded-full)` |
| Border width | `1px solid` → `var(--border-1) solid`, `2px solid` → `var(--border-2) solid` |
| Z-index | `0` → `var(--z-0)`, `10` → `var(--z-10)`, `50` → `var(--z-50)` |
| Opacity | `0` → `var(--opacity-0)`, `0.4` → `var(--opacity-40)`, `1` → `var(--opacity-100)` |
| Blur | `blur(24px)` → `blur(var(--blur-xl))` |
| Max-width | `80rem` → `var(--max-w-7xl)`, `32rem` → `var(--max-w-lg)` |
| Transition duration | `0.2s` → `var(--duration-200)`, `0.5s` → `var(--duration-500)` |
| Transition easing | `ease` → `var(--ease-in-out)`, `ease-out` → `var(--ease-out)` |

Values with no exact token match were intentionally left hardcoded. Phase 3 below catalogues every one of them.

---

## Phase 3: Gap-fill migration — TODO

The values below remain hardcoded in `hero.css` because `tokens.css` has no exact match. To finish the migration:

1. **Add the missing tokens to `tokens.css`** (suggestions in each table).
2. **Then find-and-replace in `hero.css`** using the new tokens.

### 3a. Font sizes (6 orphan values, ~22 occurrences)

These sit between the existing Tailwind `--text-*` stops. They come from the miniature card UI where type is deliberately smaller than the standard scale.

| Hardcoded | px | Occurrences | Suggested token | Notes |
|---|---|---|---|---|
| `0.5625rem` | 9px | 5 | `--text-2xs` | Meta labels, signal pills, trend arrows, teaser text |
| `0.625rem` | 10px | 6 | `--text-3xs` | Demo label, badge, flags title, flag items, recommendation, activity pill |
| `0.6875rem` | 11px | 5 | `--text-card-sm` or leave as `0.6875rem` | Meta value, unified btn, signal icon, flag icon, company meta |
| `0.8125rem` | 13px | 2 | `--text-card-base` or leave as `0.8125rem` | Company number, unified btn icon |
| `0.9375rem` | 15px | 3 | `--text-card-lg` or leave as `0.9375rem` | Search input, company name (×2) |
| `1.75rem` | 28px | 1 | — (use `var(--space-7)` as a size) | Check-types vehicle icons |

> **Decision needed:** The bottom three (11 / 13 / 15 px) are half-steps between existing Tailwind stops. Adding named tokens avoids magic numbers but inflates the scale. An alternative is to leave them hardcoded and accept them as one-off card-detail sizes.

### 3b. Spacing (5 orphan values, ~7 occurrences)

| Hardcoded | px | Occurrences | Suggested token | Where used |
|---|---|---|---|---|
| `0.1875rem` | 3px | 2 | `--space-0-75` | Vertical padding in badge & signal pills |
| `0.3125rem` | 5px | 2 | `--space-1-25` | Flags-count horizontal padding, flags-list gap |
| `1.375rem` | 22px | 1 | `--space-5-5` | Skeleton signal height |
| `4.5rem` | 72px | 1 | `--space-18` | Skeleton badge width |
| `5.5rem` | 88px | 1 | `--space-22` | Skeleton signal width |

Also left as-is (intentionally, not candidates for new tokens):

| Value | Reason |
|---|---|
| `480px` (min-height) | One-off illustration sizing, not a spacing scale value |
| `-2.5rem` (bottom) | Negative offset — use `calc(-1 * var(--space-10))` once you're happy with the pattern |

### 3c. Letter spacing (4 orphan values, ~6 occurrences)

The existing `--tracking-*` tokens use named stops (`-0.05em`, `-0.025em`, `0`, `0.025em`, `0.05em`, `0.1em`). These values fall between them.

| Hardcoded | Occurrences | Suggested token | Notes |
|---|---|---|---|
| `-0.02em` | 1 | `--tracking-snug` or leave | Headline — very close to `--tracking-tight` (-0.025em) |
| `0.01em` | 1 | leave | Trend arrows — negligible, one-off |
| `0.02em` | 1 | leave | Signal pills — close to `--tracking-wide` (0.025em) |
| `0.03em` | 3 | `--tracking-caps` | Badge, meta-label, snapshot-label — all uppercase contexts |

> **Decision needed:** If you adopt `--tracking-tight` for `-0.02em` and `--tracking-wide` for `0.02em / 0.03em` (accepting the ≤0.005em rounding), Phase 3c collapses to zero new tokens. Otherwise add `--tracking-caps: 0.03em`.

### 3d. Line height (4 orphan values, 4 occurrences)

| Hardcoded | Occurrences | Nearest token | Gap |
|---|---|---|---|
| `1.1` | 1 | `--leading-none` (1) | +0.1 — headline display |
| `1.2` | 1 | `--leading-tight` (1.25) | −0.05 — snapshot value |
| `1.4` | 1 | `--leading-snug` (1.375) | +0.025 — flag items |
| `1.6` | 1 | `--leading-relaxed` (1.625) | −0.025 — subheadline |

> **Recommendation:** These are all very close to existing tokens. Consider rounding to the nearest named stop and visually verifying. If the 0.025–0.05 difference matters, add e.g. `--leading-display: 1.1`.

### 3e. Transition durations (4 orphan values, 5 occurrences)

| Hardcoded | ms | Occurrences | Suggested token | Where used |
|---|---|---|---|---|
| `0.12s` | 120ms | 1 | `--duration-125` | Dropdown item hover |
| `0.25s` | 250ms | 1 | `--duration-250` | Card-inner crossfade |
| `0.4s` | 400ms | 2 | `--duration-400` | Checklist items, back-card fade |
| `0.6s` | 600ms | 1 | — (animation, skip) | Spinner `@keyframes` — leave as-is per rules |

> **Recommendation:** Adding `--duration-250` and `--duration-400` covers 3 of the 4 cases and aligns with Tailwind v4's expanded duration scale. `120ms` is niche enough to leave hardcoded.

### 3f. Opacity (1 orphan value)

| Hardcoded | Occurrences | Notes |
|---|---|---|
| `0.015` | 1 | Grid pattern texture — intentionally ultra-faint, no token needed |

---

## Summary: suggested new tokens for `tokens.css`

If you want full coverage, add these to `tokens.css` before the next hero.css pass:

```css
/* Font size — sub-xs card scale */
--text-2xs:       0.5625rem;  /* 9px  */
--text-3xs:       0.625rem;   /* 10px */

/* Spacing — fractional fills */
--space-0-75:     0.1875rem;  /* 3px  */
--space-1-25:     0.3125rem;  /* 5px  */
--space-5-5:      1.375rem;   /* 22px */
--space-18:       4.5rem;     /* 72px */
--space-22:       5.5rem;     /* 88px */

/* Letter spacing */
--tracking-caps:  0.03em;

/* Line height */
--leading-display: 1.1;

/* Duration — Tailwind v4 gap fills */
--duration-125:   125ms;
--duration-250:   250ms;
--duration-400:   400ms;
```

After adding those, a second pass on `hero.css` can tokenise ~35 more values and leave only ~10 truly one-off hardcoded values (the 0.6875 / 0.8125 / 0.9375rem font sizes, `-2.5rem` offset, `480px` min-height, and the `0.015` opacity).

---

## Rules (unchanged from Phase 2 — keep for reference)

1. Only use tokens that exist. Don't round to neighbours without visual sign-off.
2. Don't change colour, layout structure, selectors, class names, or animations (`@keyframes`, `animation`, `clip-path`, `transform`, `filter: url(#…)`).
3. Don't touch `hero.js` — only `hero.css` changes.
4. `tokens.css` is writable in Phase 3 (read-only restriction lifted).
5. Leave: `clamp()`, `calc()`, viewport units, percentages, `currentColor`, `background-size`, `background-position`.
6. Shorthand expansion is fine for partial tokenisation.
7. `border-radius: 100px` → `var(--rounded-full)`.
8. `border-radius: 50%` → leave as-is.
9. Tokenise transition `duration` and `easing` inline where tokens exist.
10. Only tokenise `box-shadow` values without `color-mix()`.

### Files

| File | Role |
|---|---|
| `frontend/src/styles/tokens.css` | Token definitions (**writable** in Phase 3) |
| `frontend/src/js/components/hero/styles/hero.css` | Target file to migrate |
| `frontend/src/js/components/hero/hero.js` | Reference only (do not modify) |
