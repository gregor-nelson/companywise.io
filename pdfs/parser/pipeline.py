"""
Master pipeline orchestrator — ties all stages together.

parse_pdf_filing(pdf_path) → PipelineResult

This is the single entry point. Each stage is called in sequence,
with intermediate results passed forward. Debug output can be saved
to a directory for visual inspection.
"""

import re
import time
from dataclasses import dataclass, field
from pathlib import Path

from .stage1_render import render_pages, save_debug_images
from .stage2_preprocess import preprocess
from .stage3_classify import classify_pages, find_best_pages
from .stage4_tables import detect_table
from .stage5_ocr import ocr_table
from .stage6_values import parse_value, detect_scale
from .stage7_concepts import map_concept
from .stage8_validate import validate, ValidationResult


@dataclass
class Metadata:
    company_name: str | None = None
    company_number: str | None = None
    period_end_date: str | None = None


@dataclass
class ExtractedFact:
    concept: str
    value: int
    raw_label: str
    raw_value_text: str
    match_type: str       # "exact" or "fuzzy"
    match_score: float
    ocr_confidence: float


@dataclass
class StageTimings:
    render: float = 0.0
    preprocess: float = 0.0
    classify: float = 0.0
    tables: float = 0.0
    ocr: float = 0.0
    parse: float = 0.0
    total: float = 0.0


@dataclass
class PipelineResult:
    metadata: Metadata
    current_year: str | None
    prior_year: str | None
    current_year_facts: dict[str, int]
    prior_year_facts: dict[str, int]
    current_year_details: list[ExtractedFact] = field(default_factory=list)
    prior_year_details: list[ExtractedFact] = field(default_factory=list)
    current_year_validation: ValidationResult | None = None
    prior_year_validation: ValidationResult | None = None
    timings: StageTimings = field(default_factory=StageTimings)
    warnings: list[str] = field(default_factory=list)
    balance_sheet_page: int | None = None
    profit_loss_page: int | None = None


def parse_pdf_filing(
    pdf_path: str | Path,
    debug_dir: str | Path | None = None,
) -> PipelineResult:
    """Run the full extraction pipeline on a scanned PDF filing.

    Args:
        pdf_path: path to the PDF file
        debug_dir: optional directory to save intermediate images/data

    Returns:
        PipelineResult with extracted financial data.
    """
    pdf_path = Path(pdf_path)
    timings = StageTimings()
    warnings: list[str] = []
    start_total = time.time()

    # --- Stage 1: Render PDF to page images ---
    t0 = time.time()
    pages = render_pages(pdf_path)
    timings.render = time.time() - t0
    print(f"  Stage 1 (render): {len(pages)} pages in {timings.render:.1f}s")

    if debug_dir:
        save_debug_images(pages, Path(debug_dir) / "stage1_pages")

    # --- Stage 2: Preprocess ---
    t0 = time.time()
    preprocessed = [preprocess(p) for p in pages]
    timings.preprocess = time.time() - t0
    print(f"  Stage 2 (preprocess): {timings.preprocess:.1f}s")

    # --- Stage 3: Classify pages ---
    t0 = time.time()
    page_inputs = [(pp.page_number, pp.image) for pp in preprocessed]
    classified = classify_pages(page_inputs)
    best = find_best_pages(classified)
    timings.classify = time.time() - t0
    print(f"  Stage 3 (classify): {timings.classify:.1f}s")

    for ptype, page in best.items():
        if page:
            print(f"    {ptype}: page {page.page_number} (score={page.score:.1f})")
        else:
            print(f"    {ptype}: NOT FOUND")
            warnings.append(f"No {ptype} page identified")

    # --- Extract metadata from cover page ---
    metadata = Metadata()
    if best["cover"]:
        metadata = _extract_metadata(best["cover"].ocr_text)
    elif best["balance_sheet"]:
        # Try extracting from balance sheet page OCR text
        metadata = _extract_metadata(best["balance_sheet"].ocr_text)

    # --- Stage 4+5+6+7: Process balance sheet ---
    current_facts: dict[str, int] = {}
    prior_facts: dict[str, int] = {}
    current_details: list[ExtractedFact] = []
    prior_details: list[ExtractedFact] = []
    current_year = None
    prior_year = None
    bs_page_num = None
    pl_page_num = None

    if best["balance_sheet"]:
        bs_page = best["balance_sheet"]
        bs_page_num = bs_page.page_number
        bs_image = preprocessed[bs_page.page_number].image

        t0 = time.time()
        table = detect_table(bs_page.page_number, bs_image)
        timings.tables = time.time() - t0
        print(f"  Stage 4 (tables): {timings.tables:.1f}s")

        if table:
            current_year = table.years[0] if table.years else None
            prior_year = table.years[1] if len(table.years) > 1 else None
            print(f"    Years: {table.years}, {len(table.rows)} rows detected")

            t0 = time.time()
            ocr_result = ocr_table(table, bs_image)
            timings.ocr = time.time() - t0
            print(f"  Stage 5 (OCR): {timings.ocr:.1f}s")

            # Detect scale from header text (record for metadata, but don't apply)
            detected_scale = detect_scale(ocr_result.scale_text)
            if detected_scale == 1:
                detected_scale = detect_scale(bs_page.ocr_text)
            scale = 1  # values on the page are already in the stated unit (e.g. £000)
            print(f"    Scale detected: {detected_scale}x (not applied — as-printed values used)")

            # --- Debug: dump every row Stage 4 detected ---
            print(f"\n    {'='*70}")
            print(f"    STAGE 4 ROW DUMP — Balance Sheet (page {bs_page_num})")
            print(f"    {'='*70}")
            for i, (s4row, row) in enumerate(zip(table.rows, ocr_result.rows)):
                vals = {y: (row.values[y].text if row.values.get(y) else "—")
                        for y in ocr_result.years}
                cm = map_concept(row.label) if row.label else None
                concept_str = ""
                if row.label and cm:
                    if cm.concept:
                        concept_str = f" → {cm.concept} [{cm.match_type} {cm.score:.0f}%]"
                    else:
                        concept_str = f" → NO MATCH"
                tag = ""
                if not row.label and any(row.values.get(y) for y in ocr_result.years):
                    tag = " *** UNLABELLED VALUES ***"
                print(f"    [{i:3d}] y={s4row.y_centre:4d}  "
                      f"label={row.label!r:50s}  vals={vals}{concept_str}{tag}")
            print(f"    {'='*70}\n")

            t0 = time.time()
            for row in ocr_result.rows:
                if not row.label:
                    continue

                concept_match = map_concept(row.label)
                if concept_match.concept is None:
                    continue

                for year in ocr_result.years:
                    cell = row.values.get(year)
                    if cell is None:
                        continue

                    parsed = parse_value(cell.text, scale=scale)
                    if not parsed.is_valid:
                        warnings.append(
                            f"Unparseable value for {concept_match.concept} "
                            f"({year}): '{cell.text}'"
                        )
                        continue

                    fact = ExtractedFact(
                        concept=concept_match.concept,
                        value=parsed.value,
                        raw_label=row.label,
                        raw_value_text=cell.text,
                        match_type=concept_match.match_type,
                        match_score=concept_match.score,
                        ocr_confidence=cell.confidence,
                    )

                    if year == current_year:
                        # Only keep first match per concept (highest in table = subtotal)
                        if concept_match.concept not in current_facts:
                            current_facts[concept_match.concept] = parsed.value
                            current_details.append(fact)
                    elif year == prior_year:
                        if concept_match.concept not in prior_facts:
                            prior_facts[concept_match.concept] = parsed.value
                            prior_details.append(fact)

            timings.parse = time.time() - t0
        else:
            warnings.append("No table structure detected on balance sheet page")

    # --- Process P&L page (just for ProfitLoss) ---
    if best["profit_loss"] and "ProfitLoss" not in current_facts:
        pl_page = best["profit_loss"]
        pl_page_num = pl_page.page_number
        pl_image = preprocessed[pl_page.page_number].image

        table = detect_table(pl_page.page_number, pl_image)
        if table:
            ocr_result = ocr_table(table, pl_image)
            scale = 1  # as-printed values, don't apply scale

            # --- Debug: dump P&L rows ---
            print(f"\n    {'='*70}")
            print(f"    STAGE 4 ROW DUMP — P&L (page {pl_page_num})")
            print(f"    {'='*70}")
            for i, (s4row, row) in enumerate(zip(table.rows, ocr_result.rows)):
                vals = {y: (row.values[y].text if row.values.get(y) else "—")
                        for y in ocr_result.years}
                cm = map_concept(row.label) if row.label else None
                concept_str = ""
                if row.label and cm:
                    if cm.concept:
                        concept_str = f" → {cm.concept} [{cm.match_type} {cm.score:.0f}%]"
                    else:
                        concept_str = f" → NO MATCH"
                tag = ""
                if not row.label and any(row.values.get(y) for y in ocr_result.years):
                    tag = " *** UNLABELLED VALUES ***"
                print(f"    [{i:3d}] y={s4row.y_centre:4d}  "
                      f"label={row.label!r:50s}  vals={vals}{concept_str}{tag}")
            print(f"    {'='*70}\n")

            for row in ocr_result.rows:
                if not row.label:
                    continue
                concept_match = map_concept(row.label)
                if concept_match.concept != "ProfitLoss":
                    continue

                for year in ocr_result.years:
                    cell = row.values.get(year)
                    if cell is None:
                        continue
                    parsed = parse_value(cell.text, scale=scale)
                    if not parsed.is_valid:
                        continue

                    if year == current_year and "ProfitLoss" not in current_facts:
                        current_facts["ProfitLoss"] = parsed.value
                        current_details.append(ExtractedFact(
                            concept="ProfitLoss", value=parsed.value,
                            raw_label=row.label, raw_value_text=cell.text,
                            match_type=concept_match.match_type,
                            match_score=concept_match.score,
                            ocr_confidence=cell.confidence,
                        ))
                    elif year == prior_year and "ProfitLoss" not in prior_facts:
                        prior_facts["ProfitLoss"] = parsed.value
                        prior_details.append(ExtractedFact(
                            concept="ProfitLoss", value=parsed.value,
                            raw_label=row.label, raw_value_text=cell.text,
                            match_type=concept_match.match_type,
                            match_score=concept_match.score,
                            ocr_confidence=cell.confidence,
                        ))

    # --- Stage 8: Validate ---
    current_validation = validate(current_facts) if current_facts else None
    prior_validation = validate(prior_facts) if prior_facts else None

    timings.total = time.time() - start_total

    return PipelineResult(
        metadata=metadata,
        current_year=current_year,
        prior_year=prior_year,
        current_year_facts=current_facts,
        prior_year_facts=prior_facts,
        current_year_details=current_details,
        prior_year_details=prior_details,
        current_year_validation=current_validation,
        prior_year_validation=prior_validation,
        timings=timings,
        warnings=warnings,
        balance_sheet_page=bs_page_num,
        profit_loss_page=pl_page_num,
    )


def _extract_metadata(ocr_text: str) -> Metadata:
    """Extract company metadata from OCR'd cover/balance sheet page text."""
    meta = Metadata()

    # Company number: 8-digit number
    num_match = re.search(r"\b(\d{8})\b", ocr_text)
    if num_match:
        meta.company_number = num_match.group(1)

    # Period end date: "31 December 2024" or "31/12/2024" etc.
    date_patterns = [
        # "31 December 2024"
        (r"(\d{1,2})\s+(January|February|March|April|May|June|July|August|"
         r"September|October|November|December)\s+(\d{4})", "dmy_word"),
        # "31/12/2024"
        (r"(\d{1,2})/(\d{1,2})/(\d{4})", "dmy_slash"),
    ]
    for pattern, fmt in date_patterns:
        m = re.search(pattern, ocr_text, re.IGNORECASE)
        if m:
            if fmt == "dmy_word":
                months = {
                    "january": "01", "february": "02", "march": "03",
                    "april": "04", "may": "05", "june": "06",
                    "july": "07", "august": "08", "september": "09",
                    "october": "10", "november": "11", "december": "12",
                }
                day = m.group(1).zfill(2)
                month = months.get(m.group(2).lower(), "01")
                year = m.group(3)
                meta.period_end_date = f"{year}-{month}-{day}"
            elif fmt == "dmy_slash":
                meta.period_end_date = f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
            break

    # Company name: typically in all caps on the cover page, look for it
    # Heuristic: find lines that are mostly uppercase and reasonably long
    lines = ocr_text.split("\n")
    for line in lines:
        stripped = line.strip()
        if len(stripped) > 10 and stripped.isupper() and "LIMITED" in stripped:
            meta.company_name = stripped
            break

    return meta
