# Handover: Session 2 Findings — Stage 4 Post-Processing Needed

## What Was Done This Session

### 1. Scale Bug Fixed (pipeline.py)

The pipeline was multiplying all values by 1000 (because it detected "£000" in the header). But the values on the page are already printed in £000s, and the ground truth stores as-printed values. Fix: `scale=1` is now hardcoded for both BS and P&L processing. `detect_scale()` still runs and reports what it found (metadata), but the multiplier is not applied.

**Result: 0/10 → 4/10 for both years.** The 4 values that were already being extracted (NetCurrentAssetsLiabilities, TotalAssetsLessCL, NetAssetsLiabilities, Equity) are now correct.

### 2. Debug Logging Added (pipeline.py)

After Stage 5 OCR, every row is dumped showing: index, y-position, label text, values per year, concept match result, and a flag for unlabelled value rows. This runs for both BS and P&L pages. The logging uses `zip(table.rows, ocr_result.rows)` to get `y_centre` from the Stage 4 `TableRow` (since `OCRRow` doesn't have it).

### 3. Root Cause Analysis Complete

Ran the pipeline on the ACTEON 2024 filing. Full debug output analysed below.

---

## Current Score: 4/10 (both years)

| Concept | Status | Root Cause |
|---------|--------|------------|
| FixedAssets | MISSING | Subtotal row has values but no label (row 15) |
| CurrentAssets | MISSING | Subtotal value (37,892) misclassified as label text (row 21) |
| CashBankOnHand | MISSING | Value (370) and note number (17) absorbed into label text (row 20) |
| Debtors | MISSING | Multi-line label split across rows 18+19; value (37,522) in label |
| Creditors | MISSING | Multi-line label split across rows 23+24; value (279,477) in label |
| ProfitLoss | MISSING | Both year values concatenated in one cell: "(284,085) (55,657)" |
| NetCurrentAssetsLiabilities | OK | |
| TotalAssetsLessCL | OK | |
| NetAssetsLiabilities | OK | |
| Equity | OK | |

---

## Detailed Row Dump Analysis

### Balance Sheet (page 16) — Key Rows

```
ROW  Y     LABEL                                              2024 VAL        2023 VAL        ISSUE
───  ────  ─────                                              ────────        ────────        ─────
 7   832   'Fixed assets'                                     —               —               Section header, no values
15  1207   ''                                                 '4,308'         '487,516'       *** Subtotal, no label → needs FixedAssets
17  1268   'Current assets'                                   —               —               Section header, no values
18  1345   'Receivables: amounts falling due within one'      —               —               First line of multi-line label
19  1393   'year 16 37,522'                                   '123,097'       —               Continuation + note(16) + 2024 val in label, 2023 val in 2024 col
20  1453   'Cash at bank and in hand 17 370'                  —               —               Note(17) + 2024 val(370) absorbed into label, 2023 val(52) missing entirely
21  1565   '37,892'                                           '123,149'       —               2024 subtotal is the label, 2023 val in 2024 col → needs CurrentAssets
23  1641   'Payables: amounts falling due within one'         —               —               First line of multi-line label
24  1690   'year 18 (279,477)'                                '(410,644)'     —               Continuation + note(18) + 2024 val in label, 2023 val in 2024 col
25  1798   'Net current liabilities'                          '(241,585)'     '(287,495)'     ✓ Correct
26  1906   'Total assets less current liabilities'            '(237,277)'     '200,021'       ✓ Correct
30  2188   'Net (liabilities)/assets'                         '(237,277)'     '46,808'        ✓ Correct
36  2675   'Total equity'                                     '(237,277)'     '46,808'        ✓ Correct
```

### P&L (page 15) — Key Rows

```
ROW  Y     LABEL                                              2024 VAL                   2023 VAL   ISSUE
───  ────  ─────                                              ────────                   ────────   ─────
 6   849   'Administrative expenses'                          '(1,807) (28,627)'         —          Both vals in one cell
14  1455   'Loss for the financial year'                      '(284,085) (55,657)'       —          *** ProfitLoss: both vals concatenated
```

The P&L has a systematic column alignment issue — nearly all rows have both year values concatenated in the 2024 column, with the 2023 column empty or containing a dash.

---

## Five Patterns to Fix (all in stage4_tables.py)

All fixes should be a **post-processing pass** on the rows returned by `_build_rows()`, called at the end of `detect_table()` before returning the `DetectedTable`. This keeps the existing column-position logic untouched.

### Pattern 1: Multi-line Label Merging

**Affected:** Debtors (rows 18+19), Creditors (rows 23+24)

When a row has a label but no values, and the next consecutive row looks like a continuation, merge them.

**Merge conditions (all must be true):**
- Row N has a label (length > 3 chars) and NO value cells (all None)
- Row N+1's label starts with a lowercase letter (continuation text like "year 16 37,522")
  - OR starts with a digit AND contains a financial value (like "16 37,522")
- Y-gap between rows is ≤ 80px (prevents false merges across sections)

**Merge action:** Combine labels, combine label_cells lists, take values from row N+1, skip row N+1 in iteration.

**Critical guard:** Do NOT merge when:
- Next row starts with uppercase (it's a new line item, not a continuation)
- Next row has an empty label (it's a subtotal — handle with Pattern 3 instead)
- Y-gap > 80px (different section of the page)

### Pattern 2: Extract Values Embedded in Labels

**Affected:** Debtors, Creditors (after merge), CashBankOnHand (row 20)

After merging, labels contain trailing note numbers and financial values that should be in value columns. E.g., `"Receivables: amounts falling due within one year 16 37,522"`.

**Algorithm:**
1. Scan `label_cells` right-to-left
2. If cell text is a financial value (3+ digits, or parenthesised number) → extract it
3. If cell text is a 1-2 digit integer (note reference like "16") → remove from label, discard
4. Stop at the first cell that's neither
5. Rebuild label from remaining cells
6. Collect ALL value cells (extracted + existing from value columns)
7. Sort all value cells by x-position (left → right)
8. Assign to year columns sorted by x-position (left → right, matching most-recent-year-left convention)

**Financial value test:** `^\(?[\d,]+\)?$` AND (has 3+ digits after removing commas, OR is parenthesised). This correctly classifies `37,522` as a value and `16` as a note number. The edge case is 2-digit values like `52` — these will be misclassified as note numbers and lost. Acceptable for the PoC since 2-digit financial values are rare.

**Why x-position reassignment matters:** After merge, the existing column assignments are often wrong (e.g., the 2023 value sitting in the 2024 column because it was the closest). Reassigning all values by x-position fixes this.

### Pattern 3: Section Header Inheritance for Subtotals

**Affected:** FixedAssets (row 15), CurrentAssets (row 21 after Pattern 4)

Unlabelled rows with values are subtotals. The label should come from the nearest section header above.

**Algorithm:**
1. Track `last_section_header` as we iterate rows top-to-bottom
2. A section header = row with label (length > 3) and NO values
3. When we hit an unlabelled row with real values (not just dashes/dots), assign `last_section_header`

**"Real values" check:** At least one value cell text is not in `('-', '—', '–', '~', '.', '')`. This prevents noise rows (like row 16 with just a dot) from inheriting headers.

### Pattern 4: Fix Numeric Labels (Subtotal Values as Labels)

**Affected:** CurrentAssets (row 21: `label='37,892'`, `vals={'2024': '123,149'}`)

When a subtotal value lands to the left of the value column, it gets classified as label text. Detect this and fix it.

**Algorithm:**
1. If a row's entire label is a number (digits + commas + optional parens, 3+ digits)
2. Create a synthetic TableCell from the label_cells
3. Collect it + existing value cells, sort by x-position, reassign to year columns
4. Clear the label (so Pattern 3's section header inheritance will fill it)

**Must run AFTER Pattern 2** (which might have already cleaned the label) **and BEFORE Pattern 3** (which needs the empty label to trigger inheritance).

### Pattern 5: Split Compound Values

**Affected:** ProfitLoss and most P&L rows

A cell contains two concatenated values separated by whitespace, like `"(284,085) (55,657)"`.

**Algorithm:**
1. Match against regex: `^(-?\(?[\d,]+\)?)\s+(-?\(?[\d,]+\)?)$`
2. First value stays in current year column
3. Second value goes to the next year column (if empty or just a dash)

**Years list is ordered most-recent-first**, and the left value on the page is the most recent year. So first match → current year, second match → prior year.

---

## Suggested Processing Order

```python
def _postprocess_rows(rows, years, year_columns):
    rows = _merge_multiline_rows(rows, years)      # Pattern 1
    _extract_label_values(rows, years, year_columns) # Pattern 2 (mutates in place)
    _fix_numeric_labels(rows, years, year_columns)   # Pattern 4 (mutates in place)
    _inherit_section_labels(rows, years)             # Pattern 3 (mutates in place)
    _split_compound_cells(rows, years)               # Pattern 5 (mutates in place)
    return rows
```

Call from `detect_table()`:
```python
rows = _build_rows(words, year_columns, col_tolerance, min_value_x)
rows = _postprocess_rows(rows, years, year_columns)
```

---

## Expected Outcome After Fixes

| Concept | Current | Expected |
|---------|---------|----------|
| FixedAssets | MISS | OK (Pattern 3) |
| CurrentAssets | MISS | OK (Patterns 4 + 3) |
| CashBankOnHand | MISS (2024), MISS (2023) | OK 2024 (Pattern 2), MISS 2023 (value 52 not in any row) |
| Debtors | MISS | OK (Patterns 1 + 2) |
| Creditors | MISS | OK (Patterns 1 + 2) — but sign mismatch: extracted as negative, ground truth is positive |
| ProfitLoss | MISS | OK (Pattern 5) |

**Predicted score: 8-9/10** (depending on CashBankOnHand 2023 and Creditors sign convention).

### Creditors Sign Issue (separate from extraction)

Ground truth stores Creditors as positive (279,477), but the PDF prints it in parentheses "(279,477)" which `parse_value()` converts to -279,477. This is a sign convention mismatch in `parse_filing.py`'s ground truth comparison, not an extraction bug. Can be fixed by comparing absolute values for Creditors, or by flipping the sign in Stage 6 for the Creditors concept.

---

## Remaining Work Beyond Accuracy Fixes

### Classification Speed (Problem 3 — not yet addressed)

Stage 3 takes 91s to OCR all 42 pages. Fix: crop each page image to top ~20% before the classification OCR pass — page titles are always at the top. This is independent of the accuracy work.

### Debug Logging Cleanup

The debug row dumps in `pipeline.py` should be gated behind a flag or removed once accuracy is stable. Currently they print unconditionally.

---

## Files to Change

| File | Changes |
|------|---------|
| `pdfs/parser/stage4_tables.py` | Add `_postprocess_rows()` and 5 helper functions. Call from `detect_table()`. |
| `pdfs/parser/pipeline.py` | Already modified (scale fix + debug logging). No further changes needed for accuracy. |

## Files Already Modified (this session)

| File | What Changed |
|------|-------------|
| `pdfs/parser/pipeline.py` | Scale fix (lines 158-163, 220), debug row dumps for BS (165-184) and P&L (222-241) |

## How to Run

```bash
# In WSL, from project root
source pdfs/.venv/bin/activate
python pdfs/scripts/parse_filing.py "pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf"
```

## Reference Docs

- Pipeline spec: `pdfs/spec/PDF-PARSING-PIPELINE.md`
- Ground truth: `pdfs/docs/HANDOVER-STAGE2-PARSING.md`
- Previous handover: `pdfs/docs/HANDOVER-SESSION2-ACCURACY.md`
- Source: `pdfs/parser/stage4_tables.py` (292 lines, the file to modify)
