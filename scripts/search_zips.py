"""
Search Companies House bulk data ZIP files for a specific company.
Searches by company number in filenames and optionally inside file contents.

Usage:
    python search_zips.py --number 04231212
    python search_zips.py --number 04231212 --name "ACTEON"
    python search_zips.py --number 04231212 --name "ACTEON" --deep
    python search_zips.py --number 04231212 --deep --from 2025-12-01 --to 2026-02-28
"""

import argparse
import zipfile
import os
import glob
import sys
from datetime import datetime


def parse_zip_date(filename):
    """Extract date from ZIP filename like Accounts_Bulk_Data-2025-12-31.zip"""
    try:
        base = os.path.basename(filename).replace(".zip", "")
        date_str = base.split("Accounts_Bulk_Data-")[1]
        return datetime.strptime(date_str, "%Y-%m-%d")
    except (IndexError, ValueError):
        return None


def search_filenames(zip_path, search_terms):
    """Search for terms in filenames within a ZIP."""
    matches = []
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            name_upper = name.upper()
            for term in search_terms:
                if term.upper() in name_upper:
                    matches.append((name, term))
    return matches


def search_contents(zip_path, search_terms):
    """Search inside file contents within a ZIP."""
    matches = []
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            with zf.open(name) as f:
                content = f.read().decode("utf-8", errors="replace").upper()
                for term in search_terms:
                    if term.upper() in content:
                        matches.append((name, term))
    return matches


def main():
    parser = argparse.ArgumentParser(
        description="Search Companies House bulk data ZIPs for a company"
    )
    parser.add_argument(
        "--number", required=True, help="Company number to search for (e.g. 04231212)"
    )
    parser.add_argument(
        "--name", help="Company name or partial name to search for (e.g. ACTEON)"
    )
    parser.add_argument(
        "--deep",
        action="store_true",
        help="Also search inside file contents (slow)",
    )
    parser.add_argument(
        "--from",
        dest="date_from",
        help="Only search ZIPs from this date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--to", dest="date_to", help="Only search ZIPs up to this date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--zip-dir",
        default=os.path.join(os.path.dirname(__file__), "data", "daily"),
        help="Directory containing ZIP files",
    )
    args = parser.parse_args()

    search_terms = [args.number]
    # Also search without leading zeros
    stripped = args.number.lstrip("0")
    if stripped != args.number:
        search_terms.append(stripped)
    if args.name:
        search_terms.append(args.name)

    date_from = (
        datetime.strptime(args.date_from, "%Y-%m-%d") if args.date_from else None
    )
    date_to = datetime.strptime(args.date_to, "%Y-%m-%d") if args.date_to else None

    zip_files = sorted(glob.glob(os.path.join(args.zip_dir, "*.zip")))

    if date_from or date_to:
        filtered = []
        for zf in zip_files:
            zd = parse_zip_date(zf)
            if zd is None:
                continue
            if date_from and zd < date_from:
                continue
            if date_to and zd > date_to:
                continue
            filtered.append(zf)
        zip_files = filtered

    print(f"Company number: {args.number}")
    if args.name:
        print(f"Company name:   {args.name}")
    print(f"Search terms:   {search_terms}")
    print(f"ZIP directory:  {args.zip_dir}")
    print(f"ZIPs to search: {len(zip_files)}")
    if date_from:
        print(f"From date:      {args.date_from}")
    if date_to:
        print(f"To date:        {args.date_to}")
    print(f"Deep search:    {'YES (searching file contents)' if args.deep else 'NO (filenames only)'}")
    print("=" * 70)

    filename_hits = []
    content_hits = []

    for i, zf_path in enumerate(zip_files, 1):
        basename = os.path.basename(zf_path)
        sys.stdout.write(f"\r[{i}/{len(zip_files)}] Scanning {basename}...")
        sys.stdout.flush()

        try:
            # Filename search
            fm = search_filenames(zf_path, search_terms)
            if fm:
                filename_hits.append((basename, fm))
                print(f"\n  FILENAME MATCH in {basename}:")
                for name, term in fm:
                    print(f"    [{term}] -> {name}")

            # Content search (if requested)
            if args.deep:
                cm = search_contents(zf_path, search_terms)
                if cm:
                    content_hits.append((basename, cm))
                    print(f"\n  CONTENT MATCH in {basename}:")
                    for name, term in cm:
                        print(f"    [{term}] -> {name}")

        except Exception as e:
            print(f"\n  ERROR reading {basename}: {e}")

    # Summary
    print("\n")
    print("=" * 70)
    print("RESULTS SUMMARY")
    print("=" * 70)
    print(f"Total ZIPs searched: {len(zip_files)}")
    print()

    if filename_hits:
        print(f"FILENAME MATCHES ({len(filename_hits)} ZIPs):")
        for basename, matches in filename_hits:
            print(f"  {basename}:")
            for name, term in matches:
                print(f"    [{term}] {name}")
    else:
        print("FILENAME MATCHES: NONE")

    if args.deep:
        print()
        if content_hits:
            print(f"CONTENT MATCHES ({len(content_hits)} ZIPs):")
            for basename, matches in content_hits:
                print(f"  {basename}:")
                for name, term in matches:
                    print(f"    [{term}] {name}")
        else:
            print("CONTENT MATCHES: NONE")

    print()
    if not filename_hits and not content_hits:
        print("CONCLUSION: Company NOT FOUND in any of the downloaded ZIP files.")
        print("The filing may not have been included in the bulk data downloads yet,")
        print("or the data for the relevant date was not downloaded.")
    elif filename_hits:
        print("CONCLUSION: Company FOUND in raw ZIP data (filename match).")
        print("If missing from your DB, the issue is in your data loading logic.")
    elif content_hits and not filename_hits:
        print("CONCLUSION: Company referenced in file contents but not as a")
        print("primary filing. May be a subsidiary or related entity reference.")


if __name__ == "__main__":
    main()
