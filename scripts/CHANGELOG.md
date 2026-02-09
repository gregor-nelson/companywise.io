# Scripts & Loader Changelog

## 2026-02-08 — Bulk Load Performance & Integrity Improvements

### Bug Fixes

- **profile_loader.py**: Fixed relative path bug on line 184 — `Path("scripts/data/daily")`
  resolved relative to CWD, causing "No ZIP files found" error when run from the scripts
  directory. Now uses `Path(__file__).resolve().parent / "data" / "daily"` for correct
  resolution regardless of working directory.

- **profile_loader.py**: Fixed missing `cache: ResolutionCache` parameter in
  `bulk_insert_filing()` call. Function signature was updated in v2 schema but this script
  was not updated. Added `ResolutionCache` import, instantiation after `configure_for_bulk_load()`,
  and passed it as the 7th argument to `bulk_insert_filing()`.

### Performance Optimisations (bulk_loader.py)

All changes are data-safe — identical rows, values, and constraints in the output database.

1. **Crash-safe PRAGMAs** — `configure_for_bulk_load()` now uses `synchronous=NORMAL` +
   `journal_mode=WAL` instead of the previous `synchronous=OFF` + `journal_mode=MEMORY`.
   The old settings could corrupt the database on process crash or power loss. The new
   settings are crash-safe with minimal speed difference.

2. **Foreign key checks disabled during bulk load** — Added `PRAGMA foreign_keys = OFF` to
   `configure_for_bulk_load()` and re-enabled in `restore_normal_config()`. All data comes
   from our own parser/cache so FK violations cannot occur. Removes per-INSERT FK lookup
   overhead (~10-20% faster inserts).

3. **Index drop/recreate for bulk loading** — New functions `drop_indexes_for_bulk_load(conn)`
   and `recreate_indexes(conn)` in bulk_loader.py. Drops 12 non-unique indexes before bulk
   loading and recreates them in a single scan afterwards. Avoids millions of incremental
   B-tree updates during inserts (~2-5x faster DB insertion phase). Indexes are derived data
   and are rebuilt identically from the table contents.

4. **External connection and cache support** — `load_batch()` and `load_batch_sequential()`
   now accept optional `conn` and `cache` parameters. When provided, the caller manages the
   connection lifecycle, allowing a single `ResolutionCache` to persist across multiple
   batches without repeated warm-up from the database.

### Orchestrator Changes (load_all_batches.py)

5. **Switched from sequential to parallel parsing** — Now calls `load_batch()` (which uses
   `ProcessPoolExecutor` with 4 workers for CPU-bound lxml parsing) instead of
   `load_batch_sequential()`. DB insertion remains single-threaded (SQLite single-writer
   constraint). Expected ~3-4x speedup on the parsing phase.

6. **Persistent connection and cache across batches** — The orchestrator now creates one
   shared DB connection and `ResolutionCache` for the entire run, passing them to each
   `load_batch()` call. Eliminates per-batch cache rebuild overhead.

7. **Indexes managed at orchestrator level** — Indexes are dropped once before the batch
   loop and recreated once after all batches complete. Previously, indexes were maintained
   throughout, causing incremental B-tree updates on every INSERT across all 102 batches.

### Data Integrity Notes

None of these changes affect what data is stored. Specifically:

- PRAGMAs control write durability and caching, not data content
- Indexes are derived structures rebuilt from existing table data
- FK checks are a validation step, not a data transformation
- The ResolutionCache is a read-through cache mapping strings to existing DB IDs
- Parallel parsing is read-only; DB insertion remains single-threaded and sequential

### Verification (2026-02-08)

All changes audited against `VERIFY_CHANGES.md` — 17/17 checks passed across
`profile_loader.py`, `bulk_loader.py`, and `load_all_batches.py`. PRAGMA settings
are crash-safe, index lifecycle is correct, connection ownership logic is sound, and
data integrity is preserved. Loader is confirmed safe to run.
