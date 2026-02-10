# HANDOVER: PDF Accounts Pipeline

## Problem Statement

CompanyWise.io ingests UK Companies House financial accounts from the free bulk data product (Product 223). This product **only contains electronically filed accounts** (iXBRL/XBRL) — approximately 75% of all filings. The remaining ~25% are filed as PDFs (paper or digital PDF submissions) and are completely absent from the bulk data.

This means ~550,000 companies per year have accounts that our system cannot see. For a SaaS that answers "Will this company pay my invoice?", this is a critical coverage gap.

**Example:** ACTEON GROUP LIMITED (04231212) filed full accounts on 31 Dec 2025 (made up to 31 Dec 2024). Confirmed not present in any of the 103 downloaded bulk data ZIPs. The filing is only available as a PDF via the Companies House website/API.

---

## What Already Exists (companywise.io)

### Current Data Pipeline

```
Companies House Daily ZIP (iXBRL only, ~75% of filings)
    ↓
Parallel Parser (lxml, 4 workers) → ParsedIXBRL dataclass
    ↓
ResolutionCache (concept/context/dimension dedup)
    ↓
SQLite v2 (normalized schema, 255MB per batch)
    ↓
FastAPI → Vanilla JS Frontend
```

### Database Schema (SQLite v2 — normalized)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `batches` | Audit trail per ZIP | filename, source_url, file_count, processed_at |
| `companies` | One row per company | company_number (PK), name, jurisdiction |
| `filings` | One row per source file | company_number (FK), source_type, balance_sheet_date, period_start/end, file_hash |
| `concepts` | Global concept lookup | concept_raw ("uk-core:Equity"), concept ("Equity"), namespace |
| `dimension_patterns` | Dimensional breakdowns (director-level etc.) | dimensions (JSON), pattern_hash |
| `context_definitions` | Reporting period + dimensions | period_type, instant_date, start_date, end_date, dimension_pattern_id |
| `numeric_facts` | All financial values | filing_id, concept_id, context_id, unit, value (REAL) |
| `text_facts` | All text/disclosure values | filing_id, concept_id, context_id, value (TEXT) |

### Parser Output Contract

The existing iXBRL parser returns a `ParsedIXBRL` dataclass. **Your PDF parser must return the same structure** to reuse the entire loader pipeline:

```python
@dataclass
class ParsedIXBRL:
    contexts: list[Context]           # Reporting periods + dimensions
    units: list[Unit]                 # Currency/measure definitions
    numeric_facts: list[NumericFact]  # Financial values
    text_facts: list[TextFact]       # Disclosures, names, metadata
    company_number: str | None
    company_name: str | None
    balance_sheet_date: str | None    # ISO format
    period_start_date: str | None     # ISO format
    period_end_date: str | None       # ISO format
```

Each NumericFact needs: `concept_raw`, `concept`, `context_ref`, `unit_ref`, `value` (float), `value_raw` (string)
Each TextFact needs: `concept_raw`, `concept`, `context_ref`, `value` (string)
Each Context needs: `context_ref`, `period_type` (instant/duration), dates, `dimensions`
Each Unit needs: `unit_ref`, `measure` (e.g. "GBP")

### Filing source_type

Currently accepts: `ixbrl_html`, `xbrl_xml`, `cic_zip`. Add `pdf` as a new valid type.

### Key Concepts to Extract (by coverage priority)

**Must-have (>75% coverage in iXBRL data, used for risk scoring):**
- `Equity` — 97% coverage
- `NetAssetsLiabilities` — 91%
- `AverageNumberEmployeesDuringPeriod` — 84%
- `NetCurrentAssetsLiabilities` — 81%
- `Creditors` — 77%
- `TotalAssetsLessCurrentLiabilities` — 76%
- `CurrentAssets` — 74%

**Important metadata (>95% coverage, text facts):**
- `UKCompaniesHouseRegisteredNumber`
- `EntityCurrentLegalOrRegisteredName`
- `BalanceSheetDate`
- `StartDateForPeriodCoveredByReport` / `EndDateForPeriodCoveredByReport`
- `EntityDormantTruefalse`

**Nice-to-have:**
- `FixedAssets` (43%), `CashBankOnHand` (34%), `Debtors` (22%)
- `ProfitLoss` (3.7%), `TurnoverRevenue` (2.7%)

### Risk Scoring (what the extracted data feeds into)

The risk engine checks:
- `NetAssetsLiabilities < 0` → negative_net_assets
- `Equity current < previous` → declining_equity
- `Creditors > CurrentAssets` → high_creditors
- `EntityDormantTruefalse == "true"` → dormant
- `AverageNumberEmployeesDuringPeriod == 0` → no_employees
- `NetCurrentAssetsLiabilities < 0` → negative_working_capital

So the PDF parser needs to extract at minimum: Equity, NetAssetsLiabilities, Creditors, CurrentAssets, NetCurrentAssetsLiabilities, employee count, and dormancy status.

---

## The PDF Pipeline: What Needs Building

### Phase 1: Companies House API — Download PDFs

The Companies House REST API provides programmatic access to all filed documents including PDFs.

**Registration:** https://developer.company-information.service.gov.uk/ (free, no approval needed)
**Auth:** HTTP Basic — API key as username, blank password
**Rate limit:** 600 requests per 5-minute window

#### Step 1: Get filing history for a company

```
GET https://api.company-information.service.gov.uk/company/{company_number}/filing-history
```

Response includes an array of filings, each with:
```json
{
  "category": "accounts",
  "type": "AA",
  "date": "2025-12-31",
  "description": "accounts-with-accounts-type-full",
  "links": {
    "document_metadata": "https://document-api.company-information.service.gov.uk/document/{document_id}"
  }
}
```

#### Step 2: Get document metadata

```
GET https://document-api.company-information.service.gov.uk/document/{document_id}
```

Response includes available formats:
```json
{
  "resources": {
    "application/pdf": {
      "content_length": 123456
    },
    "application/xhtml+xml": {
      "content_length": 89012
    }
  }
}
```

**Key insight:** If `application/xhtml+xml` is available, the filing IS in the bulk data (iXBRL). If only `application/pdf` is available, it's a PDF-only filing and missing from bulk data.

#### Step 3: Download the PDF

```
GET https://document-api.company-information.service.gov.uk/document/{document_id}/content
Accept: application/pdf
```

Returns a redirect to the actual file location. Follow the redirect to download.

#### Identifying missing companies

Strategy to find PDF-only filers:
1. Use the Companies House [streaming API](https://developer-specs.company-information.service.gov.uk/streaming-api/reference) or [bulk company data](https://download.companieshouse.gov.uk/en_output.html) to get a list of all active companies
2. Cross-reference against companies already in your DB
3. For missing companies, check filing history via API
4. Download PDF accounts for those with `accounts` category filings

Alternative: Process the free [filing history bulk data](https://download.companieshouse.gov.uk/) to identify all companies with recent account filings, then diff against your DB.

### Phase 2: PDF Parsing — Extract Financial Data

This is the hard part. PDF accounts vary wildly in layout depending on the accountancy software, firm, or template used. There is no standard structure.

#### Approach Options

**Option A: LLM-based extraction (recommended for accuracy)**
- Use Claude API with vision/PDF support
- Send the PDF and a structured extraction prompt
- Ask for specific financial concepts in JSON format
- Pros: Handles any layout, high accuracy on well-formatted accounts
- Cons: Cost per filing (~$0.01-0.10 depending on page count), latency, rate limits

**Option B: Rule-based table extraction**
- Use libraries like `pdfplumber`, `tabula-py`, or `camelot`
- Extract tables, then pattern-match for known line items
- Pros: Free, fast, no API dependency
- Cons: Brittle, breaks on unusual layouts, needs ongoing maintenance

**Option C: Hybrid**
- Use rule-based extraction first (cheap, fast)
- Fall back to LLM for filings that fail confidence thresholds
- Pros: Cost-efficient at scale
- Cons: More complex to build and maintain

#### Extraction Target

The PDF parser must produce a `ParsedIXBRL`-compatible output. At minimum:

```python
# Company metadata
company_number: str          # From filename or document content
company_name: str            # From cover page or balance sheet header
balance_sheet_date: str      # "Made up to" date, ISO format
period_start_date: str       # Start of reporting period
period_end_date: str         # End of reporting period

# Financial values (current year + previous year if available)
# Map to existing concept names for schema compatibility:
numeric_facts = [
    NumericFact(concept="Equity", concept_raw="pdf:Equity", value=123000, unit_ref="GBP"),
    NumericFact(concept="CurrentAssets", concept_raw="pdf:CurrentAssets", value=456000, unit_ref="GBP"),
    # ... etc
]

# Text metadata
text_facts = [
    TextFact(concept="EntityCurrentLegalOrRegisteredName", value="ACTEON GROUP LIMITED"),
    TextFact(concept="EntityDormantTruefalse", value="false"),
    # ... etc
]
```

**Important:** Use `concept_raw` with a `pdf:` namespace prefix to distinguish PDF-extracted facts from iXBRL-tagged facts. The normalized `concept` field should match the existing iXBRL concept names exactly (e.g. `Equity`, `CurrentAssets`) so queries and risk scoring work seamlessly.

#### Context Handling for PDFs

PDFs typically show current year and previous year columns. Create contexts like:

```python
# Current year balance sheet
Context(
    context_ref="pdf-current-instant",
    period_type="instant",
    instant_date="2024-12-31",    # balance sheet date
    dimensions=None
)

# Previous year balance sheet
Context(
    context_ref="pdf-previous-instant",
    period_type="instant",
    instant_date="2023-12-31",    # previous balance sheet date
    dimensions=None
)

# Current year P&L period
Context(
    context_ref="pdf-current-duration",
    period_type="duration",
    start_date="2024-01-01",
    end_date="2024-12-31",
    dimensions=None
)
```

### Phase 3: Integration with Existing Loader

The cleanest integration point is at the bulk_loader level:

1. **Modify `filings.source_type` CHECK constraint** to include `'pdf'`
2. **Create `backend/parser/pdf_parser.py`** that returns `ParsedIXBRL`
3. **Route in bulk_loader:** detect `.pdf` files → call pdf_parser instead of ixbrl_fast
4. **Everything downstream works unchanged:** ResolutionCache, fact insertion, queries, API, risk engine

```python
# In bulk_loader.py — add PDF routing
def parse_file_content(args):
    source_file, content, source_type = args
    if source_type == 'pdf':
        from backend.parser.pdf_parser import parse_pdf
        parsed = parse_pdf(content)
        return [ParsedFile(source_file, source_type, parsed)]
    else:
        # existing iXBRL/XBRL logic
        ...
```

### Phase 4: Download Orchestration

Build a script that:
1. Queries the Companies House streaming API or filing history API for recent account filings
2. Checks if each company_number already has a filing in the DB for that balance_sheet_date
3. For missing ones, checks document metadata to confirm it's PDF-only
4. Downloads the PDF
5. Passes it through the PDF parser → bulk_loader → DB

Rate limit budget: 600 req / 5 min = 2 req/sec. For each company you need ~3 API calls (filing history, document metadata, document download), so throughput is ~40 companies/minute or ~2,400/hour.

---

## Architecture Decision: Where to Run PDF Extraction

### If using LLM extraction (Option A)

```
Companies House API → PDF file
    ↓
Claude API (vision/PDF) → structured JSON
    ↓
JSON → ParsedIXBRL dataclass
    ↓
Existing bulk_loader pipeline → SQLite
```

Cost estimate for backfill:
- ~550,000 PDF filers per year
- Average ~5-10 pages per filing
- At ~$0.02-0.05 per filing: $11,000-$27,500 per year of backfill
- Daily new PDF filings: ~1,500/day × $0.03 = ~$45/day ongoing

### If using rule-based extraction (Option B)

```
Companies House API → PDF file
    ↓
pdfplumber/camelot → raw tables
    ↓
Pattern matching → concept mapping
    ↓
ParsedIXBRL dataclass
    ↓
Existing bulk_loader pipeline → SQLite
```

Cost: Compute only. But expect 10-30% failure rate on unusual layouts.

---

## Key Files in Existing Codebase

| File | Relevance | Action |
|------|-----------|--------|
| `backend/parser/ixbrl_fast.py` | Reference parser implementation | Study the output format |
| `backend/parser/ixbrl.py` | Dataclass definitions (ParsedIXBRL, NumericFact, etc.) | Import and reuse these |
| `backend/loader/bulk_loader.py` | Loading pipeline with ResolutionCache | Add PDF routing here |
| `backend/db/schema.sql` | DB schema with CHECK constraints | Update source_type CHECK |
| `backend/db/queries.py` | Query layer (12 functions) | No changes needed if concepts match |
| `backend/api/risk_engine.py` | Risk scoring | No changes needed if concepts match |
| `scripts/download_daily.py` | Reference for download patterns | Pattern for new download script |
| `backend/docs/SPEC.md` | Full concept audit with coverage stats | Reference for concept mapping |

---

## Suggested Project Structure (New Project)

```
companywise-pdf-pipeline/
├── README.md
├── requirements.txt
├── config/
│   └── settings.py              # API keys, paths, rate limits
├── downloader/
│   ├── api_client.py            # Companies House API wrapper
│   ├── filing_discovery.py      # Find PDF-only filers
│   └── pdf_downloader.py        # Download + store PDFs
├── parser/
│   ├── pdf_parser.py            # Main parser → ParsedIXBRL
│   ├── table_extractor.py       # pdfplumber/camelot table extraction
│   ├── concept_mapper.py        # Map extracted line items to CH concepts
│   └── llm_extractor.py         # Claude API extraction (if using Option A)
├── loader/
│   └── pdf_loader.py            # Orchestrates parse → DB insert
├── tests/
│   ├── sample_pdfs/             # Test fixtures
│   ├── test_parser.py
│   ├── test_downloader.py
│   └── test_integration.py
└── scripts/
    ├── backfill.py              # One-time backfill of historical PDFs
    └── daily_sync.py            # Daily job to fetch new PDF filings
```

This project should import from the main companywise.io codebase:
- `backend.parser.ixbrl` — for ParsedIXBRL and related dataclasses
- `backend.loader.bulk_loader` — for the insertion pipeline
- `backend.db.connection` — for database access

---

## Risks and Considerations

1. **PDF layout variability** — UK accounts have no mandated layout. Micro-entity accounts (47% of filings) are simpler and more consistent. Full accounts are the most variable.

2. **Scanned documents** — Some paper filings are scanned to PDF. These need OCR before any extraction. Quality varies.

3. **API rate limits** — 600 req/5min is generous for daily sync (~1,500 new PDF filings/day) but tight for a full historical backfill of 550K+ companies.

4. **Cost control** — If using LLM extraction, implement confidence scoring and only send ambiguous cases to the LLM. Use rule-based for simple micro-entity accounts.

5. **Data quality** — PDF extraction will never be as reliable as iXBRL. Consider adding a `confidence_score` column to `numeric_facts` to flag PDF-extracted values, or track this via the `source_type='pdf'` on the filing record.

6. **Concept mapping** — PDF line items like "Total shareholders' funds" need to map to the existing concept `Equity`. Build a mapping table and expect to maintain it as new variations appear.

---

## Suggested Implementation Order

1. **API client + filing discovery** — Get a list of PDF-only filers, confirm the gap size
2. **PDF downloader** — Download a sample set (100-500 PDFs across different account types)
3. **PDF parser prototype** — Start with micro-entity accounts (simplest, ~47% of filings)
4. **Concept mapping** — Build the line-item → concept mapping table
5. **Integration test** — End-to-end: download → parse → insert → query → risk score
6. **Scale to small company accounts** — More complex layouts (~52% of filings)
7. **Daily sync job** — Automate for ongoing new filings
8. **Historical backfill** — Process the backlog (rate-limit aware)

---

*Generated: February 2026*
*Source project: companywise.io (main branch)*
*Context: ACTEON GROUP LIMITED (04231212) confirmed missing from all 103 bulk data ZIPs — PDF-only filer*
