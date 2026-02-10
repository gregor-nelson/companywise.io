#!/usr/bin/env python3
"""
Download historical archive bulk accounts files from Companies House.

Source: https://download.companieshouse.gov.uk/historicmonthlyaccountsdata.html
Archives span 2008-2024 (files beyond the 12-month rolling window).

Usage:
    python scripts/download_archive.py [--output-dir PATH] [--dry-run]
    python scripts/download_archive.py --year 2020          # Single year
    python scripts/download_archive.py --from-year 2015     # 2015 onwards
    python scripts/download_archive.py --to-year 2015       # Up to 2015
"""

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

try:
    import requests
except ImportError:
    print("Error: requests library required. Install with: pip install requests")
    sys.exit(1)


BASE_URL = "https://download.companieshouse.gov.uk/"
INDEX_URL = "https://download.companieshouse.gov.uk/historicmonthlyaccountsdata.html"

# Pattern to match href values for monthly account files
# Format: archive/Accounts_Monthly_Data-MONTHYYYY.zip
HREF_PATTERN = re.compile(r'href="((?:archive/)?Accounts_Monthly_Data-[A-Za-z]+\d{4}\.zip)"')
# Pattern to extract month and year from filename
MONTHLY_FILE_PATTERN = re.compile(r'Accounts_Monthly_Data-([A-Za-z]+)(\d{4})\.zip')


def get_archive_file_links() -> list[tuple[str, str, int]]:
    """
    Fetch the historic archive page and extract all file links.

    Returns:
        List of (filename, url, year) tuples
    """
    print(f"Fetching archive index: {INDEX_URL}")

    response = requests.get(INDEX_URL, timeout=30)
    response.raise_for_status()

    # Extract href values from anchor tags (gets correct paths including archive/ prefix)
    href_matches = HREF_PATTERN.findall(response.text)

    # Build file list with year info
    files = []
    seen = set()
    for href in href_matches:
        filename = href.split("/")[-1]
        if filename not in seen:
            seen.add(filename)
            url = urljoin(BASE_URL, href)
            match = MONTHLY_FILE_PATTERN.search(filename)
            if match:
                year = int(match.group(2))
                files.append((filename, url, year))

    # Sort by year then month
    month_order = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    }

    def sort_key(item):
        filename, _, year = item
        match = MONTHLY_FILE_PATTERN.match(filename)
        if match:
            month = match.group(1)
            return (year, month_order.get(month, 0))
        return (year, 0)

    files.sort(key=sort_key)

    return files


def download_file(url: str, output_path: Path, skip_existing: bool = True) -> bool:
    """
    Download a file from URL to output_path.

    Returns:
        True if downloaded, False if skipped
    """
    if skip_existing and output_path.exists():
        print(f"  Skipping (exists): {output_path.name}")
        return False

    print(f"  Downloading: {output_path.name} ... ", end="", flush=True)

    response = requests.get(url, stream=True, timeout=600)
    response.raise_for_status()

    # Get file size if available
    total_size = int(response.headers.get('content-length', 0))

    # Download in chunks
    downloaded = 0
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size:
                pct = (downloaded / total_size) * 100
                size_mb = downloaded / (1024 * 1024)
                total_mb = total_size / (1024 * 1024)
                print(f"\r  Downloading: {output_path.name} ... {size_mb:.0f}/{total_mb:.0f} MB ({pct:.1f}%)", end="", flush=True)

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"\r  Downloaded: {output_path.name} ({size_mb:.1f} MB)                    ")

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Download Companies House historical archive accounts files (2008-2024)"
    )
    parser.add_argument(
        "--output-dir", "-o",
        type=Path,
        default=Path("data/archive"),
        help="Output directory for downloaded files (default: data/archive)"
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="List files without downloading"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Re-download existing files"
    )
    parser.add_argument(
        "--year", "-y",
        type=int,
        help="Download only files from this year"
    )
    parser.add_argument(
        "--from-year",
        type=int,
        help="Download files from this year onwards"
    )
    parser.add_argument(
        "--to-year",
        type=int,
        help="Download files up to and including this year"
    )

    args = parser.parse_args()

    # Get list of available files
    files = get_archive_file_links()

    # Filter by year if specified
    if args.year:
        files = [(f, u, y) for f, u, y in files if y == args.year]
    else:
        if args.from_year:
            files = [(f, u, y) for f, u, y in files if y >= args.from_year]
        if args.to_year:
            files = [(f, u, y) for f, u, y in files if y <= args.to_year]

    # Group by year for display
    years = sorted(set(y for _, _, y in files))

    print(f"\nFound {len(files)} archive files across {len(years)} years")
    if years:
        print(f"Years: {min(years)} - {max(years)}")

    if args.dry_run:
        print("\nFiles available (dry run):")
        current_year = None
        for filename, url, year in files:
            if year != current_year:
                current_year = year
                print(f"\n  {year}:")
            print(f"    {filename}")

        # Estimate total size
        print("\n" + "=" * 50)
        print("Estimated download sizes by year:")
        print("  2008-2009: ~0.6 GB (consolidated)")
        print("  2010-2012: ~5 GB")
        print("  2013-2015: ~15 GB")
        print("  2016-2018: ~25 GB")
        print("  2019-2024: ~40 GB")
        print("  TOTAL: ~85-100 GB")
        return

    # Create output directory
    args.output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nOutput directory: {args.output_dir.absolute()}")

    # Download files
    downloaded = 0
    skipped = 0
    errors = []

    print(f"\nDownloading {len(files)} files (archive files can be 0.5-4GB each)...")
    for filename, url, year in files:
        output_path = args.output_dir / filename
        try:
            if download_file(url, output_path, skip_existing=not args.force):
                downloaded += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ERROR: {filename} - {e}")
            errors.append((filename, str(e)))

    # Summary
    print(f"\n{'='*50}")
    print(f"Download complete:")
    print(f"  Downloaded: {downloaded}")
    print(f"  Skipped:    {skipped}")
    print(f"  Errors:     {len(errors)}")

    if errors:
        print("\nFailed downloads:")
        for filename, error in errors:
            print(f"  {filename}: {error}")


if __name__ == "__main__":
    main()
