# Handover: Session 3 — Column Fixes Done, Post-Processing Next

## What Was Done This Session

### Context

Session 2 identified 5 post-processing patterns needed in `stage4_tables.py`. Rather than implementing all 5 at once, this session investigated root causes for 3 specific issues and implemented targeted fixes.

### 3 Fixes Implemented (all in `pdfs/parser/stage4_tables.py`)

#### Fix 1: Nearest Column Assignment (lines 251-258)

The word-to-column assignment loop in `_build_rows()` previously iterated `year_columns.items()` and broke on the first column within tolerance. When P&L columns were close together, both fell within the tolerance zone of the same word, and dict iteration order determined which won — all values landed in one column.

**Change:** Replaced the first-match-break loop with a nearest-column approach. Now scans all year columns, picks the closest one within tolerance. Drop-in replacement — same assignment body, just better column selection.

**Result:** P&L values now correctly separated into two columns. ProfitLoss extracted for both years.

#### Fix 2: Orphan Word Rescue (lines 276-300)

Words right of `min_value_x` that didn't match any column within tolerance were silently dropped (assumed to be note references). This lost legitimate values like `52` (CashBankOnHand 2023).

**Change:** Instead of dropping, these orphan words now check for the nearest year column within 2x the normal tolerance. Only words that are truly far from any column get dropped.

**Result:** CashBankOnHand 2023 value `52` now rescued. Score went from 4 to 6 for 2023.

#### Fix 3: Compound Value Splitting (lines 320-365, called at line 95)

New function `_split_compound_values()` as a safety net for when Tesseract returns two numbers as a single word (e.g. `"(284,085) (55,657)"`).

**Change:** Post-processing pass after `_build_rows()`. Regex matches cells with two whitespace-separated financial values. First value stays in current year column, second goes to next year (if empty). Years ordered most-recent-first matching left-to-right page layout.

**Result:** Acts as fallback for any compound values that Fix 1 didn't separate at the word level.

---

## Current Scores

| Year | Session 2 Start | Session 3 End | Delta |
|------|-----------------|---------------|-------|
| 2024 | 4/10 | 5/10 | +1 (ProfitLoss) |
| 2023 | 4/10 | 6/10 | +2 (ProfitLoss, CashBankOnHand) |

---

## What's Still Missing — 5 Concepts Need Patterns 1-4

The remaining misses are all caused by label/row-level issues that the column fixes don't address. These require post-processing patterns from the Session 2 handover (`HANDOVER-SESSION2-FINDINGS.md`).

### Row Dump Evidence (Balance Sheet, page 16)

```
ROW  LABEL                                              2024 VAL      2023 VAL      PROBLEM
───  ─────                                              ────────      ────────      ───────
 7   'Fixed assets'                                     —             —             Section header, no values
15   ''                                                 '4,308'       '487,516'     Subtotal with no label → needs FixedAssets
17   'Current assets'                                   —             —             Section header, no values
18   'Receivables: amounts falling due within one'      —             —             First line of multi-line label
19   'year 16 37,522'                                   '123,097'     —             Continuation + note(16) + 2024 val in label
20   'Cash at bank and in hand 17 370'                  —             '52'          Note(17) + 2024 val(370) in label; 2023 rescued by Fix 2
21   '37,892'                                           '123,149'     —             Subtotal value as label text
23   'Payables: amounts falling due within one'         —             —             First line of multi-line label
24   'year 18 (279,477)'                                '(410,644)'   —             Continuation + note(18) + 2024 val in label
```

### Remaining Patterns to Implement

All patterns should be a **post-processing pass** on the rows returned by `_build_rows()`, called from `detect_table()` after the existing `_split_compound_values()` call (line 95). This keeps the column-position logic untouched.

#### Pattern 1: Multi-line Label Merging

**Affected:** Debtors (rows 18+19), Creditors (rows 23+24)

When a row has a label but no values, and the next consecutive row looks like a continuation, merge them.

**Merge conditions (all must be true):**
- Row N has a label (length > 3 chars) and NO value cells (all None)
- Row N+1's label starts with a lowercase letter (continuation text like "year 16 37,522") OR starts with a digit AND contains a financial value
- Y-gap between rows is <= 80px (ACTEON-derived threshold — prevents false merges across sections)

**Merge action:** Combine labels, combine label_cells lists, take values from row N+1, remove row N+1.

**Guard:** Do NOT merge when next row starts with uppercase, has empty label, or Y-gap > 80px.

#### Pattern 2: Extract Values Embedded in Labels

**Affected:** Debtors, Creditors (after merge), CashBankOnHand 2024

After merging, labels contain trailing note numbers and financial values. E.g. `"Receivables: amounts falling due within one year 16 37,522"`.

**Algorithm:**
1. Scan `label_cells` right-to-left
2. If cell text is a financial value (matches `^\(?[\d,]+\)?$` AND has 3+ digits after removing commas, OR is parenthesised) → extract as value
3. If cell text is a 1-2 digit integer → check x-position: if near a year column (within `col_tolerance`), treat as value; otherwise discard as note reference
4. Stop at first cell that's neither
5. Rebuild label from remaining cells
6. Collect ALL value cells (extracted + existing from value columns)
7. Sort all value cells by x-position (left → right)
8. Assign to year columns in order (most-recent-first, matching left-to-right convention)

**Note on the 1-2 digit heuristic:** Session 2 proposed discarding all 1-2 digit integers as note numbers. Session 3 analysis showed this loses values like `52`. Using x-position proximity to year columns (already available via `year_columns` dict) distinguishes note numbers from values. Note numbers sit in the gap between label and value regions; values sit near/in a column.

#### Pattern 3: Section Header Inheritance for Subtotals

**Affected:** FixedAssets (row 15), CurrentAssets (row 21 after Pattern 4)

Unlabelled rows with values are subtotals. The label should come from the nearest section header above.

**Algorithm:**
1. Track `last_section_header` iterating top-to-bottom
2. Section header = row with label (length > 3) and NO values
3. When hitting an unlabelled row with real values (not just dashes), assign `last_section_header`

**"Real values" check:** At least one value cell text is not in `('-', '—', '–', '~', '.', '')`.

#### Pattern 4: Fix Numeric Labels (Subtotal Values as Labels)

**Affected:** CurrentAssets (row 21: `label='37,892'`, `vals={'2024': '123,149'}`)

When a subtotal value lands left of the value column, it gets classified as label text.

**Algorithm:**
1. If a row's entire label is a number (digits + commas + optional parens, 3+ digits)
2. Create a synthetic TableCell from the label_cells
3. Collect it + existing value cells, sort by x-position, reassign to year columns
4. Clear the label (so Pattern 3's section header inheritance fills it)

**Must run AFTER Pattern 2 and BEFORE Pattern 3.**

### Suggested Processing Order

```python
def _postprocess_rows(rows, years, year_columns):
    rows = _merge_multiline_rows(rows)                 # Pattern 1
    _extract_label_values(rows, years, year_columns)    # Pattern 2 (mutates)
    _fix_numeric_labels(rows, years, year_columns)      # Pattern 4 (mutates)
    _inherit_section_labels(rows)                       # Pattern 3 (mutates)
    return rows
```

Call from `detect_table()` after `_split_compound_values()`:
```python
rows = _build_rows(words, year_columns, col_tolerance, min_value_x)
_split_compound_values(rows, years)
rows = _postprocess_rows(rows, years, year_columns)
```

### Expected Outcome After All Patterns

| Concept | Current | Expected | Pattern |
|---------|---------|----------|---------|
| FixedAssets | MISS | OK | 3 |
| CurrentAssets | MISS | OK | 4 + 3 |
| CashBankOnHand 2024 | MISS | OK | 2 |
| Debtors | MISS | OK | 1 + 2 |
| Creditors | MISS | OK (with sign caveat) | 1 + 2 |

**Predicted score: 9-10/10** for both years.

### Creditors Sign Issue (separate from extraction)

Ground truth stores Creditors as positive (279,477), but the PDF prints it in parentheses "(279,477)" which `parse_value()` converts to -279,477. This is a sign convention mismatch in `parse_filing.py`'s ground truth comparison, not an extraction bug. Fix by comparing absolute values for Creditors, or flipping the sign in Stage 6 for the Creditors concept.

---

## Other Outstanding Work

### Classification Speed (from Session 2, not yet addressed)

Stage 3 takes ~98s to OCR all 42 pages. Fix: crop each page image to top ~20% before the classification OCR pass. Independent of accuracy work.

### Debug Logging Cleanup

The debug row dumps in `pipeline.py` (lines 165-184 for BS, lines 243-262 for P&L) print unconditionally. Should be gated behind a flag once accuracy is stable.

---

## Files Modified

| File | Session | What Changed |
|------|---------|-------------|
| `pdfs/parser/pipeline.py` | 2 | Scale fix + debug row dumps |
| `pdfs/parser/stage4_tables.py` | 3 | Nearest column (lines 251-258), orphan rescue (lines 276-300), compound split (lines 320-365) |

## File to Change Next

| File | Changes |
|------|---------|
| `pdfs/parser/stage4_tables.py` | Add `_postprocess_rows()` wrapper + 4 pattern functions. Call from `detect_table()` after `_split_compound_values()`. |

## How to Run

```bash
# In WSL, from project root
source pdfs/.venv/bin/activate
python pdfs/scripts/parse_filing.py "pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf"
```

## Reference Docs

- Pipeline spec: `pdfs/spec/PDF-PARSING-PIPELINE.md`
- Ground truth: `pdfs/docs/HANDOVER-STAGE2-PARSING.md`
- Session 2 findings: `pdfs/docs/HANDOVER-SESSION2-FINDINGS.md`
- Session 2 accuracy: `pdfs/docs/HANDOVER-SESSION2-ACCURACY.md`
- Source to modify: `pdfs/parser/stage4_tables.py` (366 lines)
