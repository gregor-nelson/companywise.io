# Kickoff: Directors Panel — Composed Illustration Refactor

## Task

Refactor the Directors panel from individual tall cards to the composed illustration layout (centred anchor card + absolutely positioned float card). This is the simplest panel — only 2 signals, so 1 anchor + 1 float.

## Files to modify

- JS: frontend/src/js/components/Home/what-we-check/components/directors.js
- CSS: frontend/src/js/components/Home/what-we-check/styles/components/directors.css

## Reference files (read these first as your template)

- JS: frontend/src/js/components/Home/what-we-check/components/financial.js
- CSS: frontend/src/js/components/Home/what-we-check/styles/components/financial.css

A second completed example is also available:
- JS: frontend/src/js/components/Home/what-we-check/components/operations.js
- CSS: frontend/src/js/components/Home/what-we-check/styles/components/operations.css

## Panel spec

Prefix: dir-
Theme colour: blue (var(--brand), var(--brand-bg))
Signals: 2

### Signal 1 — Director History (id: director-history) — ANCHOR

Stats row: Active count / Resigned count / Dissolved companies count
Director roster: max 2 rows. Each row: avatar icon + name + role + date + company count flag + dissolved count flag
Footer: average tenure line

Anchor card body layout:
```
+----------------------------------------------+
| [icon] Director History                  MED  |
| Track record across companies                 |
|----------------------------------------------|
|                                               |
|  2 Active    1 Resigned    4 Dissolved cos.   |
|                                               |
|  avatar J. Smith  . Director . Mar 2016  4  1 |
|  avatar A. Johnson . Director . Jun 2020 7  3 |
|                                               |
|  Avg. tenure: 5 years                         |
+----------------------------------------------+
```

### Signal 2 — PSC Register (id: psc-register) — FLOAT bottom-right

PSC count + entries with ownership percentage bars + transparency indicator
The float can be larger (~240-250px) since it is the sole companion

### Layout notes

- Only 2 signals so simpler composition: 1 anchor + 1 float
- Anchor can be wider (~70-75%) since there is only one float
- PSC float positioned bottom-right or bottom-centre-right
- On mobile both cards stack vertically

### Theme details

Depth card tint: var(--brand-bg) with color-mix(in srgb, var(--brand) 4%, var(--page))
Accent bars: blue gradient on anchor, blue on PSC float

## What to keep unchanged

- DEMO_DATA, SIGNAL_DEFINITIONS, buildSignals(), panel definition object, exports
- Do NOT modify what-we-check.js, index.js, what-we-check.css, or any other panel files

## Implementation steps

1. Read directors.js to understand the existing DEMO_DATA shape and signal IDs
2. Read financial.js + financial.css as your template (operations.js/css also available as a second example)
3. Rewrite the renderer functions in directors.js:
   - renderNoDataCard(signal, extraClass) with dir- prefix classes
   - renderAnchorCard(signal) for Director History
   - renderPSCFloat(signal) for PSC Register
   - renderDirectorsPanel(signals) returning a div.dir-showcase wrapper with depth + anchor + float + blur
4. Rewrite directors.css following the same section structure as financial.css:
   - Grid container override for .wwc-signals-grid--directors
   - Showcase container (mobile flex column, tablet+ block with relative positioning)
   - Shared card base .dir-card
   - Card header, icon variants, titles, badge, accent bars
   - Anchor card body (stats row + director roster + tenure footer)
   - Float card body (PSC entries with ownership bars + transparency indicator)
   - No-data card
   - Tablet+ composed illustration (depth card, blur, anchor centering at ~70-75%, float positioning)
   - Desktop/1280px refinements

## Design tokens

Colours: var(--brand), var(--brand-bg), var(--success), var(--success-bg), var(--warning), var(--warning-bg), var(--danger), var(--danger-bg), var(--red-500)
Text: var(--text), var(--text-secondary), var(--text-muted), var(--text-faint)
Surfaces: var(--surface), var(--page), var(--muted), var(--border)
Spacing: var(--space-0-5) through var(--space-96)
Borders: var(--border-1), var(--rounded-lg), var(--rounded-xl), var(--rounded-2xl), var(--rounded-full)
Typography: var(--text-xs) through var(--text-4xl), var(--font-medium), var(--font-semibold), var(--font-bold)
Effects: var(--shadow-sm) through var(--shadow-xl), var(--blur-xl), var(--blur-2xl), var(--blur-3xl)
Transitions: var(--duration-200), var(--duration-300), var(--duration-700), var(--ease-out), var(--ease-out-expo)
Icons: Phosphor Icons (ph-* regular, ph-fill filled, ph-bold bold)
