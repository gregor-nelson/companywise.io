"""
Stage 5: Cell-level OCR — re-OCR individual value cells for higher accuracy.

Stage 4 already gets word-level text from Tesseract's image_to_data pass.
This stage optionally re-OCRs cropped cell regions using --psm 7 (single line)
with a digit whitelist for value cells, improving accuracy on numbers.

For the PoC, we use the text already captured by stage 4 and only re-OCR
cells with low confidence. This keeps things fast while allowing targeted
improvement.
"""

from dataclasses import dataclass

import pytesseract
import numpy as np

from .stage4_tables import DetectedTable, TableCell


@dataclass
class OCRCell:
    text: str
    confidence: float
    re_ocrd: bool  # whether this cell was re-OCR'd


@dataclass
class OCRRow:
    label: str
    values: dict[str, OCRCell | None]  # year → OCR result


@dataclass
class OCRTable:
    years: list[str]
    rows: list[OCRRow]
    scale_text: str
    page_number: int


# Confidence threshold below which we re-OCR the cell
_REOCR_THRESHOLD = 70.0

# Tesseract config for numeric cells: single line, digit whitelist
_NUMERIC_CONFIG = "--psm 7 -c tessedit_char_whitelist=0123456789,.()-£ "


def ocr_table(table: DetectedTable, image: np.ndarray) -> OCRTable:
    """Refine OCR results for a detected table.

    Args:
        table: detected table structure with initial OCR text
        image: the preprocessed page image (for re-OCR cropping)

    Returns:
        OCRTable with refined text and confidence for each cell.
    """
    rows: list[OCRRow] = []
    img_h, img_w = image.shape[:2]

    for row in table.rows:
        ocr_values: dict[str, OCRCell | None] = {}

        for year in table.years:
            cell = row.values.get(year)
            if cell is None:
                ocr_values[year] = None
                continue

            # If confidence is good enough, keep the existing text
            if cell.confidence >= _REOCR_THRESHOLD:
                ocr_values[year] = OCRCell(
                    text=cell.text,
                    confidence=cell.confidence,
                    re_ocrd=False,
                )
            else:
                # Re-OCR the cell region with numeric-optimised settings
                re_text, re_conf = _reocr_cell(image, cell, img_h, img_w)
                ocr_values[year] = OCRCell(
                    text=re_text if re_text else cell.text,
                    confidence=re_conf if re_text else cell.confidence,
                    re_ocrd=bool(re_text),
                )

        rows.append(OCRRow(
            label=row.label,
            values=ocr_values,
        ))

    return OCRTable(
        years=table.years,
        rows=rows,
        scale_text=table.scale_text,
        page_number=table.page_number,
    )


def _reocr_cell(
    image: np.ndarray,
    cell: TableCell,
    img_h: int,
    img_w: int,
    padding: int = 5,
) -> tuple[str, float]:
    """Re-OCR a single cell by cropping and running Tesseract with numeric config.

    Returns:
        (text, confidence) or ("", 0.0) if crop is invalid.
    """
    # Expand crop slightly for context
    x1 = max(0, cell.x - padding)
    y1 = max(0, cell.y - padding)
    x2 = min(img_w, cell.x + cell.width + padding)
    y2 = min(img_h, cell.y + cell.height + padding)

    if x2 - x1 < 5 or y2 - y1 < 5:
        return "", 0.0

    crop = image[y1:y2, x1:x2]

    try:
        text = pytesseract.image_to_string(crop, config=_NUMERIC_CONFIG).strip()
        # Get confidence from image_to_data
        data = pytesseract.image_to_data(crop, config=_NUMERIC_CONFIG, output_type=pytesseract.Output.DICT)
        confs = [float(c) for c in data["conf"] if float(c) > 0]
        avg_conf = sum(confs) / len(confs) if confs else 0.0
        return text, avg_conf
    except Exception:
        return "", 0.0
