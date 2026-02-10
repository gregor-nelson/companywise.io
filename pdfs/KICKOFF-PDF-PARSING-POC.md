# Kickoff: PDF Parsing PoC — Scanned Financial Statement Extraction

## The Problem

~25% of Companies House filings (~550K companies/year) are PDF-only. These are paper filings that Companies House scans into TIFF images and wraps in PDF containers. They contain zero extractable text — every text-based extraction tool (pdfplumber, tabula, camelot) is useless against them.

Our existing pipeline ingests iXBRL (structured digital filings) but is blind to these PDFs. We need to extract the same financial data from scanned images.

## The Proposal

A deterministic, CPU-only pipeline of specialized tools — no LLMs, no GPU, no cloud APIs. Each stage does one thing:

```
PDF → Page Images → Cleanup → Page Classification → Table Detection → Cell OCR → Value Parsing → Concept Mapping → Validation
     (PyMuPDF)     (OpenCV)   (Tesseract+keywords)  (img2table)     (Tesseract)   (regex)        (rapidfuzz)       (arithmetic)
```

Key design principle: every non-deterministic stage (OCR, fuzzy matching) has a confidence gate. The pipeline either produces correct numbers or explicitly says "I don't know" — it never silently guesses.

## Why This Approach

- All scanned PDFs tested (24/24 ACTEON filings) are TIFF-to-PDF with zero text layer
- Financial statements have built-in checksums (balance sheet equations) that validate extraction
- UK accounts follow predictable layouts: two-column tables (current year + prior year), standard line items
- Cell-level OCR (Tesseract on individual pre-detected cells) is far more accurate than full-page OCR
- Total dependencies: 5 pip packages + Tesseract system install

## What We're NOT Doing

- No LLMs or vision models — fully deterministic where possible
- No cloud API calls — everything runs locally on CPU
- No training data or model fine-tuning
- No GPU requirement

## The PoC Test

Extract 10 financial values from ACTEON GROUP LIMITED 2024 filing (42-page scanned PDF) for both current and prior year, validated against hand-verified ground truth:

| Concept | 2024 | 2023 |
|---------|------|------|
| Fixed Assets | 4,308 | 487,516 |
| Current Assets | 37,892 | 123,149 |
| Cash at Bank | 370 | 52 |
| Debtors | 37,522 | 123,097 |
| Creditors | 279,477 | 410,644 |
| Net Current Assets/Liabilities | -241,585 | -287,495 |
| Total Assets Less Current Liabilities | -237,277 | 200,021 |
| Net Assets/Liabilities | -237,277 | 46,808 |
| Equity | -237,277 | 46,808 |
| Profit/Loss | -284,085 | -55,657 |

All values in £000s as printed on the scanned balance sheet.

## Risks and Open Questions

1. **Table detection on borderless tables** — UK accounts rarely have cell borders. The plan uses a column-position heuristic (find year headers, use x-coordinates to define columns) rather than line detection. Is this robust enough across different accounting firms' layouts?

2. **OCR accuracy on financial numbers** — A single misread digit changes everything. Mitigated by cell-level OCR (small crops, single-line mode) and arithmetic validation, but worth stress-testing on varied scan qualities.

3. **Concept name variability** — Different accountants use different labels for the same concept. The fuzzy matching dictionary needs to be broad enough. How many synonyms per concept is sufficient?

4. **Scale detection** — Most filings say "£000" in the header but some use actual values. The parser must detect this automatically.

5. **Generalization beyond ACTEON** — The PoC proves it works on one company. How much additional testing is needed before trusting it on the full population?

## Dependencies

```
pip: PyMuPDF, opencv-python-headless, pytesseract, img2table, rapidfuzz, numpy
system: Tesseract OCR (UB Mannheim build for Windows)
```

## Detailed Plan

Full implementation plan with build order, module design, and test strategy:
`C:\Users\gregor\.claude\plans\splendid-sniffing-glade.md`

Also available in the project at:
`pdfs/HANDOVER-STAGE2-PARSING.md` (background research and ground truth data)
