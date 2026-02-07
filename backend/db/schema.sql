-- Companies House Data Layer Schema
-- Version: 1.0.0
-- See docs/ARCHITECTURE_PROPOSAL.md Section 10 for full specification
--
-- Design Principles:
-- - Perfect mirror of source data (dual-value storage: raw + normalized)
-- - Full attribute preservation from iXBRL/XBRL
-- - Foreign key constraints for referential integrity
-- - Indexes optimized for common query patterns

-- ============================================================================
-- Schema Version Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- ============================================================================
-- Batch Tracking
-- ============================================================================
-- Tracks each downloaded ZIP file for audit trail and incremental loading

CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    source_url TEXT,
    downloaded_at TEXT NOT NULL,
    file_count INTEGER,
    processed_at TEXT
);

-- ============================================================================
-- Companies
-- ============================================================================
-- Primary entity table. Minimal - just identification.
-- Updated on each filing with most recent name.

CREATE TABLE IF NOT EXISTS companies (
    company_number TEXT PRIMARY KEY,
    name TEXT,
    jurisdiction TEXT
);

-- ============================================================================
-- Filings
-- ============================================================================
-- One record per source file processed.
-- Links to company and batch for full traceability.

CREATE TABLE IF NOT EXISTS filings (
    id INTEGER PRIMARY KEY,
    company_number TEXT NOT NULL,
    batch_id INTEGER,
    source_file TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (source_type IN ('ixbrl_html', 'xbrl_xml', 'cic_zip')),
    balance_sheet_date TEXT NOT NULL,
    period_start_date TEXT,
    period_end_date TEXT,
    loaded_at TEXT NOT NULL,
    file_hash TEXT,
    FOREIGN KEY (company_number) REFERENCES companies(company_number),
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- ============================================================================
-- Numeric Facts
-- ============================================================================
-- All numeric values from <ix:nonFraction> elements.
-- Preserves ALL attributes with dual-value storage.
--
-- Dual-value pattern:
--   concept_raw: "uk-core:Equity" (original with namespace)
--   concept: "Equity" (normalized for queries)
--   value_raw: "762,057" (original display text)
--   value: -762057.0 (parsed with sign/scale applied)

CREATE TABLE IF NOT EXISTS numeric_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL,
    concept_raw TEXT NOT NULL,
    concept TEXT NOT NULL,
    context_ref TEXT NOT NULL,
    unit_ref TEXT,
    value_raw TEXT NOT NULL,
    value REAL,
    sign TEXT,
    decimals INTEGER,
    scale INTEGER,
    format TEXT,
    FOREIGN KEY (filing_id) REFERENCES filings(id)
);

-- ============================================================================
-- Text Facts
-- ============================================================================
-- All text values from <ix:nonNumeric> elements.
-- HTML content stored raw; escape attribute indicates interpretation.

CREATE TABLE IF NOT EXISTS text_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL,
    concept_raw TEXT NOT NULL,
    concept TEXT NOT NULL,
    context_ref TEXT NOT NULL,
    value TEXT,
    format TEXT,
    "escape" TEXT,
    FOREIGN KEY (filing_id) REFERENCES filings(id)
);

-- ============================================================================
-- Contexts
-- ============================================================================
-- Period and dimension definitions from <xbrli:context> elements.
-- Stores both parsed dimensions (JSON) and raw segment XML for full preservation.

CREATE TABLE IF NOT EXISTS contexts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL,
    context_ref TEXT NOT NULL,
    entity_identifier TEXT,
    entity_scheme TEXT,
    period_type TEXT NOT NULL CHECK (period_type IN ('instant', 'duration', 'forever')),
    instant_date TEXT,
    start_date TEXT,
    end_date TEXT,
    dimensions TEXT,
    segment_raw TEXT,
    FOREIGN KEY (filing_id) REFERENCES filings(id)
);

-- ============================================================================
-- Units
-- ============================================================================
-- Unit definitions from <xbrli:unit> elements.
-- Dual-value: measure_raw (original) and measure (normalized).

CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL,
    unit_ref TEXT NOT NULL,
    measure_raw TEXT NOT NULL,
    measure TEXT NOT NULL,
    FOREIGN KEY (filing_id) REFERENCES filings(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
-- Optimized for common query patterns:
-- - Company lookup and filtering
-- - Filing retrieval by date/batch
-- - Fact queries by concept
-- - Context/unit resolution

-- Filing indexes (primary lookup patterns)
CREATE INDEX IF NOT EXISTS idx_filings_company ON filings(company_number);
CREATE INDEX IF NOT EXISTS idx_filings_date ON filings(balance_sheet_date);
CREATE INDEX IF NOT EXISTS idx_filings_batch ON filings(batch_id);

-- Numeric facts indexes
CREATE INDEX IF NOT EXISTS idx_numeric_filing ON numeric_facts(filing_id);
CREATE INDEX IF NOT EXISTS idx_numeric_concept ON numeric_facts(concept);
CREATE INDEX IF NOT EXISTS idx_numeric_filing_concept ON numeric_facts(filing_id, concept);

-- Text facts indexes
CREATE INDEX IF NOT EXISTS idx_text_filing ON text_facts(filing_id);
CREATE INDEX IF NOT EXISTS idx_text_concept ON text_facts(concept);

-- Context indexes (for resolving fact references)
CREATE INDEX IF NOT EXISTS idx_contexts_filing ON contexts(filing_id);
CREATE INDEX IF NOT EXISTS idx_contexts_ref ON contexts(filing_id, context_ref);

-- Unit indexes (for resolving fact references)
CREATE INDEX IF NOT EXISTS idx_units_filing ON units(filing_id);
CREATE INDEX IF NOT EXISTS idx_units_ref ON units(filing_id, unit_ref);

-- ============================================================================
-- Initial Schema Version
-- ============================================================================

INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (1, datetime('now'));
