# PDF Parsing Pipeline — Technical Spec

> Reference document for developers and LLMs working on this codebase.
> Reflects the implementation as of 10 February 2026.

---

## 1. What This Does

Extracts structured financial data from **scanned PDF filings** downloaded from Companies House. These PDFs contain zero extractable text — they are TIFF images wrapped in PDF containers. The pipeline reads the image, finds the right pages, detects tables, OCRs cell values, maps labels to iXBRL concepts, and validates the output using balance sheet arithmetic.

**Single entry point:**
```python
from pdfs.parser.pipeline import parse_pdf_filing
result = parse_pdf_filing("path/to/filing.pdf")
```

**CLI:**
```bash
python pdfs/scripts/parse_filing.py <pdf_path> [--debug-dir <dir>]
```

---

## 2. Architecture

Eight sequential stages. Each is a standalone module with a defined input/output contract. No stage knows about the internals of any other — they communicate through dataclasses.

```
PDF file
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: Render          (stage1_render.py)                     │
│ PDF → list[PageImage]    PyMuPDF at 300 DPI → RGB numpy arrays  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ list[PageImage]
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 2: Preprocess      (stage2_preprocess.py)                 │
│ RGB → grayscale → Otsu threshold → deskew → denoise             │
│ Returns PreprocessedPage (cleaned binary image)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ list[PreprocessedPage]
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 3: Classify        (stage3_classify.py)                   │
│ Full-page Tesseract OCR (--psm 6), score against keyword dicts  │
│ Identifies: balance_sheet, profit_loss, cover, other            │
│ Reduces 42 pages → 2-3 target pages                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ best pages (ClassifiedPage per type)
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 4: Table Detection (stage4_tables.py)        HIGHEST RISK │
│ Tesseract image_to_data → word bounding boxes                   │
│ Find year header row → x-coords define column centres           │
│ Cluster words into rows by y-proximity (±15px)                  │
│ Assign words to label column or value columns by x-position     │
│ Returns DetectedTable with rows, year columns, scale text       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ DetectedTable
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 5: Cell OCR        (stage5_ocr.py)                        │
│ Uses text from Stage 4 if confidence ≥ 70%                      │
│ Re-OCRs low-confidence cells: crop → --psm 7 + digit whitelist  │
│ Returns OCRTable with refined text per cell                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ OCRTable
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 6: Value Parsing   (stage6_values.py)                     │
│ Text → integer: "(279,477)" → -279477, "-" → 0                 │
│ OCR corrections: l→1, O→0, S→5, I→1, B→8, g→9, Z→2            │
│ Scale detection: "£000" in header → multiply all values ×1000  │
│ Returns ParsedValue (value | None, corrections applied)         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ int values per concept per year
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 7: Concept Mapping (stage7_concepts.py)                   │
│ Row label text → iXBRL concept name                             │
│ Exact match first (normalised label → synonym dict)             │
│ Fuzzy fallback: rapidfuzz token_sort_ratio, cutoff 75           │
│ Returns ConceptMatch (concept, score, match_type)               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ concept → value facts
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 8: Validation      (stage8_validate.py)                   │
│ Arithmetic cross-checks on extracted values:                    │
│   CurrentAssets − Creditors = NetCurrentAssetsLiabilities       │
│   FixedAssets + NetCurrentAssets = TotalAssetsLessCL             │
│   NetAssetsLiabilities = Equity                                 │
│ Tolerance: ±1. Each check → pass / fail / skip (missing data)  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Pipeline Orchestrator    (pipeline.py)                           │
│ Calls stages in sequence, extracts metadata from cover page,    │
│ processes BS page for 9 concepts, P&L page for ProfitLoss,      │
│ runs validation, returns PipelineResult                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. File Structure

```
pdfs/
├── parser/
│   ├── __init__.py
│   ├── pipeline.py              # Orchestrator — the only file that imports all stages
│   ├── stage1_render.py         # PDF → page images
│   ├── stage2_preprocess.py     # Image cleanup
│   ├── stage3_classify.py       # Page identification
│   ├── stage4_tables.py         # Table structure detection
│   ├── stage5_ocr.py            # Cell-level OCR refinement
│   ├── stage6_values.py         # Number parsing
│   ├── stage7_concepts.py       # Label → concept mapping
│   ├── stage8_validate.py       # Arithmetic validation
│   └── synonyms.py              # Concept synonym dictionary
├── scripts/
│   ├── parse_filing.py          # CLI entry point + ground truth comparison
│   └── download_sample.py       # (Stage 1 — downloads PDFs from Companies House)
├── data/
│   ├── manifest.json            # Download tracking (24 ACTEON filings)
│   └── pdfs/                    # Downloaded PDF files
├── downloader/                  # Stage 1 download infrastructure (pre-existing)
├── config/
│   └── settings.py              # API keys, rate limits, paths
├── spec/                        # This file
├── docs/                        # Handover documents
└── requirements.txt             # Python dependencies
```

---

## 4. Data Flow in Detail

### 4.1 Pipeline Orchestrator (`pipeline.py`)

The orchestrator is the **only module that imports all stages**. It runs them in sequence on the target PDF and produces a single `PipelineResult`.

**Processing flow:**

1. Render all pages (Stage 1)
2. Preprocess all pages (Stage 2)
3. Classify all pages (Stage 3) → pick best balance_sheet, profit_loss, cover
4. Extract metadata from cover page (regex: company name, number, period date)
5. On the balance sheet page: Stage 4 → 5 → 6 → 7 for all 9 balance sheet concepts
6. On the P&L page: Stage 4 → 5 → 6 → 7 for ProfitLoss only (if not already found on BS)
7. Validate both years (Stage 8)
8. Return `PipelineResult`

**Key behaviours:**
- First concept match wins per year — if "Fixed assets" appears twice (subtotals vs line items), the first occurrence (higher in the table) is kept
- Scale detection tries the table header area first, falls back to the full-page OCR text
- P&L page is only processed if ProfitLoss wasn't found on the balance sheet
- Metadata extraction uses cover page OCR text, falls back to balance sheet page

### 4.2 Output: `PipelineResult`

```python
@dataclass
class PipelineResult:
    metadata: Metadata                           # company_name, company_number, period_end_date
    current_year: str | None                     # e.g. "2024"
    prior_year: str | None                       # e.g. "2023"
    current_year_facts: dict[str, int]           # concept → value (scaled integers)
    prior_year_facts: dict[str, int]             # concept → value (scaled integers)
    current_year_details: list[ExtractedFact]    # full provenance per value
    prior_year_details: list[ExtractedFact]      # full provenance per value
    current_year_validation: ValidationResult    # arithmetic check results
    prior_year_validation: ValidationResult      # arithmetic check results
    timings: StageTimings                        # per-stage wall clock time
    warnings: list[str]                          # anything that went wrong
    balance_sheet_page: int | None               # 0-indexed page number
    profit_loss_page: int | None                 # 0-indexed page number
```

Each `ExtractedFact` carries full provenance:
```python
@dataclass
class ExtractedFact:
    concept: str            # iXBRL concept name
    value: int              # scaled integer
    raw_label: str          # OCR'd label text that was matched
    raw_value_text: str     # OCR'd value text before parsing
    match_type: str         # "exact" or "fuzzy"
    match_score: float      # 0-100
    ocr_confidence: float   # Tesseract confidence 0-100
```

---

## 5. Stage-by-Stage Detail

### Stage 1: Render (`stage1_render.py`)

| | |
|---|---|
| **Input** | PDF file path |
| **Output** | `list[PageImage]` — one per page |
| **Library** | PyMuPDF (fitz) |
| **Config** | 300 DPI (zoom = 300/72) |
| **Debug** | `save_debug_images()` writes PNGs to disk |

`PageImage` is a dataclass holding a `numpy.ndarray` (HxWx3 RGB), page number, width, height.

### Stage 2: Preprocess (`stage2_preprocess.py`)

| | |
|---|---|
| **Input** | `PageImage` |
| **Output** | `PreprocessedPage` — cleaned binary image |
| **Library** | OpenCV |
| **Operations** | RGB → grayscale → Otsu binarisation → deskew (if >0.5°) → median blur (kernel=3) |

Deskew uses Hough line transform to detect near-horizontal lines, takes median angle, rotates if needed. All operations are deterministic pixel transforms.

### Stage 3: Classify (`stage3_classify.py`)

| | |
|---|---|
| **Input** | `list[(page_number, image)]` |
| **Output** | `list[ClassifiedPage]` + `find_best_pages()` picks top per category |
| **Library** | Tesseract (`--psm 6`) |
| **Method** | Keyword scoring against 3 dictionaries |

**Keyword categories (with weighted scores):**
- **balance_sheet**: "statement of financial position" (10), "balance sheet" (10), "net current" (5), "total equity" (5), "capital and reserves" (5), etc.
- **profit_loss**: "statement of comprehensive income" (10), "profit and loss" (10), "operating loss" (5), "loss before tax" (5), etc.
- **cover**: "registered number" (6), "for the year ended" (5), "annual accounts" (4), etc.

Threshold: a page must score ≥ 5.0 to be assigned to a category. Below that → "other".

`find_best_pages()` returns the single highest-scoring page per category.

### Stage 4: Table Detection (`stage4_tables.py`)

> **This is the highest-risk stage.** Most likely to need tuning per filing layout.

| | |
|---|---|
| **Input** | Page number + preprocessed image |
| **Output** | `DetectedTable` or `None` |
| **Library** | Tesseract `image_to_data` (`--psm 6`) |
| **Method** | Column-position heuristic based on word bounding boxes |

**Algorithm:**

1. **Extract words**: Tesseract `image_to_data` → `TableCell` per word (text, x, y, width, height, confidence). Cells with confidence < 0 (Tesseract separators) are skipped.

2. **Find year columns**: Search for words matching `^(19|20)\d{2}$`. Cluster by y-position (±15px tolerance). Pick the topmost cluster with 2+ distinct years. Each year's x-centre becomes a column anchor.

3. **Find scale text**: Look for words containing "£", "000", "thousand" near the year headers (within 100px x-distance) or in the top portion of the page.

4. **Define column boundaries**:
   - Column tolerance = 10% of page width
   - Label column = everything with x-centre < (leftmost value column x − tolerance)

5. **Build rows**: Cluster all words by y-proximity (±15px). Within each row:
   - Words whose x-centre falls within tolerance of a year column → assigned to that year's value
   - Words to the left of the value region → label text
   - Multiple words assigned to the same year in the same row are concatenated (handles parenthesised negatives split across words, e.g. `(` and `279,477)`)
   - Note reference numbers (between label and values) are skipped

**Key constants:**
```python
_ROW_CLUSTER_TOLERANCE = 15      # pixels at 300 DPI
_COLUMN_TOLERANCE_RATIO = 0.10   # 10% of page width
```

**Output structure:**
```python
@dataclass
class DetectedTable:
    years: list[str]               # ["2024", "2023"] — most recent first
    year_columns: dict[str, int]   # year → x-centre pixel position
    rows: list[TableRow]           # ordered top to bottom
    scale_text: str                # raw text for scale detection
    page_number: int
```

### Stage 5: Cell OCR (`stage5_ocr.py`)

| | |
|---|---|
| **Input** | `DetectedTable` + preprocessed image |
| **Output** | `OCRTable` |
| **Library** | Tesseract (`--psm 7`, digit whitelist) |
| **Method** | Keep Stage 4 text if confidence ≥ 70%, re-OCR low-confidence cells |

Re-OCR config: `--psm 7 -c tessedit_char_whitelist=0123456789,.()-£`

Crops cell region with 5px padding, runs Tesseract in single-line mode with restricted character set. Falls back to original text if re-OCR fails.

### Stage 6: Value Parsing (`stage6_values.py`)

| | |
|---|---|
| **Input** | OCR'd cell text string + scale multiplier |
| **Output** | `ParsedValue` (integer value or None) |
| **Library** | Pure Python (regex) |

**Parsing rules (applied in order):**

1. Empty text → `None`
2. Dash/em-dash (`-`, `—`, `–`, `~`) → `0`
3. Parenthesised text `(279,477)` → strip parens, mark negative
4. Leading minus sign → mark negative
5. Strip currency symbols (`£`, `$`) and whitespace
6. Remove commas
7. If not pure digits, apply OCR corrections: `l→1, I→1, O→0, o→0, S→5, s→5, B→8, g→9, Z→2`
8. Strip trailing dots
9. Final digit check — must be pure digits at this point or returns `None`
10. Multiply by scale, apply negative sign

**Scale detection:**
```python
"£000" or "£'000"     → 1000
"in thousands"         → 1000
"£millions" or "£m"   → 1_000_000
(no match)             → 1
```

### Stage 7: Concept Mapping (`stage7_concepts.py`)

| | |
|---|---|
| **Input** | OCR'd row label string |
| **Output** | `ConceptMatch` (concept name, score, match type) |
| **Library** | rapidfuzz |

**Matching order:**

1. **Normalise**: lowercase, strip non-alphanumeric (keep `/` and `()`), collapse whitespace
2. **Exact match**: look up normalised text in `LABEL_TO_CONCEPT` dict (built from `synonyms.py`)
3. **Fuzzy match**: `rapidfuzz.process.extractOne` with `fuzz.token_sort_ratio` scorer, cutoff 75.0
4. **No match**: returns `concept=None`

### Stage 8: Validation (`stage8_validate.py`)

| | |
|---|---|
| **Input** | `dict[str, int]` — concept → value for one year |
| **Output** | `ValidationResult` with per-check pass/fail/skip |

**Checks (tolerance ±1):**

| # | Equation | Skipped if missing |
|---|----------|-------------------|
| 1 | `CurrentAssets − Creditors = NetCurrentAssetsLiabilities` | Any of the 3 |
| 2 | `FixedAssets + NetCurrentAssetsLiabilities = TotalAssetsLessCurrentLiabilities` | Any of the 3 |
| 3 | `NetAssetsLiabilities = Equity` | Either |

---

## 6. Concept Dictionary (`synonyms.py`)

10 iXBRL concepts with 3-12 synonym labels each:

| Concept | Example Synonyms |
|---------|-----------------|
| `FixedAssets` | "fixed assets", "non-current assets", "total fixed assets" |
| `CurrentAssets` | "current assets", "total current assets" |
| `CashBankOnHand` | "cash at bank and in hand", "cash and cash equivalents" |
| `Debtors` | "debtors", "receivables", "trade and other receivables" |
| `Creditors` | "creditors amounts falling due within one year", "payables amounts falling due within one year", "current liabilities" |
| `NetCurrentAssetsLiabilities` | "net current liabilities", "net current assets", "net current assets/(liabilities)" |
| `TotalAssetsLessCurrentLiabilities` | "total assets less current liabilities", "net assets employed" |
| `NetAssetsLiabilities` | "net assets", "net liabilities", "net (liabilities)/assets" |
| `Equity` | "total equity", "total shareholders funds", "capital and reserves" |
| `ProfitLoss` | "loss for the financial year", "profit for the year", "net profit", "net loss" |

**To extend:** add new entries to the `CONCEPT_SYNONYMS` dict in `synonyms.py`. The `LABEL_TO_CONCEPT` flat lookup and the fuzzy match candidate list are rebuilt automatically at import time.

---

## 7. Confidence Gates

Every non-deterministic stage has a rejection threshold — the pipeline says "I don't know" rather than silently guessing.

| Stage | Signal | Reject Threshold |
|-------|--------|-----------------|
| Stage 3 (classify) | Keyword score | < 5.0 → page labelled "other" |
| Stage 4 (tables) | Year header detection | No year headers found → returns `None` |
| Stage 5 (OCR) | Tesseract per-word confidence | < 70% triggers re-OCR |
| Stage 6 (values) | Clean parse check | Not pure digits after corrections → `None` |
| Stage 7 (concepts) | rapidfuzz score | < 75 → no concept assigned |
| Stage 8 (validate) | Arithmetic difference | > ±1 → check fails |

Rejected values are added to `PipelineResult.warnings`, never silently dropped.

---

## 8. Dependencies

**Python packages** (`pdfs/requirements.txt`):
```
PyMuPDF>=1.24.0            # PDF rendering
opencv-python-headless>=4.9.0  # Image preprocessing
pytesseract>=0.3.10        # OCR (Tesseract wrapper)
img2table>=1.3.0           # (Available for future table detection enhancement)
rapidfuzz>=3.6.0           # Fuzzy string matching
numpy>=1.24.0              # Array operations
requests>=2.28.0           # Download infrastructure (pre-existing)
python-dotenv>=1.0.0       # Config (pre-existing)
```

**System dependency**: Tesseract OCR with English language data
- Arch Linux: `sudo pacman -S tesseract tesseract-data-eng`
- Ubuntu/Debian: `sudo apt install tesseract-ocr`
- Windows: UB Mannheim build, added to PATH

**Environment**: Python 3.12+ (uses `X | Y` union type syntax). Venv at `pdfs/.venv`.

---

## 9. How to Run

```bash
# From project root, inside WSL
source pdfs/.venv/bin/activate

# Basic run
python pdfs/scripts/parse_filing.py pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf

# With debug output (saves page images at each stage)
python pdfs/scripts/parse_filing.py pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf --debug-dir ./debug
```

The CLI prints: metadata, extracted values with match provenance, arithmetic validation, ground truth comparison (for ACTEON), warnings, and per-stage timings.

---

## 10. Ground Truth (ACTEON GROUP LIMITED, 2024 Filing)

All values in £000s as printed. The `Creditors` value is stored as a **positive integer** — the sign convention is that parentheses in the source indicate a liability, but the concept `Creditors` is the absolute amount.

```
              Concept                          2024         2023
              ───────                          ────         ────
              FixedAssets                      4,308      487,516
              CurrentAssets                   37,892      123,149
              CashBankOnHand                     370           52
              Debtors                         37,522      123,097
              Creditors                      279,477      410,644
              NetCurrentAssetsLiabilities   -241,585     -287,495
              TotalAssetsLessCL             -237,277      200,021
              NetAssetsLiabilities          -237,277       46,808
              Equity                        -237,277       46,808
              ProfitLoss                    -284,085      -55,657
```

**Metadata**: company name "ACTEON GROUP LIMITED", number "04231212", period ending "2024-12-31".

---

## 11. Current Scope and Limitations

**PoC scope**: ACTEON GROUP LIMITED 2024 filing only. The pipeline is tuned for this filing's layout (borderless two-column financial table, TIFF-in-PDF scan).

**Not yet implemented:**
- `ParsedIXBRL` conversion — output is `PipelineResult`, not the iXBRL dataclass used by the existing DB loader
- DB integration — no routing through `bulk_loader.py`
- Layout generalisation — different accounting firms use different table layouts, indentation, borders
- Broader sample testing — only tested on ACTEON
- Employee count extraction — requires finding the notes page
- Dormancy detection — requires narrative text analysis
- Digital PDF handling — these scans have no text layer; PDFs with text layers could use pdfplumber directly (faster, more accurate)

**Known risks:**
1. **Stage 4 (table detection)** is the most fragile — the column-position heuristic assumes year headers exist and are the widest-scope columns. Borderless tables with inconsistent alignment may break it.
2. **OCR accuracy on numbers** — a single misread digit changes the value. Mitigated by cell-level OCR and arithmetic validation, but not guaranteed.
3. **Concept name variability** — the synonym dictionary needs expanding as more accounting firm layouts are encountered.
4. **Scale detection** — depends on finding "£000" or similar in the page text. Some filings may not state the scale explicitly.

---

## 12. How to Extend

### Add a new concept
1. Add an entry to `CONCEPT_SYNONYMS` in `synonyms.py` with the concept name and list of label variations
2. The flat lookup and fuzzy candidate list rebuild automatically
3. Add a validation check in `stage8_validate.py` if applicable

### Improve table detection
- `stage4_tables.py` exposes `detect_table()` with a stable interface (`page_number, image → DetectedTable | None`)
- Replace the internals (e.g. with img2table, a line-detection approach, or ML-based detection) without changing the output dataclass
- Tune `_ROW_CLUSTER_TOLERANCE` and `_COLUMN_TOLERANCE_RATIO` for different scan qualities/resolutions

### Add a new page type
1. Add a keyword dictionary entry in `stage3_classify.py`'s `_KEYWORDS`
2. Add handling in `pipeline.py` to process the new page type after classification

### Handle digital PDFs (text-layer present)
- Add a detection step before Stage 1: check if the PDF has extractable text (PyMuPDF `page.get_text()`)
- If yes, skip Stages 1-5 and extract text/tables directly with pdfplumber
- Feed the extracted data into Stage 6+ as-is

### Integration with existing DB pipeline
- Convert `PipelineResult` → `ParsedIXBRL` (defined in `backend/parser/ixbrl.py`)
- Add `pdf-current-instant`, `pdf-current-duration` contexts with `pdf:` namespace prefix
- Route through `backend/loader/bulk_loader.py`
