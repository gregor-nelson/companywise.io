Review and verify the changes documented in `scripts/CHANGELOG.md` (2026-02-08 entry). Check the following across three files — do NOT make any changes, only report issues:

## 1. `scripts/profile_loader.py`
- Line 184 uses `Path(__file__).resolve().parent / "data" / "daily"` (not a relative `Path("scripts/data/daily")`)
- `ResolutionCache` is imported from `backend.loader.bulk_loader`
- A `ResolutionCache(conn)` is instantiated after `configure_for_bulk_load(conn)` in `profile_db_only()`
- `bulk_insert_filing()` is called with 7 arguments, the last being `cache`

## 2. `backend/loader/bulk_loader.py`
- `configure_for_bulk_load()` uses `journal_mode=WAL`, `synchronous=NORMAL`, and `foreign_keys=OFF` (NOT `synchronous=OFF` or `journal_mode=MEMORY`)
- `restore_normal_config()` re-enables `foreign_keys=ON`
- `_BULK_LOAD_INDEXES` list exists with 12 entries covering filings, concepts, context_definitions, numeric_facts, and text_facts
- `drop_indexes_for_bulk_load(conn)` and `recreate_indexes(conn)` functions exist and iterate over `_BULK_LOAD_INDEXES`
- `load_batch()` signature accepts optional `conn` and `cache` parameters
- `load_batch_sequential()` signature accepts optional `conn` and `cache` parameters
- Both functions use `owns_conn = conn is None` to decide whether to manage the connection lifecycle (configure/restore/close only when `owns_conn is True`)

## 3. `scripts/load_all_batches.py`
- Imports `load_batch` (NOT `load_batch_sequential`), plus `ResolutionCache`, `configure_for_bulk_load`, `drop_indexes_for_bulk_load`, `recreate_indexes`, `restore_normal_config`
- Creates a shared `conn` and `ResolutionCache` before the batch loop
- Calls `drop_indexes_for_bulk_load(conn)` before the loop
- Calls `load_batch(batch_path, conn=conn, cache=cache)` inside the loop
- Calls `recreate_indexes(conn)` after the loop
- `finally` block calls `restore_normal_config(conn)` and `conn.close()`

Report any discrepancies, missing pieces, or logic errors.
