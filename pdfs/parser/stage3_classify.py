"""
Stage 3: Page classification — identify balance sheet, P&L, and cover pages.

Runs a fast Tesseract pass on each page, then scores against keyword
dictionaries to find the pages we care about. Reduces a 42-page PDF
to 2-3 target pages.
"""

from dataclasses import dataclass

import pytesseract
import numpy as np


@dataclass
class ClassifiedPage:
    page_number: int
    page_type: str        # "balance_sheet", "profit_loss", "cover", "other"
    score: float          # keyword match score
    ocr_text: str         # full-page OCR text (kept for later stages)


# Keyword dictionaries — score each page against these
_KEYWORDS: dict[str, list[tuple[str, float]]] = {
    "balance_sheet": [
        ("statement of financial position", 10.0),
        ("balance sheet", 10.0),
        ("net current", 5.0),
        ("total equity", 5.0),
        ("capital and reserves", 5.0),
        ("net assets", 4.0),
        ("net liabilities", 4.0),
        ("fixed assets", 3.0),
        ("current assets", 3.0),
        ("creditors", 3.0),
        ("total assets less current liabilities", 6.0),
        ("shareholders funds", 4.0),
        ("shareholders' funds", 4.0),
    ],
    "profit_loss": [
        ("statement of comprehensive income", 10.0),
        ("profit and loss", 10.0),
        ("income statement", 10.0),
        ("operating loss", 5.0),
        ("operating profit", 5.0),
        ("loss before tax", 5.0),
        ("profit before tax", 5.0),
        ("loss for the financial year", 6.0),
        ("profit for the financial year", 6.0),
        ("administrative expenses", 4.0),
        ("cost of sales", 4.0),
        ("turnover", 3.0),
        ("revenue", 3.0),
        ("tax on loss", 3.0),
        ("tax on profit", 3.0),
    ],
    "cover": [
        ("registered number", 6.0),
        ("company number", 6.0),
        ("for the year ended", 5.0),
        ("for the period ended", 5.0),
        ("annual accounts", 4.0),
        ("report and financial statements", 4.0),
        ("directors report", 3.0),
        ("directors' report", 3.0),
    ],
}


def _score_page(text: str, keywords: list[tuple[str, float]]) -> float:
    """Score a page's OCR text against a keyword list."""
    text_lower = text.lower()
    return sum(weight for keyword, weight in keywords if keyword in text_lower)


def classify_pages(
    pages: list[tuple[int, np.ndarray]],
) -> list[ClassifiedPage]:
    """Classify pages by type using keyword scoring on OCR text.

    Args:
        pages: list of (page_number, preprocessed_image) tuples

    Returns:
        List of ClassifiedPage for ALL pages, sorted by page number.
    """
    classified: list[ClassifiedPage] = []

    for page_num, image in pages:
        # Fast OCR pass — psm 6 = uniform block of text
        text = pytesseract.image_to_string(image, config="--psm 6")

        # Score against each category
        scores = {
            category: _score_page(text, keywords)
            for category, keywords in _KEYWORDS.items()
        }

        # Assign to highest-scoring category (must beat threshold of 5.0)
        best_category = max(scores, key=scores.get)
        best_score = scores[best_category]

        if best_score >= 5.0:
            page_type = best_category
        else:
            page_type = "other"

        classified.append(ClassifiedPage(
            page_number=page_num,
            page_type=page_type,
            score=best_score,
            ocr_text=text,
        ))

    return sorted(classified, key=lambda p: p.page_number)


def find_best_pages(classified: list[ClassifiedPage]) -> dict[str, ClassifiedPage | None]:
    """Pick the single best page for each category.

    Returns:
        Dict with keys "balance_sheet", "profit_loss", "cover" → best page or None.
    """
    result: dict[str, ClassifiedPage | None] = {
        "balance_sheet": None,
        "profit_loss": None,
        "cover": None,
    }

    for page_type in result:
        candidates = [p for p in classified if p.page_type == page_type]
        if candidates:
            result[page_type] = max(candidates, key=lambda p: p.score)

    return result
