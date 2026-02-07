# API Layer — Kickoff Prompt

Copy everything below the line into a fresh Claude session.

---

## Context

I'm building CompanyWise.io — a freelancer client vetting tool that answers "Will this company pay my invoice?" by analysing UK Companies House financial accounts data.

The backend already has:
- A **SQLite database** with ~35K companies, ~35K filings, ~1M numeric facts, ~1.3M text facts loaded from Companies House bulk iXBRL data
- A **parser** that extracts financial data from iXBRL HTML files
- A **bulk loader** that processes daily ZIP archives
- A **query layer** (`queries.py`) with 12 functions that return plain dicts
- A **v2 normalized schema** with lookup tables for concepts, contexts, and dimensions

What's missing: an HTTP API to serve this data to the vanilla JS frontend.

## Your Task

Build the FastAPI API layer. **2 files only: `app.py` and `risk_engine.py`.**

### Before writing any code, do this first:

1. **Read the architecture doc** — `backend/docs/API_ARCHITECTURE.md` — this is the spec you're implementing
2. **Read the existing DB layer** (all 3 files, do not modify them):
   - `backend/db/schema.sql` — table definitions, indexes, views
   - `backend/db/connection.py` — connection config, PRAGMAs
   - `backend/db/queries.py` — all query functions you'll call from routes
3. **Read the data spec** — `backend/docs/SPEC.md` — sections 7 and 8 specifically, to understand what financial concepts exist and their coverage percentages
4. **Query the actual database** to verify what's loaded and understand the real data shapes:
   ```python
   # Run these against the live DB at database/companies_house.db
   # Check what's actually in there
   python -c "from backend.db.queries import get_database_stats; import json; print(json.dumps(get_database_stats(), indent=2))"

   # Pick a real company and look at what a full filing returns
   python -c "from backend.db.queries import search_companies; import json; print(json.dumps(search_companies('%LTD%', 5), indent=2))"

   # Then get a real filing's facts to see the actual data shapes
   python -c "from backend.db.queries import get_latest_filing, get_numeric_facts; import json; f = get_latest_filing('COMPANY_NUMBER_FROM_ABOVE'); print(json.dumps(get_numeric_facts(f['id'])[:10], indent=2))"
   ```

### Then build:

**File 1: `backend/api/app.py`** (~150-250 lines)

5 route functions:
- `GET /api/health` — passes through `get_database_stats()`
- `GET /api/search?q={query}&limit={limit}` — wraps `search_companies()`, default limit 20
- `GET /api/company/{number}` — `get_company()` + `get_filings_for_company()`
- `GET /api/report/{number}` — the main endpoint: company + latest filing + ALL facts grouped by concept with current/previous period separation + risk score
- `GET /api/filing/{filing_id}/facts` — wraps `get_filing_with_facts()` for full raw data access

The report endpoint is where the real logic lives:
- Fetch all numeric facts for the latest filing
- Group by normalized concept name (the `concept` field, not `concept_raw`)
- Separate current vs previous period by comparing `instant_date` against `balance_sheet_date`
- Facts with dimensions (non-null `dimensions` field) should be kept but nested separately — don't mix dimensional breakdowns into the top-level concept grouping
- Return ALL concepts found, not a hardcoded subset — the frontend will progressively consume more data as it's built out
- Include text facts grouped by concept name (simple key-value, most recent context only)
- Wire in risk_engine.score() on the grouped financials

Include CORS middleware allowing all origins (dev mode). Add `if __name__ == "__main__"` block to run with uvicorn.

**File 2: `backend/api/risk_engine.py`** (~50-80 lines)

Single function:
```python
def score(financials: dict, text: dict) -> dict:
    # Returns { level: "low"|"medium"|"high", score: int, flags: list[str], recommendation: str }
```

v1 checks (simple threshold-based):
- Negative net assets → `negative_net_assets`
- Declining equity (current < previous) → `declining_equity`
- Creditors exceed current assets → `high_creditors`
- Dormant company → `dormant`
- Zero employees → `no_employees`
- Negative working capital → `negative_working_capital`

Score = weighted count of flags. Level = threshold buckets. Recommendation = short text summary. Keep it simple — this gets refined later.

### Key constraints:

- **Do NOT modify** any existing files in `backend/db/`, `backend/parser/`, or `backend/loader/`
- **Do NOT use Pydantic schemas** — return plain dicts, FastAPI handles serialization
- **Do NOT create a service layer** — routes call query functions directly
- **Do NOT over-engineer** — no middleware, no auth, no caching, no error handling beyond basic 404s
- **Do create** `backend/api/__init__.py` (empty package marker)
- The database lives at `database/companies_house.db` relative to the project root
- Python imports use `backend.db.queries`, `backend.db.connection` etc.

### After building, verify:

- Start the server: `python -m backend.api.app` (or `uvicorn backend.api.app:app`)
- Hit `/api/health` and confirm it returns real database stats
- Hit `/api/search?q=LTD` and confirm results come back
- Pick a company number from search results and hit `/api/report/{number}` — confirm the response has grouped financials with current/previous values and a risk assessment
- Hit `/api/docs` to see the auto-generated API documentation
