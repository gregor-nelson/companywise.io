# Goal

Make the site's visual design trivially changeable by ensuring **every colour, font, spacing, and easing value** in every component CSS file references a `var(--token)` defined in `frontend/src/styles/main.css :root`. No hardcoded hex, rgb, rgba, named colours, or font names in component files. The user has **not finalised a design language** yet — the system must be palette-agnostic so swapping the entire colour scheme means editing only `:root`.

Remove all references to "GOV.UK Design System" from the spec and code comments. The palette should be treated as a generic, swappable set of tokens.

---