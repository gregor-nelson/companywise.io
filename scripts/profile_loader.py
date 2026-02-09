"""
Profiling script for bulk loader performance analysis.

Identifies bottlenecks in:
1. ZIP file reading
2. iXBRL parsing (BeautifulSoup)
3. Database insertion

Usage:
    python scripts/profile_loader.py
"""

import cProfile
import pstats
import io
import time
import zipfile
from pathlib import Path
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Use fast lxml-based parser (14x faster)
from backend.parser.ixbrl_fast import parse_ixbrl_fast as parse_ixbrl
from backend.db.connection import get_connection, init_db
from backend.loader.bulk_loader import bulk_insert_filing, configure_for_bulk_load, ResolutionCache


def get_sample_files(zip_path: Path, count: int = 100) -> list[tuple[str, bytes]]:
    """Extract sample files from ZIP for profiling."""
    samples = []
    with zipfile.ZipFile(zip_path, 'r') as zf:
        entries = [n for n in zf.namelist()
                   if not n.endswith('/') and not n.startswith('__')
                   and n.lower().endswith(('.html', '.xhtml', '.htm'))]

        for entry in entries[:count]:
            content = zf.read(entry)
            samples.append((entry, content))

    return samples


def profile_parsing_only(samples: list[tuple[str, bytes]]) -> dict:
    """Profile just the parsing phase."""
    print(f"\n{'='*60}")
    print(f"PROFILING: Parsing Only ({len(samples)} files)")
    print(f"{'='*60}")

    start = time.perf_counter()
    results = []

    for name, content in samples:
        try:
            parsed = parse_ixbrl(content)
            results.append(parsed)
        except Exception as e:
            pass

    elapsed = time.perf_counter() - start
    files_per_min = (len(samples) / elapsed) * 60

    print(f"Time: {elapsed:.2f}s for {len(samples)} files")
    print(f"Rate: {files_per_min:.0f} files/minute (parsing only)")
    print(f"Avg per file: {(elapsed/len(samples))*1000:.1f}ms")

    return {
        "phase": "parsing",
        "files": len(samples),
        "time_sec": elapsed,
        "files_per_min": files_per_min,
        "results": results
    }


def profile_db_only(parsed_results: list, batch_id: int = 1) -> dict:
    """Profile just the database insertion phase."""
    print(f"\n{'='*60}")
    print(f"PROFILING: Database Only ({len(parsed_results)} filings)")
    print(f"{'='*60}")

    init_db(force=True)  # Fresh database
    conn = get_connection()
    configure_for_bulk_load(conn)
    cache = ResolutionCache(conn)

    # Create dummy batch
    conn.execute("INSERT INTO batches (filename, downloaded_at, file_count) VALUES (?, ?, ?)",
                 ("profile_test.zip", "2024-01-01", len(parsed_results)))
    conn.commit()

    start = time.perf_counter()

    for i, parsed in enumerate(parsed_results):
        if parsed is None:
            continue

        company_number = parsed.company_number or f"TEST{i:06d}"
        conn.execute("INSERT OR IGNORE INTO companies (company_number) VALUES (?)", (company_number,))

        bulk_insert_filing(
            conn, parsed, company_number,
            batch_id, f"test_file_{i}.html", "ixbrl_html",
            cache
        )

        if i % 50 == 0:
            conn.commit()

    conn.commit()
    elapsed = time.perf_counter() - start
    files_per_min = (len(parsed_results) / elapsed) * 60

    print(f"Time: {elapsed:.2f}s for {len(parsed_results)} filings")
    print(f"Rate: {files_per_min:.0f} files/minute (DB only)")
    print(f"Avg per file: {(elapsed/len(parsed_results))*1000:.1f}ms")

    conn.close()

    return {
        "phase": "database",
        "files": len(parsed_results),
        "time_sec": elapsed,
        "files_per_min": files_per_min
    }


def profile_detailed_parsing(samples: list[tuple[str, bytes]]) -> None:
    """Detailed cProfile of parsing to see which functions are slow."""
    print(f"\n{'='*60}")
    print(f"DETAILED PROFILE: parse_ixbrl breakdown")
    print(f"{'='*60}")

    profiler = cProfile.Profile()
    profiler.enable()

    for name, content in samples[:50]:  # Profile smaller set for detail
        try:
            parse_ixbrl(content)
        except:
            pass

    profiler.disable()

    # Get stats
    s = io.StringIO()
    stats = pstats.Stats(profiler, stream=s)
    stats.sort_stats('cumulative')
    stats.print_stats(30)  # Top 30 functions

    print(s.getvalue())


def profile_zip_read(zip_path: Path, count: int = 500) -> dict:
    """Profile just the ZIP reading phase."""
    print(f"\n{'='*60}")
    print(f"PROFILING: ZIP Reading ({count} files)")
    print(f"{'='*60}")

    start = time.perf_counter()

    with zipfile.ZipFile(zip_path, 'r') as zf:
        entries = [n for n in zf.namelist()
                   if not n.endswith('/') and not n.startswith('__')][:count]

        for entry in entries:
            content = zf.read(entry)

    elapsed = time.perf_counter() - start
    files_per_min = (count / elapsed) * 60

    print(f"Time: {elapsed:.2f}s for {count} files")
    print(f"Rate: {files_per_min:.0f} files/minute (ZIP read only)")

    return {
        "phase": "zip_read",
        "files": count,
        "time_sec": elapsed,
        "files_per_min": files_per_min
    }


def main():
    # Find a test ZIP file
    daily_dir = Path(__file__).resolve().parent / "data" / "daily"
    zip_files = sorted(daily_dir.glob("*.zip"))

    if not zip_files:
        print("ERROR: No ZIP files found in scripts/data/daily/")
        return

    # Use most recent ZIP
    test_zip = zip_files[0]
    print(f"Using test file: {test_zip.name}")

    # Get file count
    with zipfile.ZipFile(test_zip, 'r') as zf:
        total_files = len([n for n in zf.namelist() if not n.endswith('/')])
    print(f"Total files in ZIP: {total_files}")

    sample_size = 50  # Profile with 50 files (safe for 2GB VPS)

    # Phase 1: ZIP reading
    zip_stats = profile_zip_read(test_zip, sample_size)

    # Phase 2: Get samples and profile parsing
    samples = get_sample_files(test_zip, sample_size)
    parse_stats = profile_parsing_only(samples)

    # Phase 3: Profile database insertion (then free parsed results)
    db_stats = profile_db_only(parse_stats["results"])
    del parse_stats["results"]  # Free parsed data before detailed profiling

    # Phase 4: Detailed cProfile breakdown
    profile_detailed_parsing(samples)
    del samples  # Free raw bytes

    # Summary
    print(f"\n{'='*60}")
    print("PERFORMANCE SUMMARY")
    print(f"{'='*60}")
    print(f"ZIP Read:   {zip_stats['files_per_min']:,.0f} files/min ({zip_stats['time_sec']:.2f}s)")
    print(f"Parsing:    {parse_stats['files_per_min']:,.0f} files/min ({parse_stats['time_sec']:.2f}s)")
    print(f"Database:   {db_stats['files_per_min']:,.0f} files/min ({db_stats['time_sec']:.2f}s)")

    total_time = zip_stats['time_sec'] + parse_stats['time_sec'] + db_stats['time_sec']
    print(f"\nCombined:   {(sample_size / total_time) * 60:,.0f} files/min theoretical")

    # Identify bottleneck
    phases = [
        ("ZIP Read", zip_stats['time_sec']),
        ("Parsing", parse_stats['time_sec']),
        ("Database", db_stats['time_sec'])
    ]
    phases.sort(key=lambda x: x[1], reverse=True)

    print(f"\n>>> BOTTLENECK: {phases[0][0]} ({phases[0][1]:.2f}s = {phases[0][1]/total_time*100:.0f}% of time)")


if __name__ == "__main__":
    main()
