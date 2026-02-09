# Verification Prompt: Batch Loader Reliability Fixes (2026-02-09)

Paste everything below the line into a fresh Claude Code session.

---

## Context

Three sessions have touched the batch loading pipeline for Companies House financial data:

1. **Session 1 (2026-02-08):** Added performance optimisations — shared connection, index drop/recreate, parallel parsing. Documented in `scripts/CHANGELOG.md` under the 2026-02-08 entry.

2. **Session 2 (2026-02-08):** "Verified" session 1's changes, declared "17/17 checks passed". That verification only tested the happy path and missed all error-handling bugs.

3. **Session 3 (2026-02-09):** Audited the full pipeline, found 3 critical + 3 high-severity bugs, produced a fix plan at `C:\Users\gregor\.claude\plans\hashed-coalescing-goblet.md`.

4. **Session 4 (2026-02-09):** Independently audited the plan, approved it with two amendments (add `conn.rollback()` before cleanup; fix bare `except:pass` in `bulk_loader.py` too), then implemented all 6 fixes plus the amendments.

**You are Session 5.** Your job is to verify Session 4's implementation is correct.

## What was changed (summary)

### `scripts/load_all_batches.py`
- Added `import sqlite3`
- Added `cleanup_incomplete_batch(conn, filename)` — deletes incomplete batch + associated filings/facts in FK-safe order
- Added `check_connection_health(conn)` — tries `SELECT 1`, returns bool
- **Batch loop:** calls `cleanup_incomplete_batch()` before each `load_batch()` (Fix 1)
- **Except block:** calls `conn.rollback()` then `cleanup_incomplete_batch()` after failure (Fix 3), then checks connection health and recreates if broken (Fix 6)
- **Finally block:** `recreate_indexes()` moved here with own try/except (Fix 4); bare `except:pass` replaced with `except Exception as e: logger.warning(...)` (Fix 5)

### `backend/loader/bulk_loader.py`
- `resolve_context()`: added `normalize_date_to_iso()` calls on `instant_date`, `start_date`, `end_date` before hashing AND before INSERT (Fix 2)
- Two instances of bare `except: pass` (in `load_batch()` and `load_batch_sequential()` finally blocks) replaced with `except Exception as e: logger.warning(...)` (Fix 5)

### `scripts/CHANGELOG.md`
- New 2026-02-09 entry documenting all 6 fixes
- Retraction note added to the 2026-02-08 verification claim

## Your verification checklist

Do NOT make any code changes. This is read-only verification.

### A. Read all source files

Read each of these files in full:
- `scripts/load_all_batches.py`
- `backend/loader/bulk_loader.py`
- `backend/db/schema.sql`
- `backend/db/connection.py`
- `backend/parser/ixbrl.py`
- `backend/parser/ixbrl_fast.py`
- `scripts/CHANGELOG.md`
- `C:\Users\gregor\.claude\plans\hashed-coalescing-goblet.md` (the original plan)

### B. Fix-by-fix verification (6 checks)

For each fix, verify:

**Fix 1 — Stuck batch on partial failure:**
- [ ] `cleanup_incomplete_batch()` queries `batches WHERE filename = ? AND processed_at IS NULL`
- [ ] Deletes in correct FK-safe order: numeric_facts → text_facts → filings → batches
- [ ] Uses `batch_id` from the query (not hardcoded or assumed)
- [ ] Commits after cleanup
- [ ] Called BEFORE `load_batch()` in the batch loop (pre-retry path)
- [ ] Does NOT touch shared lookup tables (concepts, context_definitions, dimension_patterns, companies)

**Fix 2 — Context date normalization:**
- [ ] Three local variables (`instant`, `start`, `end`) assigned via `normalize_date_to_iso()`
- [ ] All three used in the hash construction (`def_parts` join)
- [ ] All three used in the INSERT statement (not `context.instant_date` etc.)
- [ ] `normalize_date_to_iso` handles `None` input (returns `None`) — check the function
- [ ] No other references to `context.instant_date` / `start_date` / `end_date` remain in `resolve_context()` after the normalization point

**Fix 3 — Cleanup on batch failure:**
- [ ] `conn.rollback()` is called BEFORE `cleanup_incomplete_batch()` in the except block
- [ ] The rollback is wrapped in its own try/except (connection may already be broken)
- [ ] `cleanup_incomplete_batch()` is wrapped in its own try/except
- [ ] Cleanup failure logs a warning but does NOT re-raise or mask the original error

**Fix 4 — Indexes in finally:**
- [ ] `recreate_indexes(conn)` is NO LONGER in the try block
- [ ] `recreate_indexes(conn)` IS in the finally block
- [ ] It is the FIRST operation in the finally block (before `restore_normal_config`)
- [ ] Wrapped in its own try/except so failure doesn't prevent config restore / conn.close()

**Fix 5 — Bare except:pass eliminated:**
- [ ] `load_all_batches.py` finally block: `except Exception as e:` with logging (not bare `except:`)
- [ ] `bulk_loader.py` `load_batch()` finally block: same pattern
- [ ] `bulk_loader.py` `load_batch_sequential()` finally block: same pattern
- [ ] None of the three catch `BaseException` or use bare `except:`
- [ ] All three log the exception (not silently discard)

**Fix 6 — Connection recovery:**
- [ ] `check_connection_health()` exists and uses `SELECT 1`
- [ ] Called AFTER cleanup in the except block (not before)
- [ ] If unhealthy: closes old connection (wrapped in try/except), calls `get_connection()`, calls `configure_for_bulk_load()`, creates new `ResolutionCache`
- [ ] Does NOT re-drop indexes (they're already dropped — verify this reasoning is sound)
- [ ] The new connection gets `row_factory = sqlite3.Row` from `get_connection()` → `_configure_connection()` — confirm by reading `connection.py`

### C. Cross-cutting checks

- [ ] `load_all_batches.py` compiles: run `python -m py_compile scripts/load_all_batches.py`
- [ ] `bulk_loader.py` compiles: run `python -m py_compile backend/loader/bulk_loader.py`
- [ ] No remaining bare `except:` in either file (search for `except:` without `Exception`)
- [ ] The `conn` variable in `load_all_batches.py` is reassigned in the except block (Fix 6) but the finally block still references `conn` — verify this works because Python closures rebind the local variable
- [ ] `cleanup_incomplete_batch` uses `row["id"]` — verify `row_factory = sqlite3.Row` is set on the connection (it is, via `get_connection()` → `_configure_connection()`)
- [ ] `CHANGELOG.md` 2026-02-09 entry accurately describes all 6 fixes
- [ ] `CHANGELOG.md` 2026-02-08 entry has the retraction note about incomplete verification
- [ ] The `--dry-run` path (returns early before the try block) is unaffected by all changes

### D. Negative checks — things that should NOT have changed

- [ ] `backend/db/schema.sql` — unchanged
- [ ] `backend/db/connection.py` — unchanged
- [ ] `backend/parser/ixbrl.py` — unchanged
- [ ] `backend/parser/ixbrl_fast.py` — unchanged
- [ ] `backend/db/queries.py` — unchanged
- [ ] No new files were created (other than this verification spec)
- [ ] `load_batch()` function signature in `bulk_loader.py` — unchanged
- [ ] `create_batch()`, `mark_batch_complete()` — unchanged
- [ ] `ResolutionCache.__init__`, `_load_existing`, `resolve_concept` — unchanged

### E. Edge case analysis

- [ ] What happens if `cleanup_incomplete_batch()` is called for a filename with NO incomplete batch? (Should be a no-op — verify the `if row is None: return` guard)
- [ ] What happens if `cleanup_incomplete_batch()` is called for a filename that was ALREADY completed? (The `processed_at IS NULL` filter should exclude it — verify)
- [ ] What if the connection dies during `cleanup_incomplete_batch()`? (The outer try/except in the batch loop's except block catches this — verify)
- [ ] What if `recreate_indexes()` partially succeeds in the finally block? (`CREATE INDEX IF NOT EXISTS` is idempotent, so next run recovers — verify)
- [ ] What if `normalize_date_to_iso()` can't parse a date? (It logs a warning and returns the raw string — verify this still produces a valid hash and INSERT)

## Output format

Produce a structured report:

```
## Verification Results — Session 5

### Fix 1: [PASS/FAIL] — Stuck batch cleanup
<details if FAIL>

### Fix 2: [PASS/FAIL] — Context date normalization
<details if FAIL>

### Fix 3: [PASS/FAIL] — Failure cleanup with rollback
<details if FAIL>

### Fix 4: [PASS/FAIL] — Indexes in finally
<details if FAIL>

### Fix 5: [PASS/FAIL] — Bare except eliminated
<details if FAIL>

### Fix 6: [PASS/FAIL] — Connection recovery
<details if FAIL>

### Cross-cutting: [PASS/FAIL]
<details if FAIL>

### Negative checks: [PASS/FAIL]
<details if FAIL>

### Edge cases: [PASS/FAIL]
<details if FAIL>

### Verdict: [ALL CLEAR / ISSUES FOUND]
<summary>
```

If you find ANY issues — even minor ones — report them clearly with file, line number, and what's wrong. Do not soften findings. Do not skip checks to save time.
