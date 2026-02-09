#!/usr/bin/env python3
"""
Batch loader for all Companies House daily ZIP files.

Processes all ZIP files in scripts/data/daily/, skipping already-loaded batches.
Designed for resumable operation - can be interrupted and restarted.

Usage:
    python scripts/load_all_batches.py
    python scripts/load_all_batches.py --dry-run     # Preview what would be loaded
    python scripts/load_all_batches.py --limit 5     # Process only 5 batches
"""

from __future__ import annotations

import argparse
import logging
import signal
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.db.connection import get_connection, init_db
from backend.loader.bulk_loader import (
    BatchResult,
    ResolutionCache,
    configure_for_bulk_load,
    drop_indexes_for_bulk_load,
    load_batch,
    recreate_indexes,
    restore_normal_config,
)

# Configure logging
log_dir = PROJECT_ROOT / "logs"
log_dir.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_dir / "batch_load.log")
    ]
)
logger = logging.getLogger(__name__)

# Directory containing daily ZIP files
DAILY_DATA_DIR = PROJECT_ROOT / "scripts" / "data" / "daily"

# Global flag for graceful shutdown
shutdown_requested = False


def signal_handler(signum, frame):
    """Handle interrupt signal for graceful shutdown."""
    global shutdown_requested
    if shutdown_requested:
        logger.warning("Force quit requested. Exiting immediately.")
        sys.exit(1)
    logger.warning("Shutdown requested. Will stop after current batch completes.")
    logger.warning("Press Ctrl+C again to force quit.")
    shutdown_requested = True


def get_loaded_batches() -> set[str]:
    """Get set of already-loaded batch filenames from database."""
    conn = get_connection(read_only=True)
    try:
        cursor = conn.execute(
            "SELECT filename FROM batches WHERE processed_at IS NOT NULL"
        )
        return {row["filename"] for row in cursor.fetchall()}
    finally:
        conn.close()


def get_pending_batches() -> list[Path]:
    """
    Get list of ZIP files that haven't been loaded yet.

    Returns files sorted by date (oldest first).
    """
    if not DAILY_DATA_DIR.exists():
        raise FileNotFoundError(f"Daily data directory not found: {DAILY_DATA_DIR}")

    # Get all ZIP files
    all_zips = sorted(DAILY_DATA_DIR.glob("*.zip"))

    # Get already loaded
    loaded = get_loaded_batches()

    # Filter to pending
    pending = [z for z in all_zips if z.name not in loaded]

    return pending


def format_duration(seconds: float) -> str:
    """Format duration in human-readable form."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins}m {secs}s"
    else:
        hours = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        return f"{hours}h {mins}m"


def estimate_remaining(
    batches_done: int,
    batches_total: int,
    elapsed_seconds: float
) -> str:
    """Estimate remaining time based on progress."""
    if batches_done == 0:
        return "calculating..."

    avg_per_batch = elapsed_seconds / batches_done
    remaining_batches = batches_total - batches_done
    remaining_seconds = avg_per_batch * remaining_batches

    return format_duration(remaining_seconds)


def load_all_batches(
    dry_run: bool = False,
    limit: int | None = None
) -> dict:
    """
    Load all pending batches into the database.

    Args:
        dry_run: If True, only show what would be loaded
        limit: Maximum number of batches to process (None = all)

    Returns:
        Statistics dict with results
    """
    # Ensure logs directory exists
    (PROJECT_ROOT / "logs").mkdir(exist_ok=True)

    # Get pending batches
    pending = get_pending_batches()

    if limit:
        pending = pending[:limit]

    total_batches = len(pending)

    if total_batches == 0:
        logger.info("No pending batches to load. All ZIP files already processed.")
        return {
            "batches_total": 0,
            "batches_processed": 0,
            "batches_failed": 0,
            "files_total": 0,
            "files_processed": 0,
            "files_failed": 0,
            "duration_seconds": 0
        }

    logger.info(f"Found {total_batches} pending batches to load")

    if dry_run:
        logger.info("DRY RUN - would process:")
        for i, batch in enumerate(pending, 1):
            logger.info(f"  {i}. {batch.name}")
        return {"dry_run": True, "batches_pending": total_batches}

    # Statistics
    results: list[BatchResult] = []
    failed_batches: list[tuple[str, str]] = []
    start_time = time.time()

    # Set up shared connection, cache, and indexes for entire run
    init_db()
    conn = get_connection()

    try:
        configure_for_bulk_load(conn)
        drop_indexes_for_bulk_load(conn)
        cache = ResolutionCache(conn)

        # Process each batch
        for i, batch_path in enumerate(pending, 1):
            if shutdown_requested:
                logger.warning("Shutdown requested. Stopping batch processing.")
                break

            elapsed = time.time() - start_time
            eta = estimate_remaining(i - 1, total_batches, elapsed)

            logger.info("=" * 70)
            logger.info(f"BATCH {i}/{total_batches}: {batch_path.name}")
            logger.info(f"Elapsed: {format_duration(elapsed)} | ETA: {eta}")
            logger.info("=" * 70)

            batch_start = time.time()

            try:
                result = load_batch(batch_path, conn=conn, cache=cache)
                results.append(result)

                batch_duration = time.time() - batch_start
                files_per_min = result.files_total / (batch_duration / 60) if batch_duration > 0 else 0

                logger.info(
                    f"Batch complete: {result.files_processed}/{result.files_total} files "
                    f"in {format_duration(batch_duration)} ({files_per_min:.0f} files/min)"
                )

                if result.files_failed > 0:
                    logger.warning(f"  {result.files_failed} files failed in this batch")

            except Exception as e:
                logger.error(f"BATCH FAILED: {batch_path.name} - {e}")
                failed_batches.append((batch_path.name, str(e)))

        # Recreate indexes after all batches are done
        logger.info("Recreating indexes...")
        recreate_indexes(conn)

    finally:
        try:
            restore_normal_config(conn)
            conn.commit()
        except:
            pass
        conn.close()

    # Calculate totals
    total_duration = time.time() - start_time
    total_files = sum(r.files_total for r in results)
    total_processed = sum(r.files_processed for r in results)
    total_failed = sum(r.files_failed for r in results)

    # Final report
    logger.info("")
    logger.info("=" * 70)
    logger.info("LOAD COMPLETE")
    logger.info("=" * 70)
    logger.info(f"Batches processed: {len(results)}/{total_batches}")
    logger.info(f"Files total: {total_files:,}")
    logger.info(f"Files processed: {total_processed:,}")
    logger.info(f"Files failed: {total_failed:,}")
    logger.info(f"Total duration: {format_duration(total_duration)}")

    if total_duration > 0:
        overall_rate = total_files / (total_duration / 60)
        logger.info(f"Average rate: {overall_rate:.0f} files/minute")

    if failed_batches:
        logger.error("")
        logger.error(f"FAILED BATCHES ({len(failed_batches)}):")
        for name, error in failed_batches:
            logger.error(f"  - {name}: {error}")

    if shutdown_requested:
        remaining = total_batches - len(results)
        logger.warning(f"Load was interrupted. {remaining} batches remaining.")
        logger.warning("Run script again to continue.")

    return {
        "batches_total": total_batches,
        "batches_processed": len(results),
        "batches_failed": len(failed_batches),
        "files_total": total_files,
        "files_processed": total_processed,
        "files_failed": total_failed,
        "duration_seconds": total_duration,
        "interrupted": shutdown_requested
    }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Load all Companies House daily batch files"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be loaded without actually loading"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of batches to process"
    )

    args = parser.parse_args()

    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("Companies House Batch Loader")
    logger.info(f"Data directory: {DAILY_DATA_DIR}")
    logger.info("")

    try:
        stats = load_all_batches(
            dry_run=args.dry_run,
            limit=args.limit
        )

        if not args.dry_run:
            # Write summary to file
            summary_file = PROJECT_ROOT / "logs" / "batch_load_summary.txt"
            with open(summary_file, "w") as f:
                f.write(f"Batch Load Summary - {datetime.now().isoformat()}\n")
                f.write("=" * 50 + "\n")
                for key, value in stats.items():
                    f.write(f"{key}: {value}\n")

            logger.info(f"\nSummary written to: {summary_file}")

    except FileNotFoundError as e:
        logger.error(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
