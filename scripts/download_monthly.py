#!/usr/bin/env python3
"""
Download monthly bulk accounts archives from Companies House.

Source: https://download.companieshouse.gov.uk/en_monthlyaccountsdata.html
Monthly files cover the previous 12 months (~2-4GB each).

Usage:
    python scripts/download_monthly.py [--output-dir PATH] [--dry-run]
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
INDEX_URL = "https://download.companieshouse.gov.uk/en_monthlyaccountsdata.html"

# Pattern to match monthly account files
# Format: Accounts_Monthly_Data-MONTHYYYY.zip (e.g., Accounts_Monthly_Data-December2024.zip)
MONTHLY_FILE_PATTERN = re.compile(r'Accounts_Monthly_Data-[A-Za-z]+\d{4}\.zip')


def get_monthly_file_links() -> list[tuple[str, str]]:
    """
    Fetch the index page and extract all monthly file links.

    Returns:
        List of (filename, url) tuples
    """
    print(f"Fetching index page: {INDEX_URL}")

    response = requests.get(INDEX_URL, timeout=30)
    response.raise_for_status()

    # Find all matching filenames in the HTML
    matches = MONTHLY_FILE_PATTERN.findall(response.text)

    # Deduplicate and create full URLs
    files = []
    seen = set()
    for filename in matches:
        if filename not in seen:
            seen.add(filename)
            url = urljoin(BASE_URL, filename)
            files.append((filename, url))

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

    response = requests.get(url, stream=True, timeout=600)  # Longer timeout for large files
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
        description="Download Companies House monthly bulk accounts archives"
    )
    parser.add_argument(
        "--output-dir", "-o",
        type=Path,
        default=Path("data/monthly"),
        help="Output directory for downloaded files (default: data/monthly)"
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

    args = parser.parse_args()

    # Get list of available files
    files = get_monthly_file_links()

    print(f"\nFound {len(files)} monthly files available")

    if args.dry_run:
        print("\nFiles available (dry run):")
        for filename, url in files:
            print(f"  {filename}")
        print("\nNote: Monthly files are typically 2-4GB each.")
        print("Total download size estimate: 25-50GB")
        return

    # Create output directory
    args.output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nOutput directory: {args.output_dir.absolute()}")

    # Download files
    downloaded = 0
    skipped = 0
    errors = []

    print(f"\nDownloading {len(files)} files (this may take a while - files are 2-4GB each)...")
    for filename, url in files:
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
