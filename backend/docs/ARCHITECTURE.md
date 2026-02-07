# Companies House Data Layer — Architecture Reference

**Version:** 1.0.0
**Status:** Active
**Schema Version:** 2

---

## 1. Design Principles

| Principle | Implementation |
|-----------|----------------|
| Preserve all user-relevant financial data | Every financial value, concept, period, dimension, and unit is stored with full accuracy |
| INTEGER FKs to lookup tables | Repeated strings (concepts, contexts, dimensions) stored once in lookup tables, referenced by ID |
| Drop XBRL rendering plumbing | Format hints, raw display strings, internal reference IDs, and parsing parameters are not stored |
| Dual-value concept storage | `concept_raw` ("uk-core:Equity") and `concept` ("Equity") stored once in `concepts` lookup |
| Traceability | Every fact links to its filing, batch, and original source file |

### Separation of Concerns

```
Application Layer    — Risk calculations, ratio analysis, business logic
        │
Data Access Layer    — Pure retrieval functions, JOINs through lookup tables
        │
Database (SQLite)    — Normalized schema, INTEGER FKs, lookup tables
        │
Parser / Loader      — iXBRL/XBRL extraction → resolve to lookups → bulk insert
        │
Source Data           — Companies House daily/monthly ZIP archives
```

---

## 2. Data Source Context

### 2.1 Source Overview

| Attribute | Value |
|-----------|-------|
| Provider | Companies House (UK Government) |
| URL | https://download.companieshouse.gov.uk/en_accountsdata.html |
| Update frequency | Daily (Tue-Sat), 60-day retention |
| Historical data | Monthly archives available |
| Coverage | ~75% of 2.2M annual filings (electronic only) |
| File formats | iXBRL (.html), XBRL (.xml), nested ZIP (.zip) |

### 2.2 Volume Estimates

| Period | Estimated Files |
|--------|-----------------|
| Daily batch | 15,000 - 30,000 files |
| Monthly | ~140,000 files |
| Annual | ~1,650,000 files |
| Historical (2008-present) | ~25,000,000 files |

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────┐
│     batches       │     │    companies      │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │─┐   │ company_number(PK)│─┐
│ filename (UQ)    │ │   │ name              │ │
│ source_url       │ │   │ jurisdiction      │ │
│ downloaded_at    │ │   └──────────────────┘ │
│ file_count       │ │                        │
│ processed_at     │ │                        │
└──────────────────┘ │   ┌──────────────────┐ │
                     └──▶│     filings       │◀┘
                         ├──────────────────┤
                         │ id (PK)          │──────────────────────┐
                         │ company_number(FK)│                      │
                         │ batch_id (FK)    │                      │
                         │ source_file (UQ) │                      │
                         │ source_type      │                      │
                         │ balance_sheet_date│                      │
                         │ period_start_date│                      │
                         │ period_end_date  │                      │
                         │ loaded_at        │                      │
                         │ file_hash        │                      │
                         └──────────────────┘                      │
                                                                   │
┌──────────────────┐     ┌──────────────────────┐                  │
│    concepts       │     │  dimension_patterns   │                  │
├──────────────────┤     ├──────────────────────┤                  │
│ id (PK)          │─┐   │ id (PK)              │─┐                │
│ concept_raw (UQ) │ │   │ dimensions (UQ)      │ │                │
│ concept          │ │   │ pattern_hash (UQ)    │ │                │
│ namespace        │ │   └──────────────────────┘ │                │
└──────────────────┘ │                             │                │
                     │   ┌──────────────────────┐  │                │
                     │   │ context_definitions   │  │                │
                     │   ├──────────────────────┤  │                │
                     │   │ id (PK)              │──┤                │
                     │   │ period_type          │  │                │
                     │   │ instant_date         │  │                │
                     │   │ start_date           │  │                │
                     │   │ end_date             │  │                │
                     │   │ dimension_pattern_id(FK)│                │
                     │   │ definition_hash (UQ) │  │                │
                     │   └──────────────────────┘  │                │
                     │              │               │                │
            ┌────────┴──────┐      │      ┌────────┘                │
            ▼               ▼      ▼      ▼                         │
┌────────────────────┐  ┌────────────────────┐                      │
│   numeric_facts     │  │    text_facts       │                      │
├────────────────────┤  ├────────────────────┤                      │
│ id (PK)            │  │ id (PK)            │                      │
│ filing_id (FK) ────┼──┼─── filing_id (FK) ─┼──────────────────────┘
│ concept_id (FK)    │  │ concept_id (FK)    │
│ context_id (FK)    │  │ context_id (FK)    │
│ unit               │  │ value              │
│ value              │  └────────────────────┘
└────────────────────┘
```

### 3.2 Table Definitions

#### `schema_version`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `version` | INTEGER | PK | Schema version number |
| `applied_at` | TEXT | NOT NULL | ISO timestamp |

#### `batches`

Tracks each downloaded ZIP file for audit trail and incremental loading.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK | Auto-increment |
| `filename` | TEXT | NOT NULL, UNIQUE | ZIP filename |
| `source_url` | TEXT | | Download URL |
| `downloaded_at` | TEXT | NOT NULL | ISO timestamp |
| `file_count` | INTEGER | | Files in ZIP |
| `processed_at` | TEXT | | Completion timestamp |

#### `companies`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `company_number` | TEXT | PK | 8-char registration number |
| `name` | TEXT | | Most recent legal name |
| `jurisdiction` | TEXT | | eng_wales / scotland / ni / llp |

#### `filings`

One record per source file processed.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK | Auto-increment |
| `company_number` | TEXT | NOT NULL, FK → companies | Registration number |
| `batch_id` | INTEGER | FK → batches | Parent batch |
| `source_file` | TEXT | NOT NULL, UNIQUE | Original filename from ZIP |
| `source_type` | TEXT | NOT NULL, CHECK | `ixbrl_html` / `xbrl_xml` / `cic_zip` |
| `balance_sheet_date` | TEXT | NOT NULL | Balance sheet date (ISO-normalized) |
| `period_start_date` | TEXT | | Reporting period start (ISO) |
| `period_end_date` | TEXT | | Reporting period end (ISO) |
| `loaded_at` | TEXT | NOT NULL | Import timestamp |
| `file_hash` | TEXT | | SHA-256 of source file |

#### `concepts` (lookup)

Stores each unique concept once. Cross-filing, global.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK | Auto-increment |
| `concept_raw` | TEXT | NOT NULL, UNIQUE | Full taxonomy reference: `uk-core:Equity` |
| `concept` | TEXT | NOT NULL | Normalized name: `Equity` |
| `namespace` | TEXT | | Taxonomy source: `uk-core` |

#### `dimension_patterns` (lookup)

Stores each unique dimension JSON once. Cross-filing, global.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK | Auto-increment |
| `dimensions` | TEXT | NOT NULL, UNIQUE | Full JSON string |
| `pattern_hash` | TEXT | NOT NULL, UNIQUE | SHA-256 for fast dedup |

Dimensions JSON format:

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

#### `context_definitions` (lookup)

Stores each unique context definition once. Cross-filing, global.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK | Auto-increment |
| `period_type` | TEXT | NOT NULL, CHECK | `instant` / `duration` / `forever` |
| `instant_date` | TEXT | | Point-in-time date (ISO) |
| `start_date` | TEXT | | Period start (ISO) |
| `end_date` | TEXT | | Period end (ISO) |
| `dimension_pattern_id` | INTEGER | FK → dimension_patterns | NULL if no dimensions |
| `definition_hash` | TEXT | NOT NULL, UNIQUE | SHA-256 of all fields for dedup |

#### `numeric_facts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK | Auto-increment |
| `filing_id` | INTEGER | NOT NULL, FK → filings | Parent filing |
| `concept_id` | INTEGER | NOT NULL, FK → concepts | What this number represents |
| `context_id` | INTEGER | NOT NULL, FK → context_definitions | Period and dimensions |
| `unit` | TEXT | | Resolved measure: `GBP`, `shares`, `pure` |
| `value` | REAL | | Parsed numeric value (sign + scale applied) |

#### `text_facts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK | Auto-increment |
| `filing_id` | INTEGER | NOT NULL, FK → filings | Parent filing |
| `concept_id` | INTEGER | NOT NULL, FK → concepts | What this text represents |
| `context_id` | INTEGER | NOT NULL, FK → context_definitions | Period and dimensions |
| `value` | TEXT | | Text or HTML content |

### 3.3 Indexes (12)

```sql
-- Filing lookups
CREATE INDEX idx_filings_company    ON filings(company_number);
CREATE INDEX idx_filings_date       ON filings(balance_sheet_date);
CREATE INDEX idx_filings_batch      ON filings(batch_id);

-- Concept lookup
CREATE INDEX idx_concepts_name      ON concepts(concept);

-- Context definition lookup
CREATE INDEX idx_context_def_hash   ON context_definitions(definition_hash);
CREATE INDEX idx_context_def_period ON context_definitions(period_type, instant_date);

-- Numeric facts
CREATE INDEX idx_numeric_filing         ON numeric_facts(filing_id);
CREATE INDEX idx_numeric_concept        ON numeric_facts(concept_id);
CREATE INDEX idx_numeric_filing_concept ON numeric_facts(filing_id, concept_id);
CREATE INDEX idx_numeric_context        ON numeric_facts(context_id);

-- Text facts
CREATE INDEX idx_text_filing  ON text_facts(filing_id);
CREATE INDEX idx_text_concept ON text_facts(concept_id);
```

### 3.4 Convenience Views

Two views JOIN through lookup tables for human-readable queries:

```sql
-- numeric_facts_v: nf.id, nf.filing_id, nf.value, nf.unit,
--   c.concept, c.concept_raw, c.namespace,
--   cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
--   dp.dimensions

-- text_facts_v: tf.id, tf.filing_id, tf.value,
--   c.concept, c.concept_raw, c.namespace,
--   cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
--   dp.dimensions
```

---

## 4. Data Preservation

### What is preserved

| Data | Storage Location |
|------|-----------------|
| Company identification | `companies.company_number`, `companies.name` |
| Filing metadata | `filings.*` (dates, source file, batch, hash) |
| Financial values | `numeric_facts.value` (sign + scale applied) |
| Concept identity | `concepts.concept` + `concepts.concept_raw` (via FK) |
| Taxonomy namespace | `concepts.namespace` (via FK) |
| Reporting period | `context_definitions.period_type`, date columns |
| Dimensional breakdowns | `dimension_patterns.dimensions` (via FK chain) |
| Currency/unit | `numeric_facts.unit` (resolved measure string) |
| Text disclosures | `text_facts.value` (full text/HTML content) |
| Audit trail | `filings.source_file`, `filings.file_hash`, `batches.*` |

### What was dropped

| Dropped | Rationale |
|---------|-----------|
| `value_raw` ("762,057") | Display string. Parsed value is the accurate data. |
| `sign`, `decimals`, `scale` | Parsing parameters already applied to produce `value`. |
| `format`, `escape` | iXBRL rendering instructions. No analytical purpose. |
| `context_ref` ("FY1Current") | Internal XBRL ID. Resolved to period + dimensions at load time. |
| `unit_ref` ("GBP-1") | Internal XBRL ID. Resolved to "GBP" at load time. |
| `entity_identifier` | Duplicate of `filings.company_number`. |
| `entity_scheme` | Constant (`companieshouse.gov.uk`) across all data. |
| `segment_raw` | 100% NULL in all data. |
| `measure_raw` ("iso4217:GBP") | Namespace-prefixed unit. Normalized to "GBP". |
| `units` table | Eliminated. Only ~10 unique measures; resolved inline. |
| `contexts` table (per-filing) | Replaced by global `context_definitions` lookup. |

### Background

The v1 schema stored every XBRL attribute verbatim, producing a 1,624 MB database from a single ~200-300 MB source ZIP. Extrapolating to all 103 available batches yielded ~165 GB — impractical. A storage audit identified massive string duplication (481 MB in dimension JSON alone, 148 MB in concept strings, 155 MB in context_ref strings). The v2 schema normalizes these into lookup tables and drops rendering-only metadata, achieving an 84% size reduction while preserving all financially relevant data.

---

## 5. File Processing Pipeline

### Flow

```
Companies House ZIP
        │
        ▼
┌─────────────────────────────────────────────┐
│  Phase 1: Parallel Parsing (4 workers)      │
│  ProcessPoolExecutor parses iXBRL/XBRL      │
│  CIC ZIPs → extract inner .xhtml files      │
│  Output: list[ParsedFile]                   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Phase 2: Resolve + Insert (sequential)     │
│                                             │
│  For each filing:                           │
│  1. Upsert company record                  │
│  2. Insert filing record                   │
│     (dates normalized to ISO via            │
│      normalize_date_to_iso())              │
│  3. Resolve concepts → concept_id           │
│     (ResolutionCache: INSERT OR IGNORE,     │
│      cache concept_raw → id)               │
│  4. Resolve contexts → context_id           │
│     (hash dimensions → dimension_pattern,   │
│      hash definition → context_definition) │
│  5. Resolve units → measure string          │
│     (unit_ref → "GBP")                     │
│  6. Bulk insert numeric_facts (executemany) │
│  7. Bulk insert text_facts (executemany)    │
│  8. Batch commit every 500 files            │
└─────────────────────────────────────────────┘
```

### ResolutionCache

Pre-loads all existing lookup table entries at batch start. On cache miss, inserts the new entry and caches the ID. All lookups are Python dict operations; database INSERTs only occur for genuinely new entries.

### CIC ZIP Handling

CIC ZIPs are nested archives containing two XHTML files:

```
CIC-{CompanyNumber}/
├── accounts/financialStatement.xhtml
└── cic34/cicReport.xhtml
```

Both are processed as separate filings with `source_type=cic_zip`, source_file recorded as `outer.zip!inner/path.xhtml`.

### Date Normalization

`normalize_date_to_iso()` handles formats found in Companies House data:

| Input Format | Example |
|-------------|---------|
| ISO (pass-through) | `2023-02-28` |
| Long text | `28 February 2023` |
| Dot notation (2-digit year) | `28.2.23` |
| Slash notation (DD/MM/YYYY) | `28/02/2023` |
| Dash with full year | `28-2-2023` |
| US text | `February 28, 2023` |

Applied to `balance_sheet_date`, `period_start_date`, and `period_end_date` on filing insert. All context definition dates are also ISO-normalized.

### Bulk Load Performance Settings

During bulk loading, SQLite is configured for maximum throughput:

```sql
PRAGMA synchronous = OFF;
PRAGMA journal_mode = MEMORY;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -256000;  -- 256MB
```

Normal settings are restored after the batch completes.

---

## 6. Data Access Layer

All query functions live in `backend/db/queries.py`. They use read-only connections and return dicts/lists. Fact queries JOIN through lookup tables to return human-readable data.

| Function | Signature | Description |
|----------|-----------|-------------|
| `get_company` | `(company_number: str) → dict \| None` | Lookup by registration number |
| `get_filings_for_company` | `(company_number: str) → list[dict]` | All filings, ordered by date desc |
| `get_latest_filing` | `(company_number: str) → dict \| None` | Most recent filing |
| `get_numeric_facts` | `(filing_id: int, concept: str \| None) → list[dict]` | Numeric facts, optional concept filter |
| `get_text_facts` | `(filing_id: int, concept: str \| None) → list[dict]` | Text facts, optional concept filter |
| `get_contexts` | `(filing_id: int) → list[dict]` | Context definitions used by a filing's facts |
| `get_units` | `(filing_id: int) → list[str]` | Distinct unit strings for a filing |
| `get_filing_with_facts` | `(filing_id: int) → dict \| None` | Complete filing with contexts, units, and all facts |
| `get_filing_by_source` | `(source_file: str) → dict \| None` | Lookup by original filename |
| `search_companies` | `(name_pattern: str, limit: int) → list[dict]` | SQL LIKE search on company name |
| `get_facts_by_concept` | `(concept: str, limit: int) → list[dict]` | Cross-filing concept search with company context |
| `get_database_stats` | `() → dict` | Row counts for all tables, date range |

---

## 7. Technology Choices & SQLite Configuration

| Choice | Rationale |
|--------|-----------|
| **SQLite** | Built into Python, single file, handles millions of rows |
| **Python 3.11+** | Type hints, pattern matching, good ecosystem |
| **lxml** (fast parser) | 14x faster than BeautifulSoup for iXBRL parsing |
| **BeautifulSoup** (fallback) | Robust HTML/XML parsing, handles malformed markup |
| **No ORM** | Direct SQL, stable schema, better performance |

### SQLite PRAGMA Settings (normal operation)

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;       -- 64MB
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;     -- 256MB memory-mapped I/O
```

Row factory set to `sqlite3.Row` for dict-like access.

---

## 8. Verified Statistics

Results from 1 batch loaded (Accounts_Bulk_Data-2023-12-01.zip):

### Row Counts

| Table | Rows |
|-------|------|
| companies | 35,067 |
| filings | 35,119 |
| numeric_facts | 1,081,996 |
| text_facts | 1,295,741 |
| concepts | 3,630 |
| dimension_patterns | 3,009 |
| context_definitions | 144,650 |
| batches | 1 |

### Size & Integrity

| Metric | Value |
|--------|-------|
| Database size | **255 MB** |
| v1 equivalent | 1,624 MB |
| Size reduction | **84%** |
| `PRAGMA integrity_check` | OK |
| Foreign key violations | 0 |
| Orphaned references | 0 |
| Dates normalized to ISO | All |

### Projections

| Scope | Estimated Size |
|-------|---------------|
| 103 daily batches | ~25-30 GB |
| With historical (200+ batches) | ~50-60 GB |

---

## 9. Data Acquisition Plan

### Current State

| Data | Status |
|------|--------|
| Single daily batch (2023-12-01) | Loaded, verified |
| v2 schema | Implemented, ready for full load |
| Rolling 60 daily files | Not yet acquired |
| Monthly archives (rolling 12) | Not yet acquired |
| Historical archives (2008-2024) | Not yet acquired |

### Acquisition Phases

**Phase 1: Daily Files (Rolling 60)**
```
Source: https://download.companieshouse.gov.uk/en_accountsdata.html
Files:  Accounts_Bulk_Data-YYYY-MM-DD.zip
Count:  ~60 files
Size:   ~50-400 MB each, ~6-8 GB total
```

**Phase 2: Monthly Archives (Rolling 12)**
```
Source: https://download.companieshouse.gov.uk/en_monthlyaccountsdata.html
Files:  Accounts_Monthly_Data-MonthYYYY.zip
Count:  ~12 files
Size:   ~2-4 GB each, ~25-50 GB total
```

**Phase 3: Historical Archives (2008-2024)**
```
Source: https://download.companieshouse.gov.uk/historicmonthlyaccountsdata.html
Files:  Accounts_Monthly_Data-MonthYYYY.zip
Count:  ~200 files (17 years of monthly data)
Size:   ~85-100 GB total
```

---

## 10. Key Source Files

| File | Role |
|------|------|
| `backend/db/schema.sql` | v2 DDL (source of truth) |
| `backend/db/connection.py` | Connection config, PRAGMAs, `verify_schema()` |
| `backend/loader/bulk_loader.py` | `ResolutionCache`, `normalize_date_to_iso()`, `bulk_insert_filing()` |
| `backend/db/queries.py` | All query functions with v2 JOINs |
| `backend/parser/ixbrl.py` | Parser dataclasses: `Context`, `Unit`, `NumericFact`, `TextFact`, `ParsedIXBRL` |
| `backend/parser/ixbrl_fast.py` | lxml-based fast parser (14x speedup) |

---

## 11. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-05 | Initial proposal |
| 0.2.0 | 2026-02-05 | Revised after review: dual-value storage, units table, format/escape attributes |
| 0.2.1 | 2026-02-05 | Marked as DRAFT pending full data acquisition; added acquisition plan |
| 0.3.0 | 2026-02-05 | Added storage audit findings and normalized schema proposal |
| 0.3.1 | 2026-02-05 | Data integrity verification passed. Verified unique counts. |
| 0.4.0 | 2026-02-07 | Rewrote with "Prune + Normalize" approach. Slimmed fact tables, eliminated units/contexts tables. |
| **1.0.0** | **2026-02-07** | **Converted from proposal to architecture reference. Reflects implemented v2 schema with verified statistics.** |
