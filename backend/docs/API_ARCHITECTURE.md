# CompanyWise — API Layer Architecture

**Version:** 0.2.0
**Status:** Draft — Pre-Implementation
**Date:** 2026-02-07

---

## 1. Overview

A Python HTTP API that connects the existing SQLite backend to the vanilla JS frontend. Currently the frontend uses hardcoded mock data (`mock-data.js`). This API replaces that with live data from the Companies House database.

### Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Minimal file count** | Solo dev — fewer files to navigate, grep, and maintain |
| **No unnecessary layers** | Routes call query functions directly. No service layer for 5 endpoints. |
| **Plain dicts, no Pydantic** | Query functions already return dicts. FastAPI serializes them. Add schemas later only if auto-docs prove useful. |
| **Existing DB layer untouched** | `queries.py`, `connection.py`, `schema.sql` stay as-is |
| **Frontend-agnostic response shapes** | Return clean, logical data. Frontend adapts to API, not the other way around. |

---

## 2. Technology Choice

**FastAPI** on **uvicorn**.

| Criterion | Why FastAPI |
|-----------|------------|
| Simplicity | Routes are decorated functions returning dicts |
| Performance | Fastest mainstream Python framework |
| Solo-dev friendly | Auto-generated docs at `/docs` for free |
| Future-proofing | Middleware for auth, rate limiting, caching — added later without restructuring |

### Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |

No ORM. No Pydantic schemas (for MVP). Direct SQL via existing `queries.py`.

---

## 3. Project Structure

```
backend/
├── api/                        <- NEW (2 files)
│   ├── app.py                  <- FastAPI app, CORS, all routes (~150-250 lines)
│   └── risk_engine.py          <- Scoring logic, flags, recommendation
├── db/                         <- EXISTING — untouched
│   ├── connection.py
│   ├── queries.py
│   └── schema.sql
├── parser/                     <- EXISTING — untouched
├── loader/                     <- EXISTING — untouched
└── docs/
```

**2 new files.** If `app.py` grows past ~300 lines, split then — based on actual pain, not predicted architecture.

---

## 4. API Endpoints

### 4.1 Health Check

```
GET /api/health
```

Passes through `get_database_stats()`. Returns row counts, date range, schema version.

### 4.2 Company Search

```
GET /api/search?q={query}&limit={limit}
```

Wraps `search_companies()`. The `q` parameter is wrapped in `%` wildcards for SQL LIKE matching. Returns list of `{ company_number, name, jurisdiction }`.

### 4.3 Company Profile

```
GET /api/company/{number}
```

Calls `get_company()` + `get_filings_for_company()`. Returns company info with list of all filings (dates, source type).

### 4.4 Company Report

```
GET /api/report/{number}
```

The main endpoint. Assembles a complete report from the latest filing:

1. `get_company()` — company info
2. `get_latest_filing()` — most recent filing metadata
3. `get_numeric_facts(filing_id)` — all financial values
4. `get_text_facts(filing_id)` — all metadata/text values

**Response shape — financials grouped by concept, current vs previous separated:**

```json
{
  "company": { "company_number": "12345678", "name": "ACME LTD", "jurisdiction": "eng_wales" },
  "filing": { "balance_sheet_date": "2024-06-30", "period_start_date": "2023-07-01", "period_end_date": "2024-06-30" },
  "financials": {
    "Equity": { "current": 1240000, "previous": 985000, "unit": "GBP" },
    "Creditors": { "current": 485000, "previous": 410000, "unit": "GBP" },
    "CurrentAssets": { "current": 623000, "unit": "GBP" }
  },
  "text": {
    "EntityDormantTruefalse": "false",
    "EntityCurrentLegalOrRegisteredName": "ACME LTD",
    "DirectorSigningFinancialStatements": "J Smith"
  },
  "risk": { "level": "medium", "score": 55, "flags": ["negative_net_assets", "declining_equity"], "recommendation": "..." }
}
```

**Current vs Previous period logic:** Compare each fact's `instant_date` (or `end_date` for duration periods) against the filing's `balance_sheet_date`. If it matches, it's "current". If it's earlier, it's "previous". Facts with dimensions (director breakdowns, maturity periods) are excluded from the top-level grouping to keep the shape clean — they're available via the full facts endpoint if needed.

### 4.5 Full Filing Facts (optional/power-user)

```
GET /api/filing/{filing_id}/facts
```

Wraps `get_filing_with_facts()`. Returns the raw, ungrouped facts with full context and dimension data. Useful for debugging, building detailed views later, or accessing dimensional breakdowns the grouped report endpoint omits.

---

## 5. Risk Engine (`risk_engine.py`)

Separate module because it will grow independently. Clear inputs and outputs.

```python
def score(financials: dict, text: dict) -> dict:
    """
    Takes the grouped financials and text dicts from the report endpoint.
    Returns { level, score, flags, recommendation }.
    """
```

### v1 Scoring (MVP)

Simple threshold-based checks on available data:

| Check | Flag | Condition |
|-------|------|-----------|
| Negative net assets | `negative_net_assets` | `NetAssetsLiabilities.current < 0` |
| Declining equity | `declining_equity` | `Equity.current < Equity.previous` |
| High creditors ratio | `high_creditors` | `Creditors.current > CurrentAssets.current` |
| Dormant company | `dormant` | `EntityDormantTruefalse == "true"` |
| No employees | `no_employees` | `AverageNumberEmployeesDuringPeriod.current == 0` |
| Negative working capital | `negative_working_capital` | `NetCurrentAssetsLiabilities.current < 0` |

Score is a simple weighted sum. Level is derived from score thresholds (`low`/`medium`/`high`).

This is intentionally basic. It can be refined with ratio analysis, trend detection, and industry benchmarks over time — but only after the API is serving real data.

---

## 6. CORS Configuration

Frontend is static files (possibly different port or `file://`). FastAPI `CORSMiddleware` configured in `app.py` to allow the frontend origin. For dev, allow all origins. Tighten for production.

---

## 7. Implementation Sequence

| Step | What | Proves |
|------|------|--------|
| 1 | `app.py` with `/api/health` | Full chain: HTTP -> query -> SQLite -> JSON |
| 2 | `/api/search` | Frontend can get live search results |
| 3 | `/api/company/{number}` | Company lookup works |
| 4 | `/api/report/{number}` with grouping logic | Core data shaping works |
| 5 | `risk_engine.py` + wire into report | Reports include risk assessment |
| 6 | `/api/filing/{id}/facts` | Full data access for power users |
| 7 | Frontend wiring | Swap mock data for `fetch()` calls |

---

## 8. Available Data (from DB)

The API exposes data already loaded and queryable via `queries.py`. Key coverage from the data spec:

### High-Coverage Financial Concepts (>75% of filings)

`Equity` (97%), `NetAssetsLiabilities` (91%), `AverageNumberEmployeesDuringPeriod` (84%), `NetCurrentAssetsLiabilities` (81%), `Creditors` (77%), `TotalAssetsLessCurrentLiabilities` (76%), `CurrentAssets` (74%)

### Medium-Coverage (20-75%)

`FixedAssets` (43%), `CashBankOnHand` (34%), `Debtors` (22%)

### Core Text Concepts (>95%)

`UKCompaniesHouseRegisteredNumber`, `EntityCurrentLegalOrRegisteredName`, `BalanceSheetDate`, `StartDateForPeriodCoveredByReport`, `EndDateForPeriodCoveredByReport`, `EntityDormantTruefalse`, `DirectorSigningFinancialStatements`, `NameEntityOfficer`

### Sparse but Valuable

`ProfitLoss` (3.7%), `TurnoverRevenue` (2.7%) — most filings are micro-entities exempt from P&L reporting.

The report endpoint returns ALL concepts found in a filing, not a hardcoded subset. This means the frontend can progressively display more data as it's built out, without API changes.

---

## 9. Existing Query Functions (in `queries.py`)

| Function | Used By |
|----------|---------|
| `get_database_stats()` | `/api/health` |
| `search_companies(pattern, limit)` | `/api/search` |
| `get_company(number)` | `/api/company`, `/api/report` |
| `get_filings_for_company(number)` | `/api/company` |
| `get_latest_filing(number)` | `/api/report` |
| `get_numeric_facts(filing_id, concept?)` | `/api/report` |
| `get_text_facts(filing_id, concept?)` | `/api/report` |
| `get_filing_with_facts(filing_id)` | `/api/filing/{id}/facts` |
| `get_facts_by_concept(concept, limit)` | Not exposed yet — cross-filing analysis |
| `get_filing_by_source(source_file)` | Not exposed yet — traceability |

---

## 10. Future Considerations (Not In Scope)

| Topic | Notes |
|-------|-------|
| Authentication | JWT or session-based, added as FastAPI dependency |
| Rate limiting | Middleware |
| Caching | Response caching for expensive report builds |
| PostgreSQL migration | Only `connection.py` changes |
| Server-side wallet validation | New endpoints for hash-chain verification |
| Pydantic schemas | Add if auto-docs become useful |

---

## Related Documents

| Document | Content |
|----------|---------|
| `backend/docs/ARCHITECTURE.md` | Database schema, parser pipeline, data access layer |
| `backend/docs/SPEC.md` | Source data specification, concept coverage, audit history |
| `frontend/docs/MVP-SPEC.md` | Frontend components, mock data shape |
| `frontend/specs/payment/PAYMENT-FLOW.spec.md` | Payment flow specification |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-07 | Initial draft — 3-layer architecture with 10-12 files |
| **0.2.0** | **2026-02-07** | **Simplified to 2 files (`app.py` + `risk_engine.py`). Dropped Pydantic schemas, service layer, separate route files. Frontend-agnostic response shapes. Added full data coverage reference.** |
