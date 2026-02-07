# Bulk loader pipeline — v2 schema (Prune + Normalize)
# See docs/SESSION_12_PLAN.md for implementation details
"""
Bulk loader for Companies House daily ZIP files.

Processes daily ZIP archives containing iXBRL/XBRL filings and loads
parsed data into SQLite database using the v2 schema with lookup tables.

v2 changes from v1:
- ResolutionCache maps parser output to lookup table IDs before inserting
- No more contexts/units table inserts
- Facts reference concept_id and context_id (INTEGER FKs) instead of inline strings
- Unit resolved to measure string inline on numeric_facts

Performance optimizations:
- Batch commits (every N files instead of per-file)
- executemany() for bulk inserts
- Multiprocessing for parallel parsing
- Optimized PRAGMA settings during bulk load
- Resolution cache pre-loaded at batch start, accumulates during batch

Usage:
    python -m backend.loader.bulk_loader "path/to/Accounts_Bulk_Data-2023-12-01.zip"
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
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
from backend.parser.ixbrl import normalize_concept

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Performance tuning constants
COMMIT_BATCH_SIZE = 500  # Commit every N files
PARALLEL_WORKERS = 4     # Number of parallel parsing workers

_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def normalize_date_to_iso(date_str: str | None) -> str | None:
    """Normalize a date string to ISO format (YYYY-MM-DD).

    Handles formats found in Companies House data:
    - ISO: "2023-02-28" (returned as-is)
    - Long text: "28 February 2023" / "1 March 2022"
    - Dot notation: "28.2.23" / "1.3.22" (2-digit year)
    - Slash notation: "28/02/2023" (DD/MM/YYYY)
    - Dash with full year: "28-2-2023" (D-M-YYYY)
    - US text: "February 28, 2023"
    """
    if not date_str:
        return None
    date_str = date_str.strip()
    if not date_str:
        return None
    if _ISO_DATE_RE.match(date_str):
        return date_str
    for fmt in ("%d %B %Y", "%d.%m.%y", "%d/%m/%Y", "%d-%m-%Y", "%B %d, %Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    logger.warning(f"Could not parse date: '{date_str}'")
    return date_str


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


class ResolutionCache:
    """Caches for resolving parser output to v2 lookup table IDs.

    Maps parser output (concept_raw strings, Context objects, Unit objects)
    to their corresponding database IDs in the lookup tables. Pre-loads
    existing entries at construction; inserts new ones on cache miss.
    """

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self._concepts: dict[str, int] = {}       # concept_raw -> concept_id
        self._dim_patterns: dict[str, int] = {}    # pattern_hash -> dimension_pattern_id
        self._ctx_defs: dict[str, int] = {}        # definition_hash -> context_definition_id
        self._load_existing()

    def _load_existing(self):
        """Pre-load existing lookup entries from database."""
        for row in self.conn.execute("SELECT id, concept_raw FROM concepts"):
            self._concepts[row["concept_raw"]] = row["id"]
        for row in self.conn.execute("SELECT id, pattern_hash FROM dimension_patterns"):
            self._dim_patterns[row["pattern_hash"]] = row["id"]
        for row in self.conn.execute("SELECT id, definition_hash FROM context_definitions"):
            self._ctx_defs[row["definition_hash"]] = row["id"]

        logger.info(
            f"ResolutionCache loaded: {len(self._concepts)} concepts, "
            f"{len(self._dim_patterns)} dimension patterns, "
            f"{len(self._ctx_defs)} context definitions"
        )

    def resolve_concept(self, concept_raw: str) -> int:
        """Resolve a concept_raw string to its concept_id in the lookup table."""
        if concept_raw in self._concepts:
            return self._concepts[concept_raw]

        # Insert new concept
        concept = normalize_concept(concept_raw)
        namespace = concept_raw.split(":")[0] if ":" in concept_raw else None

        cursor = self.conn.execute(
            "INSERT OR IGNORE INTO concepts (concept_raw, concept, namespace) VALUES (?, ?, ?)",
            (concept_raw, concept, namespace)
        )
        concept_id = cursor.lastrowid
        if concept_id == 0:
            # Row already existed (conflict on UNIQUE concept_raw)
            row = self.conn.execute(
                "SELECT id FROM concepts WHERE concept_raw = ?", (concept_raw,)
            ).fetchone()
            concept_id = row["id"]
        self._concepts[concept_raw] = concept_id
        return concept_id

    def resolve_context(self, context) -> int:
        """Resolve a parsed Context object to its context_definition_id.

        1. Hash dimensions JSON -> lookup/insert dimension_pattern
        2. Hash full context definition -> lookup/insert context_definition
        """
        # Step 1: Resolve dimension pattern
        dimension_pattern_id = None
        if context.dimensions:
            dims_json = json.dumps(context.dimensions, sort_keys=True)
            pattern_hash = hashlib.sha256(dims_json.encode()).hexdigest()

            if pattern_hash in self._dim_patterns:
                dimension_pattern_id = self._dim_patterns[pattern_hash]
            else:
                cursor = self.conn.execute(
                    "INSERT OR IGNORE INTO dimension_patterns (dimensions, pattern_hash) VALUES (?, ?)",
                    (dims_json, pattern_hash)
                )
                dimension_pattern_id = cursor.lastrowid
                if dimension_pattern_id == 0:
                    row = self.conn.execute(
                        "SELECT id FROM dimension_patterns WHERE pattern_hash = ?", (pattern_hash,)
                    ).fetchone()
                    dimension_pattern_id = row["id"]
                self._dim_patterns[pattern_hash] = dimension_pattern_id

        # Step 2: Resolve context definition
        # Build canonical string for hashing
        def_parts = "|".join([
            context.period_type or "",
            context.instant_date or "",
            context.start_date or "",
            context.end_date or "",
            str(dimension_pattern_id) if dimension_pattern_id is not None else "",
        ])
        definition_hash = hashlib.sha256(def_parts.encode()).hexdigest()

        if definition_hash in self._ctx_defs:
            return self._ctx_defs[definition_hash]

        cursor = self.conn.execute(
            """INSERT OR IGNORE INTO context_definitions
               (period_type, instant_date, start_date, end_date, dimension_pattern_id, definition_hash)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                context.period_type,
                context.instant_date,
                context.start_date,
                context.end_date,
                dimension_pattern_id,
                definition_hash,
            )
        )
        ctx_def_id = cursor.lastrowid
        if ctx_def_id == 0:
            row = self.conn.execute(
                "SELECT id FROM context_definitions WHERE definition_hash = ?", (definition_hash,)
            ).fetchone()
            ctx_def_id = row["id"]
        self._ctx_defs[definition_hash] = ctx_def_id
        return ctx_def_id


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
    source_type: str,
    cache: ResolutionCache,
) -> int:
    """
    Insert a complete filing with all related data using batch operations.

    v2: Uses ResolutionCache to resolve concepts, contexts, and units
    to lookup table IDs before inserting facts.

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
            normalize_date_to_iso(parsed.balance_sheet_date) or "unknown",
            normalize_date_to_iso(parsed.period_start_date),
            normalize_date_to_iso(parsed.period_end_date),
            datetime.now().isoformat()
        )
    )
    filing_id = cursor.lastrowid

    # Build per-filing resolution maps
    unit_map: dict[str, str] = {}      # unit_ref -> measure string
    context_map: dict[str, int] = {}   # context_ref -> context_definition_id

    for unit in parsed.units:
        unit_map[unit.unit_ref] = unit.measure

    for ctx in parsed.contexts:
        context_map[ctx.context_ref] = cache.resolve_context(ctx)

    # Bulk insert numeric facts
    if parsed.numeric_facts:
        numeric_rows = []
        for f in parsed.numeric_facts:
            if f.context_ref not in context_map:
                logger.warning(
                    f"Skipping numeric fact {f.concept_raw}: "
                    f"context_ref '{f.context_ref}' not found in filing {source_file}"
                )
                continue

            unit = None
            if f.unit_ref:
                if f.unit_ref in unit_map:
                    unit = unit_map[f.unit_ref]
                else:
                    logger.warning(
                        f"unit_ref '{f.unit_ref}' not found in filing {source_file}, setting unit=None"
                    )

            numeric_rows.append((
                filing_id,
                cache.resolve_concept(f.concept_raw),
                context_map[f.context_ref],
                unit,
                f.value,
            ))

        if numeric_rows:
            conn.executemany(
                """
                INSERT INTO numeric_facts (filing_id, concept_id, context_id, unit, value)
                VALUES (?, ?, ?, ?, ?)
                """,
                numeric_rows
            )

    # Bulk insert text facts
    if parsed.text_facts:
        text_rows = []
        for f in parsed.text_facts:
            if f.context_ref not in context_map:
                logger.warning(
                    f"Skipping text fact {f.concept_raw}: "
                    f"context_ref '{f.context_ref}' not found in filing {source_file}"
                )
                continue

            text_rows.append((
                filing_id,
                cache.resolve_concept(f.concept_raw),
                context_map[f.context_ref],
                f.value,
            ))

        if text_rows:
            conn.executemany(
                """
                INSERT INTO text_facts (filing_id, concept_id, context_id, value)
                VALUES (?, ?, ?, ?)
                """,
                text_rows
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

        # Create resolution cache (pre-loads existing lookup entries)
        cache = ResolutionCache(conn)

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
                        batch_id, pf.source_file, pf.source_type,
                        cache
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

        # Create resolution cache
        cache = ResolutionCache(conn)

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
                            batch_id, pf.source_file, pf.source_type,
                            cache
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
