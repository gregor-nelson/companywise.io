# Loader Pipeline Verification Audit

## Context

This is a handover prompt for a fresh Claude session to perform a full verification audit of the Companies House data loader pipeline. This pipeline is the **foundation data layer** for the companywise.io SaaS product. Data fidelity from source iXBRL/XBRL filings through to the SQLite database is critical.

Recent changes were made to fix two data-handling bugs observed during bulk loading of ~287k files. The changes touch three files across two modules. This audit must verify the fixes are correct, complete, and introduce no regressions.

---

## What Changed and Why

### Bug 1: Dates like `'17 11 2023'` failing to parse despite `%d %m %Y` being in the format list

**Root cause**: Invisible Unicode characters (zero-width spaces U+200B, LTR/RTL marks U+200E/U+200F, soft hyphens U+00AD) leak from HTML/iXBRL text extraction into date strings. These are invisible in log output but cause `strptime` to fail silently on every format attempt.

**Fix location**: `backend/loader/bulk_loader.py` function `normalize_date_to_iso()` (line 68)

**What was added**:
- `_INVISIBLE_CHARS_RE` regex to strip zero-width/invisible Unicode chars (does NOT strip `\xa0` non-breaking space, which is a space-like separator)
- `_HTML_TAG_RE` regex to strip HTML/XBRL tags
- Whitespace normalizer (`\s+` -> single space) to collapse non-breaking spaces and multi-space runs
- Second ISO-format check after cleaning (a cleaned string may become ISO-parseable)

### Bug 2: Raw XBRL/HTML namespace markup leaking into date values

**Root cause**: When `ix:nonNumeric` elements (e.g. `BalanceSheetDate`) have the iXBRL `escape` attribute set, `parse_text_fact_fast()` correctly stores the raw HTML in `fact.value` (for the text fact record). But the metadata extraction loop then blindly copied `fact.value` into `result.balance_sheet_date`, passing the raw HTML (including massive XBRL namespace declarations) to `normalize_date_to_iso()`.

**Fix location**: `backend/parser/ixbrl_fast.py` lines 274-304 and `backend/parser/ixbrl.py` lines 362-394

**What was changed**: The metadata extraction loop now uses `_get_all_text(elem)` (lxml) or `elem.get_text(strip=True)` (BeautifulSoup) to get text-only content for metadata fields when `escape` is set, while `fact.value` still retains the raw HTML for the stored text fact itself.

---

## Files to Audit

All paths relative to project root `/home/debian/companywise.io`:

| File | Role | Lines of interest |
|------|------|------------------|
| `backend/loader/bulk_loader.py` | Orchestrates ZIP processing, date normalization, DB insertion | Lines 58-113 (date normalization), 399-512 (filing insertion) |
| `backend/parser/ixbrl_fast.py` | Fast lxml-based iXBRL parser (production parser) | Lines 180-203 (text fact parsing), 274-304 (metadata extraction) |
| `backend/parser/ixbrl.py` | BeautifulSoup iXBRL parser (fallback, defines shared dataclasses) | Lines 276-293 (text fact parsing), 362-394 (metadata extraction) |
| `scripts/load_all_batches.py` | CLI entry point, batch orchestration | Unchanged in this round but in-scope for full audit |
| `backend/db/schema.sql` | v2 schema definition | Reference for table structures and constraints |
| `backend/db/connection.py` | DB connection management, PRAGMA config | Reference for connection setup |

---

## Verification Tasks

Please perform each of these checks. For each, state PASS/FAIL and provide evidence.

### 1. normalize_date_to_iso() correctness

Read `backend/loader/bulk_loader.py` lines 58-113 and verify:

- [ ] **1a. ISO fast path**: Strings matching `YYYY-MM-DD` are returned immediately without cleaning
- [ ] **1b. HTML stripping**: The `<` check gates HTML stripping (avoids regex cost on clean strings). Verify `_HTML_TAG_RE` handles self-closing tags (`<span ... />`), tags with attributes, and nested tags
- [ ] **1c. Invisible char removal**: Verify `_INVISIBLE_CHARS_RE` covers: U+200B (ZWSP), U+200C (ZWNJ), U+200D (ZWJ), U+200E (LTR mark), U+200F (RTL mark), U+00AD (soft hyphen), U+FEFF (BOM), U+2060 (word joiner). Verify it does NOT include U+00A0 (NBSP) which must be handled as whitespace, not removed
- [ ] **1d. Whitespace normalization**: `re.sub(r"\s+", " ", ...)` collapses all Unicode whitespace (including `\xa0`) to a single ASCII space. Confirm this runs after invisible char removal
- [ ] **1e. Empty string guard**: After cleaning, empty strings return `None` (not passed to strptime)
- [ ] **1f. Second ISO check**: After cleaning, re-check for ISO format (a date with invisible chars embedded in an ISO string would become valid after cleaning)
- [ ] **1g. Format coverage**: Verify all 6 strptime formats are present and correct: `%d %B %Y`, `%d %m %Y`, `%d.%m.%y`, `%d/%m/%Y`, `%d-%m-%Y`, `%B %d, %Y`
- [ ] **1h. Fallback behavior**: Unparseable dates log a WARNING and return the (cleaned) string as-is, not `None`. Verify the log message now shows the cleaned string (not raw HTML)

Run this validation script to confirm:

```python
cd /home/debian/companywise.io
python3 -c "
from backend.loader.bulk_loader import normalize_date_to_iso

# ISO fast path
assert normalize_date_to_iso('2023-02-28') == '2023-02-28'

# Standard formats
assert normalize_date_to_iso('28 February 2023') == '2023-02-28'
assert normalize_date_to_iso('17 11 2023') == '2023-11-17'
assert normalize_date_to_iso('05 04 2024') == '2024-04-05'
assert normalize_date_to_iso('28.02.23') == '2023-02-28'
assert normalize_date_to_iso('28/02/2023') == '2023-02-28'
assert normalize_date_to_iso('28-02-2023') == '2023-02-28'
assert normalize_date_to_iso('February 28, 2023') == '2023-02-28'

# Invisible Unicode chars (the actual production bug)
assert normalize_date_to_iso('17\u200b 11\u200b 2023') == '2023-11-17'  # ZWSP
assert normalize_date_to_iso('05\u200e 04\u200e 2024') == '2024-04-05'  # LTR mark
assert normalize_date_to_iso('28\u00ad02\u00ad2023') == '2023-02-28'     # soft hyphen in ISO
assert normalize_date_to_iso('\ufeff2023-02-28') == '2023-02-28'         # BOM prefix

# Non-breaking spaces (must become regular spaces, not be removed)
assert normalize_date_to_iso('17\xa011\xa02023') == '2023-11-17'
assert normalize_date_to_iso('05\xa004\xa02024') == '2024-04-05'

# Mixed invisible chars
assert normalize_date_to_iso('\u200b17\xa0\u200e11\xa02023\u200f') == '2023-11-17'

# HTML tag stripping
assert normalize_date_to_iso('<span class=\"x\"/>28 February 2023') == '2023-02-28'
html_xbrl = '<span xmlns=\"http://www.w3.org/1999/xhtml\" class=\"_ _8\"/>28 February 2023'
assert normalize_date_to_iso(html_xbrl) == '2023-02-28'

# Edge cases
assert normalize_date_to_iso(None) is None
assert normalize_date_to_iso('') is None
assert normalize_date_to_iso('   ') is None
assert normalize_date_to_iso('\u200b\u200e') is None  # only invisible chars

print('ALL DATE NORMALIZATION TESTS PASSED')
"
```

### 2. Parser metadata extraction (ixbrl_fast.py)

Read `backend/parser/ixbrl_fast.py` lines 274-304 and verify:

- [ ] **2a. _METADATA_CONCEPTS set**: Contains exactly these 7 concepts: `UKCompaniesHouseRegisteredNumber`, `CompaniesHouseRegisteredNumber`, `EntityCurrentLegalOrRegisteredName`, `EntityCurrentLegalName`, `BalanceSheetDate`, `StartDateForPeriodCoveredByReport`, `EndDateForPeriodCoveredByReport`
- [ ] **2b. Escape-aware extraction**: When `fact.escape` is truthy, metadata uses `_get_all_text(elem)` (text-only). When falsy, uses `fact.value` (already text-only from `_get_all_text`)
- [ ] **2c. fact.value preservation**: The `fact.value` stored in `result.text_facts` is NOT modified. It still contains raw HTML when `escape` is set. Only the metadata fields (`result.balance_sheet_date`, etc.) use the text-only version
- [ ] **2d. Non-metadata facts**: Facts whose concept is NOT in `_METADATA_CONCEPTS` hit the `continue` and skip the if/elif chain. They are still added to `result.text_facts`
- [ ] **2e. All text facts processed**: Every element in the `text_facts` list gets parsed and appended to `result.text_facts`, regardless of whether it's a metadata concept

Run this validation:

```python
cd /home/debian/companywise.io
python3 -c "
from backend.parser.ixbrl_fast import parse_ixbrl_fast

# iXBRL with escape='true' on BalanceSheetDate
doc = '''<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<html xmlns=\"http://www.w3.org/1999/xhtml\"
      xmlns:ix=\"http://www.xbrl.org/2013/inlineXBRL\"
      xmlns:xbrli=\"http://www.xbrl.org/2003/instance\"
      xmlns:bus=\"http://xbrl.frc.org.uk/cd/2024-01-01/business\"
      xmlns:core=\"http://xbrl.frc.org.uk/fr/2024-01-01/core\">
<body>
<ix:header>
<ix:resources>
<xbrli:context id=\"ctx1\">
  <xbrli:entity><xbrli:identifier scheme=\"http://www.companieshouse.gov.uk\">12345678</xbrli:identifier></xbrli:entity>
  <xbrli:period><xbrli:instant>2023-06-30</xbrli:instant></xbrli:period>
</xbrli:context>
<xbrli:context id=\"ctx2\">
  <xbrli:entity><xbrli:identifier scheme=\"http://www.companieshouse.gov.uk\">12345678</xbrli:identifier></xbrli:entity>
  <xbrli:period><xbrli:startDate>2022-07-01</xbrli:startDate><xbrli:endDate>2023-06-30</xbrli:endDate></xbrli:period>
</xbrli:context>
</ix:resources>
</ix:header>
<ix:nonNumeric name=\"bus:EntityCurrentLegalOrRegisteredName\" contextRef=\"ctx2\">Test Company Ltd</ix:nonNumeric>
<ix:nonNumeric name=\"bus:UKCompaniesHouseRegisteredNumber\" contextRef=\"ctx2\">12345678</ix:nonNumeric>
<ix:nonNumeric name=\"bus:BalanceSheetDate\" contextRef=\"ctx1\" escape=\"true\">
  <span class=\"styled\">30</span> <span class=\"styled\">June</span> <span class=\"styled\">2023</span>
</ix:nonNumeric>
<ix:nonNumeric name=\"bus:StartDateForPeriodCoveredByReport\" contextRef=\"ctx2\">1 July 2022</ix:nonNumeric>
<ix:nonNumeric name=\"bus:EndDateForPeriodCoveredByReport\" contextRef=\"ctx2\">30 June 2023</ix:nonNumeric>
<ix:nonNumeric name=\"core:DirectorsReport\" contextRef=\"ctx2\" escape=\"true\">
  <p>The directors present their report...</p>
</ix:nonNumeric>
</body></html>'''

result = parse_ixbrl_fast(doc.encode())

# Metadata fields should be text-only
assert result.company_name == 'Test Company Ltd', f'company_name: {result.company_name}'
assert result.company_number == '12345678', f'company_number: {result.company_number}'
assert '<span' not in (result.balance_sheet_date or ''), f'HTML leaked into balance_sheet_date: {result.balance_sheet_date}'
assert '30' in result.balance_sheet_date and '2023' in result.balance_sheet_date, f'balance_sheet_date missing content: {result.balance_sheet_date}'
assert result.period_start_date == '1 July 2022', f'period_start_date: {result.period_start_date}'
assert result.period_end_date == '30 June 2023', f'period_end_date: {result.period_end_date}'

# fact.value for escaped BalanceSheetDate should still contain HTML
date_facts = [f for f in result.text_facts if f.concept == 'BalanceSheetDate']
assert len(date_facts) == 1
assert '<span' in (date_facts[0].value or ''), 'fact.value should retain HTML for escaped elements'

# fact.value for escaped DirectorsReport should still contain HTML
report_facts = [f for f in result.text_facts if f.concept == 'DirectorsReport']
assert len(report_facts) == 1
assert '<p>' in (report_facts[0].value or ''), 'DirectorsReport fact.value should retain HTML'

# Total text facts should include all 6
assert len(result.text_facts) == 6, f'Expected 6 text facts, got {len(result.text_facts)}'

print('ALL PARSER METADATA TESTS PASSED')
"
```

### 3. Parser metadata extraction (ixbrl.py - BeautifulSoup fallback)

Read `backend/parser/ixbrl.py` lines 362-394 and verify the same logic as check 2 but using `elem.get_text(strip=True)` instead of `_get_all_text(elem)`.

- [ ] **3a.** Same `_METADATA_CONCEPTS` set as ixbrl_fast.py
- [ ] **3b.** Uses `elem.get_text(strip=True)` when `fact.escape` is truthy
- [ ] **3c.** Non-metadata facts still appended to `result.text_facts`
- [ ] **3d.** All `nonNumeric` elements processed (the `if not elem.get("name"): continue` guard is correct)

### 4. Data flow integrity - end to end

Trace the full data path and verify no data corruption is introduced:

- [ ] **4a. Context dates**: `resolve_context()` in `bulk_loader.py` (line 228-230) passes `context.instant_date`, `context.start_date`, `context.end_date` through `normalize_date_to_iso()`. These come from XBRL `<xbrli:period>` elements which are normally ISO format. Verify the ISO fast-path means these are returned unchanged in the common case
- [ ] **4b. Filing dates**: `bulk_insert_filing()` (lines 430-432) passes `parsed.balance_sheet_date`, `parsed.period_start_date`, `parsed.period_end_date` through `normalize_date_to_iso()`. These now come from the metadata extraction fix. Verify the data flows cleanly: parser -> ParsedIXBRL fields -> normalize_date_to_iso -> INSERT INTO filings
- [ ] **4c. Numeric fact values**: Verify `f.value` in numeric fact insertion (line 473) is a `float | None` from `parse_numeric_value()` and is NOT affected by any of these changes
- [ ] **4d. Text fact values**: Verify `f.value` in text fact insertion (line 500) stores whatever `parse_text_fact_fast()` returns, including raw HTML for escaped facts. This is intentional - the text_facts table stores the original iXBRL content
- [ ] **4e. Context definition hashing**: The `definition_hash` in `resolve_context()` (line 240) is computed from the normalized date strings. Verify that two contexts with the same dates but different invisible chars will now hash identically (correct deduplication)

### 5. Regression safety

- [ ] **5a. No dataclass changes**: `TextFact`, `NumericFact`, `Context`, `Unit`, `ParsedIXBRL` in `ixbrl.py` are unchanged
- [ ] **5b. No schema changes**: The database schema is unchanged
- [ ] **5c. No import changes**: All imports in the three modified files are unchanged
- [ ] **5d. Batch orchestration unchanged**: `load_all_batches.py` is not modified by these changes
- [ ] **5e. Sequential loader unchanged**: `load_batch_sequential()` in `bulk_loader.py` is not modified
- [ ] **5f. ParsedFile / FileResult unchanged**: The dataclasses for internal pipeline state are not modified

### 6. Edge cases and robustness

- [ ] **6a. Empty escape attribute**: What happens if `escape=""` (empty string, falsy)? Verify both parsers handle this correctly (should take the non-escape path)
- [ ] **6b. Date with only HTML tags**: e.g. `<span class="x"/>` with no text content at all. After stripping tags, this becomes empty -> should return `None`
- [ ] **6c. Date that becomes ISO after cleaning**: e.g. `\u200b2023-02-28\u200f`. After invisible char removal, this should match the ISO regex and return immediately
- [ ] **6d. Very long HTML in date field**: The regex `<[^>]+>` is non-greedy on tag content. Verify it doesn't catastrophically backtrack on malformed HTML (the `[^>]+` pattern cannot backtrack since `>` stops the match)
- [ ] **6e. normalize_date_to_iso return type contract**: Returns `str | None`. Never returns empty string. Verify all code paths

### 7. Database spot-check (if data has already been loaded)

If the database at `database/companies_house.db` has existing data, run these queries to check for data quality issues:

```sql
-- Check for HTML contamination in filing dates
SELECT COUNT(*) as html_dates FROM filings WHERE balance_sheet_date LIKE '%<%';
SELECT COUNT(*) as html_starts FROM filings WHERE period_start_date LIKE '%<%';
SELECT COUNT(*) as html_ends FROM filings WHERE period_end_date LIKE '%<%';

-- Check for non-ISO dates in filings (should all be YYYY-MM-DD or 'unknown')
SELECT balance_sheet_date, COUNT(*) as cnt
FROM filings
WHERE balance_sheet_date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  AND balance_sheet_date != 'unknown'
GROUP BY balance_sheet_date
ORDER BY cnt DESC
LIMIT 20;

-- Check for non-ISO dates in context_definitions
SELECT instant_date, COUNT(*) as cnt
FROM context_definitions
WHERE instant_date IS NOT NULL
  AND instant_date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
GROUP BY instant_date
ORDER BY cnt DESC
LIMIT 20;

-- Check for duplicate context_definitions that differ only by whitespace/invisible chars
-- (these would have been deduped correctly after the fix)
SELECT definition_hash, COUNT(*) as cnt
FROM context_definitions
GROUP BY definition_hash
HAVING cnt > 1
LIMIT 10;
```

---

## Project Structure Reference

```
companywise.io/
  backend/
    db/
      connection.py          # DB connection management, PRAGMAs
      schema.sql             # v2 schema (tables, indexes, views)
    loader/
      __init__.py
      bulk_loader.py         # [MODIFIED] Core loader: date normalization, ZIP processing, DB insertion
    parser/
      __init__.py
      ixbrl.py               # [MODIFIED] BeautifulSoup parser, shared dataclasses
      ixbrl_fast.py          # [MODIFIED] lxml parser (production, 14x faster)
      xbrl.py                # Plain XBRL parser (not involved in these changes)
  scripts/
    load_all_batches.py      # CLI batch loader entry point
    download_archive.py      # Downloads from Companies House
    download_daily.py
    download_monthly.py
  database/
    companies_house.db       # SQLite database
```

## Key Database Tables

- **filings**: `balance_sheet_date`, `period_start_date`, `period_end_date` columns store normalized dates
- **context_definitions**: `instant_date`, `start_date`, `end_date` columns store normalized dates, `definition_hash` used for deduplication
- **numeric_facts**: `value` column stores parsed floats
- **text_facts**: `value` column stores text/HTML content from iXBRL

---

## Summary Checklist

After completing all checks above, provide a final verdict:

- [ ] `normalize_date_to_iso()` correctly handles all known date formats, invisible chars, and HTML contamination
- [ ] Parser metadata extraction uses text-only values for dates/identifiers while preserving raw HTML in `fact.value`
- [ ] Both parsers (lxml and BeautifulSoup) have consistent metadata extraction logic
- [ ] No regressions to numeric fact values, text fact values, context hashing, or batch orchestration
- [ ] End-to-end data flow from iXBRL source to database rows is faithful to the source data
