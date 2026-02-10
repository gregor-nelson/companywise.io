# HANDOVER: Stage 2 — PDF Parsing Strategy

## What Was Built (Stage 1 — Complete)

### Download Infrastructure (`pdfs/`)

```
pdfs/
├── .env                          # Companies House REST API key (live)
├── requirements.txt              # requests, python-dotenv, pdfplumber
├── config/
│   └── settings.py               # Loads .env, rate limit constants, paths
├── downloader/
│   ├── api_client.py             # CH API wrapper — Basic auth, sliding-window rate limiter
│   │                               (targets 500 req/5min, backs off on 429, retries on 5xx)
│   ├── filing_discovery.py       # Finds PDF-only filings — checks document metadata for
│   │                               absence of application/xhtml+xml (iXBRL)
│   └── pdf_downloader.py         # Downloads PDFs, skip-existing resume, manifest.json tracking
├── data/
│   ├── manifest.json             # Machine-readable log of all downloads (24 entries)
│   └── pdfs/                     # 24 downloaded ACTEON PDFs (2002–2024)
└── scripts/
    └── download_sample.py        # CLI: --company, --companies file, --limit, --discover-only
```

### ACTEON GROUP LIMITED (04231212) — Sample Data

Successfully downloaded **24 PDF-only account filings** spanning 2002–2024.

| Year | Pages | Size (KB) | Account Type |
|------|-------|-----------|--------------|
| 2024 | 42    | 1,487     | AA (full)    |
| 2023 | 97    | 4,470     | AA (group)   |
| 2022 | 85    | 3,965     | AA (group)   |
| 2021 | 87    | 4,111     | AA (group)   |
| 2020 | 88    | 3,730     | AA (group)   |
| 2019 | 95    | 4,121     | AA (group)   |
| 2018 | 85    | 3,602     | AA (group)   |
| 2017 | 77    | 3,101     | AA (group)   |
| ... earlier filings back to 2002 ... |

---

## Critical Finding: ALL PDFs Are Scanned Images

**Every single ACTEON PDF (24/24) is a TIFF-to-PDF scan with zero extractable text.**

```
Producer: libtiff / tiff2pdf
Characters per page: 0
Images per page: 1 (full-page TIFF scan)
```

This means:
- **pdfplumber table extraction: USELESS** — there are no text characters to extract
- **tabula-py / camelot: USELESS** — same reason, these work on text-layer PDFs
- **Any text-based extraction: IMPOSSIBLE** without OCR or vision first

The scan quality is high — text is crisp and legible to human eyes. The challenge is purely that the data is locked in images.

**This is likely representative of PDF-only filers in general.** Companies House converts paper filings to TIFF scans before storing them. The `go-tiff2pdf` producer tag confirms this is Companies House's own scan-to-PDF pipeline, not something specific to ACTEON.

---

## What Needs Extracting (ACTEON 2024 as Example)

### Statement of Financial Position (Balance Sheet) — Page 14

This single page contains most of the data the risk engine needs:

```
                                          Note    2024      2023
                                                  £000      £000
Fixed assets
  Intangible assets                        12       -        310
  Tangible assets                          13       -         17
  Right-of-use assets                      14       -      1,838
  Investments                              15     4,308   485,351
                                                  4,308   487,516
Current assets
  Receivables: amounts falling due
    within one year                         16    37,522   123,097
  Cash at bank and in hand                  17       370       52
                                                 37,892   123,149

Payables: amounts falling due
  within one year                           18  (279,477) (410,644)

Net current liabilities                        (241,585) (287,495)
Total assets less current liabilities          (237,277)  200,021

Payables: amounts falling due after
  more than one year                        19        -  (153,213)

Net (liabilities)/assets                       (237,277)   46,808

Capital and reserves
  Called up share capital                    23    46,659   46,659
  Share premium account                     24    16,437   16,437
  Capital redemption reserve                24     1,154    1,154
  Profit and loss account                   24  (301,527)  (17,442)
Total equity                                   (237,277)   46,808
```

### Concept Mapping — What Maps Where

| PDF Line Item | → iXBRL Concept | Priority |
|---|---|---|
| Total equity | `Equity` | MUST (97% coverage in iXBRL) |
| Net (liabilities)/assets | `NetAssetsLiabilities` | MUST (91%) |
| Net current liabilities | `NetCurrentAssetsLiabilities` | MUST (81%) |
| Payables: amounts falling due within one year | `Creditors` | MUST (77%) |
| Total assets less current liabilities | `TotalAssetsLessCurrentLiabilities` | MUST (76%) |
| Current assets (subtotal) | `CurrentAssets` | MUST (74%) |
| Fixed assets (subtotal) | `FixedAssets` | NICE (43%) |
| Cash at bank and in hand | `CashBankOnHand` | NICE (34%) |
| Receivables | `Debtors` | NICE (22%) |
| Loss for the financial year | `ProfitLoss` | NICE (3.7%) |

### Statement of Comprehensive Income — Page 13

```
                                          Note    2024      2023
                                                  £000      £000
Administrative expenses                          (1,807)  (28,627)
Exceptional administrative expenses         4  (266,227)       -
Operating loss                              5  (268,034)  (28,627)
Interest receivable and similar income      9    18,423    16,396
Interest payable and similar expenses      10   (31,671)  (47,204)
Loss before tax                                (281,282)  (59,435)
Tax on loss                                11    (2,803)    3,778
Loss for the financial year                    (284,085)  (55,657)
```

### Metadata Extractable from Cover Page

```
Company name:     ACTEON GROUP LIMITED
Registered number: 04231212
Period:           FOR THE YEAR ENDED 31 DECEMBER 2024
```

### Employee Count

Found in notes (need to locate the exact page) — required for `AverageNumberEmployeesDuringPeriod`.

---

## Parsing Approach Options

### Option A: OCR + Rule-Based Extraction

```
PDF (scanned image)
    ↓
OCR engine (Tesseract / EasyOCR / PaddleOCR)
    ↓
Raw text (imperfect, needs cleanup)
    ↓
Page classifier (identify: cover, contents, balance sheet, P&L, notes)
    ↓
Table parser (regex/heuristic on OCR'd text)
    ↓
Concept mapper (line item text → standard concept)
    ↓
ParsedIXBRL dataclass
```

**Pros:**
- Fully local, no API costs
- Can process at high throughput
- No external dependencies beyond OCR engine

**Cons:**
- OCR errors on financial figures are dangerous (1 → l, 0 → O, commas vs periods)
- Table structure is hard to reconstruct from raw OCR text
- Parentheses for negatives `(279,477)` may not OCR cleanly
- Need to maintain line-item synonym mapping
- Different accounting firms use different layouts

**OCR Engine Options:**
- **Tesseract** (pytesseract): Most mature, free, good for clean printed text. Needs `--psm 6` for table blocks.
- **EasyOCR**: PyTorch-based, handles varied fonts better. Heavier dependency.
- **PaddleOCR**: Strong on structured documents/tables. Outputs bounding boxes useful for table reconstruction.
- **docTR** (mindee): Transformer-based, good layout understanding. Returns word positions useful for column alignment.

### Option B: Vision LLM (Claude API with PDF/Image Support)

```
PDF (scanned image) → page images
    ↓
Claude API (vision) with structured extraction prompt
    ↓
JSON response with financial values
    ↓
Validation layer (cross-check totals, sign conventions)
    ↓
ParsedIXBRL dataclass
```

**Pros:**
- Handles ANY layout — no rules to maintain
- Understands context (parentheses = negative, "£000" = multiply by 1000)
- Can extract employee count, dormancy status, dates from narrative text
- High accuracy on clean scans like these

**Cons:**
- Cost: ~$0.02–0.10 per filing depending on page count
- Latency: ~5–15 seconds per filing
- Rate limits on Claude API (separate from CH API limits)
- Ongoing API dependency
- At 550K filings/year for backfill: $11K–$55K

### Option C: Hybrid — OCR First, LLM Fallback

```
PDF → OCR → rule-based extraction
    ↓
Confidence check (do totals add up? are key fields present?)
    ↓
If confidence < threshold → send to Claude API for verification/extraction
    ↓
ParsedIXBRL dataclass
```

**Pros:**
- Best cost/accuracy tradeoff
- OCR handles the ~47% micro-entity accounts (simple, 1-page balance sheet)
- LLM only needed for complex/ambiguous cases
- Estimated 70-80% handled by OCR, 20-30% by LLM

**Cons:**
- Most complex to build and maintain
- Two extraction paths means two sets of bugs

### Option D: OCR + Layout-Aware Model (LayoutLM / Donut)

```
PDF → page images
    ↓
Layout-aware document model (fine-tuned on UK accounts)
    ↓
Structured key-value extraction
    ↓
ParsedIXBRL dataclass
```

**Pros:**
- Single model handles OCR + structure understanding together
- Can be fine-tuned on a training set of UK accounts
- Runs locally once trained

**Cons:**
- Needs a labelled training set (hundreds of annotated examples)
- Significant ML engineering effort
- Model may not generalize to all accounting software outputs

---

## Key Challenges for ANY Approach

### 1. Values are in £000s
The balance sheet header says "£000" — all values must be multiplied by 1000. Some micro-entity accounts use actual values. The parser must detect the scale.

### 2. Negative values as parentheses
`(279,477)` means -279,477. Some filings may use a minus sign instead.

### 3. Two-column layout (current year + prior year)
Most balance sheets have two columns. The parser must associate values with the correct year and create separate contexts.

### 4. Page identification
Need to find the right pages (balance sheet, P&L, notes) out of 40-90 page documents. The contents page helps but isn't always present or consistent.

### 5. Concept name variability
The same concept appears under different names across accountancy firms:
- "Total equity" / "Total shareholders' funds" / "Capital and reserves total" → `Equity`
- "Net current assets/(liabilities)" / "Net current liabilities" → `NetCurrentAssetsLiabilities`
- "Creditors: amounts falling due within one year" / "Current liabilities" / "Payables" → `Creditors`

### 6. Scanned vs digital PDFs
ACTEON's filings are all scanned. Other companies may file digital PDFs (with a text layer). The pipeline needs to detect which type and route accordingly:
- Text layer present → pdfplumber extraction (fast, free, accurate)
- No text layer → OCR/vision path

### 7. Validation
Financial statements have built-in checksums:
- `Fixed assets + Current assets - Creditors ≈ Total assets less current liabilities`
- `Total equity = Net assets/liabilities`
- `Called up share capital + reserves = Total equity`

These can be used to validate extraction accuracy.

---

## Recommended Next Steps

1. **Download a broader sample** — Get 100-500 PDFs across different companies and account types (micro-entity, small, full) to understand the true variability. Use `download_sample.py --companies companies.txt --limit 200`.

2. **Classify the sample** — How many are scanned vs digital? What's the split by account type? This determines the approach balance.

3. **Prototype OCR on ACTEON** — Try Tesseract on the balance sheet page, measure accuracy on the known values above.

4. **Prototype Claude API on ACTEON** — Send the balance sheet page image with a structured prompt, compare accuracy and cost.

5. **Decide the approach** — Based on accuracy, cost, and the scanned-vs-digital split from the broader sample.

6. **Build the parser** — Whichever approach wins, output must be `ParsedIXBRL` compatible.

---

## Files Reference

| File | Purpose |
|------|---------|
| `pdfs/downloader/api_client.py` | Companies House API with rate limiting |
| `pdfs/downloader/filing_discovery.py` | Find PDF-only filings |
| `pdfs/downloader/pdf_downloader.py` | Download + manifest tracking |
| `pdfs/scripts/download_sample.py` | CLI for downloading samples |
| `pdfs/data/manifest.json` | 24 ACTEON filings metadata |
| `pdfs/data/pdfs/` | 24 downloaded PDFs |
| `pdfs/data/page_samples/` | Extracted page images for visual inspection |
| `backend/parser/ixbrl.py` | ParsedIXBRL dataclass (target output format) |
| `backend/loader/bulk_loader.py` | Integration point for PDF parser |
| `pdfs/HANDOVER-PDF-PIPELINE.md` | Original pipeline spec |

---

## ACTEON 2024 — Ground Truth for Parser Testing

Extracted by human inspection of the scanned balance sheet (page 14):

```python
# Company metadata
company_number = "04231212"
company_name = "ACTEON GROUP LIMITED"
balance_sheet_date = "2024-12-31"
period_end_date = "2024-12-31"

# 2024 values (£000 — multiply by 1000 for actual)
ground_truth_2024 = {
    "FixedAssets": 4308,           # Fixed assets subtotal
    "CurrentAssets": 37892,         # Current assets subtotal
    "CashBankOnHand": 370,          # Cash at bank and in hand
    "Debtors": 37522,              # Receivables due within one year
    "Creditors": 279477,           # Payables due within one year (absolute)
    "NetCurrentAssetsLiabilities": -241585,  # Net current liabilities
    "TotalAssetsLessCurrentLiabilities": -237277,
    "NetAssetsLiabilities": -237277,
    "Equity": -237277,             # Total equity
    "ProfitLoss": -284085,          # Loss for the financial year (from P&L)
}

# 2023 comparative values (£000)
ground_truth_2023 = {
    "FixedAssets": 487516,
    "CurrentAssets": 123149,
    "CashBankOnHand": 52,
    "Debtors": 123097,
    "Creditors": 410644,
    "NetCurrentAssetsLiabilities": -287495,
    "TotalAssetsLessCurrentLiabilities": 200021,
    "NetAssetsLiabilities": 46808,
    "Equity": 46808,
    "ProfitLoss": -55657,
}
```

Use these as the acceptance test for any parser prototype.

---

*Generated: 10 February 2026*
*Stage 1 complete, Stage 2 pending approach decision*
