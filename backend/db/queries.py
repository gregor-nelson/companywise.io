# Data access layer - query functions (v2 schema)
# See docs/SESSION_12_PLAN.md Step 4 for rewrite specification
"""
Query functions for retrieving Companies House data from SQLite.

v2 schema: Facts reference lookup tables (concepts, context_definitions,
dimension_patterns) via INTEGER foreign keys. All fact queries use JOINs
to return human-readable data.

All functions use read-only connections and return dicts/lists for easy serialization.
"""

from __future__ import annotations

from typing import Any

from backend.db.connection import get_connection


def get_company(company_number: str) -> dict | None:
    """
    Get a company by registration number.

    Args:
        company_number: Companies House registration number (e.g., "12345678")

    Returns:
        Dict with company_number, name, jurisdiction or None if not found
    """
    company_number = company_number.strip().upper()

    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            "SELECT company_number, name, jurisdiction FROM companies WHERE company_number = ?",
            (company_number,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_filings_for_company(company_number: str) -> list[dict]:
    """
    Get all filings for a company, ordered by balance sheet date descending.

    Args:
        company_number: Companies House registration number

    Returns:
        List of filing dicts with id, source_file, balance_sheet_date, etc.
    """
    company_number = company_number.strip().upper()

    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT id, company_number, batch_id, source_file, source_type,
                   balance_sheet_date, period_start_date, period_end_date, loaded_at
            FROM filings
            WHERE company_number = ?
            ORDER BY balance_sheet_date DESC
            """,
            (company_number,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_latest_filing(company_number: str) -> dict | None:
    """
    Get the most recent filing for a company.

    Args:
        company_number: Companies House registration number

    Returns:
        Filing dict or None if company has no filings
    """
    company_number = company_number.strip().upper()

    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT id, company_number, batch_id, source_file, source_type,
                   balance_sheet_date, period_start_date, period_end_date, loaded_at
            FROM filings
            WHERE company_number = ?
            ORDER BY balance_sheet_date DESC
            LIMIT 1
            """,
            (company_number,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_numeric_facts(filing_id: int, concept: str | None = None) -> list[dict]:
    """
    Get numeric facts for a filing, optionally filtered by concept.

    Args:
        filing_id: Database ID of the filing
        concept: Optional normalized concept name to filter by (e.g., "Equity")

    Returns:
        List of numeric fact dicts with value, unit, concept info, and period info
    """
    conn = get_connection(read_only=True)
    try:
        base_query = """
            SELECT
                nf.id, nf.filing_id, nf.value, nf.unit,
                c.concept, c.concept_raw, c.namespace,
                cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
                dp.dimensions
            FROM numeric_facts nf
            JOIN concepts c ON nf.concept_id = c.id
            JOIN context_definitions cd ON nf.context_id = cd.id
            LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id
            WHERE nf.filing_id = ?
        """
        if concept:
            cursor = conn.execute(
                base_query + " AND c.concept = ?",
                (filing_id, concept)
            )
        else:
            cursor = conn.execute(base_query, (filing_id,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_text_facts(filing_id: int, concept: str | None = None) -> list[dict]:
    """
    Get text facts for a filing, optionally filtered by concept.

    Args:
        filing_id: Database ID of the filing
        concept: Optional normalized concept name to filter by

    Returns:
        List of text fact dicts with value, concept info, and period info
    """
    conn = get_connection(read_only=True)
    try:
        base_query = """
            SELECT
                tf.id, tf.filing_id, tf.value,
                c.concept, c.concept_raw, c.namespace,
                cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
                dp.dimensions
            FROM text_facts tf
            JOIN concepts c ON tf.concept_id = c.id
            JOIN context_definitions cd ON tf.context_id = cd.id
            LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id
            WHERE tf.filing_id = ?
        """
        if concept:
            cursor = conn.execute(
                base_query + " AND c.concept = ?",
                (filing_id, concept)
            )
        else:
            cursor = conn.execute(base_query, (filing_id,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_contexts(filing_id: int) -> list[dict]:
    """
    Get all context definitions used by facts in a filing.

    Args:
        filing_id: Database ID of the filing

    Returns:
        List of context dicts with period and dimension info
    """
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT DISTINCT
                cd.id, cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
                dp.dimensions
            FROM context_definitions cd
            LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id
            WHERE cd.id IN (
                SELECT context_id FROM numeric_facts WHERE filing_id = ?
                UNION
                SELECT context_id FROM text_facts WHERE filing_id = ?
            )
            """,
            (filing_id, filing_id)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_units(filing_id: int) -> list[str]:
    """
    Get all distinct units used in numeric facts for a filing.

    Args:
        filing_id: Database ID of the filing

    Returns:
        List of unit strings (e.g., ["GBP", "shares"])
    """
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            "SELECT DISTINCT unit FROM numeric_facts WHERE filing_id = ? AND unit IS NOT NULL",
            (filing_id,)
        )
        return [row["unit"] for row in cursor.fetchall()]
    finally:
        conn.close()


def get_filing_with_facts(filing_id: int) -> dict | None:
    """
    Get a filing with all related data (contexts, units, numeric facts, text facts).

    This is the main function for retrieving complete filing data.

    Args:
        filing_id: Database ID of the filing

    Returns:
        Dict with filing data plus nested lists for contexts, units,
        numeric_facts, and text_facts. Returns None if filing not found.
    """
    conn = get_connection(read_only=True)
    try:
        # Get filing
        cursor = conn.execute(
            """
            SELECT id, company_number, batch_id, source_file, source_type,
                   balance_sheet_date, period_start_date, period_end_date, loaded_at
            FROM filings
            WHERE id = ?
            """,
            (filing_id,)
        )
        filing_row = cursor.fetchone()
        if not filing_row:
            return None

        result = dict(filing_row)

        # Get company name
        cursor = conn.execute(
            "SELECT name FROM companies WHERE company_number = ?",
            (result["company_number"],)
        )
        company_row = cursor.fetchone()
        result["company_name"] = company_row["name"] if company_row else None

        # Get contexts used by this filing's facts
        cursor = conn.execute(
            """
            SELECT DISTINCT
                cd.id, cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
                dp.dimensions
            FROM context_definitions cd
            LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id
            WHERE cd.id IN (
                SELECT context_id FROM numeric_facts WHERE filing_id = ?
                UNION
                SELECT context_id FROM text_facts WHERE filing_id = ?
            )
            """,
            (filing_id, filing_id)
        )
        result["contexts"] = [dict(row) for row in cursor.fetchall()]

        # Get distinct units
        cursor = conn.execute(
            "SELECT DISTINCT unit FROM numeric_facts WHERE filing_id = ? AND unit IS NOT NULL",
            (filing_id,)
        )
        result["units"] = [row["unit"] for row in cursor.fetchall()]

        # Get numeric facts
        cursor = conn.execute(
            """
            SELECT
                nf.id, nf.filing_id, nf.value, nf.unit,
                c.concept, c.concept_raw, c.namespace,
                cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
                dp.dimensions
            FROM numeric_facts nf
            JOIN concepts c ON nf.concept_id = c.id
            JOIN context_definitions cd ON nf.context_id = cd.id
            LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id
            WHERE nf.filing_id = ?
            """,
            (filing_id,)
        )
        result["numeric_facts"] = [dict(row) for row in cursor.fetchall()]

        # Get text facts
        cursor = conn.execute(
            """
            SELECT
                tf.id, tf.filing_id, tf.value,
                c.concept, c.concept_raw, c.namespace,
                cd.period_type, cd.instant_date, cd.start_date, cd.end_date,
                dp.dimensions
            FROM text_facts tf
            JOIN concepts c ON tf.concept_id = c.id
            JOIN context_definitions cd ON tf.context_id = cd.id
            LEFT JOIN dimension_patterns dp ON cd.dimension_pattern_id = dp.id
            WHERE tf.filing_id = ?
            """,
            (filing_id,)
        )
        result["text_facts"] = [dict(row) for row in cursor.fetchall()]

        return result
    finally:
        conn.close()


def get_filing_by_source(source_file: str) -> dict | None:
    """
    Get a filing by its source filename.

    Args:
        source_file: Original filename from the ZIP archive

    Returns:
        Filing dict or None if not found
    """
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT id, company_number, batch_id, source_file, source_type,
                   balance_sheet_date, period_start_date, period_end_date, loaded_at
            FROM filings
            WHERE source_file = ?
            """,
            (source_file,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def search_companies(name_pattern: str, limit: int = 100) -> list[dict]:
    """
    Search companies by name pattern.

    Args:
        name_pattern: SQL LIKE pattern (e.g., "%ACME%")
        limit: Maximum results to return

    Returns:
        List of company dicts matching the pattern
    """
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT company_number, name, jurisdiction
            FROM companies
            WHERE name LIKE ?
            LIMIT ?
            """,
            (name_pattern, limit)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_facts_by_concept(concept: str, limit: int = 1000) -> list[dict]:
    """
    Get all numeric facts for a given concept across all filings.

    Useful for analysis queries like "all TurnoverRevenue values".

    Args:
        concept: Normalized concept name (e.g., "TurnoverRevenue")
        limit: Maximum results to return

    Returns:
        List of fact dicts with company/filing context
    """
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT
                nf.id, nf.filing_id, nf.value, nf.unit,
                c.concept, c.concept_raw,
                f.company_number, f.balance_sheet_date,
                co.name as company_name,
                cd.period_type, cd.instant_date, cd.start_date, cd.end_date
            FROM numeric_facts nf
            JOIN concepts c ON nf.concept_id = c.id
            JOIN filings f ON nf.filing_id = f.id
            LEFT JOIN companies co ON f.company_number = co.company_number
            JOIN context_definitions cd ON nf.context_id = cd.id
            WHERE c.concept = ?
            LIMIT ?
            """,
            (concept, limit)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_database_stats() -> dict[str, Any]:
    """
    Get statistics about the database contents.

    Returns:
        Dict with counts for companies, filings, facts, lookup tables, etc.
    """
    conn = get_connection(read_only=True)
    try:
        stats = {}

        for table in ["companies", "filings", "numeric_facts", "text_facts",
                      "concepts", "dimension_patterns", "context_definitions", "batches"]:
            cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
            stats[f"{table}_count"] = cursor.fetchone()[0]

        # Date range
        cursor = conn.execute(
            "SELECT MIN(balance_sheet_date), MAX(balance_sheet_date) FROM filings"
        )
        row = cursor.fetchone()
        stats["earliest_filing"] = row[0]
        stats["latest_filing"] = row[1]

        return stats
    finally:
        conn.close()


if __name__ == "__main__":
    # Quick test when run directly
    stats = get_database_stats()
    print("Database Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
