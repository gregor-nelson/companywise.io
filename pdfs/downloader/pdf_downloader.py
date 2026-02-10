"""
PDF downloader — download and store PDF account filings.

Downloads PDFs from the Companies House document API, with resume support
and a manifest file tracking all downloads for the future parser.
"""

import json
import logging
from datetime import datetime
from pathlib import Path

from config.settings import DATA_DIR, MANIFEST_PATH
from downloader.api_client import CompaniesHouseAPI
from downloader.filing_discovery import PdfFiling

logger = logging.getLogger(__name__)


def make_filename(filing: PdfFiling) -> str:
    """Generate a consistent filename for a PDF filing.

    Format: {company_number}_{made_up_to_or_filing_date}_{document_id}.pdf
    """
    date = filing.made_up_to or filing.filing_date
    # Sanitize date for filename (remove any slashes etc.)
    date_clean = date.replace("/", "-").replace(" ", "")
    return f"{filing.company_number}_{date_clean}_{filing.document_id}.pdf"


def download_pdf(
    api: CompaniesHouseAPI,
    filing: PdfFiling,
    output_dir: Path | None = None,
) -> Path | None:
    """Download a single PDF filing.

    Args:
        api: Authenticated API client
        filing: Filing metadata from discovery
        output_dir: Where to save (defaults to DATA_DIR)

    Returns:
        Path to downloaded file, or None if skipped/failed
    """
    output_dir = output_dir or DATA_DIR
    filename = make_filename(filing)
    output_path = output_dir / filename

    if output_path.exists():
        logger.info(f"  Skipping (exists): {filename}")
        return None

    try:
        api.download_document(filing.document_url, output_path)
        return output_path
    except Exception as e:
        logger.error(f"  Failed to download {filename}: {e}")
        # Clean up partial file
        if output_path.exists():
            output_path.unlink()
        return None


def load_manifest(manifest_path: Path | None = None) -> list[dict]:
    """Load existing manifest entries."""
    manifest_path = manifest_path or MANIFEST_PATH
    if manifest_path.exists():
        with open(manifest_path) as f:
            return json.load(f)
    return []


def save_manifest(entries: list[dict], manifest_path: Path | None = None):
    """Save manifest to disk."""
    manifest_path = manifest_path or MANIFEST_PATH
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(entries, f, indent=2)


def download_batch(
    api: CompaniesHouseAPI,
    filings: list[PdfFiling],
    output_dir: Path | None = None,
    limit: int | None = None,
) -> dict:
    """Download a batch of PDF filings with progress reporting.

    Args:
        api: Authenticated API client
        filings: List of filings to download
        output_dir: Where to save (defaults to DATA_DIR)
        limit: Maximum number of PDFs to download (None = all)

    Returns:
        Summary dict with counts and file paths
    """
    output_dir = output_dir or DATA_DIR
    filings_to_process = filings[:limit] if limit else filings

    downloaded = 0
    skipped = 0
    failed = 0
    paths = []

    # Load existing manifest and build a set of known document IDs
    manifest = load_manifest()
    known_ids = {e["document_id"] for e in manifest}

    logger.info(
        f"Downloading {len(filings_to_process)} PDFs "
        f"(manifest has {len(manifest)} existing entries)..."
    )

    for i, filing in enumerate(filings_to_process, 1):
        logger.info(
            f"[{i}/{len(filings_to_process)}] "
            f"{filing.company_number} — {filing.filing_date} "
            f"({filing.account_type})"
        )

        path = download_pdf(api, filing, output_dir)

        if path:
            downloaded += 1
            paths.append(str(path))

            # Add to manifest if not already tracked
            if filing.document_id not in known_ids:
                manifest.append({
                    "company_number": filing.company_number,
                    "filing_date": filing.filing_date,
                    "made_up_to": filing.made_up_to,
                    "description": filing.description,
                    "account_type": filing.account_type,
                    "document_id": filing.document_id,
                    "document_url": filing.document_url,
                    "filename": make_filename(filing),
                    "downloaded_at": datetime.now().isoformat(),
                })
                known_ids.add(filing.document_id)
        elif (output_dir / make_filename(filing)).exists():
            skipped += 1
            # Ensure it's in manifest even if we skipped the download
            if filing.document_id not in known_ids:
                manifest.append({
                    "company_number": filing.company_number,
                    "filing_date": filing.filing_date,
                    "made_up_to": filing.made_up_to,
                    "description": filing.description,
                    "account_type": filing.account_type,
                    "document_id": filing.document_id,
                    "document_url": filing.document_url,
                    "filename": make_filename(filing),
                    "downloaded_at": "previously_downloaded",
                })
                known_ids.add(filing.document_id)
        else:
            failed += 1

    # Save updated manifest
    save_manifest(manifest)

    rate_status = api.get_rate_limit_status()

    summary = {
        "total_filings": len(filings_to_process),
        "downloaded": downloaded,
        "skipped": skipped,
        "failed": failed,
        "manifest_entries": len(manifest),
        "api_requests_total": rate_status["total_requests"],
        "files": paths,
    }

    logger.info(
        f"Batch complete: {downloaded} downloaded, {skipped} skipped, {failed} failed. "
        f"Total API requests: {rate_status['total_requests']}"
    )

    return summary
