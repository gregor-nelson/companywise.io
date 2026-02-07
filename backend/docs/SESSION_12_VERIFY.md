# Session 12 Verification: Audit Schema v2 Changes

## Your Role

You are auditing code changes made in Session 12. A database schema migration was performed (v1 -> v2). Your job is to read every changed file, cross-reference against the plan, and produce an audit report with findings.

**Do NOT modify any files. This is a read-only audit.**

## What Was Changed (Session 12)

Four files were modified to implement Schema v2 (Prune + Normalize):

1. `backend/db/schema.sql` — Full rewrite. v2 DDL with 3 new lookup tables, slimmed fact tables, convenience views.
2. `backend/db/connection.py` — Small change to `verify_schema()` expected tables set.
3. `backend/loader/bulk_loader.py` — Major rewrite. Added `ResolutionCache` class, resolve-then-insert pipeline.
4. `backend/db/queries.py` — Full rewrite. All fact/context/unit queries use JOINs through lookup tables.

Two files were NOT modified (verify they are untouched):

5. `backend/parser/ixbrl.py` — Parser dataclasses. Should be identical to pre-session state.
6. `backend/parser/ixbrl_fast.py` — Fast parser. Should be identical to pre-session state.

## What To Read

Read these files in order:

1. `docs/SESSION_12_PLAN.md` — The implementation plan. Check that the Phase 0 gate check table is filled in, and all checklist items are checked.
2. `docs/ARCHITECTURE_PROPOSAL.md` — Section 17.6 specifically. The v2 DDL spec.
3. `backend/db/schema.sql` — Compare against Section 17.6 DDL. Check for the Modification 2 fix (`value REAL` nullable, NOT `REAL NOT NULL`).
4. `backend/db/connection.py` — Check that `verify_schema()` expected tables matches the v2 schema (9 tables, no `contexts`/`units`).
5. `backend/loader/bulk_loader.py` — Audit the `ResolutionCache` class and `bulk_insert_filing()` rewrite. Check edge case handling.
6. `backend/db/queries.py` — Audit all rewritten query functions. Verify JOINs are correct.
7. `backend/parser/ixbrl.py` — Verify NOT modified. Read the dataclasses to confirm the loader correctly consumes their fields.

## Audit Checklist

For each file, check:

### schema.sql
- [ ] `schema_version`, `batches`, `companies`, `filings` tables unchanged from v1
- [ ] `concepts` table: `id`, `concept_raw` (UNIQUE), `concept`, `namespace`
- [ ] `dimension_patterns` table: `id`, `dimensions` (UNIQUE), `pattern_hash` (UNIQUE)
- [ ] `context_definitions` table: `id`, `period_type` (CHECK constraint), `instant_date`, `start_date`, `end_date`, `dimension_pattern_id` (FK), `definition_hash` (UNIQUE)
- [ ] `numeric_facts`: only 5 columns — `id`, `filing_id` (FK), `concept_id` (FK), `context_id` (FK), `unit` (TEXT), `value` (REAL, **nullable**)
- [ ] `text_facts`: only 4 columns — `id`, `filing_id` (FK), `concept_id` (FK), `context_id` (FK), `value` (TEXT)
- [ ] No `contexts` table, no `units` table
- [ ] `numeric_facts_v` and `text_facts_v` views present and correctly JOIN through lookup tables
- [ ] Schema version INSERT is 2 (not 1)
- [ ] All indexes from Section 17.6 present

### connection.py
- [ ] `expected_tables` set has exactly 9 entries: schema_version, batches, companies, filings, concepts, dimension_patterns, context_definitions, numeric_facts, text_facts
- [ ] No other changes to the file (get_connection, init_db, PRAGMA settings, DatabaseConnection all unchanged)

### bulk_loader.py
- [ ] `ResolutionCache.__init__` takes `conn`, creates 3 empty dicts, calls `_load_existing()`
- [ ] `_load_existing()` pre-loads from all 3 lookup tables
- [ ] `resolve_concept()` does INSERT on cache miss, caches new ID, splits namespace on `:`
- [ ] `resolve_context()` hashes dimensions JSON with `sort_keys=True`, hashes definition with `|`-separated canonical string, inserts into both `dimension_patterns` and `context_definitions` on miss
- [ ] `bulk_insert_filing()` signature now includes `cache: ResolutionCache` parameter
- [ ] No more inserts into `contexts` or `units` tables
- [ ] Per-filing `unit_map` and `context_map` built before inserting facts
- [ ] Missing `context_ref` → log warning and skip fact (not crash)
- [ ] Missing `unit_ref` → set `unit=None` and log warning
- [ ] `load_batch()` creates `ResolutionCache` after `configure_for_bulk_load()`
- [ ] `load_batch_sequential()` also creates `ResolutionCache`
- [ ] Both pass `cache` to `bulk_insert_filing()`
- [ ] Imports include `hashlib` and `normalize_concept` from `backend.parser.ixbrl`
- [ ] `detect_source_type()`, `parse_file_content()`, `configure_for_bulk_load()`, `restore_normal_config()`, `upsert_company()`, `create_batch()`, `mark_batch_complete()`, `get_batch_stats()` all unchanged

### queries.py
- [ ] `get_company()`, `get_filings_for_company()`, `get_latest_filing()`, `get_filing_by_source()`, `search_companies()` unchanged (query `companies`/`filings` only)
- [ ] `get_numeric_facts()` JOINs through `concepts`, `context_definitions`, `dimension_patterns`
- [ ] `get_text_facts()` same JOIN pattern
- [ ] `get_contexts()` queries `context_definitions` via subquery on both fact tables
- [ ] `get_units()` returns `list[str]` (SELECT DISTINCT unit), not `list[dict]`
- [ ] `get_filing_with_facts()` uses v2 JOINs for all sub-queries
- [ ] `get_facts_by_concept()` JOINs through `concepts` for filtering
- [ ] `get_database_stats()` table list: companies, filings, numeric_facts, text_facts, concepts, dimension_patterns, context_definitions, batches (no contexts, no units)
- [ ] No references to old v1 columns: `value_raw`, `sign`, `decimals`, `scale`, `format`, `escape`, `context_ref`, `unit_ref`, `entity_identifier`, `entity_scheme`, `segment_raw`, `measure_raw`

## Database Verification (run these)

After reading all files, run these queries against the live database to verify the ingestion was successful:

```python
# Row counts
from backend.db.queries import get_database_stats
stats = get_database_stats()
for k, v in stats.items():
    print(f"  {k}: {v}")
```

Expected: companies ~35,067, filings ~35,119, numeric_facts ~1,081,996, text_facts ~1,295,741, concepts ~3,630, dimension_patterns ~3,009, context_definitions ~144,650

```python
# Referential integrity
from backend.db.connection import get_connection
conn = get_connection(read_only=True)
for query, label in [
    ("SELECT COUNT(*) FROM numeric_facts nf LEFT JOIN concepts c ON nf.concept_id = c.id WHERE c.id IS NULL", "orphaned numeric concept refs"),
    ("SELECT COUNT(*) FROM numeric_facts nf LEFT JOIN context_definitions cd ON nf.context_id = cd.id WHERE cd.id IS NULL", "orphaned numeric context refs"),
    ("SELECT COUNT(*) FROM text_facts tf LEFT JOIN concepts c ON tf.concept_id = c.id WHERE c.id IS NULL", "orphaned text concept refs"),
    ("SELECT COUNT(*) FROM text_facts tf LEFT JOIN context_definitions cd ON tf.context_id = cd.id WHERE cd.id IS NULL", "orphaned text context refs"),
]:
    print(conn.execute(query).fetchone()[0], label)
conn.close()
```

All should be 0.

```python
# Convenience views
conn = get_connection(read_only=True)
print("numeric_facts_v:", conn.execute("SELECT COUNT(*) FROM numeric_facts_v").fetchone()[0])
print("text_facts_v:", conn.execute("SELECT COUNT(*) FROM text_facts_v").fetchone()[0])
# Spot check
for row in conn.execute("SELECT concept, value, unit, period_type FROM numeric_facts_v LIMIT 3").fetchall():
    print(f"  {row['concept']} = {row['value']} {row['unit']} ({row['period_type']})")
conn.close()
```

```python
# Database size
from pathlib import Path
p = Path("database/companies_house.db")
print(f"Size: {p.stat().st_size / (1024*1024):.1f} MB")
```

Expected: ~255 MB (was 1,624 MB in v1)

## Output Format

Produce an audit report with these sections:

1. **Summary** — Pass/fail for each file, overall assessment
2. **Findings** — Any issues, discrepancies, or concerns found (numbered)
3. **Schema DDL Check** — Does schema.sql match Section 17.6 with Modification 2 applied?
4. **Loader Audit** — Is the ResolutionCache correct? Any edge cases missed?
5. **Query Audit** — Are all JOINs correct? Any missing columns or wrong table references?
6. **Database Verification** — Row counts, integrity checks, size confirmation
7. **Risk Assessment** — Any potential issues for the full 103-batch load?

Rate each finding as: CRITICAL (blocks further work), WARNING (should fix but not blocking), or INFO (observation only).
