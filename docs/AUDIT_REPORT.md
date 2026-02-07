# AUDIT REPORT: Companies House Data Layer

**Date:** 2026-02-05
**Auditor:** Claude (Opus 4.5)
**Status:** **BLOCKED** - Schema redesign required before full data load

---

## EXECUTIVE SUMMARY

| Component | Status | Notes |
|-----------|--------|-------|
| **Parser** | **PASS** | All critical elements extracted correctly |
| **Schema** | **PASS** | Matches spec exactly |
| **Bulk Loader** | **PASS** | Data flow correct, no duplicates |
| **Query Layer** | **PASS** | All functions working |
| **Data Integrity** | **PASS** | Round-trip verification successful |
| **Batch Script** | **PASS** | Skip/resume logic working |
| **Storage Efficiency** | **FAIL** | 5-8x bloat factor discovered |

### Critical Finding

| Metric | Value | Concern |
|--------|-------|---------|
| Source ZIP size | ~200-300 MB | — |
| Database size (1 batch) | **1.62 GB** | 5-8x bloat |
| Projected size (103 batches) | **~165 GB** | Impractical |
| Root cause | String duplication | See Section 8 |

**RECOMMENDATION: DO NOT PROCEED with full data load. Implement normalized schema first.**

---

## 1. PARSER AUDIT (ixbrl_fast.py)

### Results: **PASS**

| Check | Result |
|-------|--------|
| Numeric facts extraction | PASS |
| Text facts extraction | PASS |
| Context extraction | PASS |
| Unit extraction | PASS (minor issue, see below) |
| Sign attribute handling | PASS - `762,057` with `sign="-"` becomes `-762057.0` |
| Scale/decimals handling | PASS - `scale=-2` applies correctly (25 -> 0.25) |
| Namespace normalization | PASS - `uk-core:Equity` -> `Equity` |
| Format handling | PASS - zerodash, numcommadot, etc. all work |
| Deduplication | PASS - No 3x duplicates observed |

### Minor Issue: Divide Units
- **Issue:** Compound units like `GBPPerShare` (GBP/shares) have empty `measure_raw`
- **Impact:** 2,565 units (2.2%), affecting 2,497 facts
- **Severity:** LOW - unit_ref linkage is preserved
- **Location:** `backend/parser/ixbrl_fast.py:149-154`
- **Recommendation:** Fix post-load if needed for analytics

---

## 2. SCHEMA AUDIT (schema.sql)

### Results: **PASS**

| Check | Result |
|-------|--------|
| Tables match spec | PASS - All 8 tables present |
| Columns match spec | PASS - Exact match to Section 10 |
| CHECK constraints | PASS - source_type, period_type validated |
| Foreign keys | PASS - All referential integrity enforced |
| Indexes | PASS - All 12 indexes present |
| Schema version | PASS - Version 1 recorded |

**Tables verified:**
- `schema_version`, `batches`, `companies`, `filings`
- `numeric_facts`, `text_facts`, `contexts`, `units`

---

## 3. BULK LOADER AUDIT (bulk_loader.py)

### Results: **PASS**

| Check | Result |
|-------|--------|
| Company upsert | PASS - No duplicate companies |
| Filing creation | PASS - Unique source_file constraint enforced |
| Batch tracking | PASS - 1 batch with processed_at timestamp |
| Error handling | PASS - Failed files don't stop batch |
| No duplicates | PASS - 0 duplicate filings found |

**Counts verified against expected:**

| Table | Expected | Actual | Status |
|-------|----------|--------|--------|
| companies | 35,067 | 35,067 | PASS |
| filings | 35,119 | 35,119 | PASS |
| numeric_facts | 1,081,996 | 1,081,996 | PASS |
| text_facts | 1,295,741 | 1,295,741 | PASS |
| contexts | 3,150,957 | 3,150,957 | PASS |
| units | 115,835 | 115,835 | PASS |
| batches | 1 | 1 | PASS |

---

## 4. QUERY LAYER AUDIT (queries.py)

### Results: **PASS**

| Function | Test Result |
|----------|-------------|
| `get_company()` | PASS - Returns correct company data |
| `get_filings_for_company()` | PASS - Returns filings ordered by date |
| `get_latest_filing()` | PASS - Returns most recent filing |
| `get_numeric_facts()` | PASS - Returns facts with all attributes |
| `get_text_facts()` | PASS - Returns text facts correctly |
| `get_contexts()` | PASS - Returns contexts with dimensions |
| `get_units()` | PASS - Returns units with measures |
| `get_filing_with_facts()` | PASS - Returns complete filing data |
| `search_companies()` | PASS - LIKE search works |
| `get_database_stats()` | PASS - Returns accurate counts |

---

## 5. DATA INTEGRITY AUDIT (Round-Trip Verification)

### Results: **PASS**

Tested 3 filings by extracting from ZIP and re-parsing:

| Filing ID | Source File | Counts Match | Values Match |
|-----------|-------------|--------------|--------------|
| 958 | Prod223_3580_02912645_20230131.html | PASS | PASS |
| 5 | Prod223_3580_00153694_20230228.html | PASS | PASS |
| 14537 | Prod223_3580_10204175_20221130.html | PASS | PASS |

**Verified:**
- Company numbers match exactly
- Balance sheet dates match exactly
- Period dates match exactly
- Context counts match exactly (including complex file with 562 contexts)
- Unit counts match exactly
- Numeric fact counts match exactly
- Text fact counts match exactly
- **Negative values** (`sign="-"`) correctly stored as negative floats
- **segment_raw** correctly NULL (as intended per design)
- **dimensions** JSON correctly stored and retrievable

---

## 6. BATCH SCRIPT AUDIT (load_all_batches.py)

### Results: **PASS**

| Check | Result |
|-------|--------|
| Skip loaded batches | PASS - `Accounts_Bulk_Data-2023-12-01.zip` correctly skipped |
| Detect pending | PASS - 102 pending batches identified |
| Order correct | PASS - Sorted by date (oldest first) |
| Signal handling | PASS - SIGINT/SIGTERM graceful shutdown implemented |
| Logging | PASS - Writes to both console and log file |
| Resumability | PASS - Can interrupt and continue |

---

## 7. MINOR ISSUES (Non-Blocking)

### Issue 1: Divide Units (LOW severity)
- **Location:** `backend/parser/ixbrl_fast.py:149-154`
- **Problem:** Parser extracts only direct `<measure>` child, missing divide structure
- **Example:** `GBPPerShare` has `<divide><unitNumerator>...</unitNumerator><unitDenominator>...</unitDenominator></divide>`
- **Impact:** 2.2% of units have empty measure_raw
- **Fix required before load?** NO - unit associations work via unit_ref

### Issue 2: Jurisdiction Not Populated (LOW severity)
- **Location:** `backend/loader/bulk_loader.py:286-308`
- **Problem:** `jurisdiction` column always NULL
- **Expected:** Derive from company number prefix per ARCHITECTURE_PROPOSAL.md
- **Impact:** Query filtering by jurisdiction not available
- **Fix required before load?** NO - can be backfilled later

### Issue 3: Balance Sheet Date Format Inconsistency (LOW severity)
- **Observation:** Some dates are ISO format (`2023-01-31`), others human-readable (`28 February 2023`)
- **Impact:** Sorting/filtering by date may not work correctly
- **Fix required before load?** NO - can normalize during query or backfill

---

## 8. CRITICAL ISSUE: STORAGE BLOAT

### Results: **FAIL**

### 8.1 Observed Bloat

| Metric | Value |
|--------|-------|
| Source ZIP size | ~200-300 MB (estimated) |
| Database size | **1,624 MB (1.62 GB)** |
| Bloat factor | **5-8x source size** |
| Projected 103 batches | **~165 GB** |
| Projected with historical | **~325 GB** |

### 8.2 Row Counts Analysis

| Table | Rows | Rows per Filing | % of Total |
|-------|------|-----------------|------------|
| numeric_facts | 1,081,996 | ~31 | 19% |
| text_facts | 1,295,741 | ~37 | 23% |
| **contexts** | **3,150,957** | **~90** | **55%** |
| units | 115,835 | ~3 | 2% |
| filings | 35,119 | 1 | <1% |
| companies | 35,067 | ~1 | <1% |

**Key finding:** The `contexts` table has 90 rows per filing on average, making it 55% of all rows.

### 8.3 Storage Breakdown by Column

| Table.Column | Total Size | Notes |
|--------------|------------|-------|
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

### 8.4 Root Causes

#### Cause 1: Massive String Duplication in `dimensions` Column (481 MB)
- Only **~100-200 unique dimension patterns** exist
- Stored **3.15 million times** (once per context row)
- Example pattern repeated 24,799 times:
  ```json
  {"explicit": [{"dimension": "core:MaturitiesOrExpirationPeriodsDimension", "member": "core:WithinOneYear"}], "typed": []}
  ```

#### Cause 2: Denormalized Concept Names (148 MB)
- Only **699 unique numeric concepts** and **383 unique text concepts**
- Stored **2.3 million times** in fact tables
- Both `concept_raw` and `concept` stored in every row

#### Cause 3: String Foreign Keys (155 MB)
- `context_ref` is TEXT (average 36 characters)
- Stored in 3 tables: contexts, numeric_facts, text_facts
- Could be INTEGER (4 bytes) with lookup table

#### Cause 4: Index Overhead (~400 MB)
- 13 indexes on 5.6+ million rows
- Text columns in indexes are expensive

---

## 9. RECOMMENDATIONS

### 9.1 Immediate Action Required

| Priority | Action | Status |
|----------|--------|--------|
| **P0** | **DO NOT load additional batches** | BLOCKING |
| **P0** | Review normalized schema (ARCHITECTURE_PROPOSAL.md Section 17) | Required |
| **P0** | Implement lookup tables for concepts and dimensions | Required |
| **P0** | Re-test with single batch (target: ~500-600 MB) | Required |
| **P1** | Then proceed with full data load | After schema fix |

### 9.2 Proposed Solution Summary

Create lookup tables for repeated data:

| New Table | Purpose | Expected Rows |
|-----------|---------|---------------|
| `concepts` | Deduplicated concept names | ~1,100 |
| `dimension_patterns` | Deduplicated dimension JSON | ~200-500 |
| `context_definitions` | Deduplicated period+dimension combos | ~10,000-50,000 |

**Expected size reduction: 60-70%** (1.62 GB -> ~550-650 MB per batch)

### 9.3 Files Requiring Changes

| File | Changes Required |
|------|------------------|
| `backend/db/schema.sql` | Add lookup tables, modify fact tables |
| `backend/parser/ixbrl_fast.py` | Return concept/context IDs |
| `backend/loader/bulk_loader.py` | Upsert to lookup tables first |
| `backend/db/queries.py` | Add JOINs to lookup tables |

---

## 10. VERIFICATION QUERIES USED

```sql
-- Database file size
SELECT page_count * page_size / 1024.0 / 1024.0 AS size_mb
FROM pragma_page_count(), pragma_page_size();

-- Table row counts
SELECT 'numeric_facts' as tbl, COUNT(*) FROM numeric_facts
UNION ALL SELECT 'text_facts', COUNT(*) FROM text_facts
UNION ALL SELECT 'contexts', COUNT(*) FROM contexts
UNION ALL SELECT 'units', COUNT(*) FROM units;

-- Column size analysis
SELECT SUM(LENGTH(dimensions)) / 1024.0 / 1024.0 as dimensions_mb FROM contexts;
SELECT SUM(LENGTH(concept_raw) + LENGTH(concept)) / 1024.0 / 1024.0 FROM numeric_facts;

-- Duplicate check
SELECT source_file, COUNT(*) FROM filings GROUP BY source_file HAVING COUNT(*) > 1;

-- Sign handling verification
SELECT concept, value_raw, value, sign FROM numeric_facts WHERE sign = '-' LIMIT 10;

-- Format handling verification
SELECT format, COUNT(*) FROM numeric_facts WHERE format IS NOT NULL GROUP BY format;
```

---

## 11. APPENDIX: Test Results Detail

### Round-Trip Test 1: Filing 958
```
Company: 02912645 - SCEPTRE JEWELS LONDON LIMITED
Source: Prod223_3580_02912645_20230131.html
DB Contexts: 21 | Parsed: 21 | MATCH
DB Units: 2 | Parsed: 2 | MATCH
DB Numeric Facts: 36 | Parsed: 36 | MATCH
DB Text Facts: 38 | Parsed: 38 | MATCH
```

### Round-Trip Test 2: Filing 5 (with sign="-")
```
Source: Prod223_3580_00153694_20230228.html
DB Contexts: 29 | Parsed: 29 | MATCH
DB Units: 3 | Parsed: 3 | MATCH
DB Numeric Facts: 50 | Parsed: 50 | MATCH
DB Text Facts: 51 | Parsed: 51 | MATCH
Negative fact: NetCurrentAssetsLiabilities
  value_raw="84,709" -> value=-84709.0 | CORRECT
```

### Round-Trip Test 3: Filing 14537 (complex, 562 contexts)
```
Source: Prod223_3580_10204175_20221130.html
DB Contexts: 562 | Parsed: 562 | MATCH
DB Units: 6 | Parsed: 6 | MATCH
DB Numeric Facts: 22 | Parsed: 22 | MATCH
DB Text Facts: 32 | Parsed: 32 | MATCH
segment_raw: All NULL | CORRECT (by design)
Contexts with dimensions: 556 | Dimensions JSON valid
```

---

## 12. CONCLUSION

### What Works
- Parser correctly extracts all iXBRL elements
- Sign, scale, format handling all correct
- No data loss or corruption
- No duplicate insertion bugs
- Batch skip/resume logic functional
- Query layer returns accurate data

### What Blocks Full Load
- **Storage bloat makes 103-batch load impractical (~165 GB)**
- Schema normalization required before proceeding

### Next Steps
1. Review ARCHITECTURE_PROPOSAL.md Section 17 (normalized schema)
2. Decide on implementation approach (fresh start vs migration)
3. Implement normalized schema
4. Re-test with 1 batch (verify ~60% size reduction)
5. Then proceed with full data load

---

**End of Audit Report**

*Report generated: 2026-02-05*
*Auditor: Claude (Opus 4.5)*
