# Changelog: CompanyWise.io

**Project:** Freelancer client vetting tool — "Will this company pay my invoice?"
**Started:** 2026-02-05
**Last Updated:** 2026-02-07

---

## Uncommitted — Cleanup & Hardening Pass (2026-02-07)

**Backend**

| File | Change | Details |
|------|--------|---------|
| `backend/loader/bulk_loader.py` | Modified | Added `normalize_date_to_iso()` handling 6 date formats (ISO, long text, dot notation, slash, dash, US text). Changed 3 `ResolutionCache` INSERTs to `INSERT OR IGNORE` with fallback SELECT to prevent duplicate key errors on repeated loads. Applied date normalization to filing insert fields (`balance_sheet_date`, `period_start_date`, `period_end_date`). Added `import re`. |

**Frontend**

| File | Change | Details |
|------|--------|---------|
| `frontend/src/js/components/hero/hero.js` | Modified | Added `escapeHtml()` on `company.name`, `company.number`, `company.type`, `company.sicCode` for XSS protection. Changed `company.flags` to `(company.flags \|\| [])` for null safety. |
| `frontend/src/js/components/modal/modal.js` | Modified | Added `creditWalletChanged` listener to re-render modal body when credits change (live unlock of premium sections after in-modal purchase). Added `escapeHtml()` on company name, number, type, sicCode, address, director name/role. Changed `company.flags` to `(company.flags \|\| [])`. |
| `frontend/src/js/components/premium-report/premium-report.js` | Modified | Added local `escapeHtml()` utility. Applied to company name, number, type, address, director name/role for XSS protection. |
| `frontend/src/js/components/purchase-dialog/purchase-dialog.js` | Modified | Added "Go to Report" button on delivery step when `options.returnTo` is set (spends credit and navigates to premium report). Adjusted Done button styling when returnTo present. |
| `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js` | Modified | Removed `renderInline()` and `removeInline()` methods (72 lines dead code). Added `escapeHtml()` on company name. Changed "Buy Credits" button to pass `{ returnTo: company }` to purchase dialog. Added `creditWalletChanged` listener to auto-dismiss when credits available. |
| `frontend/src/js/components/credit-badge/credit-badge.js` | Modified | Added `destroy(instance)` method to remove badge instances and clean up DOM. |
| `frontend/src/js/components/header/header.js` | Modified | Changed mobile drawer "Get started" link from `/signup` to `#` so `handleNavigation()` can intercept it to open purchase dialog. |

**Documentation**

| File | Change | Details |
|------|--------|---------|
| `backend/docs/ARCHITECTURE_PROPOSAL.md` | Deleted | Replaced by `backend/docs/ARCHITECTURE.md` |
| `backend/docs/DATA_SPECIFICATION.md` | Deleted | Replaced by `backend/docs/SPEC.md` |
| `backend/docs/SESSION_12_VERIFY.md` | Deleted | One-time verification record, no longer needed |
| `backend/docs/ARCHITECTURE.md` | Created | Rewritten architecture reference (v1.0.0, ~553 lines), more concise than old proposal |
| `backend/docs/SPEC.md` | Created | Cleaned data specification (5 audits, ~906 lines) |
| `frontend/docs/PAYMENT-FLOW-HANDOFF.md` | Deleted | Consolidated into `frontend/specs/payment/PAYMENT-FLOW.spec.md` |
| `frontend/docs/PAYMENT-FLOW-KICKOFF.md` | Deleted | Consolidated into `frontend/specs/payment/PAYMENT-FLOW.spec.md` |
| `frontend/specs/payment/PAYMENT-FLOW.spec.md` | Created | Combined payment flow specification (~326 lines) |
| `frontend/docs/MVP-SPEC.md` | Rewritten | Now a comprehensive frontend spec covering file structure, architecture, all components, APIs, dependency graph, mock data, user journey, and design tokens (~529 lines, down from ~891) |

---

## Session 12: Schema v2 — Prune + Normalize (2026-02-07)

**Commit:** `db67492` — "Payment Token Based Hash Poc Added, Static Approach"

### Backend — 84% Database Size Reduction

**Problem:** v1 schema stored every XBRL attribute and produced 1.62 GB from 1 batch (35,119 filings). Extrapolated to 103 batches: ~165 GB.

**Solution:** Schema v2 drops XBRL rendering plumbing and normalizes repeated data into lookup tables.

**Blocker Investigation (Phase 0):**

| Blocker | Investigation | Result |
|---------|--------------|--------|
| `entity_identifier` safe to drop? | Queried all 3.15M contexts. 3,148,955 match `company_number` exactly. 2,002 contain the scheme URL (parsing artifact in 155 filings). 0 contain a different company number. | Safe to drop |
| `value REAL` stays nullable? | Design correction — `value_raw` being dropped so nullable `value` is the safety valve for unparseable values | Confirmed |
| Source ZIP archival? | Policy decision | Deferred |

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/db/schema.sql` | Full rewrite | v2 DDL: 3 new lookup tables (`concepts`, `dimension_patterns`, `context_definitions`), 2 tables eliminated (`contexts`, `units`), slimmed fact tables, 2 convenience views (`numeric_facts_v`, `text_facts_v`), 12 indexes |
| `backend/db/connection.py` | Modified | `verify_schema()` updated: removed `contexts`/`units`, added `concepts`/`dimension_patterns`/`context_definitions` |
| `backend/loader/bulk_loader.py` | Major rewrite | Added `ResolutionCache` class with 3 caches. Resolve-then-insert pipeline. Per-filing transient `unit_map`/`context_map`. Edge case handling for missing `context_ref` and `unit_ref`. Added `hashlib` and `normalize_concept` imports. |
| `backend/db/queries.py` | Full rewrite | All queries rewritten with JOINs through lookup tables. `get_contexts()` queries `context_definitions` via subquery. `get_units()` returns `list[str]`. `get_facts_by_concept()` JOINs through `concepts`. `get_database_stats()` updated. |

**Verification Results:**

| Metric | v1 | v2 |
|--------|-----|-----|
| Database size | 1,624 MB | 255 MB |
| companies | — | 35,067 (exact match) |
| filings | — | 35,119 (exact match) |
| numeric_facts | — | 1,081,996 (exact match) |
| text_facts | — | 1,295,741 (exact match) |
| concepts | — | 3,630 |
| dimension_patterns | — | 3,009 |
| context_definitions | — | 144,650 |
| Orphaned refs | — | 0 |

**Scale Projection:**

| Batches | v1 | v2 |
|---------|-----|-----|
| 1 batch | 1,624 MB | 255 MB |
| 103 batches | ~165 GB | ~26 GB |

### Frontend — Payment System (PoC)

**New Components:**

| File | Details |
|------|---------|
| `frontend/src/js/components/credit-wallet/credit-wallet.js` | Lamport hash-chain credit system. Client-side, localStorage persistence. Demo/PoC only. |
| `frontend/src/js/components/purchase-dialog/purchase-dialog.js` + CSS | 3-step checkout modal (tier selection, payment form, delivery). 3 tiers: Starter (10 credits/£5), Standard (25/£10), Pro (60/£20). |
| `frontend/src/js/components/credit-badge/credit-badge.js` + CSS | Header credit balance pill widget. |
| `frontend/src/js/components/upgrade-prompt/upgrade-prompt.js` + CSS | Premium upsell mini-dialog shown when free users hit premium content. |
| `frontend/src/js/components/premium-report/premium-report.js` + CSS | Full premium report page component (~1,008 lines CSS). |

**Modified Components:**

| File | Change |
|------|--------|
| `header.js` | Added credit badge integration and "Buy Credits" button |
| `hero.js` | Added "Get Premium Report" button with 3-way wallet check |
| `modal.js` | Added premium-gated sections (directors, CCJs) with blur overlay |
| `pricing.js` | Added purchase dialog integration on CTA buttons |
| `home.html` | Added script/link tags for new components |
| `premium-report.html` | Built out full premium report page |

**Documentation Created:**

| File | Details |
|------|---------|
| `frontend/docs/PAYMENT-FLOW-HANDOFF.md` | Payment flow handoff documentation |
| `frontend/docs/PAYMENT-FLOW-KICKOFF.md` | Payment flow kickoff notes |
| `backend/docs/SESSION_12_VERIFY.md` | Schema v2 verification results (144 lines) |

---

## Sessions 1–8: Initial Build (2026-02-05)

**Commit:** `ecaa267` — "First Commit"

All sessions below were included in a single initial commit containing 60 files and 22,361 lines.

### Session 8: Storage Optimization + Batch Loading Script

**Problem:** After loading 1 batch (35,119 files), database was 6.8 GB. Full load would require 600+ GB.

**Root Cause:** `segment_raw` column in `contexts` table consumed 3.61 GB (53% of DB) — re-serialized XML with redundant namespace declarations repeated 3.3M times, averaging 1,235 chars each.

**Solution:** Removed `segment_raw` storage from parser. The `dimensions` JSON column already captures all meaningful segment data.

| Metric | Before | After |
|--------|--------|-------|
| DB size (1 batch) | 6.8 GB | 1.6 GB |
| Projected full load | ~600 GB | ~160-200 GB |

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/parser/ixbrl_fast.py` | Modified | Removed `segment_raw` storage |
| `scripts/load_all_batches.py` | Created | Resumable batch loader with `--dry-run`, `--limit`, skip-already-loaded, graceful Ctrl+C handling, progress/ETA logging |

### Session 7: Bulk Loader Performance Optimization

**Problem:** Original loader processed ~400 files/min. With 2.8M total files: ~117 hours.

**Root Cause:** Profiling revealed 95% of time was in parsing (BeautifulSoup), not database operations.

**Solution:** Created `backend/parser/ixbrl_fast.py` — drop-in replacement using `lxml.etree` directly with single-pass element iteration and native namespace handling.

| Metric | BeautifulSoup | lxml.etree | Improvement |
|--------|---------------|------------|-------------|
| Parsing | 367 files/min | 6,078 files/min | 16.6x |
| Database | 9,353 files/min | 15,970 files/min | 1.7x |
| Combined | ~400 files/min | 3,784 files/min | 9.5x |

**Real-World Test:** 35,119 files in 9 min 17 sec (3,784 files/min), 0 failures.

**Bug Fix:** Discovered duplicate fact insertion bug in BeautifulSoup parser. `find_all_ns()` was finding each element 3x due to redundant namespace variations. New parser finds unique elements only.

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/parser/ixbrl_fast.py` | Created | Fast lxml.etree parser (16x faster) |
| `backend/loader/bulk_loader.py` | Modified | Switched to fast parser |
| `scripts/profile_loader.py` | Created | Profiling script for performance analysis |
| `scripts/compare_parsers.py` | Created | Parser comparison/validation script |

### Session 6: Query Layer + Performance Analysis

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/db/queries.py` | Created | 12 query functions: `get_company`, `get_filings_for_company`, `get_latest_filing`, `get_numeric_facts`, `get_text_facts`, `get_contexts`, `get_units`, `get_filing_with_facts`, `get_filing_by_source`, `search_companies`, `get_facts_by_concept`, `get_database_stats` |
| `backend/loader/bulk_loader.py` | Modified | Batch commits (every 500 files), `executemany()` for bulk inserts, optimized PRAGMAs during load (`synchronous=OFF`, `journal_mode=MEMORY`), `--sequential` mode option |

### Session 5: Bulk Loader Implementation

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/loader/bulk_loader.py` | Created | Full loading pipeline: `load_batch(zip_path)`, `process_content()`, `process_cic_zip()`, `upsert_company()`, `insert_filing/contexts/units/facts()`, CLI interface. Commits per file for recoverability. Extracts company number from filename as fallback. Nested ZIP paths use `outer.zip!inner/path.xhtml` format. Errors logged but don't stop processing. |

### Session 4: numcommadot Bug Fix

**Bug:** `parse_numeric_value()` in `backend/parser/ixbrl.py` — `ixt:numcommadot` format incorrectly treated comma as decimal separator.

**Fix:** UK Companies House data uses comma as thousands separator regardless of format attribute. Simplified to always remove commas.

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/parser/ixbrl.py` | Modified | Lines 126-128: `text = text.replace(",", "")` — always strip commas. `16,754` now correctly parses to `16754.0` (was returning `None`). |

### Session 3: iXBRL Parser Implementation

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/parser/ixbrl.py` | Created | Full iXBRL parser using BeautifulSoup with lxml-xml. Dataclasses: `Context`, `Unit`, `NumericFact`, `TextFact`, `ParsedIXBRL`. Extracts contexts (with explicit + typed dimensions), units, numeric facts (with sign/scale/format handling), text facts. Dual-value storage (`concept_raw` + `concept`). Namespace normalization. CLI test mode. |

**Test Results:**
- Simple file: 16 contexts, 1 unit, 36 numeric facts, 57 text facts
- Complex file: 70 contexts, 3 units, 660 numeric facts, 204 text facts (42 with `sign="-"`)

### Session 2: Schema Implementation

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/db/schema.sql` | Created | v1 DDL: 8 tables (`schema_version`, `batches`, `companies`, `filings`, `numeric_facts`, `text_facts`, `contexts`, `units`), 12 indexes, dual-value storage, CHECK constraints, foreign keys |
| `backend/db/connection.py` | Created | `get_connection()` with PRAGMAs (WAL, foreign_keys, 64MB cache, synchronous NORMAL), `init_db()` (idempotent), `verify_schema()`, `DatabaseConnection` context manager. DB location: `database/companies_house.db` |

### Session 1: Codebase Audit & Scaffolding

**Files Changed:**

| File | Change | Details |
|------|--------|---------|
| `backend/__init__.py` | Created | Package marker |
| `backend/db/__init__.py` | Created | Package marker |
| `backend/db/schema.sql` | Created | Placeholder |
| `backend/db/connection.py` | Created | Placeholder |
| `backend/db/queries.py` | Created | Placeholder |
| `backend/parser/__init__.py` | Created | Package marker |
| `backend/parser/ixbrl.py` | Created | Placeholder |
| `backend/parser/xbrl.py` | Created | Placeholder |
| `backend/loader/__init__.py` | Created | Package marker |
| `backend/loader/bulk_loader.py` | Created | Placeholder |

**Audit Findings:** Verified `DATA_SPECIFICATION.md` aligns with `ARCHITECTURE_PROPOSAL.md` schema. Confirmed `database/` and `backend/` directories were empty. Schema design sound with dual-value storage and full attribute preservation. 5 data audits provided high confidence in format understanding.

### Frontend MVP (included in initial commit)

Built as a static vanilla JS application with no build step. Tailwind CSS via CDN, Jost font, Phosphor Icons.

**Files Created:**

| File | Details |
|------|---------|
| `frontend/src/js/components/header/header.js` + CSS | Fixed nav with mobile drawer, glass blur effect |
| `frontend/src/js/components/hero/hero.js` + CSS | Company search with mock data, traffic-light verdict, animated illustration |
| `frontend/src/js/components/modal/modal.js` + CSS | Free report modal with financial summary, key metrics, verdict |
| `frontend/src/js/components/pricing/pricing.js` + CSS | 4-tier pricing grid |
| `frontend/src/js/components/how-it-works/how-it-works.js` + CSS | 3-step explainer section |
| `frontend/src/js/components/what-we-check/` + CSS | 12-signal grid with sub-components (signal card, detail panel) |
| `frontend/src/js/components/why-us/why-us.js` + CSS | Comparison table |
| `frontend/src/js/components/faq/faq.js` + CSS | FAQ accordion |
| `frontend/src/js/components/call-to-action/cta.js` + CSS | Bottom CTA section |
| `frontend/src/js/components/footer/footer.js` + CSS | Reusable footer |
| `frontend/src/js/data/mock-data.js` | 6 sample companies with financial data |
| `frontend/src/js/main.js` | Scroll reveal, counters, header/footer init |
| `frontend/src/styles/main.css` | Design system tokens and shared styles |
| `frontend/src/pages/Home/home.html` | Landing page |
| `frontend/src/pages/Report/Free/free-report.html` | Free report page (placeholder) |
| `frontend/src/pages/Report/Premium/premium-report.html` | Premium report page (placeholder) |

**Architecture:** Self-initializing IIFE components communicating via custom DOM events and `window.CompanyWise*` global namespace. No framework, no bundler.

### Scripts & Data Acquisition (included in initial commit)

| File | Details |
|------|---------|
| `scripts/download_daily.py` | Downloads daily ZIP files from Companies House |
| `scripts/download_monthly.py` | Downloads monthly archive ZIPs |
| `scripts/download_archive.py` | Downloads historical archives |
| `scripts/load_all_batches.py` | Resumable batch loading script |
| `scripts/profile_loader.py` | Performance profiling for loader |
| `scripts/compare_parsers.py` | BeautifulSoup vs lxml parser comparison |

**Data Acquired:** 103 daily ZIP files (2023-12-01 to 2026-02-05), ~1.4M+ files total.

---

## Summary of Current State

**Backend (Phase 1 — Complete):**
- v2 schema with 3 lookup tables, 84% storage reduction
- Fast lxml parser at 3,784 files/min
- 1 batch loaded and verified (255 MB), 102 remaining (~26 GB projected)
- Query layer with JOINs through lookup tables

**Frontend (MVP — Complete):**
- Static vanilla JS landing page with company search
- Free report modal with premium-gated sections
- Payment PoC: Lamport hash-chain credit wallet (client-side only)
- Premium report page
- XSS protections applied across components

**Reference Documents:**
- `backend/docs/ARCHITECTURE.md` — Database architecture reference (v1.0.0)
- `backend/docs/SPEC.md` — Data specification (5 audits)
- `frontend/docs/MVP-SPEC.md` — Frontend specification
- `frontend/specs/payment/PAYMENT-FLOW.spec.md` — Payment flow specification
