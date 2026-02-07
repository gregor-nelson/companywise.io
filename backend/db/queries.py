# Data access layer - query functions
# See docs/ARCHITECTURE_PROPOSAL.md Section 8.2 for function signatures
"""
Query functions for retrieving Companies House data from SQLite.

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
        List of numeric fact dicts with all columns including value_raw and value
    """
    conn = get_connection(read_only=True)
    try:
        if concept:
            cursor = conn.execute(
                """
                SELECT id, filing_id, concept_raw, concept, context_ref, unit_ref,
                       value_raw, value, sign, decimals, scale, format
                FROM numeric_facts
                WHERE filing_id = ? AND concept = ?
                """,
                (filing_id, concept)
            )
        else:
            cursor = conn.execute(
                """
                SELECT id, filing_id, concept_raw, concept, context_ref, unit_ref,
                       value_raw, value, sign, decimals, scale, format
                FROM numeric_facts
                WHERE filing_id = ?
                """,
                (filing_id,)
            )
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
        List of text fact dicts
    """
    conn = get_connection(read_only=True)
    try:
        if concept:
            cursor = conn.execute(
                """
                SELECT id, filing_id, concept_raw, concept, context_ref,
                       value, format, "escape"
                FROM text_facts
                WHERE filing_id = ? AND concept = ?
                """,
                (filing_id, concept)
            )
        else:
            cursor = conn.execute(
                """
                SELECT id, filing_id, concept_raw, concept, context_ref,
                       value, format, "escape"
                FROM text_facts
                WHERE filing_id = ?
                """,
                (filing_id,)
            )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_contexts(filing_id: int) -> list[dict]:
    """
    Get all contexts for a filing.

    Args:
        filing_id: Database ID of the filing

    Returns:
        List of context dicts with period and dimension info
    """
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT id, filing_id, context_ref, entity_identifier, entity_scheme,
                   period_type, instant_date, start_date, end_date,
                   dimensions, segment_raw
            FROM contexts
            WHERE filing_id = ?
            """,
            (filing_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_units(filing_id: int) -> list[dict]:
    """
    Get all units for a filing.

    Args:
        filing_id: Database ID of the filing

    Returns:
        List of unit dicts with measure_raw and measure
    """
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            """
            SELECT id, filing_id, unit_ref, measure_raw, measure
            FROM units
            WHERE filing_id = ?
            """,
            (filing_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
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

        # Get contexts
        cursor = conn.execute(
            """
            SELECT id, filing_id, context_ref, entity_identifier, entity_scheme,
                   period_type, instant_date, start_date, end_date,
                   dimensions, segment_raw
            FROM contexts
            WHERE filing_id = ?
            """,
            (filing_id,)
        )
        result["contexts"] = [dict(row) for row in cursor.fetchall()]

        # Get units
        cursor = conn.execute(
            """
            SELECT id, filing_id, unit_ref, measure_raw, measure
            FROM units
            WHERE filing_id = ?
            """,
            (filing_id,)
        )
        result["units"] = [dict(row) for row in cursor.fetchall()]

        # Get numeric facts
        cursor = conn.execute(
            """
            SELECT id, filing_id, concept_raw, concept, context_ref, unit_ref,
                   value_raw, value, sign, decimals, scale, format
            FROM numeric_facts
            WHERE filing_id = ?
            """,
            (filing_id,)
        )
        result["numeric_facts"] = [dict(row) for row in cursor.fetchall()]

        # Get text facts
        cursor = conn.execute(
            """
            SELECT id, filing_id, concept_raw, concept, context_ref,
                   value, format, "escape"
            FROM text_facts
            WHERE filing_id = ?
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
                nf.id, nf.filing_id, nf.concept_raw, nf.concept,
                nf.value_raw, nf.value, nf.sign, nf.scale,
                f.company_number, f.balance_sheet_date,
                c.name as company_name
            FROM numeric_facts nf
            JOIN filings f ON nf.filing_id = f.id
            LEFT JOIN companies c ON f.company_number = c.company_number
            WHERE nf.concept = ?
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
        Dict with counts for companies, filings, facts, etc.
    """
    conn = get_connection(read_only=True)
    try:
        stats = {}

        for table in ["companies", "filings", "numeric_facts", "text_facts", "contexts", "units", "batches"]:
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
