#!/usr/bin/env python3
"""
Download sample PDF account filings from Companies House.

Discovers PDF-only filings for specified companies and downloads them.
Used for building a sample set to inspect before designing the parser.

Usage:
    # Single company (smoke test)
    python scripts/download_sample.py --company 04231212

    # Multiple companies from a file
    python scripts/download_sample.py --companies companies.txt --limit 50

    # Discovery only (no download)
    python scripts/download_sample.py --company 04231212 --discover-only
"""

import argparse
import logging
import sys
from pathlib import Path

# Add the pdfs/ root to the path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.settings import DATA_DIR
from downloader.api_client import CompaniesHouseAPI
from downloader.filing_discovery import (
    discover_from_company_list,
    find_pdf_account_filings,
)
from downloader.pdf_downloader import download_batch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Download sample PDF account filings from Companies House"
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--company",
        help="Single company number to check (e.g. 04231212)",
    )
    group.add_argument(
        "--companies",
        type=Path,
        help="File with company numbers, one per line",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of PDFs to download",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DATA_DIR,
        help=f"Output directory (default: {DATA_DIR})",
    )
    parser.add_argument(
        "--discover-only",
        action="store_true",
        help="Only discover PDF filings, don't download",
    )

    args = parser.parse_args()

    # Initialize API client
    try:
        api = CompaniesHouseAPI()
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)

    print("=" * 60)
    print("Companies House PDF Filing Downloader")
    print("=" * 60)

    # Discover PDF-only filings
    if args.company:
        company_number = args.company.strip().upper()
        print(f"\nChecking company: {company_number}")
        pdf_filings = find_pdf_account_filings(company_number, api)
    else:
        with open(args.companies) as f:
            company_numbers = [line.strip() for line in f if line.strip()]
        print(f"\nChecking {len(company_numbers)} companies from {args.companies}")
        pdf_filings = discover_from_company_list(company_numbers, api)

    # Report discovery results
    print(f"\n{'=' * 60}")
    print(f"DISCOVERY RESULTS")
    print(f"{'=' * 60}")
    print(f"PDF-only filings found: {len(pdf_filings)}")

    if pdf_filings:
        # Group by company
        by_company = {}
        for f in pdf_filings:
            by_company.setdefault(f.company_number, []).append(f)

        print(f"Companies with PDF filings: {len(by_company)}")
        print()

        for company, filings in by_company.items():
            print(f"  {company}:")
            for f in filings:
                made_up = f" (made up to {f.made_up_to})" if f.made_up_to else ""
                print(f"    {f.filing_date} — {f.description}{made_up} [{f.account_type}]")

    if args.discover_only:
        print("\n(Discovery only — no downloads)")
        rate = api.get_rate_limit_status()
        print(f"API requests used: {rate['total_requests']}")
        return

    if not pdf_filings:
        print("\nNo PDF-only filings to download.")
        return

    # Download
    print(f"\n{'=' * 60}")
    print(f"DOWNLOADING")
    print(f"{'=' * 60}")
    print(f"Output directory: {args.output_dir}")
    if args.limit:
        print(f"Limit: {args.limit} files")

    summary = download_batch(api, pdf_filings, args.output_dir, limit=args.limit)

    # Final report
    print(f"\n{'=' * 60}")
    print(f"SUMMARY")
    print(f"{'=' * 60}")
    print(f"Total filings found:  {summary['total_filings']}")
    print(f"Downloaded:           {summary['downloaded']}")
    print(f"Skipped (existing):   {summary['skipped']}")
    print(f"Failed:               {summary['failed']}")
    print(f"Manifest entries:     {summary['manifest_entries']}")
    print(f"API requests total:   {summary['api_requests_total']}")

    if summary["files"]:
        print(f"\nDownloaded files:")
        for path in summary["files"]:
            print(f"  {path}")


if __name__ == "__main__":
    main()
