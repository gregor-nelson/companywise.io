# Scripts & Loader Changelog

## 2026-02-09 — Batch Loader Reliability & Data Integrity Fixes

An independent audit found 3 critical and 3 high-severity bugs in the error-handling
paths introduced by the 2026-02-08 performance optimisations. The previous verification
only tested the happy path; none of these failure scenarios were exercised.

### Critical Fixes

1. **Stuck batch on partial failure** (load_all_batches.py) — `create_batch()` commits a
   `batches` row (UNIQUE filename) before loading begins. If `load_batch()` then fails,
   `mark_batch_complete()` never runs. On retry the UNIQUE constraint blocks re-insertion,
   permanently sticking the batch. Added `cleanup_incomplete_batch()` which removes the
   incomplete batch row and all associated filings/facts in FK-safe order. Called both
   before each `load_batch()` (pre-retry) and in the except block (immediate cleanup).

2. **Context dates not ISO-normalized** (bulk_loader.py) — `resolve_context()` stored raw
   parser dates (e.g. "28 February 2023") into `context_definitions` without normalizing.
   Filing-level dates were already normalized. The same period expressed in different
   text formats created duplicate lookup rows, defeating deduplication. Now calls
   `normalize_date_to_iso()` on all three date fields before both hashing and INSERT.

3. **No cleanup on batch failure** (load_all_batches.py) — When `load_batch()` threw an
   exception, partially-committed filings and facts stayed in the database with no
   cleanup. The except block now calls `conn.rollback()` to discard uncommitted chunk
   data, then `cleanup_incomplete_batch()` to remove previously committed partial data.

### High-Severity Fixes

4. **Indexes lost on crash** (load_all_batches.py) — `recreate_indexes()` was inside the
   `try` block, not `finally`. A crash between `drop_indexes_for_bulk_load()` and
   `recreate_indexes()` left all 12 non-unique indexes missing until the next run.
   Moved `recreate_indexes()` to the `finally` block with its own error handling.

5. **Bare `except: pass` swallowing all errors** (load_all_batches.py, bulk_loader.py) —
   Three instances of `except: pass` caught `SystemExit`, `KeyboardInterrupt`, and gave
   zero error visibility. Replaced all with `except Exception as e: logger.warning(...)`.

6. **No connection recovery after failure** (load_all_batches.py) — One connection for the
   entire run meant a corrupted connection after a batch failure would cascade to all
   subsequent batches. Added `check_connection_health()` that runs `SELECT 1` after each
   failure. If unhealthy, the connection is closed and recreated with bulk-load PRAGMAs,
   and the `ResolutionCache` is rebuilt from the database.

### Files Modified

| File | Fixes |
|------|-------|
| `scripts/load_all_batches.py` | #1, #3, #4, #5, #6 |
| `backend/loader/bulk_loader.py` | #2, #5 |
| `scripts/CHANGELOG.md` | This entry |

---

## 2026-02-08 — Bulk Load Performance & Integrity Improvements

> **Note (2026-02-09):** The verification below was found to be incomplete — it only
> checked the happy path. Error-handling paths had 6 bugs (3 critical, 3 high). See
> the 2026-02-09 entry above for the fixes. The referenced `VERIFY_CHANGES.md` no
> longer exists.

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
