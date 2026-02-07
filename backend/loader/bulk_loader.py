# Bulk loader pipeline
# See docs/HANDOVER_IMPLEMENTATION.md for process flow
"""
Bulk loader for Companies House daily ZIP files.

Processes daily ZIP archives containing iXBRL/XBRL filings and loads
parsed data into SQLite database.

Performance optimizations:
- Batch commits (every N files instead of per-file)
- executemany() for bulk inserts
- Multiprocessing for parallel parsing
- Optimized PRAGMA settings during bulk load

Usage:
    python -m backend.loader.bulk_loader "path/to/Accounts_Bulk_Data-2023-12-01.zip"
"""

from __future__ import annotations

import json
import logging
import sqlite3
import zipfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from backend.db.connection import get_connection, init_db
# Use fast lxml-based parser (14x faster than BeautifulSoup)
from backend.parser.ixbrl_fast import ParsedIXBRL, parse_ixbrl_fast as parse_ixbrl

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Performance tuning constants
COMMIT_BATCH_SIZE = 500  # Commit every N files
PARALLEL_WORKERS = 4     # Number of parallel parsing workers


@dataclass
class BatchResult:
    """Result of loading a batch ZIP file."""
    batch_id: int
    filename: str
    files_total: int
    files_processed: int
    files_failed: int
    errors: list[str]


@dataclass
class FileResult:
    """Result of processing a single file."""
    success: bool
    filing_id: int | None = None
    error: str | None = None


@dataclass
class ParsedFile:
    """Parsed file ready for database insertion."""
    source_file: str
    source_type: str
    parsed: ParsedIXBRL | None = None
    error: str | None = None


def detect_source_type(filename: str) -> str:
    """
    Detect the source type based on filename extension.

    Returns:
        'ixbrl_html' for .html/.xhtml files
        'xbrl_xml' for .xml files
        'cic_zip' for nested .zip files
    """
    lower = filename.lower()
    if lower.endswith(('.html', '.xhtml', '.htm')):
        return 'ixbrl_html'
    elif lower.endswith('.xml'):
        return 'xbrl_xml'
    elif lower.endswith('.zip'):
        return 'cic_zip'
    return 'ixbrl_html'  # Default assumption


def parse_file_content(args: tuple[str, bytes, str]) -> list[ParsedFile]:
    """
    Parse file content (worker function for multiprocessing).

    Args:
        args: Tuple of (source_file, content, source_type)

    Returns:
        List of ParsedFile objects (multiple for CIC ZIPs)
    """
    source_file, content, source_type = args
    results = []

    try:
        if source_type == 'cic_zip':
            # Process nested CIC ZIP
            with zipfile.ZipFile(BytesIO(content)) as inner_zip:
                for entry in inner_zip.namelist():
                    lower = entry.lower()
                    if lower.endswith(('.xhtml', '.html', '.xml')) and not entry.startswith('__'):
                        try:
                            inner_content = inner_zip.read(entry)
                            parsed = parse_ixbrl(inner_content)
                            results.append(ParsedFile(
                                source_file=f"{source_file}!{entry}",
                                source_type='ixbrl_html',
                                parsed=parsed
                            ))
                        except Exception as e:
                            results.append(ParsedFile(
                                source_file=f"{source_file}!{entry}",
                                source_type='ixbrl_html',
                                error=str(e)
                            ))
        else:
            # Parse directly
            parsed = parse_ixbrl(content)
            results.append(ParsedFile(
                source_file=source_file,
                source_type=source_type,
                parsed=parsed
            ))
    except Exception as e:
        results.append(ParsedFile(
            source_file=source_file,
            source_type=source_type,
            error=str(e)
        ))

    return results


def configure_for_bulk_load(conn: sqlite3.Connection) -> None:
    """Configure SQLite for maximum bulk load performance."""
    conn.execute("PRAGMA synchronous = OFF")
    conn.execute("PRAGMA journal_mode = MEMORY")
    conn.execute("PRAGMA temp_store = MEMORY")
    conn.execute("PRAGMA cache_size = -256000")  # 256MB cache


def restore_normal_config(conn: sqlite3.Connection) -> None:
    """Restore normal SQLite configuration after bulk load."""
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA journal_mode = WAL")


def bulk_insert_filing(
    conn: sqlite3.Connection,
    parsed: ParsedIXBRL,
    company_number: str,
    batch_id: int,
    source_file: str,
    source_type: str
) -> int:
    """
    Insert a complete filing with all related data using batch operations.

    Returns:
        The filing ID
    """
    # Insert filing record
    cursor = conn.execute(
        """
        INSERT INTO filings (
            company_number, batch_id, source_file, source_type,
            balance_sheet_date, period_start_date, period_end_date, loaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            company_number,
            batch_id,
            source_file,
            source_type,
            parsed.balance_sheet_date or "unknown",
            parsed.period_start_date,
            parsed.period_end_date,
            datetime.now().isoformat()
        )
    )
    filing_id = cursor.lastrowid

    # Bulk insert contexts
    if parsed.contexts:
        conn.executemany(
            """
            INSERT INTO contexts (
                filing_id, context_ref, entity_identifier, entity_scheme,
                period_type, instant_date, start_date, end_date,
                dimensions, segment_raw
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    filing_id,
                    ctx.context_ref,
                    ctx.entity_identifier,
                    ctx.entity_scheme,
                    ctx.period_type,
                    ctx.instant_date,
                    ctx.start_date,
                    ctx.end_date,
                    json.dumps(ctx.dimensions) if ctx.dimensions else None,
                    ctx.segment_raw
                )
                for ctx in parsed.contexts
            ]
        )

    # Bulk insert units
    if parsed.units:
        conn.executemany(
            """
            INSERT INTO units (filing_id, unit_ref, measure_raw, measure)
            VALUES (?, ?, ?, ?)
            """,
            [(filing_id, u.unit_ref, u.measure_raw, u.measure) for u in parsed.units]
        )

    # Bulk insert numeric facts
    if parsed.numeric_facts:
        conn.executemany(
            """
            INSERT INTO numeric_facts (
                filing_id, concept_raw, concept, context_ref, unit_ref,
                value_raw, value, sign, decimals, scale, format
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    filing_id,
                    f.concept_raw,
                    f.concept,
                    f.context_ref,
                    f.unit_ref,
                    f.value_raw,
                    f.value,
                    f.sign,
                    f.decimals,
                    f.scale,
                    f.format
                )
                for f in parsed.numeric_facts
            ]
        )

    # Bulk insert text facts
    if parsed.text_facts:
        conn.executemany(
            """
            INSERT INTO text_facts (
                filing_id, concept_raw, concept, context_ref,
                value, format, "escape"
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    filing_id,
                    f.concept_raw,
                    f.concept,
                    f.context_ref,
                    f.value,
                    f.format,
                    f.escape
                )
                for f in parsed.text_facts
            ]
        )

    return filing_id


def upsert_company(
    conn: sqlite3.Connection,
    company_number: str | None,
    company_name: str | None
) -> str | None:
    """Insert or update company record."""
    if not company_number:
        return None

    company_number = company_number.strip().upper()

    conn.execute(
        "INSERT OR IGNORE INTO companies (company_number) VALUES (?)",
        (company_number,)
    )

    if company_name:
        conn.execute(
            "UPDATE companies SET name = ? WHERE company_number = ?",
            (company_name.strip(), company_number)
        )

    return company_number


def create_batch(conn: sqlite3.Connection, zip_path: Path, file_count: int) -> int:
    """Create a batch record for tracking."""
    cursor = conn.execute(
        """
        INSERT INTO batches (filename, downloaded_at, file_count)
        VALUES (?, ?, ?)
        """,
        (zip_path.name, datetime.now().isoformat(), file_count)
    )
    return cursor.lastrowid


def mark_batch_complete(conn: sqlite3.Connection, batch_id: int) -> None:
    """Mark a batch as complete with processed timestamp."""
    conn.execute(
        "UPDATE batches SET processed_at = ? WHERE id = ?",
        (datetime.now().isoformat(), batch_id)
    )


def load_batch(zip_path: str | Path, workers: int = PARALLEL_WORKERS) -> BatchResult:
    """
    Load a daily ZIP file into the database with optimized performance.

    Uses parallel parsing and batch database operations for speed.

    Args:
        zip_path: Path to the ZIP file to process
        workers: Number of parallel workers for parsing (default: 4)

    Returns:
        BatchResult with statistics and any errors
    """
    zip_path = Path(zip_path)

    if not zip_path.exists():
        raise FileNotFoundError(f"ZIP file not found: {zip_path}")

    # Ensure database is initialized
    init_db()

    conn = get_connection()
    errors: list[str] = []
    files_processed = 0
    files_failed = 0

    try:
        # Configure for bulk load performance
        configure_for_bulk_load(conn)

        with zipfile.ZipFile(zip_path, 'r') as zf:
            # Get list of processable files
            entries = [
                name for name in zf.namelist()
                if not name.endswith('/') and not name.startswith('__')
            ]
            files_total = len(entries)

            logger.info(f"Processing {zip_path.name}: {files_total} files with {workers} workers")

            # Create batch record
            batch_id = create_batch(conn, zip_path, files_total)
            conn.commit()

            # Phase 1: Parallel parsing
            logger.info("Phase 1: Parsing files...")
            parse_jobs = []
            for entry in entries:
                content = zf.read(entry)
                source_type = detect_source_type(entry)
                parse_jobs.append((entry, content, source_type))

            parsed_files: list[ParsedFile] = []

            # Use multiprocessing for parallel parsing
            with ProcessPoolExecutor(max_workers=workers) as executor:
                futures = {executor.submit(parse_file_content, job): job[0] for job in parse_jobs}

                completed = 0
                for future in as_completed(futures):
                    completed += 1
                    if completed % 1000 == 0:
                        logger.info(f"Parsed {completed}/{files_total} files")

                    try:
                        results = future.result()
                        parsed_files.extend(results)
                    except Exception as e:
                        source_file = futures[future]
                        parsed_files.append(ParsedFile(
                            source_file=source_file,
                            source_type='unknown',
                            error=str(e)
                        ))

            logger.info(f"Parsing complete: {len(parsed_files)} items to insert")

            # Phase 2: Batch database insertion
            logger.info("Phase 2: Inserting into database...")

            for i, pf in enumerate(parsed_files, 1):
                try:
                    if pf.error:
                        files_failed += 1
                        errors.append(f"{pf.source_file}: {pf.error}")
                        continue

                    if not pf.parsed:
                        files_failed += 1
                        errors.append(f"{pf.source_file}: No parsed data")
                        continue

                    # Get company number
                    company_number = upsert_company(
                        conn, pf.parsed.company_number, pf.parsed.company_name
                    )

                    if not company_number:
                        # Try to extract from filename
                        parts = pf.source_file.split("_")
                        if len(parts) >= 3:
                            company_number = parts[2]
                            upsert_company(conn, company_number, None)

                    if not company_number:
                        files_failed += 1
                        errors.append(f"{pf.source_file}: No company number")
                        continue

                    # Insert filing with all data
                    bulk_insert_filing(
                        conn, pf.parsed, company_number,
                        batch_id, pf.source_file, pf.source_type
                    )
                    files_processed += 1

                except Exception as e:
                    files_failed += 1
                    errors.append(f"{pf.source_file}: {str(e)}")

                # Batch commit for performance
                if i % COMMIT_BATCH_SIZE == 0:
                    conn.commit()
                    logger.info(f"Inserted {i}/{len(parsed_files)} ({files_processed} successful)")

            # Final commit
            mark_batch_complete(conn, batch_id)
            conn.commit()

            logger.info(
                f"Batch complete: {files_processed} processed, "
                f"{files_failed} failed out of {files_total}"
            )

            return BatchResult(
                batch_id=batch_id,
                filename=zip_path.name,
                files_total=files_total,
                files_processed=files_processed,
                files_failed=files_failed,
                errors=errors[:100]
            )

    finally:
        # Restore normal configuration
        try:
            restore_normal_config(conn)
            conn.commit()
        except:
            pass
        conn.close()


def load_batch_sequential(zip_path: str | Path) -> BatchResult:
    """
    Load a batch without multiprocessing (for debugging or when parallel fails).

    Uses batch commits and executemany but processes files sequentially.
    """
    zip_path = Path(zip_path)

    if not zip_path.exists():
        raise FileNotFoundError(f"ZIP file not found: {zip_path}")

    init_db()
    conn = get_connection()
    errors: list[str] = []
    files_processed = 0
    files_failed = 0

    try:
        configure_for_bulk_load(conn)

        with zipfile.ZipFile(zip_path, 'r') as zf:
            entries = [
                name for name in zf.namelist()
                if not name.endswith('/') and not name.startswith('__')
            ]
            files_total = len(entries)

            logger.info(f"Processing {zip_path.name}: {files_total} files (sequential mode)")

            batch_id = create_batch(conn, zip_path, files_total)
            conn.commit()

            for i, entry in enumerate(entries, 1):
                source_type = detect_source_type(entry)

                try:
                    content = zf.read(entry)
                    parsed_files = parse_file_content((entry, content, source_type))

                    for pf in parsed_files:
                        if pf.error:
                            files_failed += 1
                            errors.append(f"{pf.source_file}: {pf.error}")
                            continue

                        if not pf.parsed:
                            files_failed += 1
                            continue

                        company_number = upsert_company(
                            conn, pf.parsed.company_number, pf.parsed.company_name
                        )

                        if not company_number:
                            parts = pf.source_file.split("_")
                            if len(parts) >= 3:
                                company_number = parts[2]
                                upsert_company(conn, company_number, None)

                        if not company_number:
                            files_failed += 1
                            errors.append(f"{pf.source_file}: No company number")
                            continue

                        bulk_insert_filing(
                            conn, pf.parsed, company_number,
                            batch_id, pf.source_file, pf.source_type
                        )
                        files_processed += 1

                except Exception as e:
                    files_failed += 1
                    errors.append(f"{entry}: {str(e)}")

                # Batch commit
                if i % COMMIT_BATCH_SIZE == 0:
                    conn.commit()
                    logger.info(f"Progress: {i}/{files_total} ({files_processed} successful)")

            mark_batch_complete(conn, batch_id)
            conn.commit()

            logger.info(
                f"Batch complete: {files_processed} processed, "
                f"{files_failed} failed out of {files_total}"
            )

            return BatchResult(
                batch_id=batch_id,
                filename=zip_path.name,
                files_total=files_total,
                files_processed=files_processed,
                files_failed=files_failed,
                errors=errors[:100]
            )

    finally:
        try:
            restore_normal_config(conn)
            conn.commit()
        except:
            pass
        conn.close()


def get_batch_stats(batch_id: int | None = None) -> dict:
    """Get statistics for a batch or all batches."""
    conn = get_connection(read_only=True)
    try:
        if batch_id:
            cursor = conn.execute(
                """
                SELECT
                    b.*,
                    COUNT(DISTINCT f.id) as filings_count,
                    COUNT(DISTINCT f.company_number) as companies_count
                FROM batches b
                LEFT JOIN filings f ON f.batch_id = b.id
                WHERE b.id = ?
                GROUP BY b.id
                """,
                (batch_id,)
            )
        else:
            cursor = conn.execute(
                """
                SELECT
                    b.*,
                    COUNT(DISTINCT f.id) as filings_count,
                    COUNT(DISTINCT f.company_number) as companies_count
                FROM batches b
                LEFT JOIN filings f ON f.batch_id = b.id
                GROUP BY b.id
                ORDER BY b.id DESC
                """
            )

        rows = cursor.fetchall()
        return {"batches": [dict(row) for row in rows]}
    finally:
        conn.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m backend.loader.bulk_loader <zip_path> [--sequential]")
        print("\nOptions:")
        print("  --sequential  Use sequential mode (no multiprocessing)")
        print("\nExample:")
        print('  python -m backend.loader.bulk_loader "scripts/data/daily/Accounts_Bulk_Data-2023-12-01.zip"')
        sys.exit(1)

    zip_path = sys.argv[1]
    sequential = "--sequential" in sys.argv

    print(f"Loading batch: {zip_path}")
    print(f"Mode: {'sequential' if sequential else 'parallel'}")
    print("-" * 60)

    if sequential:
        result = load_batch_sequential(zip_path)
    else:
        result = load_batch(zip_path)

    print(f"\nBatch ID: {result.batch_id}")
    print(f"Filename: {result.filename}")
    print(f"Files Total: {result.files_total}")
    print(f"Files Processed: {result.files_processed}")
    print(f"Files Failed: {result.files_failed}")

    if result.errors:
        print(f"\nFirst {min(10, len(result.errors))} errors:")
        for error in result.errors[:10]:
            print(f"  - {error[:100]}...")
