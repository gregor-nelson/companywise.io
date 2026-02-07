# Verification Prompt — CSS Token Alignment Reference

Paste this prompt into a fresh session to verify the reference document is accurate and complete.

---

## Prompt

```
Read the following three files in full:

1. frontend/specs/HERO-CSS-TOKEN-MIGRATION.md  (the design reference document)
2. frontend/src/styles/tokens.css                (the token definitions)
3. frontend/src/js/components/hero/styles/hero.css (the reference implementation)

Then perform the following verification checks and report your findings. For each check, state PASS or FAIL with details.

---

### Check 1 — Token Quick-Reference Accuracy

Compare every token listed in the "Token Quick-Reference" section of the reference document against tokens.css. Report:

a) Any tokens listed in the reference that do NOT exist in tokens.css
b) Any tokens in tokens.css that are MISSING from the reference
c) Any incorrect values (wrong px/rem mapping, wrong numeric value)

---

### Check 2 — Migration Rules Completeness

Review the "What to tokenise" and "What to leave hardcoded" tables. For each rule:

a) Confirm the rule is demonstrated correctly in hero.css
b) Flag any rules that contradict what hero.css actually does
c) Flag any patterns in hero.css that aren't covered by any rule

---

### Check 3 — hero.css Token Coverage Audit

Scan every line of hero.css for hardcoded literal values (numbers with units, hex colours, named colours, rgb/hsl values, bare numeric weights/opacities/z-indices). For each one found:

a) Confirm it falls into one of the "What to leave hardcoded" categories
b) If it does NOT, flag it as a missed tokenisation opportunity
c) Verify the "27 remaining hardcoded values" count is accurate — list them all and count

---

### Check 4 — Snapping Examples Accuracy

For each example in the "Snapping — nearest wins" table:

a) Confirm the "Original" value is correct
b) Confirm the "Nearest" token is actually the nearest (check both neighbours)
c) Confirm the token name is correct

---

### Check 5 — Component Backlog

Verify the 14 component CSS files listed under "Components to migrate" all exist at their stated paths. Report any:

a) Files listed that don't exist
b) Component CSS files that exist but are missing from the list

---

### Check 6 — Code Examples

Review every code example in "Step 2" through "Step 4" of the migration workflow:

a) Confirm each "BEFORE" value maps to the correct "AFTER" token
b) Confirm each token name and value is correct against tokens.css
c) Flag any misleading or incorrect examples

---

### Output Format

For each check, use this format:

## Check N — [Title]
**Result: PASS / FAIL**

[Details — list any issues found, or confirm everything is correct]

At the end, provide a summary:

## Summary
- Checks passed: X/6
- Issues found: [list]
- Recommended fixes: [list]
```
