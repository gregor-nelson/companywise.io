# Kickoff: Stability Panel — Composed Illustration Refactor

## Task

Refactor the Stability panel from individual tall cards to the composed illustration layout (centred anchor card + absolutely positioned float cards). This is the most complex panel — 4 signals, so 1 anchor + 3 floats.

## Files to modify

- JS: frontend/src/js/components/Home/what-we-check/components/stability.js
- CSS: frontend/src/js/components/Home/what-we-check/styles/components/stability.css

## Reference files (read these first as your template)

- JS: frontend/src/js/components/Home/what-we-check/components/financial.js
- CSS: frontend/src/js/components/Home/what-we-check/styles/components/financial.css

Additional completed examples:
- JS: frontend/src/js/components/Home/what-we-check/components/operations.js
- CSS: frontend/src/js/components/Home/what-we-check/styles/components/operations.css
- JS: frontend/src/js/components/Home/what-we-check/components/directors.js (2-signal variant)
- CSS: frontend/src/js/components/Home/what-we-check/styles/components/directors.css

## Panel spec

Prefix: stab-
Theme colour: amber (var(--warning), var(--warning-bg))
Signals: 4

### Signal 1 — Company Age (id: company-age) — ANCHOR

Big number display (8 years 10 months) + bracket badge ("Established") + horizontal timeline bar with milestones at 0, 2yr, 5yr, 10yr, 15+. Footer with incorporated date and first filing date.

Thresholds from signal definition: { new: 2, growing: 5, established: 10 }
Bracket map: <2 = 'new'/danger, 2-5 = 'growing'/warning, 5-10 = 'established'/ok, 10+ = 'mature'/strong

Anchor card body layout:
```
+----------------------------------------------+
| [icon] Company Age                      MED  |
| How long have they been trading?             |
|----------------------------------------------|
|                                              |
|  8 years  10 months    [Established]         |
|                                              |
|  ──────●────────────── 0  2  5  10  15+     |
|                                              |
|  cal Incorporated: 12 Mar 2016               |
|  doc First filing: 12 Mar 2017               |
+----------------------------------------------+
```

### Signal 2 — Company Status (id: company-status) — FLOAT top-right

Traffic-light beacon: 3 stacked dots (ok/warning/danger), one active based on status. Status label + "Since" date. Compact — no status history in the float, just the beacon + label.

Status map: active = ok/check-circle, dormant = warning/pause-circle, in-liquidation = danger/warning-circle, struck-off/dissolved = critical/x-circle

```
+----------------------------+
| [icon] Company Status      |
|----------------------------|
|  [●] Active                |
|  Since 12 Mar 2016         |
|                            |
|  ● ● ●  (traffic lights)  |
+----------------------------+
```

### Signal 3 — Address Changes (id: address-changes) — FLOAT bottom-left

Change count + frequency badge (Low/Moderate/High) + tenure line ("1 year at current address"). NO address trail stops — remove the vertical pin trail for compactness. Keep it to: count, frequency stamp, tenure footer.

```
+----------------------------+
| [icon] Address Changes     |
|----------------------------|
|  3 changes  [Moderate]     |
|                            |
|  clock 1 year at current   |
+----------------------------+
```

### Signal 4 — Previous Names (id: previous-names) — FLOAT bottom-right

Very compact pill-sized widget. If changes: count + "name changes" label. If none: check icon + "No name changes". This is the smallest float.

```
+-------------------------+
| [icon] Previous Names   |
|-------------------------|
|  2 name changes         |
|  — or —                 |
|  check No name changes  |
+-------------------------+
```

### Layout notes

- 4 signals: 1 anchor + 3 floats — most complex composition
- Anchor at ~65-68% width (standard, same as financial)
- Status float: top-right, ~200px wide
- Address float: bottom-left, ~180px wide (compact)
- Names float: bottom-right, ~160px wide (smallest, pill-like)
- The 3rd float (Previous Names) is the smallest — keep it minimal
- On mobile all 4 cards stack vertically

### Theme details

Depth card tint: var(--warning-bg) with color-mix(in srgb, var(--warning) 4%, var(--page))
Accent bars: amber gradient on anchor, amber on status float, amber on address float, blue on names float

## What to keep unchanged

- DEMO_DATA, SIGNAL_DEFINITIONS, buildSignals(), panel definition object, exports
- Do NOT modify what-we-check.js, index.js, what-we-check.css, or any other panel files

## Implementation steps

1. Read stability.js to understand the existing DEMO_DATA shape and signal IDs
2. Read financial.js + financial.css as your template (operations.js/css and directors.js/css also available)
3. Rewrite the renderer functions in stability.js:
   - renderNoDataCard(signal, extraClass) with stab- prefix classes
   - renderAnchorCard(signal) for Company Age — big number + bracket badge + timeline bar + meta footer
   - renderStatusFloat(signal) for Company Status — beacon + traffic lights + label
   - renderAddressFloat(signal) for Address Changes — count + frequency badge + tenure line (NO trail stops)
   - renderNamesFloat(signal) for Previous Names — count or "no changes" pill
   - renderStabilityPanel(signals) returning a div.stab-showcase wrapper with depth + anchor + 3 floats + blur
4. Rewrite stability.css following the same section structure as financial.css:
   - Grid container override for .wwc-signals-grid--stability
   - Showcase container (mobile flex column, tablet+ block with relative positioning)
   - Shared card base .stab-card
   - Card header, icon variants (amber, red, blue, muted), titles, badge, accent bars
   - Anchor card body (age display + bracket badge + timeline bar + meta footer)
   - Status float body (beacon light + status label + traffic light dots)
   - Address float body (count + frequency stamp + tenure line)
   - Names float body (count label or "no changes" clear state)
   - No-data card
   - Tablet+ composed illustration (depth card, blur, anchor centering at ~65-68%, 3 float positions)
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
