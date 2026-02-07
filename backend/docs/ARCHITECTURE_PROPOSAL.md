# Companies House Data Layer - Architecture Proposal

**Version:** 0.4.0 (Session 10 - Schema v2: Prune + Normalize)
**Created:** 2026-02-05
**Status:** ⚠️ **BLOCKED** — Schema redesign required before further ingestion
**Previous Version:** 0.2.0 (Revised after Review)

> **⚠️ CRITICAL FINDING:** Initial schema has been tested with 1 batch (35,119 filings).
> The resulting database is **1.62 GB** from a source ZIP of only ~200-300 MB.
> Extrapolating to all 103 available batches would produce a **~165 GB database**.
>
> **This document now includes:**
> - Section 16: Storage audit findings with root cause analysis
> - Section 17: Proposed v2 schema — prune XBRL plumbing + normalize, targeting 70-75% reduction
>
> **Action Required:** Schema normalization must be implemented before ingesting additional batches.

---

## 1. Purpose of This Document

This document proposes a database architecture for storing Companies House bulk accounts data. The schema has been revised following peer review to ensure **complete data preservation**.

**Core Principle:** The database must be a **perfect mirror** of the source data. Every attribute, every value, every piece of information from the source files must be reconstructable from the database.

---

## 2. Design Principles

### 2.1 Perfect Mirror Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Preserve original values** | Store raw text alongside parsed values |
| **Preserve all attributes** | Every XML attribute captured |
| **Preserve namespaces** | Store both `uk-core:Equity` and `Equity` |
| **No data loss** | If it's in the source file, it's in the database |
| **Traceability** | Every record links to source file and batch |

> **v2 UPDATE (Section 17):** The "perfect mirror" philosophy has been revised for v2. The database preserves all **user-relevant financial data** with full accuracy, but drops XBRL/iXBRL rendering plumbing (format hints, raw display strings, internal reference IDs) that serves no analytical purpose. Taxonomy lineage is retained in lookup tables. See Section 17.1 for the detailed rationale.

### 2.2 Dual-Value Storage Pattern

For parsed fields, we store **both** the original and normalized form:

```
┌─────────────────────────────────────────────────────────┐
│ Original (faithful mirror)  │  Normalized (for queries) │
├─────────────────────────────────────────────────────────┤
│ concept_raw: "uk-core:Equity"  │  concept: "Equity"     │
│ value_raw: "762,057"           │  value: -762057.0      │
│ sign: "-"                      │  (incorporated)        │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Separation of Concerns

```
┌─────────────────────────────────────────────────────────┐
│              APPLICATION LAYER                          │
│  • Risk calculations                                    │
│  • Ratio analysis                                       │
│  • Business logic                                       │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              DATA ACCESS LAYER                          │
│  • Pure retrieval functions                             │
│  • Query helpers using normalized fields                │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE (SQLite)                          │
│  • Perfect mirror of source                             │
│  • Original + normalized values                         │
│  • Full audit trail                                     │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              PARSER / LOADER                            │
│  • iXBRL/XBRL extraction                                │
│  • Preserves ALL attributes                             │
│  • Computes normalized values for convenience           │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              SOURCE DATA                                │
│  Companies House Bulk ZIP files                         │
│  • Daily files (60-day retention)                       │
│  • Monthly archives (historical)                        │
│  • ~1.65M electronic filings per year                   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Data Source Context

### 3.1 Source Overview

| Attribute | Value |
|-----------|-------|
| Provider | Companies House (UK Government) |
| URL | https://download.companieshouse.gov.uk/en_accountsdata.html |
| Update frequency | Daily (Tue-Sat), 60-day retention |
| Historical data | Monthly archives available |
| Coverage | ~75% of 2.2M annual filings (electronic only) |
| File formats | iXBRL (.html), XBRL (.xml), nested ZIP (.zip) |

### 3.2 Volume Estimates

| Period | Estimated Files |
|--------|-----------------|
| Daily batch | 15,000 - 30,000 files |
| Monthly | ~140,000 files |
| Annual | ~1,650,000 files |
| Historical (2008-present) | ~25,000,000 files |

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌─────────────────────┐
│      batches        │
├─────────────────────┤
│ id (PK)             │──────────────────┐
│ filename            │                  │
│ downloaded_at       │                  │
│ file_count          │                  │
└─────────────────────┘                  │
                                         │
┌─────────────────────┐                  │
│      companies      │                  │
├─────────────────────┤                  │
│ company_number (PK) │──────────┐       │
│ name                │          │       │
│ jurisdiction        │          │       │
└─────────────────────┘          │       │
                                 │       │
                                 │ 1:many│ 1:many
                                 ▼       ▼
┌──────────────────────────────────────────────────────────────┐
│                          filings                              │
├──────────────────────────────────────────────────────────────┤
│ id (PK)                                                       │
│ company_number (FK) ──────────────────────────────────────────┘
│ batch_id (FK) ────────────────────────────────────────────────┘
│ source_file                                                   │
│ source_type (ixbrl_html/xbrl_xml/cic_zip)                    │
│ balance_sheet_date                                            │
│ period_start_date                                             │
│ period_end_date                                               │
│ loaded_at                                                     │
│ file_hash                                                     │
└───────────────────────┬───────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┬─────────────┐
          │ 1:many      │ 1:many      │ 1:many      │ 1:many
          ▼             ▼             ▼             ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  numeric_facts  │ │   text_facts    │ │    contexts     │ │      units      │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ id (PK)         │ │ id (PK)         │ │ id (PK)         │ │ id (PK)         │
│ filing_id (FK)  │ │ filing_id (FK)  │ │ filing_id (FK)  │ │ filing_id (FK)  │
│ concept_raw     │ │ concept_raw     │ │ context_ref     │ │ unit_ref        │
│ concept         │ │ concept         │ │ entity_id       │ │ measure_raw     │
│ context_ref     │ │ context_ref     │ │ entity_scheme   │ │ measure         │
│ unit_ref        │ │ value           │ │ period_type     │ └─────────────────┘
│ value_raw       │ │ format          │ │ instant_date    │
│ value           │ │ escape          │ │ start_date      │
│ sign            │ └─────────────────┘ │ end_date        │
│ decimals        │                     │ dimensions      │
│ scale           │                     │ segment_raw     │
│ format          │                     └─────────────────┘
└─────────────────┘
```

### 4.2 Table Definitions

#### `batches`

Tracks each downloaded ZIP file for audit trail and incremental loading.

| Column | Type | Nullable | Description | Source |
|--------|------|----------|-------------|--------|
| `id` | INTEGER | NO | Primary key | Generated |
| `filename` | TEXT | NO | ZIP filename | `Accounts_Bulk_Data-YYYY-MM-DD.zip` |
| `source_url` | TEXT | YES | Download URL | Companies House |
| `downloaded_at` | TEXT | NO | ISO timestamp | Generated |
| `file_count` | INTEGER | YES | Files in batch | Counted |
| `processed_at` | TEXT | YES | Completion time | Generated |

**Unique constraint:** `(filename)`

---

#### `companies`

Primary entity table. Minimal - just identification. Updated on each filing.

| Column | Type | Nullable | Description | Source |
|--------|------|----------|-------------|--------|
| `company_number` | TEXT | NO | 8-char registration | Filename |
| `name` | TEXT | YES | Most recent legal name | `EntityCurrentLegalOrRegisteredName` |
| `jurisdiction` | TEXT | YES | eng_wales/scotland/ni/other | Derived from prefix |

**Primary key:** `company_number`

**Jurisdiction derivation (deterministic):**
- Numeric (00-99) → `eng_wales`
- SC → `scotland`
- NI → `ni`
- OC/SO → `llp`
- NC → `scotland_nonprofit`

---

#### `filings`

One record per source file processed.

| Column | Type | Nullable | Description | Source |
|--------|------|----------|-------------|--------|
| `id` | INTEGER | NO | Primary key | Generated |
| `company_number` | TEXT | NO | FK to companies | Filename |
| `batch_id` | INTEGER | YES | FK to batches | Parent batch |
| `source_file` | TEXT | NO | Original filename | Filename |
| `source_type` | TEXT | NO | ixbrl_html / xbrl_xml / cic_zip | File structure |
| `balance_sheet_date` | TEXT | NO | Balance sheet date (ISO) | Filename + data |
| `period_start_date` | TEXT | YES | Reporting period start (ISO) | `StartDateForPeriodCoveredByReport` |
| `period_end_date` | TEXT | YES | Reporting period end (ISO) | `EndDateForPeriodCoveredByReport` |
| `loaded_at` | TEXT | NO | Import timestamp | Generated |
| `file_hash` | TEXT | YES | SHA-256 of source | Computed |

**Unique constraint:** `(source_file)` — each file loaded once

**Note on duplicates:** If a company re-files for the same balance sheet date, they get different source files. Both are stored. Application layer determines which to use.

---

#### `numeric_facts`

All numeric values from `<ix:nonFraction>` elements. **Preserves all attributes.**

| Column | Type | Nullable | Description | Source |
|--------|------|----------|-------------|--------|
| `id` | INTEGER | NO | Primary key | Generated |
| `filing_id` | INTEGER | NO | FK to filings | Parent |
| `concept_raw` | TEXT | NO | Original with namespace | `name` attr (e.g., `uk-core:Equity`) |
| `concept` | TEXT | NO | Normalized name | Stripped (e.g., `Equity`) |
| `context_ref` | TEXT | NO | Context reference | `contextRef` attr |
| `unit_ref` | TEXT | YES | Unit reference | `unitRef` attr |
| `value_raw` | TEXT | NO | Original text value | Element text (e.g., `762,057`) |
| `value` | REAL | YES | Parsed numeric value | Computed with sign (e.g., `-762057.0`) |
| `sign` | TEXT | YES | Sign attribute | `sign` attr (`-` or NULL) |
| `decimals` | INTEGER | YES | Precision indicator | `decimals` attr (e.g., `0`, `-3`) |
| `scale` | INTEGER | YES | Scale factor | `scale` attr (e.g., `0`, `3`, `-2`) |
| `format` | TEXT | YES | Display format | `format` attr (e.g., `ixt2:numdotdecimal`) |

**Value parsing rules:**

```python
def parse_numeric_value(raw: str, sign: str | None, scale: int | None) -> float | None:
    """
    Parse raw text to numeric value.

    - Strip commas: "762,057" -> "762057"
    - Handle dash as zero: "-" -> 0
    - Handle parentheses: "(5,000)" -> -5000
    - Apply sign attribute: sign="-" makes value negative
    - Apply scale: scale=3 multiplies by 1000, scale=-2 divides by 100
    """
```

---

#### `text_facts`

All text values from `<ix:nonNumeric>` elements.

| Column | Type | Nullable | Description | Source |
|--------|------|----------|-------------|--------|
| `id` | INTEGER | NO | Primary key | Generated |
| `filing_id` | INTEGER | NO | FK to filings | Parent |
| `concept_raw` | TEXT | NO | Original with namespace | `name` attr |
| `concept` | TEXT | NO | Normalized name | Stripped |
| `context_ref` | TEXT | NO | Context reference | `contextRef` attr |
| `value` | TEXT | YES | Text content | Element text/HTML |
| `format` | TEXT | YES | Format transform | `format` attr |
| `escape` | TEXT | YES | Escape mode | `escape` attr (for HTML content) |

**HTML content:** Stored raw, including any HTML markup. The `escape` attribute indicates how to interpret.

---

#### `contexts`

Period and dimension definitions from `<xbrli:context>` elements.

| Column | Type | Nullable | Description | Source |
|--------|------|----------|-------------|--------|
| `id` | INTEGER | NO | Primary key | Generated |
| `filing_id` | INTEGER | NO | FK to filings | Parent |
| `context_ref` | TEXT | NO | Context ID | `id` attr |
| `entity_identifier` | TEXT | YES | Company identifier | `<xbrli:identifier>` text |
| `entity_scheme` | TEXT | YES | Identifier scheme | `scheme` attr |
| `period_type` | TEXT | NO | instant / duration / forever | Element structure |
| `instant_date` | TEXT | YES | Point-in-time (ISO) | `<xbrli:instant>` |
| `start_date` | TEXT | YES | Period start (ISO) | `<xbrli:startDate>` |
| `end_date` | TEXT | YES | Period end (ISO) | `<xbrli:endDate>` |
| `dimensions` | TEXT | YES | JSON of typed/explicit members | Parsed from `<xbrli:segment>` |
| `segment_raw` | TEXT | YES | Raw segment XML | Full `<xbrli:segment>` content |

**Dimensions JSON format:**
```json
{
  "explicit": [
    {"dimension": "uk-bus:EntityOfficersDimension", "member": "uk-bus:Director1"}
  ],
  "typed": [
    {"dimension": "uk-bus:SomeTypedDimension", "value": "..."}
  ]
}
```

**Note:** `segment_raw` preserves the original XML for edge cases where JSON parsing loses information.

---

#### `units`

Unit definitions from `<xbrli:unit>` elements.

| Column | Type | Nullable | Description | Source |
|--------|------|----------|-------------|--------|
| `id` | INTEGER | NO | Primary key | Generated |
| `filing_id` | INTEGER | NO | FK to filings | Parent |
| `unit_ref` | TEXT | NO | Unit ID | `id` attr |
| `measure_raw` | TEXT | NO | Original measure | `<xbrli:measure>` text |
| `measure` | TEXT | NO | Normalized measure | Stripped namespace |

**Example:**
- `unit_ref`: `GBP`
- `measure_raw`: `iso4217:GBP`
- `measure`: `GBP`

---

## 5. Indexes

```sql
-- Primary lookup patterns
CREATE INDEX idx_filings_company ON filings(company_number);
CREATE INDEX idx_filings_date ON filings(balance_sheet_date);
CREATE INDEX idx_filings_batch ON filings(batch_id);

-- Fact queries
CREATE INDEX idx_numeric_filing ON numeric_facts(filing_id);
CREATE INDEX idx_numeric_concept ON numeric_facts(concept);
CREATE INDEX idx_numeric_filing_concept ON numeric_facts(filing_id, concept);

CREATE INDEX idx_text_filing ON text_facts(filing_id);
CREATE INDEX idx_text_concept ON text_facts(concept);

-- Context lookups
CREATE INDEX idx_contexts_filing ON contexts(filing_id);
CREATE INDEX idx_contexts_ref ON contexts(filing_id, context_ref);

-- Units
CREATE INDEX idx_units_filing ON units(filing_id);
CREATE INDEX idx_units_ref ON units(filing_id, unit_ref);
```

---

## 6. Data Preservation Guarantees

### 6.1 What Is Preserved

| Source Element | Preserved In | Original | Normalized |
|----------------|--------------|----------|------------|
| `<ix:nonFraction name="...">` | numeric_facts.concept_raw | ✅ `uk-core:Equity` | ✅ `Equity` |
| Element text content | numeric_facts.value_raw | ✅ `762,057` | ✅ `-762057.0` |
| `sign` attribute | numeric_facts.sign | ✅ `-` | (in value) |
| `decimals` attribute | numeric_facts.decimals | ✅ | — |
| `scale` attribute | numeric_facts.scale | ✅ | — |
| `format` attribute | numeric_facts.format | ✅ | — |
| `unitRef` attribute | numeric_facts.unit_ref | ✅ | — |
| `contextRef` attribute | numeric_facts.context_ref | ✅ | — |
| `<xbrli:context>` | contexts.* | ✅ (segment_raw) | ✅ (dimensions JSON) |
| `<xbrli:unit>` | units.* | ✅ (measure_raw) | ✅ (measure) |
| Source filename | filings.source_file | ✅ | — |
| File content hash | filings.file_hash | ✅ | — |

### 6.2 Reconstruction Test

Given the database, you should be able to reconstruct:
- The exact numeric value with sign and scale applied
- The original namespace-prefixed concept name
- The original display text
- The full context with all dimensions
- Which batch/file the data came from

### 6.3 What Is NOT Preserved

| Not Preserved | Rationale |
|---------------|-----------|
| HTML formatting/CSS | Presentation only, not data |
| Element ordering | Order has no semantic meaning in XBRL |
| Whitespace variations | Normalized for storage |
| Full raw file | Would 10x storage; hash provides verification |

---

## 7. File Processing Pipeline

### 7.1 Flow

```
Companies House Download Page
         │
         ▼
┌─────────────────────────────────────┐
│         Bulk ZIP File               │
│   Accounts_Bulk_Data-YYYY-MM-DD.zip │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          Batch Record               │
│   INSERT INTO batches               │
└─────────────────┬───────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
    ▼             ▼             ▼             ▼
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│ .html  │   │ .xml   │   │ .zip   │   │ .zip   │
│ iXBRL  │   │ XBRL   │   │ CIC    │   │ CIC    │
└───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
    │            │            │            │
    ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────┐
│              iXBRL Parser                    │
│  - Extract ix:header (contexts, units)      │
│  - Extract ix:nonFraction (numeric facts)   │
│  - Extract ix:nonNumeric (text facts)       │
│  - Preserve ALL attributes                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│              XBRL Parser                     │
│  (For pure .xml files - same output)        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│              Database Insert                 │
│  - filing record                            │
│  - contexts                                 │
│  - units                                    │
│  - numeric_facts                            │
│  - text_facts                               │
└─────────────────────────────────────────────┘
```

### 7.2 CIC ZIP Handling

CIC ZIP files contain two XHTML files:
```
CIC-{CompanyNumber}/
├── accounts/financialStatement.xhtml    → filing (source_type=cic_zip)
└── cic34/cicReport.xhtml                → separate filing (source_type=cic_zip)
```

Both are processed as separate filings, linked by company_number and balance_sheet_date.

### 7.3 Duplicate Detection

```python
def should_load_file(source_file: str, file_hash: str) -> bool:
    """
    Check if file should be loaded.
    - Skip if exact source_file already exists
    - Log warning if same company+date but different file
    """
```

---

## 8. Data Access Layer

### 8.1 Principles

- **No business logic** — pure data retrieval
- **Use normalized fields for queries** — `concept`, `value`
- **Expose original fields for verification** — `concept_raw`, `value_raw`

### 8.2 Core Functions

```python
# Company retrieval
def get_company(company_number: str) -> Company | None
def search_companies(name_query: str, limit: int = 100) -> list[Company]

# Filing retrieval
def get_filing(filing_id: int) -> Filing | None
def get_filings_for_company(company_number: str) -> list[Filing]
def get_latest_filing(company_number: str) -> Filing | None

# Fact retrieval (uses normalized concept names)
def get_numeric_facts(filing_id: int, concept: str | None = None) -> list[NumericFact]
def get_text_facts(filing_id: int, concept: str | None = None) -> list[TextFact]

# Context/unit retrieval
def get_contexts(filing_id: int) -> list[Context]
def get_units(filing_id: int) -> list[Unit]

# Batch tracking
def get_batch(batch_id: int) -> Batch | None
def get_unprocessed_batches() -> list[Batch]
```

---

## 9. Technology Choices

| Choice | Rationale |
|--------|-----------|
| **SQLite** | Built into Python, single file, handles millions of rows |
| **Python 3.11+** | Type hints, pattern matching, good ecosystem |
| **BeautifulSoup + lxml** | Robust HTML/XML parsing, handles malformed markup |
| **No ORM** | Direct SQL, stable schema, better performance |

### 9.1 SQLite Configuration

```python
# Recommended PRAGMA settings
PRAGMA journal_mode = WAL;          -- Better concurrent read performance
PRAGMA synchronous = NORMAL;        -- Good balance of safety/speed
PRAGMA cache_size = -64000;         -- 64MB cache
PRAGMA foreign_keys = ON;           -- Enforce referential integrity
```

---

## 10. Schema SQL

```sql
-- Schema version for migrations
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);
INSERT INTO schema_version VALUES (1, datetime('now'));

-- Batch tracking
CREATE TABLE batches (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    source_url TEXT,
    downloaded_at TEXT NOT NULL,
    file_count INTEGER,
    processed_at TEXT
);

-- Companies
CREATE TABLE companies (
    company_number TEXT PRIMARY KEY,
    name TEXT,
    jurisdiction TEXT
);

-- Filings
CREATE TABLE filings (
    id INTEGER PRIMARY KEY,
    company_number TEXT NOT NULL REFERENCES companies(company_number),
    batch_id INTEGER REFERENCES batches(id),
    source_file TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (source_type IN ('ixbrl_html', 'xbrl_xml', 'cic_zip')),
    balance_sheet_date TEXT NOT NULL,
    period_start_date TEXT,
    period_end_date TEXT,
    loaded_at TEXT NOT NULL,
    file_hash TEXT
);

-- Numeric facts
CREATE TABLE numeric_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_raw TEXT NOT NULL,
    concept TEXT NOT NULL,
    context_ref TEXT NOT NULL,
    unit_ref TEXT,
    value_raw TEXT NOT NULL,
    value REAL,
    sign TEXT,
    decimals INTEGER,
    scale INTEGER,
    format TEXT
);

-- Text facts
CREATE TABLE text_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_raw TEXT NOT NULL,
    concept TEXT NOT NULL,
    context_ref TEXT NOT NULL,
    value TEXT,
    format TEXT,
    escape TEXT
);

-- Contexts
CREATE TABLE contexts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    context_ref TEXT NOT NULL,
    entity_identifier TEXT,
    entity_scheme TEXT,
    period_type TEXT NOT NULL CHECK (period_type IN ('instant', 'duration', 'forever')),
    instant_date TEXT,
    start_date TEXT,
    end_date TEXT,
    dimensions TEXT,
    segment_raw TEXT
);

-- Units
CREATE TABLE units (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    unit_ref TEXT NOT NULL,
    measure_raw TEXT NOT NULL,
    measure TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_filings_company ON filings(company_number);
CREATE INDEX idx_filings_date ON filings(balance_sheet_date);
CREATE INDEX idx_filings_batch ON filings(batch_id);

CREATE INDEX idx_numeric_filing ON numeric_facts(filing_id);
CREATE INDEX idx_numeric_concept ON numeric_facts(concept);
CREATE INDEX idx_numeric_filing_concept ON numeric_facts(filing_id, concept);

CREATE INDEX idx_text_filing ON text_facts(filing_id);
CREATE INDEX idx_text_concept ON text_facts(concept);

CREATE INDEX idx_contexts_filing ON contexts(filing_id);
CREATE INDEX idx_contexts_ref ON contexts(filing_id, context_ref);

CREATE INDEX idx_units_filing ON units(filing_id);
CREATE INDEX idx_units_ref ON units(filing_id, unit_ref);
```

---

## 11. Open Questions (Resolved)

| # | Question | Resolution |
|---|----------|------------|
| 1 | Schema completeness | ✅ Added units table, format attribute, segment_raw for full preservation |
| 2 | JSON for dimensions | ✅ JSON for convenience + segment_raw for full preservation |
| 3 | Duplicate handling | ✅ Each source file loaded once (unique constraint). Re-filings are separate files. |
| 4 | Pure XBRL files | ✅ Same schema, different parser. source_type distinguishes. |
| 5 | HTML in text facts | ✅ Store raw. escape attribute preserved. |
| 6 | Performance | ✅ Indexes on (filing_id, concept). SQLite handles millions of rows. |
| 7 | Original namespace | ✅ Dual storage: concept_raw + concept |

---

## 12. Future Considerations

### 12.1 Historical Data Loading

Monthly archives extend back to ~2008. Same schema, same loader.

### 12.2 Incremental Updates

- `batches` table tracks what's loaded
- `file_hash` detects if file content changed (rare)
- Application can query by `batch_id` for recent data

### 12.3 Potential Additions (Not in v1)

| Feature | Notes |
|---------|-------|
| Footnotes | `<ix:footnote>` elements - rare in accounts data |
| Tuples | `<ix:tuple>` groupings - not seen in samples |
| Raw file storage | BLOB column or file reference - 10x storage cost |

---

## 13. Data Acquisition Plan

### 13.1 Current State

| Data | Status |
|------|--------|
| Single daily batch (2026-02-03) | ✅ Downloaded, analyzed |
| Rolling 60 daily files | ⏳ Not yet acquired |
| Monthly archives (rolling 12) | ⏳ Not yet acquired |
| Historical archives (2008-2024) | ⏳ Not yet acquired |

### 13.2 Acquisition Strategy

**Phase 1: Daily Files (Rolling 60)**
```
Source: https://download.companieshouse.gov.uk/en_accountsdata.html
Files: Accounts_Bulk_Data-YYYY-MM-DD.zip
Count: ~60 files
Size: ~50-400MB each, ~6-8GB total
Script: python scripts/download_daily.py --dry-run
```

**Phase 2: Monthly Archives (Rolling 12)**
```
Source: https://download.companieshouse.gov.uk/en_monthlyaccountsdata.html
Files: Accounts_Monthly_Data-MonthYYYY.zip
Count: ~12 files (rolling 12-month window)
Size: ~2-4GB each, ~25-50GB total
Script: python scripts/download_monthly.py --dry-run
```

**Phase 3: Historical Archives (2008-2024)**
```
Source: https://download.companieshouse.gov.uk/historicmonthlyaccountsdata.html
Files: Accounts_Monthly_Data-MonthYYYY.zip
Count: ~200 files (17 years of monthly data)
Size: ~85-100GB total
Script: python scripts/download_archive.py --dry-run
        python scripts/download_archive.py --year 2020    # Single year
        python scripts/download_archive.py --from-year 2018  # 2018 onwards
```

### 13.3 Post-Acquisition Validation

Once full dataset acquired:
1. Re-run concept audit across all files
2. Identify any new namespace prefixes
3. Check for schema-breaking edge cases
4. Finalize schema design
5. Begin implementation

---

## 14. Next Steps

1. ✅ Architecture review complete (preliminary)
2. ✅ Single batch ingested for testing (35,119 filings)
3. ✅ Storage audit completed — **critical bloat identified**
4. 🚫 **BLOCKED: Schema redesign required** (see Sections 16-18)
5. ⏳ Review and approve normalized schema proposal
6. ⏳ Implement normalized schema with lookup tables
7. ⏳ Modify parser for normalized inserts
8. ⏳ Re-test with single batch (target: ~500-600 MB)
9. ⏳ Download remaining daily/monthly files
10. ⏳ Full dataset ingestion
11. ⏳ Build data access layer with JOINs

---

## 15. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-05 | Claude (Opus 4.5) | Initial proposal |
| 0.2.0 | 2026-02-05 | Claude (Opus 4.5) | Revised after review: dual-value storage, units table, format/escape attributes, segment_raw, batches table, file_hash |
| 0.2.1 | 2026-02-05 | Claude (Opus 4.5) | Marked as DRAFT pending full data acquisition; added acquisition plan |
| 0.3.0 | 2026-02-05 | Claude (Opus 4.5) | **Critical:** Added storage audit findings (Section 16) and normalized schema proposal (Section 17) after discovering 5x storage bloat |
| 0.3.1 | 2026-02-05 | Claude (Opus 4.5) | **Session 9:** Data integrity verification passed. Updated estimates with verified numbers: 3,630 concepts, 3,009 dimension patterns, 144,650 context definitions. Confirmed `segment_raw` is 100% NULL (can drop). Added findings on `balance_sheet_date` formatting and unit cardinality. |
| 0.4.0 | 2026-02-07 | Claude (Opus 4.6) | **Session 10:** Rewrote Section 17 with "Prune + Normalize" approach. Key change: instead of just normalizing strings to lookup tables, also drop all XBRL plumbing columns (`value_raw`, `sign`, `decimals`, `scale`, `format`, `escape`, `context_ref`, `unit_ref`, `entity_identifier`, `entity_scheme`, `segment_raw`, `measure_raw`). Facts tables slimmed from 11→5 columns (numeric) and 8→4 columns (text). `units` table eliminated (resolved at load time). `contexts` table replaced by global `context_definitions`. Taxonomy lineage preserved in `concepts` lookup. Target: 70-75% size reduction (1.62 GB → ~400-500 MB per batch). Updated Section 18 recommendations. |

---

## 16. Storage Audit Findings (Critical)

### 16.1 Audit Summary

An audit was conducted on the database after ingesting **1 batch** (Accounts_Bulk_Data-2023-12-01.zip).

| Metric | Value |
|--------|-------|
| Source ZIP size | ~200-300 MB (estimated) |
| Database size | **1,624 MB (1.62 GB)** |
| Bloat factor | **~5-8x source size** |
| Companies loaded | 35,067 |
| Filings loaded | 35,119 |
| Total rows (all tables) | **5,714,716** |

### 16.1.1 Data Integrity Verification (Session 9)

A comprehensive data integrity audit was performed with the following results:

| Check | Result |
|-------|--------|
| SQLite `PRAGMA integrity_check` | ✅ **OK** |
| Foreign key violations | ✅ **0** |
| Numeric facts → contexts referential integrity | ✅ **0 orphans** |
| Text facts → contexts referential integrity | ✅ **0 orphans** |
| Filings → companies referential integrity | ✅ **0 orphans** |
| Filings with no facts | ✅ **0** |
| Numeric value parsing success rate | ✅ **100%** (0 NULL values) |

**Conclusion:** The data is clean and well-structured. No corruption or integrity issues.

### 16.2 Row Counts by Table

| Table | Rows | Rows per Filing |
|-------|------|-----------------|
| schema_version | 1 | — |
| batches | 1 | — |
| companies | 35,067 | ~1 |
| filings | 35,119 | 1 |
| numeric_facts | 1,081,996 | ~31 |
| text_facts | 1,295,741 | ~37 |
| **contexts** | **3,150,957** | **~90** |
| units | 115,835 | ~3 |

**Key observation:** The `contexts` table has **90 rows per filing** on average, making it the largest table by far.

### 16.3 Storage Breakdown by Column

| Table.Column | Total Size (MB) | Notes |
|--------------|-----------------|-------|
| contexts.dimensions | **481 MB** | JSON strings, highly repetitive |
| contexts.context_ref | 109 MB | String IDs, repeated across tables |
| text_facts.concept+concept_raw | 94 MB | Duplicate strings |
| text_facts.value | 67 MB | Actual text content |
| numeric_facts.concept+concept_raw | 54 MB | Duplicate strings |
| numeric_facts.context_ref | 23 MB | String references |
| text_facts.context_ref | 23 MB | String references |
| **Subtotal (data)** | **~851 MB** | |
| **Indexes + SQLite overhead** | **~773 MB** | 48% of total |
| **Total** | **1,624 MB** | |

### 16.4 Root Causes of Bloat

#### Cause 1: Massive String Duplication in `dimensions` Column (481 MB)

The `contexts.dimensions` column stores JSON strings that are **highly repetitive**:

```json
{"explicit": [{"dimension": "core:MaturitiesOrExpirationPeriodsDimension", "member": "core:WithinOneYear"}], "typed": []}
```

| Dimension Pattern | Occurrences | Wasted Space |
|-------------------|-------------|--------------|
| MaturitiesOrExpirationPeriodsDimension:WithinOneYear | 24,799 | ~2.5 MB |
| FinancialInstrumentCurrentNon-currentDimension:CurrentFinancialInstruments | 20,164 | ~2 MB |
| MaturitiesOrExpirationPeriodsDimension:AfterOneYear | 19,743 | ~2 MB |
| OriginalRevisedDataDimension:Original | 19,046 | ~2 MB |
| EquityClassesDimension:RetainedEarningsAccumulatedLosses | 17,699 | ~2 MB |

**Verified (Session 9):** There are **3,009 unique dimension patterns** stored **2.98 million times** (contexts with dimensions: 2,981,858; contexts without: 169,099).

#### Cause 2: Denormalized Concept Names (148 MB)

Both `concept_raw` and `concept` are stored in every fact row:

| Concept | Occurrences | Storage |
|---------|-------------|---------|
| `core:Equity` / `Equity` | 57,915 | ~1.4 MB |
| `core:Creditors` / `Creditors` | 49,298 | ~1.2 MB |
| `core:PropertyPlantEquipment` | 30,872 | ~1.4 MB |

**Verified (Session 9):**
- Unique `concept` (normalized): 699 numeric + 383 text
- Unique `concept_raw` (with namespace): 2,177 numeric + 1,453 text
- **Combined unique concept_raw: 3,630** (stored 2.38 million times)
- Storage: 54.4 MB (numeric_facts) + 94.0 MB (text_facts) = **148.4 MB**

#### Cause 3: String Foreign Keys (155 MB)

`context_ref` is stored as a TEXT string in three tables:
- `contexts.context_ref` (108.9 MB)
- `numeric_facts.context_ref` (23.0 MB)
- `text_facts.context_ref` (22.9 MB)

**Verified (Session 9):**
- Average `context_ref` length: **36.2 characters** vs **4 bytes** for an INTEGER
- Unique `context_ref` values: **44,035**
- Total storage: **154.8 MB**

#### Cause 4: Index Overhead (~400 MB estimated)

13 indexes on 5+ million rows creates significant B-tree overhead.

### 16.5 Projection for Full Dataset

| Batches | Current Schema | Normalized Schema (est.) |
|---------|----------------|--------------------------|
| 1 batch | 1.62 GB | ~0.5-0.6 GB |
| 103 batches | **~165 GB** | **~50-60 GB** |
| With historical (200+ batches) | **~325 GB** | **~100-120 GB** |

---

## 17. Proposed Schema v2: Prune + Normalize

### 17.1 Revised Design Philosophy

The v1 schema aimed to be a **perfect mirror** of the source XBRL — storing every attribute, namespace prefix, formatting hint, and rendering parameter from the original files. The storage audit (Section 16) revealed this approach produces a **165 GB database at scale**, which is impractical.

**Key insight:** Most of the stored data is iXBRL/XBRL plumbing — namespace prefixes, formatting hints, rendering attributes, internal reference IDs — that no user of CompanyWise.io will ever see or query. Premium customers need **accurate financial data**, not the ability to reconstruct the original iXBRL rendering.

| v1 Principle | v2 Principle |
|-------------|-------------|
| Perfect mirror of source XBRL | **Complete preservation of all user-relevant financial data** |
| Store both raw and normalized forms | **Store the accurate parsed value; drop raw display strings** |
| Preserve every XML attribute | **Preserve what has analytical value; drop rendering plumbing** |
| String references everywhere | **INTEGER foreign keys to lookup tables** |

**Data accuracy guarantee:** Every financial fact — its value, concept identity, reporting period, currency unit, and dimensional context — is preserved with full precision. Taxonomy lineage (`concept_raw`, `namespace`) is retained in the `concepts` lookup table. What is dropped is exclusively XBRL rendering/plumbing metadata that has zero bearing on data accuracy or analytical value.

### 17.2 Column-Level Analysis: Keep vs Drop

#### `numeric_facts` (currently 11 columns, 1.08M rows per batch)

| Column | Verdict | Reasoning |
|--------|---------|-----------|
| `concept` | **KEEP** (via lookup) | Core identifier — "what is this number?" |
| `concept_raw` | **MOVE to lookup** | Taxonomy lineage preserved once in `concepts` table, not 1.08M times |
| `value` | **KEEP** | The accurate parsed number (sign + scale already applied) |
| `value_raw` | **DROP** | Display string from HTML (e.g., `"762,057"`). Already fully parsed into `value`. Only useful for round-tripping to iXBRL rendering. |
| `sign` | **DROP** | Already incorporated into `value` during parsing |
| `decimals` | **DROP** | Parsing parameter, already applied to produce `value` |
| `scale` | **DROP** | Parsing parameter, already applied to produce `value` |
| `format` | **DROP** | iXBRL rendering hint (e.g., `ixt2:numdotdecimal`). No analytical purpose. |
| `context_ref` | **RESOLVE + DROP** | Users need the period/dimensions, not the string `"FY1Current"`. Resolved during loading. |
| `unit_ref` | **RESOLVE + DROP** | Users need `"GBP"`, not the internal reference `"GBP-1"`. Resolved during loading. |

**Result: 11 columns → 5 columns** (`filing_id`, `concept_id`, `context_id`, `unit`, `value`)

#### `text_facts` (currently 8 columns, 1.30M rows per batch)

| Column | Verdict | Reasoning |
|--------|---------|-----------|
| `concept` | **KEEP** (via lookup) | Core identifier |
| `concept_raw` | **MOVE to lookup** | Same as numeric |
| `value` | **KEEP** | The actual text/HTML content |
| `format` | **DROP** | iXBRL rendering hint |
| `escape` | **DROP** | iXBRL HTML rendering flag |
| `context_ref` | **RESOLVE + DROP** | Same as numeric |

**Result: 8 columns → 4 columns** (`filing_id`, `concept_id`, `context_id`, `value`)

#### `contexts` (currently 11 columns, 3.15M rows per batch)

| Column | Verdict | Reasoning |
|--------|---------|-----------|
| `context_ref` | **DROP** | Internal XBRL reference ID. Used transiently during loading, never stored. |
| `period_type` | **KEEP** (in lookup) | Users need instant vs. duration |
| `instant_date` | **KEEP** (in lookup) | |
| `start_date` / `end_date` | **KEEP** (in lookup) | |
| `dimensions` | **KEEP** (in lookup) | Critical — distinguishes current vs. prior year, segments, etc. |
| `entity_identifier` | **DROP** | Always duplicates `filings.company_number` |
| `entity_scheme` | **DROP** | Constant: always `"http://www.companieshouse.gov.uk/"` |
| `segment_raw` | **DROP** | 100% NULL in all data (verified Session 9) |

**Result:** Entire per-filing `contexts` table replaced by global `context_definitions` lookup. **3.15M rows → ~144,650 unique definitions.**

#### `units` (currently 5 columns, 115K rows per batch)

| Column | Verdict | Reasoning |
|--------|---------|-----------|
| `unit_ref` | **DROP** | Internal XBRL reference ID. Resolved during loading. |
| `measure_raw` | **DROP** | Namespace-prefixed form (`"iso4217:GBP"`). |
| `measure` | **INLINE on facts** | Only 10 unique values. Resolved and stored directly as `unit` on `numeric_facts`. |

**Result: `units` table eliminated entirely.** Unit resolved during loading and stored inline.

### 17.3 Schema v2: Lookup Tables

#### `concepts` (NEW — global, cross-filing)

```sql
CREATE TABLE concepts (
    id INTEGER PRIMARY KEY,
    concept_raw TEXT NOT NULL UNIQUE,  -- "uk-core:Equity" (full taxonomy reference)
    concept TEXT NOT NULL,             -- "Equity" (query-friendly name)
    namespace TEXT                     -- "uk-core" (taxonomy source)
);
```

**Expected rows:** ~3,630 (verified). Grows slowly as new taxonomy concepts appear in future batches.

**Note:** `concept_raw` is preserved here — not dropped from the system, just stored once instead of 2.38M times. Full taxonomy traceability is retained at zero per-row cost.

#### `dimension_patterns` (NEW — global, cross-filing)

```sql
CREATE TABLE dimension_patterns (
    id INTEGER PRIMARY KEY,
    dimensions TEXT NOT NULL UNIQUE,   -- Full JSON string
    pattern_hash TEXT NOT NULL UNIQUE  -- SHA-256 for fast dedup lookup
);
```

**Expected rows:** ~3,009 (verified). Grows slowly.

#### `context_definitions` (NEW — global, cross-filing)

```sql
CREATE TABLE context_definitions (
    id INTEGER PRIMARY KEY,
    period_type TEXT NOT NULL CHECK (period_type IN ('instant', 'duration', 'forever')),
    instant_date TEXT,
    start_date TEXT,
    end_date TEXT,
    dimension_pattern_id INTEGER REFERENCES dimension_patterns(id),
    definition_hash TEXT NOT NULL UNIQUE  -- Hash of all fields for fast dedup
);
```

**Expected rows:** ~144,650 unique combinations per batch (verified). Will grow across batches as new date combinations appear, but dramatically less than 3.15M per batch in v1.

### 17.4 Schema v2: Modified Core Tables

#### `numeric_facts` (11 columns → 5)

```sql
CREATE TABLE numeric_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_id INTEGER NOT NULL REFERENCES concepts(id),
    context_id INTEGER NOT NULL REFERENCES context_definitions(id),
    unit TEXT,            -- Resolved measure: "GBP", "shares", "pure", etc.
    value REAL NOT NULL
);
```

#### `text_facts` (8 columns → 4)

```sql
CREATE TABLE text_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_id INTEGER NOT NULL REFERENCES concepts(id),
    context_id INTEGER NOT NULL REFERENCES context_definitions(id),
    value TEXT
);
```

#### `units` — ELIMINATED

Resolved at load time. The 10 unique measure values (`GBP`, `shares`, `pure`, `USD`, `EUR`, etc.) are stored inline on `numeric_facts.unit`.

#### `contexts` — REPLACED by `context_definitions`

The per-filing `contexts` table is eliminated. Facts point directly to global `context_definitions`. The `context_ref` string is used transiently during loading to map facts to their resolved context, then discarded.

### 17.5 Schema v2: Unchanged Tables

`batches`, `companies`, `filings` — unchanged. These tables are already efficient and contain no duplicated data.

**One addition to `filings`:** Normalize `balance_sheet_date` to ISO format during ingestion (see Section 18.4 finding on inconsistent date formats).

### 17.6 Complete Schema v2 DDL

```sql
-- Schema version
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- Batch tracking (unchanged)
CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    source_url TEXT,
    downloaded_at TEXT NOT NULL,
    file_count INTEGER,
    processed_at TEXT
);

-- Companies (unchanged)
CREATE TABLE IF NOT EXISTS companies (
    company_number TEXT PRIMARY KEY,
    name TEXT,
    jurisdiction TEXT
);

-- Filings (unchanged except balance_sheet_date normalized to ISO)
CREATE TABLE IF NOT EXISTS filings (
    id INTEGER PRIMARY KEY,
    company_number TEXT NOT NULL REFERENCES companies(company_number),
    batch_id INTEGER REFERENCES batches(id),
    source_file TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (source_type IN ('ixbrl_html', 'xbrl_xml', 'cic_zip')),
    balance_sheet_date TEXT NOT NULL,
    period_start_date TEXT,
    period_end_date TEXT,
    loaded_at TEXT NOT NULL,
    file_hash TEXT
);

-- Lookup: concept definitions (global, cross-filing)
CREATE TABLE IF NOT EXISTS concepts (
    id INTEGER PRIMARY KEY,
    concept_raw TEXT NOT NULL UNIQUE,
    concept TEXT NOT NULL,
    namespace TEXT
);

-- Lookup: dimension patterns (global, cross-filing)
CREATE TABLE IF NOT EXISTS dimension_patterns (
    id INTEGER PRIMARY KEY,
    dimensions TEXT NOT NULL UNIQUE,
    pattern_hash TEXT NOT NULL UNIQUE
);

-- Lookup: context definitions (global, cross-filing)
CREATE TABLE IF NOT EXISTS context_definitions (
    id INTEGER PRIMARY KEY,
    period_type TEXT NOT NULL CHECK (period_type IN ('instant', 'duration', 'forever')),
    instant_date TEXT,
    start_date TEXT,
    end_date TEXT,
    dimension_pattern_id INTEGER REFERENCES dimension_patterns(id),
    definition_hash TEXT NOT NULL UNIQUE
);

-- Numeric facts (slimmed: 11 → 5 columns)
CREATE TABLE IF NOT EXISTS numeric_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_id INTEGER NOT NULL REFERENCES concepts(id),
    context_id INTEGER NOT NULL REFERENCES context_definitions(id),
    unit TEXT,
    value REAL NOT NULL
);

-- Text facts (slimmed: 8 → 4 columns)
CREATE TABLE IF NOT EXISTS text_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_id INTEGER NOT NULL REFERENCES concepts(id),
    context_id INTEGER NOT NULL REFERENCES context_definitions(id),
    value TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_filings_company ON filings(company_number);
CREATE INDEX IF NOT EXISTS idx_filings_date ON filings(balance_sheet_date);
CREATE INDEX IF NOT EXISTS idx_filings_batch ON filings(batch_id);

CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(concept);

CREATE INDEX IF NOT EXISTS idx_context_def_hash ON context_definitions(definition_hash);
CREATE INDEX IF NOT EXISTS idx_context_def_period ON context_definitions(period_type, instant_date);

CREATE INDEX IF NOT EXISTS idx_numeric_filing ON numeric_facts(filing_id);
CREATE INDEX IF NOT EXISTS idx_numeric_concept ON numeric_facts(concept_id);
CREATE INDEX IF NOT EXISTS idx_numeric_filing_concept ON numeric_facts(filing_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_numeric_context ON numeric_facts(context_id);

CREATE INDEX IF NOT EXISTS idx_text_filing ON text_facts(filing_id);
CREATE INDEX IF NOT EXISTS idx_text_concept ON text_facts(concept_id);

-- Convenience views for human-readable queries
CREATE VIEW IF NOT EXISTS numeric_facts_v AS
SELECT
    nf.id, nf.filing_id, nf.value, nf.unit,
    c.concept, c.concept_raw, c.namespace,
    cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
    dp.dimensions
FROM numeric_facts nf
JOIN concepts c ON nf.concept_id = c.id
JOIN context_definitions cd ON nf.context_id = cd.id
LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id;

CREATE VIEW IF NOT EXISTS text_facts_v AS
SELECT
    tf.id, tf.filing_id, tf.value,
    c.concept, c.concept_raw, c.namespace,
    cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
    dp.dimensions
FROM text_facts tf
JOIN concepts c ON tf.concept_id = c.id
JOIN context_definitions cd ON tf.context_id = cd.id
LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id;

INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (2, datetime('now'));
```

### 17.7 Estimated Size Reduction

| Component | v1 (Current) | v2 (Proposed) | Savings |
|-----------|-------------|---------------|---------|
| `contexts.dimensions` (481 MB) | 2.98M inline JSON strings | 3,009 patterns in lookup | **~480 MB** |
| `concept_raw` on facts (95 MB) | 2.38M inline strings | 3,630 rows in `concepts` | **~95 MB** |
| `concept` on facts (53 MB) | 2.38M inline strings | INTEGER FK | **~44 MB** |
| `context_ref` strings (155 MB) | TEXT FK across 3 tables | INTEGER FK, no stored ref | **~155 MB** |
| `value_raw` on numeric_facts | ~20 MB | Dropped | **~20 MB** |
| `sign`, `decimals`, `scale`, `format` | ~40 MB | Dropped | **~40 MB** |
| `format`, `escape` on text_facts | ~15 MB | Dropped | **~15 MB** |
| `entity_identifier`, `entity_scheme` | ~50 MB | Dropped | **~50 MB** |
| `measure_raw`, `unit_ref` overhead | ~15 MB | Dropped (unit inlined) | **~15 MB** |
| `units` table (115K rows) | ~5 MB | Eliminated | **~5 MB** |
| Context rows (3.15M → 144K) | ~200 MB | ~10 MB | **~190 MB** |
| Index reduction | ~400 MB | ~150 MB | **~250 MB** |
| **Total** | **1,624 MB** | **~400-500 MB** | **~70-75%** |

**Projection for full dataset:**

| Batches | v1 Schema | v2 Schema |
|---------|-----------|-----------|
| 1 batch | 1.62 GB | ~0.4-0.5 GB |
| 103 batches | ~165 GB | **~40-50 GB** |
| With historical (200+) | ~325 GB | **~80-100 GB** |

### 17.8 Customer-Facing Data Preservation Audit

**Everything a premium customer needs is preserved:**

| Customer Need | Data Source | Preserved? |
|---------------|------------|------------|
| Company identification | `companies.company_number`, `companies.name` | Yes |
| Filing metadata | `filings.*` (dates, source, batch) | Yes |
| Financial values | `numeric_facts.value` | Yes — exact parsed value |
| What the value represents | `concepts.concept` via FK | Yes — e.g. "Equity", "TurnoverRevenue" |
| Taxonomy source | `concepts.concept_raw`, `concepts.namespace` | Yes — stored once in lookup |
| Reporting period | `context_definitions.period_type`, dates | Yes |
| Dimensional breakdowns | `dimension_patterns.dimensions` via FK | Yes — current/prior year, segments |
| Currency/unit | `numeric_facts.unit` | Yes — "GBP", "shares" |
| Text disclosures | `text_facts.value` | Yes — full text/HTML content |
| Audit trail | `filings.source_file`, `filings.file_hash`, `batches.*` | Yes |

**What is dropped (none customer-facing):**

| Dropped Data | Why It's Safe to Drop |
|-------------|----------------------|
| `value_raw` ("762,057") | Display formatting. Parsed value `-762057.0` is the accurate data. |
| `sign`, `decimals`, `scale` | Parsing parameters already applied to produce `value`. |
| `format` | iXBRL rendering instruction (e.g., `ixt2:numdotdecimal`). |
| `escape` | iXBRL HTML rendering flag. |
| `context_ref` ("FY1Current") | Arbitrary XBRL internal ID. Resolved to period + dimensions. |
| `unit_ref` ("GBP-1") | Arbitrary XBRL internal ID. Resolved to "GBP". |
| `entity_identifier` | Duplicate of `filings.company_number`. |
| `entity_scheme` | Constant across all data (`companieshouse.gov.uk`). |
| `segment_raw` | 100% NULL — never populated. |
| `measure_raw` ("iso4217:GBP") | Namespace-prefixed unit. Normalized to "GBP". |

### 17.9 Migration Strategy: Fresh Start

Since only 1 batch is loaded, a fresh start is the clear choice (Option A from v1 proposal).

1. Write new `schema.sql` with v2 DDL
2. Modify loader to resolve concepts/contexts/units during loading
3. Delete existing database
4. Re-ingest single batch
5. Verify size (~400-500 MB target) and data accuracy

### 17.10 Loader Changes

The loading pipeline changes from single-phase inserts to resolve-then-insert:

```
Parser Output (unchanged)
    │
    ▼
┌──────────────────────────────────────────────┐
│ Resolution Phase (per filing)                │
│                                              │
│ 1. For each parsed concept_raw:              │
│    → INSERT OR IGNORE into concepts          │
│    → Cache concept_raw → concept_id          │
│                                              │
│ 2. For each parsed context:                  │
│    → Hash dimensions → lookup/insert         │
│      dimension_pattern                       │
│    → Hash (period + dimension_pattern_id)    │
│      → lookup/insert context_definition      │
│    → Cache context_ref → context_def_id      │
│                                              │
│ 3. For each parsed unit:                     │
│    → Cache unit_ref → measure string         │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│ Insert Phase (per filing)                    │
│                                              │
│ INSERT INTO numeric_facts (                  │
│   filing_id, concept_id, context_id,         │
│   unit, value                                │
│ )                                            │
│                                              │
│ INSERT INTO text_facts (                     │
│   filing_id, concept_id, context_id,         │
│   value                                      │
│ )                                            │
└──────────────────────────────────────────────┘
```

**Performance note:** The `concepts` and `dimension_patterns` caches are loaded once at batch start (~3,600 + ~3,000 entries, fits in memory trivially). The `context_definitions` cache grows during the batch but all lookups are Python dict operations (nanoseconds). Database INSERTs only occur for genuinely new patterns.

### 17.11 Code Changes Required

| File | Changes |
|------|---------|
| `backend/db/schema.sql` | Replace with v2 DDL (lookup tables, slimmed fact tables, drop units table) |
| `backend/loader/bulk_loader.py` | Add resolution phase with concept/context/unit caches, resolve-then-insert |
| `backend/db/queries.py` | JOIN through `concepts` and `context_definitions` for all fact queries |
| `backend/db/connection.py` | No changes |
| `backend/parser/ixbrl_fast.py` | No changes — parser output unchanged, resolution happens in loader |

### 17.12 Trade-offs

| Benefit | Cost |
|---------|------|
| **70-75% smaller database** | Slightly more complex loader (resolution phase) |
| Simpler fact tables (fewer columns) | Queries require JOINs to `concepts`/`context_definitions` |
| Faster queries (smaller rows, INTEGER indexes) | Initial cache load at batch start (~milliseconds) |
| Scales to 103+ batches (~40-50 GB vs ~165 GB) | Cannot reconstruct original iXBRL display formatting |
| Cleaner data model (only user-relevant data) | One-time effort to rewrite loader + queries |
| No `units` table to maintain | — |

### 17.13 Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Dropped column turns out to be needed | Low | `concept_raw` preserved in lookup. Other dropped data is purely XBRL plumbing. Source ZIPs can be re-parsed if ever needed. |
| `context_definitions` grows too large across batches | Low | Growth is O(unique dates × dimension patterns), not O(rows). Estimated ~500K-1M across all batches. |
| JOINs slow down queries | Very Low | INTEGER PK JOINs in SQLite are near-zero cost. Convenience views hide complexity. |
| Hash collisions in dedup | Negligible | SHA-256 collision probability is effectively zero at these data volumes. |

---

## 18. Recommendations & Next Steps

### 18.1 Immediate Actions (Before Further Ingestion)

| Priority | Action | Owner |
|----------|--------|-------|
| **P0** | Review v2 schema proposal (Section 17) — verify all customer-facing data is preserved (Section 17.8) | Stakeholder |
| **P0** | Implement v2 schema DDL with lookup tables and slimmed fact tables | Developer |
| **P0** | Modify loader for resolve-then-insert pipeline (Section 17.10) | Developer |
| **P1** | Test with single batch, verify ~70-75% size reduction (~400-500 MB) | Developer |
| **P1** | Benchmark query performance with JOINs vs convenience views | Developer |

### 18.2 Decision Required

**Question:** Should we proceed with the v2 "Prune + Normalize" schema (Section 17)?

| Option | Pros | Cons |
|--------|------|------|
| **A. Prune + Normalize (Recommended)** | 70-75% size reduction, simpler fact tables, proven technique | Drops ability to reconstruct iXBRL display formatting |
| B. Normalize only (v1 proposal) | 60-65% reduction, preserves all raw values | More columns, larger rows, slightly less savings |
| C. Prune only (drop columns, no lookup tables) | Simpler code changes, ~40% reduction | Still has string duplication, less savings |
| D. Accept large DB | No changes | 165 GB is impractical |

### 18.3 Open Questions for Discussion

1. ~~**Segment preservation:** Is `segment_raw` (original XML) still required, or is `dimensions` JSON sufficient?~~
   **RESOLVED (Session 9):** `segment_raw` is **100% NULL** in the current data. Dropped in v2.

2. ~~**Unit normalization:** Should units be normalized?~~
   **RESOLVED (Session 10):** With only 10 unique measures, the `units` table is eliminated entirely. The resolved measure value (e.g., "GBP") is stored inline on `numeric_facts.unit`.

3. **Query patterns:** What are the primary query patterns? This affects which indexes to keep.

4. **Historical priority:** Do we need all 200+ historical batches, or is recent data sufficient?

5. **Hardware constraints:** What storage is available for the final database?

6. **Customer data review (NEW):** Does Section 17.8 (Customer-Facing Data Preservation Audit) cover all premium customer use cases? Are there any dropped columns that a paying user would actually need?

### 18.4 Additional Findings (Session 9)

#### `balance_sheet_date` Formatting Inconsistency

The `balance_sheet_date` column has inconsistent formatting from source data:

| Format | Example | Count |
|--------|---------|-------|
| Long text | "28 February 2023" | 13,752 |
| Short dot notation | "28.2.23" | 3,602 |
| ISO format | "2023-02-28" | 2,980 |

**Recommendation:** Consider normalizing to ISO format during ingestion, or add a computed `balance_sheet_date_iso` column for consistent querying.

#### Context Period Distribution

| Period Type | Row Count |
|-------------|-----------|
| instant | 1,774,291 |
| duration | 1,376,666 |
| forever | 0 |

All `instant` contexts have `instant_date` populated; all `duration` contexts have `start_date` and `end_date` populated. Data quality is excellent.

---

## 19. Appendix: Audit Queries Used

```sql
-- Table row counts
SELECT 'numeric_facts' as tbl, COUNT(*) FROM numeric_facts
UNION ALL SELECT 'text_facts', COUNT(*) FROM text_facts
UNION ALL SELECT 'contexts', COUNT(*) FROM contexts;

-- Column size analysis
SELECT SUM(LENGTH(dimensions)) / 1024.0 / 1024.0 as dimensions_mb FROM contexts;
SELECT SUM(LENGTH(concept_raw) + LENGTH(concept)) / 1024.0 / 1024.0 FROM numeric_facts;

-- Dimension pattern frequency
SELECT dimensions, COUNT(*) FROM contexts
WHERE dimensions IS NOT NULL
GROUP BY dimensions ORDER BY COUNT(*) DESC LIMIT 10;

-- Concept frequency
SELECT concept_raw, COUNT(*) FROM numeric_facts
GROUP BY concept_raw ORDER BY COUNT(*) DESC LIMIT 10;

-- Unique counts
SELECT COUNT(DISTINCT concept) FROM numeric_facts;  -- 699
SELECT COUNT(DISTINCT concept) FROM text_facts;     -- 383
```

---

*End of Document — **Awaiting Decision on Normalized Schema***
