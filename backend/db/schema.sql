-- Companies House Data Layer Schema v2: Prune + Normalize
-- Version: 2.0.0
-- See docs/ARCHITECTURE_PROPOSAL.md Section 17 for full specification
--
-- Design Principles:
-- - Preserve all user-relevant financial data with full accuracy
-- - Normalize repeated data into lookup tables (concepts, dimension_patterns, context_definitions)
-- - Drop XBRL rendering plumbing (format hints, raw display strings, internal reference IDs)
-- - INTEGER foreign keys to lookup tables instead of repeated strings
-- - Target: 70-75% size reduction from v1

-- ============================================================================
-- Schema Version Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- ============================================================================
-- Batch Tracking (unchanged from v1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    source_url TEXT,
    downloaded_at TEXT NOT NULL,
    file_count INTEGER,
    processed_at TEXT
);

-- ============================================================================
-- Companies (unchanged from v1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
    company_number TEXT PRIMARY KEY,
    name TEXT,
    jurisdiction TEXT
);

-- ============================================================================
-- Filings (unchanged from v1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS filings (
    id INTEGER PRIMARY KEY,
    company_number TEXT NOT NULL REFERENCES companies(company_number),
    batch_id INTEGER REFERENCES batches(id),
    source_file TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (source_type IN ('ixbrl_html', 'xbrl_xml', 'cic_zip')),
    balance_sheet_date TEXT NOT NULL,
    period_start_date TEXT,
    period_end_date TEXT,
    loaded_at TEXT NOT NULL,
    file_hash TEXT
);

-- ============================================================================
-- Lookup: Concept Definitions (global, cross-filing)
-- ============================================================================
-- Stores each unique concept once. Replaces inline concept_raw/concept on facts.
-- Expected: ~3,630 rows (from 2.38M inline strings in v1)

CREATE TABLE IF NOT EXISTS concepts (
    id INTEGER PRIMARY KEY,
    concept_raw TEXT NOT NULL UNIQUE,
    concept TEXT NOT NULL,
    namespace TEXT
);

-- ============================================================================
-- Lookup: Dimension Patterns (global, cross-filing)
-- ============================================================================
-- Stores each unique dimension JSON once. Replaces inline dimensions on contexts.
-- Expected: ~3,009 rows (from 2.98M inline JSON strings in v1)

CREATE TABLE IF NOT EXISTS dimension_patterns (
    id INTEGER PRIMARY KEY,
    dimensions TEXT NOT NULL UNIQUE,
    pattern_hash TEXT NOT NULL UNIQUE
);

-- ============================================================================
-- Lookup: Context Definitions (global, cross-filing)
-- ============================================================================
-- Stores each unique context definition once. Replaces per-filing contexts table.
-- Expected: ~144,650 rows (from 3.15M per-filing rows in v1)

CREATE TABLE IF NOT EXISTS context_definitions (
    id INTEGER PRIMARY KEY,
    period_type TEXT NOT NULL CHECK (period_type IN ('instant', 'duration', 'forever')),
    instant_date TEXT,
    start_date TEXT,
    end_date TEXT,
    dimension_pattern_id INTEGER REFERENCES dimension_patterns(id),
    definition_hash TEXT NOT NULL UNIQUE
);

-- ============================================================================
-- Numeric Facts (slimmed: 11 columns -> 5)
-- ============================================================================
-- Dropped: concept_raw, concept (moved to concepts lookup), context_ref (resolved),
--          unit_ref (resolved), value_raw, sign, decimals, scale, format

CREATE TABLE IF NOT EXISTS numeric_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_id INTEGER NOT NULL REFERENCES concepts(id),
    context_id INTEGER NOT NULL REFERENCES context_definitions(id),
    unit TEXT,
    value REAL
);

-- ============================================================================
-- Text Facts (slimmed: 8 columns -> 4)
-- ============================================================================
-- Dropped: concept_raw, concept (moved to concepts lookup), context_ref (resolved),
--          format, escape

CREATE TABLE IF NOT EXISTS text_facts (
    id INTEGER PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    concept_id INTEGER NOT NULL REFERENCES concepts(id),
    context_id INTEGER NOT NULL REFERENCES context_definitions(id),
    value TEXT
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Filing indexes (primary lookup patterns)
CREATE INDEX IF NOT EXISTS idx_filings_company ON filings(company_number);
CREATE INDEX IF NOT EXISTS idx_filings_date ON filings(balance_sheet_date);
CREATE INDEX IF NOT EXISTS idx_filings_batch ON filings(batch_id);

-- Concept lookup
CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(concept);

-- Context definition lookup
CREATE INDEX IF NOT EXISTS idx_context_def_hash ON context_definitions(definition_hash);
CREATE INDEX IF NOT EXISTS idx_context_def_period ON context_definitions(period_type, instant_date);

-- Numeric facts indexes
CREATE INDEX IF NOT EXISTS idx_numeric_filing ON numeric_facts(filing_id);
CREATE INDEX IF NOT EXISTS idx_numeric_concept ON numeric_facts(concept_id);
CREATE INDEX IF NOT EXISTS idx_numeric_filing_concept ON numeric_facts(filing_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_numeric_context ON numeric_facts(context_id);

-- Text facts indexes
CREATE INDEX IF NOT EXISTS idx_text_filing ON text_facts(filing_id);
CREATE INDEX IF NOT EXISTS idx_text_concept ON text_facts(concept_id);

-- ============================================================================
-- Convenience Views
-- ============================================================================
-- Human-readable views that JOIN through lookup tables

CREATE VIEW IF NOT EXISTS numeric_facts_v AS
SELECT
    nf.id, nf.filing_id, nf.value, nf.unit,
    c.concept, c.concept_raw, c.namespace,
    cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
    dp.dimensions
FROM numeric_facts nf
JOIN concepts c ON nf.concept_id = c.id
JOIN context_definitions cd ON nf.context_id = cd.id
LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id;

CREATE VIEW IF NOT EXISTS text_facts_v AS
SELECT
    tf.id, tf.filing_id, tf.value,
    c.concept, c.concept_raw, c.namespace,
    cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
    dp.dimensions
FROM text_facts tf
JOIN concepts c ON tf.concept_id = c.id
JOIN context_definitions cd ON tf.context_id = cd.id
LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id;

-- ============================================================================
-- Schema Version
-- ============================================================================

INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (2, datetime('now'));
