#!/usr/bin/env python3
"""
CLI entry point for the PDF parsing pipeline.

Usage:
    python pdfs/scripts/parse_filing.py <pdf_path> [--debug-dir <dir>]

Example:
    python pdfs/scripts/parse_filing.py pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf
    python pdfs/scripts/parse_filing.py pdfs/data/pdfs/04231212_2024-12-31_QGRZErlsHLb_iHP-OpKH7GWG4sYlhkiI-xhn7gjAEBU.pdf --debug-dir ./debug
"""

import argparse
import sys
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from pdfs.parser.pipeline import parse_pdf_filing


# Ground truth for validation (ACTEON 2024)
GROUND_TRUTH = {
    "2024": {
        "FixedAssets": 4308,
        "CurrentAssets": 37892,
        "CashBankOnHand": 370,
        "Debtors": 37522,
        "Creditors": 279477,
        "NetCurrentAssetsLiabilities": -241585,
        "TotalAssetsLessCurrentLiabilities": -237277,
        "NetAssetsLiabilities": -237277,
        "Equity": -237277,
        "ProfitLoss": -284085,
    },
    "2023": {
        "FixedAssets": 487516,
        "CurrentAssets": 123149,
        "CashBankOnHand": 52,
        "Debtors": 123097,
        "Creditors": 410644,
        "NetCurrentAssetsLiabilities": -287495,
        "TotalAssetsLessCurrentLiabilities": 200021,
        "NetAssetsLiabilities": 46808,
        "Equity": 46808,
        "ProfitLoss": -55657,
    },
}


def print_facts(year: str, facts: dict[str, int], details: list) -> None:
    print(f"\n  {year}:")
    if not facts:
        print("    No values extracted")
        return

    concepts = [
        "FixedAssets", "CurrentAssets", "CashBankOnHand", "Debtors",
        "Creditors", "NetCurrentAssetsLiabilities",
        "TotalAssetsLessCurrentLiabilities", "NetAssetsLiabilities",
        "Equity", "ProfitLoss",
    ]
    for concept in concepts:
        if concept in facts:
            value = facts[concept]
            detail = next((d for d in details if d.concept == concept), None)
            match_info = ""
            if detail:
                match_info = f"  [{detail.match_type} {detail.match_score:.0f}%] '{detail.raw_label}' → '{detail.raw_value_text}'"
            print(f"    {concept:45s} = {value:>12,}{match_info}")
        else:
            print(f"    {concept:45s} =     MISSING")


def print_validation(label: str, validation) -> None:
    if validation is None:
        print(f"\n  {label}: no data to validate")
        return
    print(f"\n  {label}: {validation.summary}")
    for check in validation.checks:
        if check.passed is None:
            status = "SKIP"
        elif check.passed:
            status = "PASS"
        else:
            status = f"FAIL (diff={check.difference})"
        print(f"    {status:8s} {check.equation}")


def compare_ground_truth(year: str, facts: dict[str, int]) -> None:
    gt = GROUND_TRUTH.get(year)
    if gt is None:
        return

    print(f"\n  Ground Truth Comparison ({year}):")
    correct = 0
    total = len(gt)
    for concept, expected in gt.items():
        actual = facts.get(concept)
        if actual == expected:
            print(f"    OK   {concept}: {expected:,}")
            correct += 1
        elif actual is not None:
            print(f"    FAIL {concept}: expected {expected:,}, got {actual:,}")
        else:
            print(f"    MISS {concept}: expected {expected:,}, not extracted")
    print(f"  Score: {correct}/{total}")


def main():
    parser = argparse.ArgumentParser(description="Parse a scanned PDF financial filing")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--debug-dir", help="Directory to save debug output")
    args = parser.parse_args()

    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    print(f"Parsing: {pdf_path.name}")
    print("=" * 70)

    result = parse_pdf_filing(pdf_path, debug_dir=args.debug_dir)

    # --- Report ---
    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)

    print("\nMetadata:")
    print(f"  Company:  {result.metadata.company_name or 'NOT FOUND'}")
    print(f"  Number:   {result.metadata.company_number or 'NOT FOUND'}")
    print(f"  Period:   {result.metadata.period_end_date or 'NOT FOUND'}")
    print(f"  BS Page:  {result.balance_sheet_page}")
    print(f"  P&L Page: {result.profit_loss_page}")

    print("\nExtracted Values:")
    if result.current_year:
        print_facts(result.current_year, result.current_year_facts, result.current_year_details)
    if result.prior_year:
        print_facts(result.prior_year, result.prior_year_facts, result.prior_year_details)

    print("\nValidation:")
    if result.current_year:
        print_validation(f"{result.current_year} Arithmetic", result.current_year_validation)
    if result.prior_year:
        print_validation(f"{result.prior_year} Arithmetic", result.prior_year_validation)

    # Compare to ground truth if this is an ACTEON filing
    if result.current_year in GROUND_TRUTH:
        print("\n" + "-" * 70)
        print("GROUND TRUTH CHECK")
        print("-" * 70)
        compare_ground_truth(result.current_year, result.current_year_facts)
        if result.prior_year:
            compare_ground_truth(result.prior_year, result.prior_year_facts)

    if result.warnings:
        print(f"\nWarnings ({len(result.warnings)}):")
        for w in result.warnings:
            print(f"  - {w}")

    print(f"\nTimings:")
    t = result.timings
    print(f"  Render:     {t.render:.1f}s")
    print(f"  Preprocess: {t.preprocess:.1f}s")
    print(f"  Classify:   {t.classify:.1f}s")
    print(f"  Tables:     {t.tables:.1f}s")
    print(f"  OCR:        {t.ocr:.1f}s")
    print(f"  Parse:      {t.parse:.1f}s")
    print(f"  TOTAL:      {t.total:.1f}s")


if __name__ == "__main__":
    main()
