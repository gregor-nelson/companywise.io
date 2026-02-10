# Handover: What We Check — Remaining Panel Refactors

## Context

The home page "What We Check" section uses a tabbed card interface with 4 panels showing company risk signals. The original design rendered each signal as a separate tall card in a grid — this created excessive scroll depth, especially on smaller viewports.

We've completed a **composed illustration** redesign of the **Financial panel** as the reference implementation, and the **Operations** and **Directors** panels have been refactored to match. The remaining panel (**Stability**) needs the same treatment.

## Architecture Overview

```
frontend/src/js/components/Home/what-we-check/
├── index.js                          ← Panel registry, assembles CATEGORIES array
├── what-we-check.js                  ← Main component (tabs, swipe, navigation) — DO NOT MODIFY
├── components/
│   ├── financial.js                  ← DONE — reference implementation
│   ├── stability.js                  ← TODO — 4 signals, amber theme
│   ├── directors.js                  ← DONE — 2 signals, blue theme
│   └── operations.js                 ← DONE — 3 signals, emerald theme
└── styles/
    ├── what-we-check.css             ← Main layout — DO NOT MODIFY
    └── components/
        ├── financial.css             ← DONE — reference implementation
        ├── stability.css             ← TODO
        ├── directors.css             ← DONE
        └── operations.css            ← DONE
```

### How rendering works

1. `what-we-check.js` calls `window.WWCPanels.renderers[panelType](signals)` to get HTML
2. The returned HTML is injected into `.wwc-signals-grid.wwc-signals-grid--{panelType}`
3. The grid lives inside `.wwc-swipe-container` which has `overflow: hidden` — float cards must stay within the showcase bounds
4. Each panel JS file exports a panel definition + renderer function on the `window.WWCPanels` namespace
5. Panel definitions include: id, label, icon, color, panelType, hero content, and signals array

### Key constraint: `.wwc-swipe-container` has `overflow: hidden`

Float cards are absolutely positioned within a `.{prefix}-showcase` container. The showcase uses padding to create space around the centred anchor card, and floats sit in that padding area. Floats must not overflow the showcase bounds or they'll be clipped.

## Reference Implementation: Financial Panel

Read these two files as your template — they are the completed, working implementation:

- **JS**: `frontend/src/js/components/Home/what-we-check/components/financial.js`
- **CSS**: `frontend/src/js/components/Home/what-we-check/styles/components/financial.css`

### Pattern Summary

**JS structure:**
```
IIFE wrapper
  namespace setup (window.WWCPanels)
  DEMO_DATA (unchanged from original)
  SIGNAL_DEFINITIONS (unchanged from original)
  buildSignals() (unchanged from original)
  Panel definition object (unchanged from original)

  renderNoDataCard(signal, extraClass) — compact placeholder
  renderAnchorCard(signal) — primary showcase card, largest visual
  renderFloat1(signal) — compact floating widget, top-right
  renderFloat2(signal) — compact floating widget, bottom-left
  [renderFloat3(signal)] — if 4 signals, add a third float

  renderPanelName(signals) — composed showcase wrapper:
    <div class="{prefix}-showcase">
      <div class="{prefix}-showcase__depth"></div>
      ${anchor card}
      ${float cards}
      <div class="{prefix}-showcase__blur"></div>
    </div>

  exports (unchanged from original)
```

**CSS structure:**
```
Grid container override: .wwc-signals-grid--{panelType} { gap: 0; padding adjustments }

Showcase container:
  Mobile: flex column, gap, position: relative
  768px+: display: block, padding for float space, position: relative
  1024px+: reduced padding (content zone narrower due to hero zone)

Shared card base: .{prefix}-card (background, border, radius, transitions)
Card header: .{prefix}-card__header (flex row: icon + titles + optional badge)
Card icons: .{prefix}-card__icon--{color} (coloured icon boxes)
Card accent bars: .{prefix}-card--{role}::before (2-3px coloured top stripe)

Anchor card body: custom visual (gauge, timeline, roster, etc.)
Float card bodies: compact data widgets

No-data card: reduced opacity + placeholder message

TABLET+ (768px+): Composed illustration positioning
  - Depth card: absolute, tinted gradient background, rotate(1-2deg), z-index: 1
  - Anchor card: relative, centred (max-width ~65-70%, margin: 0 auto), z-index: 10, shadow
  - Float cards: absolute positioned (top/right, bottom/left, etc.), z-index: 20, rotated, shadow
  - Blur accent: absolute, bottom centre, blurred gradient, z-index: 0
  - Hover on floats: translateY(-4px) while maintaining rotation

DESKTOP (1024px+): Adjusted widths for narrower content zone
1280px+: More breathing room
```

### Naming convention

Each panel uses a unique CSS class prefix to avoid conflicts:
- Financial: `fin-`
- Stability: use `stab-`
- Directors: use `dir-`
- Operations: use `ops-`

## Panel-by-Panel Specifications

### 1. Stability Panel (amber theme, 4 signals)

**File:** `stability.js` / `stability.css`
**Prefix:** `stab-`
**Theme colour:** amber (use `var(--warning)`, `var(--warning-bg)`)

**Signals:**
| Signal | Role | Key Visual |
|--------|------|-----------|
| Company Age (id: `company-age`) | **Anchor** | Big number (8 years 10 months) + bracket badge ("Established") + horizontal timeline bar with milestones at 0, 2yr, 5yr, 10yr, 15+ |
| Company Status (id: `company-status`) | **Float top-right** | Traffic-light beacon: 3 stacked dots (ok/warning/danger), one active. Status label + "Since" date |
| Address Changes (id: `address-changes`) | **Float bottom-left** | Change count + frequency badge (Low/Moderate/High). NO address trail stops (remove for compactness) + tenure line |
| Previous Names (id: `previous-names`) | **Float bottom-right** | If changes: count + "name changes" label. If none: check icon + "No name changes". Very compact pill-sized widget |

**Layout notes:**
- 4 signals means 1 anchor + 3 floats
- The 3rd float (Previous Names) is the smallest — position it bottom-right
- Address and Names floats can be smaller (160-180px) since they hold minimal data
- The age timeline in the anchor body works well as a horizontal element — keep it full-width in the anchor card body
- On mobile: all 4 cards stack vertically with compact styling

**Anchor card body layout:**
```
┌──────────────────────────────────────────┐
│ [📅] Company Age                         │
│ How long have they been trading?         │
│──────────────────────────────────────────│
│                                          │
│  8 years  10 months    [Established]     │
│                                          │
│  ──────●────────────── 0  2  5  10  15+  │
│                                          │
│  📅 Incorporated: 12 Mar 2016            │
│  📄 First filing: 12 Mar 2017            │
└──────────────────────────────────────────┘
```

**Depth card tint:** `var(--warning-bg)` with `color-mix(in srgb, var(--warning) 4%, var(--page))`
**Accent bars:** amber gradient on anchor, amber on status float, amber on address float, blue on names float

### 2. Directors Panel (blue theme, 2 signals)

**File:** `directors.js` / `directors.css`
**Prefix:** `dir-`
**Theme colour:** blue (use `var(--brand)`, `var(--brand-bg)`)

**Signals:**
| Signal | Role | Key Visual |
|--------|------|-----------|
| Director History (id: `director-history`) | **Anchor** | Stats row (Active / Resigned / Dissolved cos.) + compact director roster (max 2 rows shown) + average tenure |
| PSC Register (id: `psc-register`) | **Float bottom-right** | PSC count + entries with ownership percentage bars + transparency indicator |

**Layout notes:**
- Only 2 signals — simpler composition
- The anchor card can be wider (~70-75%) since there's only one float
- The PSC float can be larger (~240-250px) since it's the sole companion
- Position the PSC float bottom-right or bottom-centre-right
- Director roster: show max 2 directors in the anchor card, omit the 3rd (resigned). Each row: avatar icon + name + role/date + flags (companies, dissolved count)
- On mobile: both cards stack

**Anchor card body layout:**
```
┌──────────────────────────────────────────────┐
│ [👤] Director History                  MED   │
│ Track record across companies                │
│──────────────────────────────────────────────│
│                                              │
│  2 Active    1 Resigned    4 Dissolved cos.  │
│                                              │
│  👤 J. Smith  · Director · Mar 2016   🏢4 ⚠1│
│  👤 A. Johnson · Director · Jun 2020  🏢7 ⚠3│
│                                              │
│  ⏱ Avg. tenure: 5 years                     │
└──────────────────────────────────────────────┘
```

**Depth card tint:** `var(--brand-bg)` with `color-mix(in srgb, var(--brand) 4%, var(--page))`
**Accent bars:** blue gradient on anchor, blue on PSC float

### 3. Operations Panel (emerald theme, 3 signals)

**File:** `operations.js` / `operations.css`
**Prefix:** `ops-`
**Theme colour:** emerald (use `var(--success)`, `var(--success-bg)`)

**Signals:**
| Signal | Role | Key Visual |
|--------|------|-----------|
| Filing Consistency (id: `filing-consistency`) | **Anchor** | Filing breakdown row (Accounts / CS01s / Other / On-time %) + last 3 filings (capped from 5) with type badge + on-time/late icon + accounts type footer |
| Virtual Office Check (id: `virtual-office`) | **Float top-right** | Address text + verification stamp (flagged/clear) + shared address count. No provider detail in the float — just the stamp verdict |
| SIC Code Analysis (id: `sic-code`) | **Float bottom-left** | Sector badge (name + risk level) + SIC codes listed + failure rate bar |

**Layout notes:**
- Same 3-signal layout as Financial (anchor + 2 floats)
- Filing history entries in anchor: cap at 3 most recent (not 5)
- Virtual Office float: simplified — show address on one line, stamp badge (flagged/clear), and shared count. Omit provider name and confidence level
- SIC Code float: sector name + risk label + 2 codes + failure rate bar

**Anchor card body layout:**
```
┌──────────────────────────────────────────────┐
│ [📄] Filing Consistency                MED   │
│ Do they file regularly?                      │
│──────────────────────────────────────────────│
│                                              │
│  7 Acc  │  8 CS01  │  3 Other  │  86% ✓     │
│                                              │
│  CS01  Confirmation  Dec 2023  ✓             │
│  AA    Accounts      Oct 2023  ✓             │
│  CS01  Confirmation  Dec 2022  ✓             │
│                                              │
│  📄 Micro accounts  ·  📅 Last: 14 Oct 2023 │
└──────────────────────────────────────────────┘
```

**Depth card tint:** `var(--success-bg)` with `color-mix(in srgb, var(--success) 4%, var(--page))`
**Accent bars:** emerald gradient on anchor, blue on virtual office float, amber on SIC float

## Design Token Reference

The project uses CSS custom properties (no Tailwind). Key tokens:

**Colours:** `var(--brand)`, `var(--brand-bg)`, `var(--success)`, `var(--success-bg)`, `var(--warning)`, `var(--warning-bg)`, `var(--danger)`, `var(--danger-bg)`, `var(--red-500)`
**Text:** `var(--text)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--text-faint)`
**Surfaces:** `var(--surface)`, `var(--page)`, `var(--muted)`, `var(--border)`
**Spacing:** `var(--space-0-5)` through `var(--space-96)` (4px increments: 0-5=2px, 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px, 10=40px, etc.)
**Borders:** `var(--border-1)` (1px), `var(--rounded-lg)`, `var(--rounded-xl)`, `var(--rounded-2xl)`, `var(--rounded-full)`
**Typography:** `var(--text-xs)` through `var(--text-4xl)`, `var(--font-medium)`, `var(--font-semibold)`, `var(--font-bold)`
**Effects:** `var(--shadow-sm)` through `var(--shadow-xl)`, `var(--blur-xl)`, `var(--blur-2xl)`, `var(--blur-3xl)`
**Transitions:** `var(--duration-200)`, `var(--duration-300)`, `var(--duration-700)`, `var(--ease-out)`, `var(--ease-out-expo)`
**Opacity:** `var(--opacity-0)` through `var(--opacity-100)` (in increments: 0, 5, 10, 20, 30, 40, 100)
**Icons:** Phosphor Icons — `ph-*` for regular, `ph-fill` for filled, `ph-bold` for bold weight

## What NOT to change

- `what-we-check.js` — the main component, tabs, swipe, navigation. The renderer interface is stable.
- `index.js` — panel registry. Each panel self-registers on load.
- `what-we-check.css` — main layout styles. The grid/body/hero/footer structure stays.
- `financial.js` / `financial.css` — the completed reference implementation.
- `operations.js` / `operations.css` — completed, follows the same pattern.
- `directors.js` / `directors.css` — completed, follows the same pattern.
- Any DEMO_DATA or SIGNAL_DEFINITIONS in the panel files — only the renderer functions change.
- Panel definition objects (id, label, icon, color, panelType, hero) — stay the same.

## Implementation Checklist

For each panel:

1. Read the existing `.js` file to understand the DEMO_DATA shape and signal IDs
2. Read the completed `financial.js` and `financial.css` as your template
3. Rewrite the renderer functions in the `.js` file:
   - Keep DEMO_DATA, SIGNAL_DEFINITIONS, buildSignals, panel definition, exports unchanged
   - Replace individual card renderers with: renderNoDataCard, renderAnchorCard, renderFloat* functions
   - Replace the main `render{Panel}Panel(signals)` to return a `.{prefix}-showcase` wrapper
4. Rewrite the `.css` file following the same section structure as financial.css:
   - Grid container override
   - Showcase container (mobile flex → tablet+ block with relative positioning)
   - Shared card base
   - Card header, icons, badges, accent bars
   - Anchor card body (unique visual per panel)
   - Float card bodies (compact data widgets)
   - No-data card
   - Tablet+ composed illustration (depth card, blur, anchor centering, float positioning)
   - Desktop/1280px refinements
5. Verify the panel renders correctly in all 4 tabs
6. Verify mobile (stacked), tablet (composed with full width), desktop (composed in narrower zone)

## Order of Implementation

1. ~~**Operations** (3 signals, emerald) — closest structural match to Financial (also 3 signals)~~ **DONE**
2. ~~**Directors** (2 signals, blue) — simplest layout (only 1 float card)~~ **DONE**
3. **Stability** (4 signals, amber) — most complex (3 float cards, needs careful positioning) **← NEXT**
