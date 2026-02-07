# CompanyWise CSS Design System

> Shared design language with the sister app **Motorwise** (motorwise.io).
> Both apps use the same visual vocabulary — colour palette, typography approach, spacing, gradients, shadows, component patterns, and animation behaviour.
> Brand-specific differences (font family, logo, product terminology) are noted where relevant.

---

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

## Colour Palette

Both apps share a single colour palette derived from Tailwind's default theme. No custom colour extensions.

### Primary (blue)

The brand accent colour used for interactive elements, links, CTAs, and section header icons.

| Stop | Tailwind Class | Hex | Usage |
|------|---------------|-----|-------|
| 700 | `blue-700` | `#1d4ed8` | — |
| 600 | `blue-600` | `#2563eb` | Primary buttons, progress bars, links |
| 500 | `blue-500` | `#3b82f6` | Icon colour in blue icon-boxes, badge text |
| 100 | `blue-100` | `#dbeafe` | Gradient endpoint (at /50 opacity) |
| 50 | `blue-50` | `#eff6ff` | Gradient start, mobile body background |

### Success / Positive (emerald)

Used for pass states, positive signals, low-risk indicators, and confirmation badges.

| Stop | Tailwind Class | Hex | Usage |
|------|---------------|-----|-------|
| 700 | `emerald-700` | `#047857` | Strong positive text |
| 600 | `emerald-600` | `#059669` | Standard positive text, risk-low |
| 500 | `emerald-500` | `#10b981` | Icon colour in emerald icon-boxes |
| 400 | `emerald-400` | `#34d399` | Bar chart good segments |
| 200 | `emerald-200` | `#a7f3d0` | Border (at /50 opacity) |
| 100 | `emerald-100` | `#d1fae5` | Badge bg, icon-box bg, gradient endpoint (at /50) |
| 50 | `emerald-50` | `#ecfdf5` | Gradient start, card backgrounds |

### Warning (amber)

Used for medium-risk, caution states, and average-quality indicators.

| Stop | Tailwind Class | Hex | Usage |
|------|---------------|-----|-------|
| 600 | `amber-600` | `#d97706` | Warning text, risk-medium |
| 500 | `amber-500` | `#f59e0b` | Search button accent, icon colour |
| 400 | `amber-400` | `#fbbf24` | Bar chart average segments, progress ring |
| 200 | `amber-200` | `#fde68a` | — |
| 100 | `amber-100` | `#fef3c7` | Gradient endpoint (at /50) |
| 50 | `amber-50` | `#fffbeb` | Gradient start |

### Danger / Negative (red)

Used for fail states, high-risk indicators, and error messages.

| Stop | Tailwind Class | Hex | Usage |
|------|---------------|-----|-------|
| 600 | `red-600` | `#dc2626` | Error text, risk-high |
| 500 | `red-500` | `#ef4444` | Negative badge text, icon colour |
| 400 | `red-400` | `#f87171` | Bar chart poor segments |
| 200 | `red-200` | `#fecaca` | — |
| 100 | `red-100` | `#fee2e2` | Gradient endpoint (at /50) |
| 50 | `red-50` | `#fef2f2` | Gradient start |

### Neutral

The primary text and UI chrome scale.

| Stop | Tailwind Class | Hex | Usage |
|------|---------------|-----|-------|
| 900 | `neutral-900` | `#171717` | Headings, strong emphasis |
| 800 | `neutral-800` | `#262626` | Stat values, secondary headings |
| 700 | `neutral-700` | `#404040` | Body text default |
| 600 | `neutral-600` | `#525252` | Descriptions, subtext |
| 500 | `neutral-500` | `#737373` | Breadcrumbs, meta text, timestamps |
| 400 | `neutral-400` | `#a3a3a3` | Micro-labels, placeholders |
| 200 | `neutral-200` | `#e5e5e5` | Borders, dividers |
| 100 | `neutral-100` | `#f5f5f5` | Card borders (at /50 or /80 opacity) |
| 50 | `neutral-50` | `#fafafa` | Page background (desktop) |

### Slate

Used for inner card and section backgrounds where a subtle warm-cool differentiation from neutral is needed.

| Stop | Tailwind Class | Hex | Usage |
|------|---------------|-----|-------|
| 50 | `slate-50` | `#f8fafc` | Card inner background, stat item bg |

---

## Typography

### Font Families

| App | Font | Stack | CDN |
|-----|------|-------|-----|
| CompanyWise | **Overpass** | `'Overpass', system-ui, sans-serif` | Google Fonts (400, 500, 600, 700, 800) |
| Motorwise | **Jost** | `'Jost', system-ui, sans-serif` | Google Fonts (400, 500, 600, 700) |

Both fonts are geometric sans-serifs with similar proportions. Monospace fallback: `'SF Mono', 'Consolas', 'Liberation Mono', monospace`.

### Type Scale

| Role | Tailwind Classes | Example |
|------|-----------------|---------|
| Page title (h1) | `text-2xl sm:text-3xl font-medium text-neutral-900` | "MOT Reliability Report" |
| Section title (h2) | `text-lg font-medium text-neutral-900` | "Key Findings" |
| Subsection title (h3) | `text-base font-medium text-neutral-900` | "Test Statistics" |
| Body text | `text-lg text-neutral-600 leading-relaxed` | Intro paragraph |
| Standard prose | `text-sm text-neutral-600` or `text-sm text-neutral-500` | Descriptions |
| Stat value | `text-lg font-medium text-neutral-800` | "1,404,695" |
| Stat value (large) | `text-2xl font-bold text-neutral-900` | "66.0%" |
| Micro-label | `text-[11px] font-medium text-neutral-400 uppercase tracking-wide` | "TOTAL TESTS" |
| Tiny label | `text-[10px] font-medium text-neutral-400 uppercase tracking-wider` | "PASS RATE" |
| Badge text | `text-xs font-medium` | "MOT Reliability Data" |
| Meta text | `text-sm text-neutral-500` | "Updated 17 Jan 2026" |
| Percentage (positive) | `text-sm text-emerald-500 font-medium` | "88.7% pass rate" |
| Percentage (negative) | `text-sm text-red-500 font-medium` | "49.2% pass rate" |

### Font Weight Usage

| Weight | Tailwind | Usage |
|--------|----------|-------|
| 400 | `font-normal` | Rarely used standalone; body inherits from parent |
| 500 | `font-medium` | **Default for most elements** — headings, stat values, labels, badges |
| 600 | `font-semibold` | Emphasis within already-medium contexts |
| 700 | `font-bold` | Hero large stat numbers only |

---

## Spacing & Layout

### Page Layout

```
max-w-6xl mx-auto px-4 py-6 sm:py-8 lg:py-12
```

- Max content width: `max-w-6xl` (72rem / 1152px)
- Horizontal padding: `px-4` (1rem) at all breakpoints
- Vertical padding: responsive `py-6` → `sm:py-8` → `lg:py-12`

### Section Spacing

| Context | Class | Value |
|---------|-------|-------|
| Between major sections | `mb-8` or `mb-10` | 2rem–2.5rem |
| Between header and content | `mb-4` or `mb-5` | 1rem–1.25rem |
| Between grid items | `gap-3` or `gap-4` | 0.75rem–1rem |
| Inside cards | `p-4` or `p-6` | 1rem–1.5rem |
| Inside stat items | `p-3.5` | 0.875rem |
| Between icon and text | `gap-2` or `gap-3` | 0.5rem–0.75rem |
| Section gap (CSS token) | `var(--section-gap)` | `clamp(3rem, 6vw, 6rem)` |

### Responsive Breakpoints

Standard Tailwind breakpoints, no custom additions:

| Prefix | Min-width | Typical usage |
|--------|-----------|---------------|
| (none) | 0px | Mobile-first defaults |
| `sm:` | 640px | Grid adjustments, padding increases |
| `md:` | 768px | Two-column layouts, desktop backgrounds |
| `lg:` | 1024px | Full padding, sidebar visibility |

---

## Gradients

Gradients are a core visual pattern. The standard formula is:

```
bg-gradient-to-br from-{colour}-50 to-{colour}-100/50
```

This creates a subtle diagonal wash from the lightest tint to a half-opacity light tint.

### Standard Gradient Recipes

| Name | Tailwind Classes | Usage |
|------|-----------------|-------|
| Blue subtle | `bg-gradient-to-br from-blue-50 to-blue-100/50` | Icon boxes, badges, featured card pseudo |
| Emerald subtle | `bg-gradient-to-br from-emerald-50 to-emerald-100/50` | Positive stat cards, data callouts |
| Amber subtle | `bg-gradient-to-br from-amber-50 to-amber-100/50` | Warning icon boxes |
| Red subtle | `bg-gradient-to-br from-red-50 to-red-100/50` | Negative icon boxes |
| Mobile body | `linear-gradient(180deg, #EFF6FF 0%, #EFF6FF 60%, #FFFFFF 100%)` | Mobile page background (CSS only) |
| Progress bar | `linear-gradient(90deg, #2563eb, #3b82f6)` | Reading progress, horizontal bars |

### CSS Token Gradients

For vanilla CSS only (legacy and body-level rules):

```css
--gradient-subtle:       linear-gradient(to bottom right, var(--primary-a06), var(--primary-a03));
--gradient-green-subtle: linear-gradient(to bottom right, var(--green-a06), var(--green-a03));
```

---

## Shadows & Depth

### Shadow Scale

| Level | Tailwind | Usage |
|-------|----------|-------|
| Minimal | `shadow-sm` | Icon boxes, small UI elements |
| Standard | `shadow-md` | Hover-state card elevation |
| Elevated | `shadow-xl` | Featured/hero cards, key findings panels |
| None | (no class) | Inner stat items, flat cards |

### Hover Lift Pattern

The standard micro-interaction for interactive cards:

```
transition-all hover:-translate-y-0.5 hover:shadow-md
```

Produces a 2px upward float with shadow increase on hover. Duration defaults to Tailwind's `150ms ease` via `transition-all`.

For stronger lift on featured elements:

```
transition-all hover:-translate-y-0.5 hover:shadow-lg
```

---

## Borders & Radii

### Border Radius Scale

| Element | Class | Pixels |
|---------|-------|--------|
| Featured cards, modals | `rounded-2xl` | 16px |
| Standard cards, stat items | `rounded-xl` | 12px |
| Icon containers | `rounded-lg` or `rounded-xl` | 8px or 12px |
| Badges, pills | `rounded-full` | 9999px |
| Bar chart tops | `rounded-t-lg` | 8px top only |

### Border Patterns

| Context | Classes |
|---------|---------|
| Featured card | `border border-neutral-100/80` |
| Standard card | `border border-neutral-200/50` |
| Stat item | `border border-neutral-100/50` |
| Positive callout | `border border-emerald-200/50` |
| Primary badge | `border border-blue-200/50` |
| Warning callout | `border border-amber-200/50` |
| Icon box inner | `border border-{colour}-100/50` |

The `/50` opacity on borders is a deliberate pattern — it keeps borders visible on white but avoids harsh lines.

---

## Animation & Motion

### Standard Easing

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* Exit / settle */
```

Bouncy-ease alternative for overlays and modals:

```css
cubic-bezier(0.34, 1.56, 0.64, 1)
```

### Fade-In Animation

Used for section reveals and content loading:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.3s ease-out forwards; }
```

### Transition Durations

| Context | Duration |
|---------|----------|
| Hover effects (lift, shadow) | `0.3s ease-out` (via `transition-all`) |
| Colour/opacity transitions | `0.2s ease` (via `transition-colors`) |
| SVG progress ring stroke | `0.5s ease` or `1s ease-out` |
| Page progress bar | `0.1s ease` |
| Modal open/close | `0.3s` with custom cubic-bezier |

### Skeleton Loading

Placeholder elements while data loads:

```
bg-neutral-200 rounded animate-pulse
```

Height and width vary per element being replaced.

---

## Component Patterns

### Card Containers

**Featured card** (key findings, hero panels):

```html
<div class="bg-white rounded-2xl shadow-xl border border-neutral-100/80 p-6">
```

Optional depth pseudo-element (rotated background):

```css
.featured-card::before {
  content: '';
  position: absolute;
  left: 8px; top: 8px;
  width: calc(100% - 16px); height: 100%;
  background: linear-gradient(to bottom right, #eff6ff, rgba(219, 234, 254, 0.5));
  border-radius: 1rem;
  transform: rotate(0.5deg);
  z-index: -1;
}
```

**Standard card** (sections, data groups):

```html
<div class="bg-slate-50 rounded-xl border border-neutral-200/50 p-4 sm:p-5">
```

**Stat item** (inside cards):

```html
<div class="bg-slate-50 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
```

Or with border:

```html
<div class="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-neutral-100/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
```

### Icon Boxes

Used in section headers and stat items. Always uses the gradient pattern.

**Section header icon** (larger):

```html
<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
  <i class="ph ph-lightning text-blue-500 text-xl"></i>
</div>
```

**Stat item icon** (smaller):

```html
<div class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100/50">
  <i class="ph ph-check-circle text-emerald-500 text-sm"></i>
</div>
```

**Circular icon** (callout blocks):

```html
<div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm">
  <i class="ph ph-database text-emerald-500 text-xl"></i>
</div>
```

Colour varies by semantic context: blue (primary), emerald (positive), amber (warning), red (negative).

### Section Headers

Every content section follows this pattern:

```html
<div class="article-section-header">
  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center shadow-sm">
    <i class="ph ph-chart-pie text-blue-500 text-xl"></i>
  </div>
  <h2 class="text-lg font-medium text-neutral-900">Section Title</h2>
</div>
```

Icon + title, flexed horizontally with `gap-3`.

### Badges & Pills

**Category badge** (top of page):

```html
<span class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-500 border-blue-200/50">
  <i class="ph ph-chart-bar"></i>
  MOT Reliability Data
</span>
```

**Data badge** (inline stat):

```html
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium">
  88.7%
</span>
```

### Semantic Status Badges

Colour-coded by quality/risk level:

| Status | Text Colour | Background Gradient |
|--------|------------|-------------------|
| Excellent / Good | `#059669` (emerald-600) | `from-emerald-50 to-emerald-100/50` |
| Average | `#d97706` (amber-600) | `from-amber-50 to-amber-100/50` |
| Poor | `#dc2626` (red-600) | `from-red-50 to-red-100/50` |

### Data Callout Block

Used to highlight key statistics (e.g. total data points):

```html
<div class="flex items-center gap-4 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md">
  <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm">
    <i class="ph ph-database text-emerald-500 text-xl"></i>
  </div>
  <div>
    <p class="text-base font-medium text-emerald-700">1,404,695 MOT tests analysed</p>
    <p class="text-sm text-emerald-500">Real DVSA data covering 1976-2021</p>
  </div>
</div>
```

### Stat Grid

A 2×2 or 2-col grid of key findings:

```html
<div class="grid sm:grid-cols-2 gap-4">
  <div class="bg-slate-50 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
    <p class="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Label</p>
    <p class="text-lg font-medium text-neutral-900">Value</p>
    <p class="text-sm text-emerald-500 font-medium">Supporting stat</p>
  </div>
</div>
```

### Circular Progress Ring (SVG)

Used for overall pass/score rates:

```html
<svg width="144" height="144" viewBox="0 0 144 144" class="-rotate-90">
  <circle cx="72" cy="72" r="54" fill="none" stroke="#f5f5f5" stroke-width="10"/>
  <circle cx="72" cy="72" r="54" fill="none"
    stroke="#fbbf24"
    stroke-width="10" stroke-linecap="round"
    stroke-dasharray="339.29"
    stroke-dashoffset="115.43"
    style="transition: stroke-dashoffset 1s ease-out"/>
</svg>
```

Ring colour matches semantic state (emerald = good, amber = average, red = poor).
Glow effect behind ring: `bg-gradient-to-br from-blue-50 to-blue-100/50 blur-xl opacity-60`.

### Bar Chart

Vertical bars with colour-coded heights:

| Range | Colour | Hex |
|-------|--------|-----|
| ≥ 80% (good) | emerald-400 | `#34d399` |
| 65–79% (average) | amber-400 | `#fbbf24` |
| < 65% (poor) | red-400 | `#f87171` |

Each bar: `rounded-t-lg`, hover: `group-hover:opacity-80 group-hover:-translate-y-0.5`.

### Breadcrumb Navigation

```html
<nav class="flex items-center gap-2 text-sm text-neutral-500 mb-6">
  <a href="/" class="hover:text-blue-600 transition-colors">Home</a>
  <i class="ph ph-caret-right text-xs"></i>
  <a href="/articles/" class="hover:text-blue-600 transition-colors">Guides</a>
  <i class="ph ph-caret-right text-xs"></i>
  <span class="text-neutral-900">Current Page</span>
</nav>
```

### Custom Scrollbar

Thin minimal scrollbar for all overflow containers:

```css
/* WebKit */
width: 6px; height: 6px;
track: transparent;
thumb: rgba(0, 0, 0, 0.15);  /* hover: 0.25 */
border-radius: 3px;

/* Firefox */
scrollbar-width: thin;
scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
```

---

## Mobile Patterns

### Mobile Background

On screens ≤ 767px, pages use a gradient body background instead of flat neutral-50:

```css
@media (max-width: 767px) {
  body {
    background: linear-gradient(180deg, #EFF6FF 0%, #EFF6FF 60%, #FFFFFF 100%);
    min-height: 100vh;
  }
}
```

Desktop (`md:` and above) uses `bg-neutral-50` or `bg-white`.

### Reading Progress Bar

Fixed at top of viewport, 3px tall, blue gradient:

```css
#reading-progress {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  z-index: 100;
  transition: width 0.1s ease;
}
```

---

## Icons

Both apps use **Phosphor Icons** via CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css">
```

Icon class pattern: `ph ph-{icon-name}` (regular), `ph-bold ph-{icon-name}` (bold), `ph-fill ph-{icon-name}` (filled).

Icon sizing follows text context — typically `text-sm`, `text-xl`, or `text-xs` to match adjacent text.

---

## Design Tokens (`:root` reference)

Design tokens are defined in `frontend/src/styles/main.css` inside a single `:root` block. These tokens are used by vanilla CSS that predates the Tailwind migration and by any new vanilla CSS where Tailwind can't reach. New components should prefer Tailwind utility classes over `var(--token)` references.

### Naming Convention

| Prefix | Purpose | Example |
|---|---|---|
| `--primary-*` | Brand accent colour scale | `--primary-500`, `--primary-a15` |
| `--green-*` | Success / positive | `--green-primary`, `--green-a12` |
| `--yellow-*` | Search button / focus | `--yellow-500`, `--yellow-a45` |
| `--amber-*` | Warning / medium-risk alpha | `--amber-a15` |
| `--red-*` | Danger / high-risk alpha | `--red-a20` |
| `--black-*` | Overlay alpha scale | `--black-a50` |
| `--ink-*` | Text-derived (neutral-900) alpha scale | `--ink-a06` |
| `--text-*` | Semantic text colours | `--text-900`, `--text-400` |
| `--bg-*` | Background colours | `--bg-white`, `--bg-slate` |
| `--border-*` | Border colours | `--border-light`, `--border-card` |
| `--risk-*` | Semantic risk badges (low/medium/high) | `--risk-low`, `--risk-high-bg` |
| `--gradient-*` | Composite gradient tokens | `--gradient-subtle` |
| `--font` / `--font-mono` | Typography stacks | `--font` |

### Alpha Scale Pattern

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

### Complete Token List

#### Primary (brand accent) — Tailwind blue-700 / blue-600 / blue-100 / blue-50

```css
--primary-600: #1d4ed8;
--primary-500: #2563eb;
--primary-100: #dbeafe;
--primary-50:  #eff6ff;
```

#### Success / Green — Tailwind emerald-600

```css
--green-primary: #059669;
```

#### Yellow (search button) — Tailwind amber-500 / amber-600

```css
--yellow-500: #f59e0b;
--yellow-600: #d97706;
```

#### Backgrounds — Tailwind neutral-50 / white / neutral-100

```css
--bg-body:   #fafafa;
--bg-white:  #ffffff;
--bg-slate:  #f5f5f5;
--bg-subtle: #fafafa;
```

#### Text — Tailwind neutral scale

```css
--text-900: #171717;
--text-800: #262626;
--text-700: #404040;
--text-600: #525252;
--text-500: #737373;
--text-400: #a3a3a3;
```

#### Borders — Tailwind neutral-200

```css
--border-light: #e5e5e5;
--border-card:  #e5e5e5;
```

#### Risk (semantic) — Tailwind emerald/amber/red-600

```css
--risk-low:           #059669;
--risk-low-bg:        linear-gradient(to bottom right, #ecfdf5, rgba(5, 150, 105, 0.08));
--risk-low-border:    rgba(5, 150, 105, 0.2);
--risk-medium:        #d97706;
--risk-medium-bg:     linear-gradient(to bottom right, #fffbeb, rgba(217, 119, 6, 0.08));
--risk-medium-border: rgba(217, 119, 6, 0.25);
--risk-high:          #dc2626;
--risk-high-bg:       linear-gradient(to bottom right, #fef2f2, rgba(220, 38, 38, 0.08));
--risk-high-border:   rgba(220, 38, 38, 0.2);
```

#### Primary alpha scale

```css
--primary-a03: color-mix(in srgb, #2563eb  3%, transparent);
--primary-a06: color-mix(in srgb, #2563eb  6%, transparent);
--primary-a10: color-mix(in srgb, #2563eb 10%, transparent);
--primary-a12: color-mix(in srgb, #2563eb 12%, transparent);
--primary-a15: color-mix(in srgb, #2563eb 15%, transparent);
--primary-a25: color-mix(in srgb, #2563eb 25%, transparent);
--primary-a30: color-mix(in srgb, #2563eb 30%, transparent);
--primary-a45: color-mix(in srgb, #2563eb 45%, transparent);
```

#### Green alpha scale

```css
--green-a03: color-mix(in srgb, #059669  3%, transparent);
--green-a06: color-mix(in srgb, #059669  6%, transparent);
--green-a08: color-mix(in srgb, #059669  8%, transparent);
--green-a10: color-mix(in srgb, #059669 10%, transparent);
--green-a12: color-mix(in srgb, #059669 12%, transparent);
--green-a15: color-mix(in srgb, #059669 15%, transparent);
--green-a19: color-mix(in srgb, #059669 19%, transparent);
--green-a20: color-mix(in srgb, #059669 20%, transparent);
```

#### Amber alpha scale

```css
--amber-a06: color-mix(in srgb, #d97706  6%, transparent);
--amber-a08: color-mix(in srgb, #d97706  8%, transparent);
--amber-a10: color-mix(in srgb, #d97706 10%, transparent);
--amber-a15: color-mix(in srgb, #d97706 15%, transparent);
--amber-a20: color-mix(in srgb, #d97706 20%, transparent);
--amber-a25: color-mix(in srgb, #d97706 25%, transparent);
--amber-a30: color-mix(in srgb, #d97706 30%, transparent);
```

#### Red alpha scale

```css
--red-a06: color-mix(in srgb, #dc2626  6%, transparent);
--red-a08: color-mix(in srgb, #dc2626  8%, transparent);
--red-a10: color-mix(in srgb, #dc2626 10%, transparent);
--red-a15: color-mix(in srgb, #dc2626 15%, transparent);
--red-a20: color-mix(in srgb, #dc2626 20%, transparent);
--red-a30: color-mix(in srgb, #dc2626 30%, transparent);
```

#### Black overlay alpha scale

```css
--black-a03: color-mix(in srgb, black  3%, transparent);
--black-a04: color-mix(in srgb, black  4%, transparent);
--black-a05: color-mix(in srgb, black  5%, transparent);
--black-a06: color-mix(in srgb, black  6%, transparent);
--black-a08: color-mix(in srgb, black  8%, transparent);
--black-a10: color-mix(in srgb, black 10%, transparent);
--black-a12: color-mix(in srgb, black 12%, transparent);
--black-a15: color-mix(in srgb, black 15%, transparent);
--black-a20: color-mix(in srgb, black 20%, transparent);
--black-a25: color-mix(in srgb, black 25%, transparent);
--black-a50: color-mix(in srgb, black 50%, transparent);
--black-a55: color-mix(in srgb, black 55%, transparent);
```

#### Ink alpha scale (text-derived: neutral-900 / #171717)

```css
--ink-a03: color-mix(in srgb, #171717  3%, transparent);
--ink-a04: color-mix(in srgb, #171717  4%, transparent);
--ink-a05: color-mix(in srgb, #171717  5%, transparent);
--ink-a06: color-mix(in srgb, #171717  6%, transparent);
--ink-a08: color-mix(in srgb, #171717  8%, transparent);
--ink-a12: color-mix(in srgb, #171717 12%, transparent);
--ink-a15: color-mix(in srgb, #171717 15%, transparent);
--ink-a20: color-mix(in srgb, #171717 20%, transparent);
```

#### Yellow alpha

```css
--yellow-a45: color-mix(in srgb, #f59e0b 45%, transparent);
```

#### Composite gradients

```css
--gradient-subtle:       linear-gradient(to bottom right, var(--primary-a06), var(--primary-a03));
--gradient-green-subtle: linear-gradient(to bottom right, var(--green-a06), var(--green-a03));
```

#### Typography

```css
--font:      'Overpass', system-ui, sans-serif;
--font-mono: 'SF Mono', 'Consolas', 'Liberation Mono', monospace;
```

#### Layout & Motion

```css
--section-gap: clamp(3rem, 6vw, 6rem);
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
```

---

## Rules for Contributors

### Tailwind-first (new work)

1. **Use Tailwind utility classes by default** for all visual styling in HTML and JS-generated templates. Colours, spacing, typography, layout, borders, shadows, and simple interactive states should all be Tailwind classes.
2. **Use vanilla CSS only when Tailwind can't express it.** If a feature requires JS class toggling for multi-property transitions, custom keyframes, or global body-level rules, put it in a component CSS file. Keep these files as small as possible.
3. **When vanilla CSS is needed, use `var(--token)` for colours.** No hardcoded hex/rgb/rgba in `.css` files. The only exceptions are `transparent` and `currentColor`.
4. **Structural values stay raw in CSS.** Sizes (`px`, `rem`, `%`), `border-radius`, `border-width`, `z-index`, and standalone `opacity` do not need tokens.

### Design tokens (existing CSS)

5. **To change the brand palette**, edit the `:root` block in `main.css`. Existing vanilla CSS components will update automatically.
6. **Adding new alpha stops**: follow the `--{colour}-a{opacity}` naming pattern (e.g. `--primary-a40` for 40% opacity).
7. **Adding new composite tokens**: define in `:root` using `var()` references to existing alpha tokens where possible.

### Visual consistency with Motorwise

8. **Follow the gradient pattern** `from-{colour}-50 to-{colour}-100/50` for all tinted backgrounds. Don't use solid fills where a gradient is expected.
9. **Use the icon-box pattern** for section headers. Always pair a gradient-background icon container with the section title.
10. **Apply hover lift** (`hover:-translate-y-0.5 hover:shadow-md`) to all interactive cards and stat items.
11. **Use the semantic colour system** — emerald for positive, amber for warning, red for negative. Never mix semantic meanings.
12. **Keep borders soft** — use `/50` or `/80` opacity modifiers on border colours. No hard `border-neutral-300` on light backgrounds.
13. **Labels are uppercase micro-text** — `text-[11px] font-medium text-neutral-400 uppercase tracking-wide` for all category/stat labels.
14. **Stat values are medium-weight** — `text-lg font-medium text-neutral-800` for data values in cards.
