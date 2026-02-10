# Handover: Session 2 — Fixing PDF Pipeline Accuracy

## What Exists

A working end-to-end PDF parsing pipeline at `pdfs/parser/` with 8 stages. Full spec at `pdfs/spec/PDF-PARSING-PIPELINE.md`. CLI at `pdfs/scripts/parse_filing.py`.

## First Run Results (ACTEON 2024)

**Score: 0/10 for both years.** Two distinct problems:

### Problem 1: Scale applied incorrectly (4 values affected)

The values that ARE extracted are 1000x too large:

```
NetCurrentAssetsLiabilities:  expected -241,585  got -241,585,000
TotalAssetsLessCL:            expected -237,277  got -237,277,000
NetAssetsLiabilities:         expected -237,277  got -237,277,000
Equity:                       expected -237,277  got -237,277,000
```

**Root cause:** The pipeline detects "£000" in the page header and multiplies every parsed number by 1000. But the numbers on the page are already in £000s (e.g. the page prints "241,585" meaning £241,585,000). The ground truth stores the as-printed values. So scale should NOT be applied — the printed numbers are the values we want.

**Fix options:**
- A) Don't apply scale at all — store as-printed, let downstream handle it. Simplest for PoC.
- B) Apply scale but change ground truth to actual £ values (4,308,000 etc). More correct long-term.

Recommend **option A** for the PoC. The `detect_scale()` function can still record what scale was found (metadata), but `parse_value()` should be called with `scale=1`.

### Problem 2: 6 concepts not extracted (FixedAssets, CurrentAssets, CashBankOnHand, Debtors, Creditors, ProfitLoss)

These are all MISSING. The table detection found 44 rows on the balance sheet page (page 16, 0-indexed), so the data is there — but either:

1. **Concept matching failed** — the OCR'd label text doesn't match any synonym closely enough. The subtotal rows (FixedAssets, CurrentAssets) may not have explicit labels in the table — they're just indented numbers on a line by themselves.

2. **Value column assignment failed** — the column-position heuristic may be assigning values to the wrong column or dropping them. Subtotal rows in UK accounts often have values but no label on the left.

3. **Creditors specifically** — the label is "Payables: amounts falling due within one year" spanning multiple lines. Stage 4's row clustering (±15px) may split this across two rows.

4. **ProfitLoss** — extracted from P&L page (page 15), but also missing. Same issues likely apply.

**Diagnosis needed:** Run with `--debug-dir ./debug` and inspect what Stage 4 actually sees. Specifically:
- Print the raw label text for all 44 detected rows
- Check which labels Stage 7 rejects and why
- Check if subtotal values are being found but have empty labels

### Problem 3: Performance (118s total, target <60s)

```
Render:      6.9s   — fine
Preprocess: 13.9s   — fine
Classify:   93.1s   — THIS IS THE BOTTLENECK
Tables:      2.7s   — fine
OCR:         0.0s   — fine (no re-OCR triggered)
```

Stage 3 runs full-page Tesseract OCR (`--psm 6`) on all 42 pages to classify them. This is the slowest possible approach.

**Fix options:**
- Only OCR a subset of pages (first 20, or every Nth page)
- Use a faster OCR pass (lower DPI, `--psm 3` with OSD, smaller image)
- OCR only the top portion of each page (crop top 20% where titles live)
- Skip OCR entirely for classification — use PyMuPDF to check if the page has certain visual features

## Files to Change

| File | What Needs Changing |
|------|-------------------|
| `pdfs/parser/pipeline.py` | Stop passing `scale` to `parse_value()`, or pass `scale=1` |
| `pdfs/parser/stage4_tables.py` | Debug output needed — print/log all detected rows with labels. May need row-merging logic for multi-line labels. May need subtotal detection for unlabelled value rows. |
| `pdfs/parser/stage3_classify.py` | Performance fix — don't OCR all 42 pages. Crop or subsample. |
| `pdfs/parser/synonyms.py` | May need more synonyms once we see what OCR produces for the missing concepts |
| `pdfs/parser/stage7_concepts.py` | May need to lower fuzzy cutoff or add pre-processing for multi-line labels |

## Suggested Approach for Session 2

1. **Add debug logging to Stage 4** — print every detected row (label + values) so we can see exactly what the table detector produces. This is the diagnostic step.
2. **Fix the scale bug** — quick win, changes 4 FAILs to 4 OKs.
3. **Fix missing concepts** — based on the debug output, determine whether it's a label matching problem or a table detection problem, then fix accordingly.
4. **Fix classification speed** — crop pages before OCR, or only OCR a subset.
5. **Re-run and compare to ground truth.**

## How to Run

```bash
# In WSL, from project root
source pdfs/.venv/bin/activate
python pdfs/scripts/parse_filing.py "pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf"

# With debug output
python pdfs/scripts/parse_filing.py "pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf" --debug-dir ./debug
```

## Reference

- Full pipeline spec: `pdfs/spec/PDF-PARSING-PIPELINE.md`
- Ground truth + concept mapping: `pdfs/docs/HANDOVER-STAGE2-PARSING.md`
- Source code: `pdfs/parser/` (8 stage modules + pipeline.py + synonyms.py)
- CLI: `pdfs/scripts/parse_filing.py`
