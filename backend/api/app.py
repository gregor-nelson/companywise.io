"""
CompanyWise API — FastAPI application serving Companies House financial data.

9 endpoints:
  GET /api/health                        — database stats
  GET /api/search                        — company name search
  GET /api/company/{number}              — company profile + filings
  GET /api/filing/{id}/facts             — raw filing facts
  GET /api/batch/{batch_id}              — batch metadata
  GET /api/concepts                      — browse concepts
  GET /api/concepts/search               — search concepts by name
  GET /api/filing/by-source/{filename}   — lookup filing by source filename
  GET /api/facts/by-concept/{concept}    — cross-filing concept query
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.db.queries import (
    get_batch,
    get_all_concepts,
    get_company,
    get_database_stats,
    get_facts_by_concept,
    get_filing_by_source,
    get_filing_with_facts,
    get_filings_for_company,
    search_companies,
    search_concepts,
)

app = FastAPI(title="CompanyWise API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health():
    return get_database_stats()


@app.get("/api/search")
def search(q: str = Query(..., min_length=1), limit: int = Query(20, ge=1, le=100)):
    pattern = f"%{q}%"
    return search_companies(pattern, limit)


@app.get("/api/company/{number}")
def company(number: str):
    comp = get_company(number)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    filings = get_filings_for_company(number)
    return {"company": comp, "filings": filings}


@app.get("/api/filing/by-source/{filename}")
def filing_by_source(filename: str):
    data = get_filing_by_source(filename)
    if not data:
        raise HTTPException(status_code=404, detail="Filing not found")
    return data


@app.get("/api/filing/{filing_id}/facts")
def filing_facts(filing_id: int):
    data = get_filing_with_facts(filing_id)
    if not data:
        raise HTTPException(status_code=404, detail="Filing not found")
    return data


@app.get("/api/batch/{batch_id}")
def batch(batch_id: int):
    data = get_batch(batch_id)
    if not data:
        raise HTTPException(status_code=404, detail="Batch not found")
    return data


@app.get("/api/concepts/search")
def concepts_search(q: str = Query(..., min_length=1), limit: int = Query(50, ge=1, le=500)):
    pattern = f"%{q}%"
    return search_concepts(pattern, limit)


@app.get("/api/concepts")
def concepts(limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0)):
    return get_all_concepts(limit, offset)


@app.get("/api/facts/by-concept/{concept}")
def facts_by_concept(concept: str, limit: int = Query(1000, ge=1, le=10000)):
    return get_facts_by_concept(concept, limit)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.api.app:app", host="0.0.0.0", port=8000, reload=True)
