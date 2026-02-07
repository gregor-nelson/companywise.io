# CompanyWise CSS Design System

## Styling Philosophy

**Tailwind is the default styling system.** All layout, typography, colour, spacing, and interactive states should be expressed as Tailwind utility classes directly in HTML/JS templates. Vanilla CSS is reserved only for features that genuinely cannot be expressed as utility classes — state-based multi-property transitions, class-toggled animations, keyframe definitions, and global rules that target elements outside component templates (e.g. `body.modal-open`).

Tailwind is loaded via CDN (`https://cdn.tailwindcss.com`) with a minimal config extending `fontFamily` only. Components use Tailwind's default colour palette (neutral, blue, emerald, amber, red, slate) directly — not custom theme extensions.

### When to use Tailwind (default)

- Layout: `flex`, `grid`, `gap-*`, `p-*`, `m-*`, responsive variants (`sm:`, `md:`)
- Typography: `text-sm`, `font-medium`, `tracking-wide`, `leading-relaxed`
- Colour: `text-neutral-800`, `bg-blue-600`, `border-emerald-200/50`
- Gradients: `bg-gradient-to-br from-blue-50 to-blue-100/50`
- Effects: `shadow-sm`, `rounded-xl`, `backdrop-blur-sm`, `animate-pulse`
- Interactivity: `hover:-translate-y-0.5`, `hover:shadow-md`, `transition-all`
- Arbitrary values when needed: `text-[11px]`, `z-[1000]`, `w-[55%]`

### When to use vanilla CSS

- **State-toggled transitions**: e.g. overlay fade `opacity 0→1` driven by adding/removing a class in JS
- **Multi-property coupled transitions**: e.g. `opacity + visibility + transform` that must animate together
- **Custom easing**: e.g. `cubic-bezier(0.34, 1.56, 0.64, 1)` on a class toggle
- **Global body rules**: e.g. `body.modal-open { overflow: hidden }`
- **Complex keyframes**: when Tailwind's built-in animations (`animate-pulse`, `animate-spin`) aren't sufficient

When vanilla CSS is used, it should reference design tokens via `var(--token)` for any colour values. Structural values (sizes, radii, z-index) stay raw.

---

## Design Tokens (Legacy Reference)

Design tokens are defined in `frontend/src/styles/main.css` inside a single `:root` block. These tokens are used by vanilla CSS that predates the Tailwind migration and by any new vanilla CSS where Tailwind can't reach. New components should prefer Tailwind utility classes over `var(--token)` references.

---

## Naming Convention

| Prefix | Purpose | Example |
|---|---|---|
| `--primary-*` | Brand accent colour scale | `--primary-500`, `--primary-a15` |
| `--green-*` | Success / positive | `--green-primary`, `--green-a12` |
| `--yellow-*` | Search button / focus | `--yellow-500`, `--yellow-a45` |
| `--amber-*` | Warning / medium-risk alpha | `--amber-a15` |
| `--red-*` | Danger / high-risk alpha | `--red-a20` |
| `--black-*` | Overlay alpha scale | `--black-a50` |
| `--ink-*` | Text-derived (11,12,12) alpha scale | `--ink-a06` |
| `--text-*` | Semantic text colours | `--text-900`, `--text-400` |
| `--bg-*` | Background colours | `--bg-white`, `--bg-slate` |
| `--border-*` | Border colours | `--border-light`, `--border-card` |
| `--risk-*` | Semantic risk badges (low/medium/high) | `--risk-low`, `--risk-high-bg` |
| `--gradient-*` | Composite gradient tokens | `--gradient-subtle` |
| `--font` / `--font-mono` | Typography stacks | `--font` |

---

## Alpha Scale Pattern

Each colour family includes an alpha scale at specific opacity stops:

```
--{colour}-a03   3% opacity
--{colour}-a06   6% opacity
--{colour}-a08   8% opacity
--{colour}-a10  10% opacity
--{colour}-a12  12% opacity
--{colour}-a15  15% opacity
--{colour}-a20  20% opacity
--{colour}-a25  25% opacity
--{colour}-a30  30% opacity
--{colour}-a45  45% opacity
--{colour}-a50  50% opacity
--{colour}-a55  55% opacity
```

Not every colour has every stop. Only the stops actually used by components are defined.

---

## Complete Token List

### Primary (brand accent)

```css
--primary-600: #003078;
--primary-500: #1d70b8;
--primary-100: #d2e2f1;
--primary-50:  #d2e2f1;
```

### Success / Green

```css
--green-primary: #00703c;
```

### Yellow (search button)

```css
--yellow-500: #ffdd00;
--yellow-600: #d4b600;
```

### Backgrounds

```css
--bg-body:   #f3f2f1;
--bg-white:  #ffffff;
--bg-slate:  #f3f2f1;
--bg-subtle: #f8fafc;
```

### Text

```css
--text-900: #0b0c0c;
--text-800: #0b0c0c;
--text-700: #505a5f;
--text-600: #505a5f;
--text-500: #505a5f;
--text-400: #b1b4b6;
```

### Borders

```css
--border-light: #b1b4b6;
--border-card:  #b1b4b6;
```

### Risk (semantic)

```css
--risk-low:           #00703c;
--risk-low-bg:        linear-gradient(to bottom right, #e7f4ed, rgba(0, 112, 60, 0.08));
--risk-low-border:    rgba(0, 112, 60, 0.2);
--risk-medium:        #f47738;
--risk-medium-bg:     linear-gradient(to bottom right, #fef3ec, rgba(244, 119, 56, 0.08));
--risk-medium-border: rgba(244, 119, 56, 0.25);
--risk-high:          #d4351c;
--risk-high-bg:       linear-gradient(to bottom right, #fbeae7, rgba(212, 53, 28, 0.08));
--risk-high-border:   rgba(212, 53, 28, 0.2);
```

### Primary alpha scale

```css
--primary-a03: rgba(29, 112, 184, 0.03);
--primary-a06: rgba(29, 112, 184, 0.06);
--primary-a10: rgba(29, 112, 184, 0.10);
--primary-a12: rgba(29, 112, 184, 0.12);
--primary-a15: rgba(29, 112, 184, 0.15);
--primary-a25: rgba(29, 112, 184, 0.25);
--primary-a30: rgba(29, 112, 184, 0.30);
--primary-a45: rgba(29, 112, 184, 0.45);
```

### Green alpha scale

```css
--green-a03: rgba(0, 112, 60, 0.03);
--green-a06: rgba(0, 112, 60, 0.06);
--green-a08: rgba(0, 112, 60, 0.08);
--green-a10: rgba(0, 112, 60, 0.10);
--green-a12: rgba(0, 112, 60, 0.12);
--green-a15: rgba(0, 112, 60, 0.15);
--green-a19: rgba(0, 112, 60, 0.19);
--green-a20: rgba(0, 112, 60, 0.20);
```

### Amber alpha scale

```css
--amber-a06: rgba(244, 119, 56, 0.06);
--amber-a08: rgba(244, 119, 56, 0.08);
--amber-a10: rgba(244, 119, 56, 0.10);
--amber-a15: rgba(244, 119, 56, 0.15);
--amber-a20: rgba(244, 119, 56, 0.20);
--amber-a25: rgba(244, 119, 56, 0.25);
--amber-a30: rgba(244, 119, 56, 0.30);
```

### Red alpha scale

```css
--red-a06: rgba(212, 53, 28, 0.06);
--red-a08: rgba(212, 53, 28, 0.08);
--red-a10: rgba(212, 53, 28, 0.10);
--red-a15: rgba(212, 53, 28, 0.15);
--red-a20: rgba(212, 53, 28, 0.20);
--red-a30: rgba(212, 53, 28, 0.30);
```

### Black overlay alpha scale

```css
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
```

### Ink alpha scale (text-derived: rgb(11, 12, 12))

```css
--ink-a03: rgba(11, 12, 12, 0.03);
--ink-a04: rgba(11, 12, 12, 0.04);
--ink-a05: rgba(11, 12, 12, 0.05);
--ink-a06: rgba(11, 12, 12, 0.06);
--ink-a08: rgba(11, 12, 12, 0.08);
--ink-a12: rgba(11, 12, 12, 0.12);
--ink-a15: rgba(11, 12, 12, 0.15);
--ink-a20: rgba(11, 12, 12, 0.20);
```

### Yellow alpha

```css
--yellow-a45: rgba(255, 221, 0, 0.45);
```

### Composite gradients

```css
--gradient-subtle:       linear-gradient(to bottom right, var(--primary-a06), var(--primary-a03));
--gradient-green-subtle: linear-gradient(to bottom right, var(--green-a06), var(--green-a03));
```

### Typography

```css
--font:      'Overpass', system-ui, sans-serif;
--font-mono: 'SF Mono', 'Consolas', 'Liberation Mono', monospace;
```

### Layout & Motion

```css
--section-gap: clamp(3rem, 6vw, 6rem);
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
```

---

## Rules for Contributors

1. **No hardcoded colours in component files.** Every colour value (`#hex`, `rgb()`, `rgba()`, named colours like `white`/`black`) must be a `var(--token)` reference. The only exceptions are `transparent` and `currentColor`.
2. **No font-family strings in component files.** Use `var(--font)` or `var(--font-mono)`.
3. **Raw values in `:root` only.** Actual hex/rgba values live exclusively in the `:root` block in `main.css`.
4. **Structural values stay raw.** Sizes (`px`, `rem`, `%`), `border-radius`, `border-width`, `z-index`, and standalone `opacity` do not need tokens.
5. **To change the brand palette**, edit only the `:root` block in `main.css`. All components will update automatically.
6. **Adding new alpha stops**: follow the `--{colour}-a{opacity}` naming pattern (e.g. `--primary-a40` for 40% opacity).
7. **Adding new composite tokens**: define in `:root` using `var()` references to existing alpha tokens where possible.
