# CompanyWise — API Layer Specification

**Version:** 0.2.0
**Status:** Implemented
**Last Updated:** 2026-02-07

---

## 1. What This Is

HTTP API serving Companies House financial data to the frontend. Pure data pass-through — no interpretation, calculation, grouping, or risk scoring. All business logic lives in the frontend.

**Stack:** FastAPI + uvicorn, plain dict responses, no Pydantic schemas, no service layer.

**Files:**

| File | Purpose |
|------|---------|
| `backend/api/app.py` | FastAPI app, CORS, 9 routes |
| `backend/api/__init__.py` | Package marker |

---

## 2. Running

```bash
# Dev server with hot reload
python -m backend.api.app

# Or directly
uvicorn backend.api.app:app --host 0.0.0.0 --port 8000 --reload
```

Auto-generated docs at `http://localhost:8000/docs`

---

## 3. Endpoints

### 3.1 `GET /api/health`

Returns database row counts and date range. No parameters.

```json
{
  "companies_count": 35067,
  "filings_count": 35119,
  "numeric_facts_count": 1081996,
  "text_facts_count": 1295741,
  "concepts_count": 3630,
  "dimension_patterns_count": 3009,
  "context_definitions_count": 144650,
  "batches_count": 1,
  "earliest_filing": "2019-07-31",
  "latest_filing": "2023-11-30"
}
```

**Calls:** `queries.get_database_stats()`

---

### 3.2 `GET /api/search?q={query}&limit={limit}`

| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `q` | string | required | min_length=1 |
| `limit` | int | 20 | 1-100 |

The `q` value is wrapped in `%` wildcards for SQL LIKE matching. Returns array of company objects.

```json
[
  { "company_number": "00275446", "name": "EDWARD BENTON & CO LTD", "jurisdiction": null }
]
```

**Calls:** `queries.search_companies(f"%{q}%", limit)`

---

### 3.3 `GET /api/company/{number}`

Returns company info plus all filings ordered by balance sheet date descending.

```json
{
  "company": {
    "company_number": "00275446",
    "name": "EDWARD BENTON & CO LTD",
    "jurisdiction": null
  },
  "filings": [
    {
      "id": 9,
      "company_number": "00275446",
      "batch_id": 1,
      "source_file": "Prod223_3580_00275446_20230831.html",
      "source_type": "ixbrl_html",
      "balance_sheet_date": "2023-08-31",
      "period_start_date": "2022-09-01",
      "period_end_date": "2023-08-31",
      "loaded_at": "2026-02-07T09:24:58.122707",
      "file_hash": "a1b2c3..."
    }
  ]
}
```

**Company fields:** `company_number`, `name`, `jurisdiction`
**Filing fields:** `id`, `company_number`, `batch_id`, `source_file`, `source_type`, `balance_sheet_date`, `period_start_date`, `period_end_date`, `loaded_at`, `file_hash`

**Calls:** `queries.get_company()` + `queries.get_filings_for_company()`
**Errors:** 404 if company number not found

---

### 3.4 `GET /api/filing/{filing_id}/facts`

Raw, ungrouped facts for a filing. This is the primary endpoint for building financial reports — the frontend handles all grouping, period detection, dimension filtering, and risk scoring.

Returns the complete filing with all related data resolved via JOINs through the lookup tables.

```json
{
  "id": 9,
  "company_number": "00275446",
  "batch_id": 1,
  "source_file": "Prod223_3580_00275446_20230831.html",
  "source_type": "ixbrl_html",
  "balance_sheet_date": "2023-08-31",
  "period_start_date": "2022-09-01",
  "period_end_date": "2023-08-31",
  "loaded_at": "2026-02-07T09:24:58.122707",
  "file_hash": "...",
  "company_name": "EDWARD BENTON & CO LTD",
  "contexts": [
    {
      "id": 1,
      "period_type": "instant",
      "instant_date": "2023-08-31",
      "start_date": null,
      "end_date": null,
      "dimensions": null
    }
  ],
  "units": ["GBP", "shares"],
  "numeric_facts": [
    {
      "id": 1,
      "filing_id": 9,
      "value": 358439.0,
      "unit": "GBP",
      "concept": "Equity",
      "concept_raw": "ns5:Equity",
      "namespace": "ns5",
      "period_type": "instant",
      "instant_date": "2023-08-31",
      "start_date": null,
      "end_date": null,
      "dimensions": null
    }
  ],
  "text_facts": [
    {
      "id": 1,
      "filing_id": 9,
      "value": "false",
      "concept": "EntityDormantTruefalse",
      "concept_raw": "ns5:EntityDormantTruefalse",
      "namespace": "ns5",
      "period_type": "instant",
      "instant_date": "2023-08-31",
      "start_date": null,
      "end_date": null,
      "dimensions": null
    }
  ]
}
```

**Top-level fields:** `id`, `company_number`, `batch_id`, `source_file`, `source_type`, `balance_sheet_date`, `period_start_date`, `period_end_date`, `loaded_at`, `file_hash`, `company_name`
**Context fields:** `id`, `period_type`, `instant_date`, `start_date`, `end_date`, `dimensions`
**Numeric fact fields:** `id`, `filing_id`, `value`, `unit`, `concept`, `concept_raw`, `namespace`, `period_type`, `instant_date`, `start_date`, `end_date`, `dimensions`
**Text fact fields:** `id`, `filing_id`, `value`, `concept`, `concept_raw`, `namespace`, `period_type`, `instant_date`, `start_date`, `end_date`, `dimensions`

**Calls:** `queries.get_filing_with_facts()`
**Errors:** 404 if filing ID not found

---

### 3.5 `GET /api/filing/by-source/{filename}`

Lookup a filing by its original source filename from the ZIP archive.

```json
{
  "id": 9,
  "company_number": "00275446",
  "batch_id": 1,
  "source_file": "Prod223_3580_00275446_20230831.html",
  "source_type": "ixbrl_html",
  "balance_sheet_date": "2023-08-31",
  "period_start_date": "2022-09-01",
  "period_end_date": "2023-08-31",
  "loaded_at": "...",
  "file_hash": "..."
}
```

**Fields:** `id`, `company_number`, `batch_id`, `source_file`, `source_type`, `balance_sheet_date`, `period_start_date`, `period_end_date`, `loaded_at`, `file_hash`

**Calls:** `queries.get_filing_by_source()`
**Errors:** 404 if filename not found

---

### 3.6 `GET /api/batch/{batch_id}`

Returns batch metadata — data provenance information.

```json
{
  "id": 1,
  "filename": "Accounts_Bulk_Data-2023-12-01.zip",
  "source_url": "https://...",
  "downloaded_at": "2026-02-07T08:00:00",
  "file_count": 5000,
  "processed_at": "2026-02-07T09:30:00"
}
```

**Fields:** `id`, `filename`, `source_url`, `downloaded_at`, `file_count`, `processed_at`

**Calls:** `queries.get_batch()`
**Errors:** 404 if batch ID not found

---

### 3.7 `GET /api/concepts?limit={limit}&offset={offset}`

Browse concepts with pagination, ordered alphabetically by normalized name.

| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `limit` | int | 100 | 1-1000 |
| `offset` | int | 0 | >= 0 |

```json
[
  { "id": 42, "concept_raw": "ns5:Equity", "concept": "Equity", "namespace": "ns5" }
]
```

**Fields:** `id`, `concept_raw`, `concept`, `namespace`

**Calls:** `queries.get_all_concepts()`

---

### 3.8 `GET /api/concepts/search?q={query}&limit={limit}`

Search concepts by name pattern.

| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `q` | string | required | min_length=1 |
| `limit` | int | 50 | 1-500 |

```json
[
  { "id": 42, "concept_raw": "ns5:Equity", "concept": "Equity", "namespace": "ns5" },
  { "id": 43, "concept_raw": "ns5:EquityAttributableToOwnersOfParent", "concept": "EquityAttributableToOwnersOfParent", "namespace": "ns5" }
]
```

**Fields:** `id`, `concept_raw`, `concept`, `namespace`

**Calls:** `queries.search_concepts(f"%{q}%", limit)`

---

### 3.9 `GET /api/facts/by-concept/{concept}?limit={limit}`

Cross-filing concept query — returns numeric facts for a given concept across all companies/filings.

| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `concept` | string (path) | required | — |
| `limit` | int | 1000 | 1-10000 |

```json
[
  {
    "id": 1,
    "filing_id": 9,
    "value": 358439.0,
    "unit": "GBP",
    "concept": "Equity",
    "concept_raw": "ns5:Equity",
    "company_number": "00275446",
    "balance_sheet_date": "2023-08-31",
    "company_name": "EDWARD BENTON & CO LTD",
    "period_type": "instant",
    "instant_date": "2023-08-31",
    "start_date": null,
    "end_date": null
  }
]
```

**Fields:** `id`, `filing_id`, `value`, `unit`, `concept`, `concept_raw`, `company_number`, `balance_sheet_date`, `company_name`, `period_type`, `instant_date`, `start_date`, `end_date`

**Calls:** `queries.get_facts_by_concept()`

---

## 4. DB Coverage

### 4.1 Table-to-Endpoint Map

Every DB table is accessible via at least one endpoint. `schema_version` is internal-only and intentionally excluded.

| DB Table | Endpoint(s) | Coverage |
|----------|-------------|----------|
| `schema_version` | — | Internal, not exposed |
| `batches` | `/api/batch/{id}`, `/api/health` (count) | All 6 fields |
| `companies` | `/api/search`, `/api/company/{number}`, `/api/filing/{id}/facts` (as `company_name`) | All 3 fields |
| `filings` | `/api/company/{number}`, `/api/filing/{id}/facts`, `/api/filing/by-source/{filename}` | All 10 fields |
| `concepts` | `/api/concepts`, `/api/concepts/search`, resolved via JOINs in fact endpoints | All 4 fields |
| `dimension_patterns` | Resolved via JOINs as `dimensions` field on contexts and facts | `dimensions` exposed (internal `id`, `pattern_hash` not exposed) |
| `context_definitions` | `/api/filing/{id}/facts` (as `contexts` array), resolved inline on facts | 5 of 7 fields (internal `dimension_pattern_id`, `definition_hash` not exposed) |
| `numeric_facts` | `/api/filing/{id}/facts`, `/api/facts/by-concept/{concept}` | All fields resolved via JOINs |
| `text_facts` | `/api/filing/{id}/facts` | All fields resolved via JOINs |

### 4.2 Fields Not Exposed (by design)

These are internal/structural fields the frontend doesn't need:

| Table | Field | Reason |
|-------|-------|--------|
| `dimension_patterns` | `id`, `pattern_hash` | Internal lookup key and dedup hash |
| `context_definitions` | `dimension_pattern_id`, `definition_hash` | Internal FK and dedup hash |
| `numeric_facts` | `concept_id`, `context_id` | Internal FKs — resolved to human-readable values via JOINs |
| `text_facts` | `concept_id`, `context_id` | Internal FKs — resolved to human-readable values via JOINs |

---

## 5. DB Layer Usage

### 5.1 Endpoint-Wired Functions

Routes call `backend.db.queries` functions directly. No service layer.

| Query Function | Used By |
|----------------|---------|
| `get_database_stats()` | `/api/health` |
| `search_companies(pattern, limit)` | `/api/search` |
| `get_company(number)` | `/api/company` |
| `get_filings_for_company(number)` | `/api/company` |
| `get_filing_with_facts(filing_id)` | `/api/filing/{id}/facts` |
| `get_filing_by_source(filename)` | `/api/filing/by-source/{filename}` |
| `get_batch(batch_id)` | `/api/batch/{batch_id}` |
| `get_all_concepts(limit, offset)` | `/api/concepts` |
| `search_concepts(pattern, limit)` | `/api/concepts/search` |
| `get_facts_by_concept(concept, limit)` | `/api/facts/by-concept/{concept}` |

### 5.2 Available but Unwired Functions

These exist in `queries.py` and can be wired to new endpoints if needed:

| Query Function | Purpose | Notes |
|----------------|---------|-------|
| `get_latest_filing(company_number)` | Returns most recent filing for a company | Frontend can derive from `/api/company` filings list (already sorted by date DESC) |
| `get_numeric_facts(filing_id, concept?)` | Numeric facts for a filing, optional concept filter | Subset of `get_filing_with_facts()` |
| `get_text_facts(filing_id, concept?)` | Text facts for a filing, optional concept filter | Subset of `get_filing_with_facts()` |
| `get_contexts(filing_id)` | Context definitions for a filing | Included in `get_filing_with_facts()` response |
| `get_units(filing_id)` | Distinct units for a filing | Included in `get_filing_with_facts()` response |

---

## 6. Frontend Workflow

The API is consumed in two main flows:

**Search + Report:**
1. `GET /api/search?q=...` — find company
2. `GET /api/company/{number}` — get company info + filings list
3. `GET /api/filing/{id}/facts` — get raw facts for chosen filing
4. Frontend: group facts by concept, detect current/previous periods, filter dimensions, calculate risk score

**Cross-Company Analysis:**
1. `GET /api/concepts/search?q=...` — find concept of interest
2. `GET /api/facts/by-concept/{concept}` — get values across all companies

---

## 7. Design Principle

**The API is a pure data pass-through.** It reads from the database and returns the result. No interpretation, no calculation, no grouping, no risk scoring. All business logic — period detection, dimension filtering, fact grouping, risk assessment — lives in the frontend.

---

## 8. Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |

No other dependencies beyond the existing `backend.db` layer.

---

## 9. CORS

Currently allows all origins (`*`) for development. Tighten for production.

---

## 10. Error Handling

Minimal — only 404s for missing resources. No auth, rate limiting, caching, or custom error middleware.

| Condition | Status | Detail |
|-----------|--------|--------|
| Company number not found | 404 | "Company not found" |
| Filing ID not found | 404 | "Filing not found" |
| Filing source filename not found | 404 | "Filing not found" |
| Batch ID not found | 404 | "Batch not found" |

---

## 11. Known Limitations

- **No pagination** on company search (capped at limit=100), concept search (500), facts-by-concept (10000)
- **No auth or rate limiting** — open API
- **CORS wide open** — allows all origins
- **No filing-level filtering** on `/api/facts/by-concept` (returns across all filings)
- **`/api/facts/by-concept` returns numeric facts only** — no cross-filing text fact query

---

## 12. Future Work

| Area | Notes |
|------|-------|
| Auth | JWT or session-based, FastAPI dependency injection |
| Rate limiting | Middleware |
| Caching | Response caching for expensive queries |
| Cross-filing text facts | Endpoint for text facts by concept across filings |
| Pydantic schemas | If auto-docs or validation becomes useful |
| PostgreSQL | Only `connection.py` changes needed |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.2.0 | 2026-02-07 | Stripped to pure data pass-through: removed `/api/report`, removed risk engine, added 5 new endpoints (`batch`, `concepts`, `concepts/search`, `filing/by-source`, `facts/by-concept`), added `file_hash` to all filing queries, added DB coverage map |
| 0.1.0 | 2026-02-07 | Initial implementation — 5 endpoints, risk engine v1, dimension-aware fact grouping |
