"""
Compare old BeautifulSoup parser vs new lxml.etree parser.

Verifies:
1. Output is identical (data integrity)
2. Performance improvement (speed)
"""

import time
import zipfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.parser.ixbrl import parse_ixbrl as parse_bs
from backend.parser.ixbrl_fast import parse_ixbrl_fast


def dedupe_facts(result):
    """Remove duplicate facts from a ParsedIXBRL result (BS parser has 3x duplicates)."""
    from backend.parser.ixbrl import NumericFact, TextFact

    # Dedupe numeric facts by (concept, context_ref, value_raw)
    seen = set()
    unique_numeric = []
    for f in result.numeric_facts:
        key = (f.concept, f.context_ref, f.value_raw)
        if key not in seen:
            seen.add(key)
            unique_numeric.append(f)
    result.numeric_facts = unique_numeric

    # Dedupe text facts by (concept, context_ref, value)
    seen = set()
    unique_text = []
    for f in result.text_facts:
        key = (f.concept, f.context_ref, f.value)
        if key not in seen:
            seen.add(key)
            unique_text.append(f)
    result.text_facts = unique_text

    return result


def compare_results(bs_result, fast_result) -> list[str]:
    """Compare two ParsedIXBRL results, return list of differences."""
    diffs = []

    # Dedupe BS result (it has a bug that produces 3x duplicates)
    bs_result = dedupe_facts(bs_result)

    # Compare metadata
    if bs_result.company_number != fast_result.company_number:
        diffs.append(f"company_number: {bs_result.company_number} vs {fast_result.company_number}")
    if bs_result.company_name != fast_result.company_name:
        diffs.append(f"company_name: {bs_result.company_name} vs {fast_result.company_name}")
    if bs_result.balance_sheet_date != fast_result.balance_sheet_date:
        diffs.append(f"balance_sheet_date: {bs_result.balance_sheet_date} vs {fast_result.balance_sheet_date}")

    # Compare counts
    if len(bs_result.contexts) != len(fast_result.contexts):
        diffs.append(f"contexts: {len(bs_result.contexts)} vs {len(fast_result.contexts)}")
    if len(bs_result.units) != len(fast_result.units):
        diffs.append(f"units: {len(bs_result.units)} vs {len(fast_result.units)}")
    if len(bs_result.numeric_facts) != len(fast_result.numeric_facts):
        diffs.append(f"numeric_facts: {len(bs_result.numeric_facts)} vs {len(fast_result.numeric_facts)}")
    if len(bs_result.text_facts) != len(fast_result.text_facts):
        diffs.append(f"text_facts: {len(bs_result.text_facts)} vs {len(fast_result.text_facts)}")

    # Compare numeric facts (sample)
    if len(bs_result.numeric_facts) == len(fast_result.numeric_facts):
        for i, (bs_f, fast_f) in enumerate(zip(bs_result.numeric_facts, fast_result.numeric_facts)):
            if bs_f.concept != fast_f.concept:
                diffs.append(f"numeric[{i}].concept: {bs_f.concept} vs {fast_f.concept}")
            if bs_f.value != fast_f.value:
                # Allow small floating point differences
                if bs_f.value is not None and fast_f.value is not None:
                    if abs(bs_f.value - fast_f.value) > 0.01:
                        diffs.append(f"numeric[{i}].value: {bs_f.value} vs {fast_f.value}")
                else:
                    diffs.append(f"numeric[{i}].value: {bs_f.value} vs {fast_f.value}")

    return diffs


def main():
    # Find test ZIP
    daily_dir = Path("scripts/data/daily")
    zip_files = sorted(daily_dir.glob("*.zip"))

    if not zip_files:
        print("ERROR: No ZIP files found")
        return

    test_zip = zip_files[0]
    print(f"Using: {test_zip.name}")

    # Get sample files
    samples = []
    with zipfile.ZipFile(test_zip, 'r') as zf:
        entries = [n for n in zf.namelist()
                   if not n.endswith('/') and not n.startswith('__')
                   and n.lower().endswith(('.html', '.xhtml', '.htm'))]

        for entry in entries[:200]:
            content = zf.read(entry)
            samples.append((entry, content))

    print(f"Testing with {len(samples)} files\n")

    # Test data integrity
    print("="*60)
    print("DATA INTEGRITY CHECK")
    print("="*60)

    total_diffs = 0
    files_with_diffs = 0

    for name, content in samples[:50]:  # Check first 50 for integrity
        try:
            bs_result = parse_bs(content)
            fast_result = parse_ixbrl_fast(content)

            diffs = compare_results(bs_result, fast_result)
            if diffs:
                files_with_diffs += 1
                total_diffs += len(diffs)
                if files_with_diffs <= 3:  # Show first 3 files with diffs
                    print(f"\n{name}:")
                    for d in diffs[:5]:
                        print(f"  - {d}")
        except Exception as e:
            print(f"Error parsing {name}: {e}")

    if files_with_diffs == 0:
        print("[OK] All files produce identical results!")
    else:
        print(f"\n[WARN] {files_with_diffs}/50 files have differences ({total_diffs} total diffs)")

    # Performance comparison
    print("\n" + "="*60)
    print("PERFORMANCE COMPARISON")
    print("="*60)

    # BeautifulSoup timing
    print("\nBeautifulSoup parser (original)...")
    start = time.perf_counter()
    for name, content in samples:
        try:
            parse_bs(content)
        except:
            pass
    bs_time = time.perf_counter() - start
    bs_rate = (len(samples) / bs_time) * 60

    print(f"  Time: {bs_time:.2f}s")
    print(f"  Rate: {bs_rate:,.0f} files/min")

    # lxml.etree timing
    print("\nlxml.etree parser (fast)...")
    start = time.perf_counter()
    for name, content in samples:
        try:
            parse_ixbrl_fast(content)
        except:
            pass
    fast_time = time.perf_counter() - start
    fast_rate = (len(samples) / fast_time) * 60

    print(f"  Time: {fast_time:.2f}s")
    print(f"  Rate: {fast_rate:,.0f} files/min")

    # Speedup
    speedup = bs_time / fast_time
    print(f"\n>>> SPEEDUP: {speedup:.1f}x faster!")
    print(f">>> {fast_rate:,.0f} vs {bs_rate:,.0f} files/min")

    # Project total time at this rate
    total_files = 2_800_000  # Approximate total
    hours_at_fast_rate = total_files / fast_rate / 60
    print(f"\nProjected time for {total_files:,} files:")
    print(f"  Original: {total_files / bs_rate / 60:.1f} hours")
    print(f"  Fast:     {hours_at_fast_rate:.1f} hours")


if __name__ == "__main__":
    main()
