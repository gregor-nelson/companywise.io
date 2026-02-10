"""
Stage 4: Table structure detection — find rows and columns in financial tables.

Uses a column-position heuristic based on Tesseract word bounding boxes:
1. Find header row containing year numbers (e.g. "2024", "2023")
2. Year header x-coordinates define value column centres
3. Group all words into rows by y-coordinate clustering
4. Assign words to columns (label vs value columns) by x-position

This is tuned for UK financial statement layout (borderless tables with
whitespace-aligned columns). The interface is stable — swap the detection
method without changing downstream stages.
"""

import re
from dataclasses import dataclass, field

import pytesseract
import numpy as np


@dataclass
class TableCell:
    text: str
    x: int          # left edge in pixels
    y: int          # top edge in pixels
    width: int
    height: int
    confidence: float


@dataclass
class TableRow:
    y_centre: int
    label: str                          # leftmost column text
    values: dict[str, TableCell | None]  # year → value cell
    label_cells: list[TableCell] = field(default_factory=list)


@dataclass
class DetectedTable:
    years: list[str]             # e.g. ["2024", "2023"]
    year_columns: dict[str, int]  # year → x-centre of that column
    rows: list[TableRow]
    scale_text: str              # header text near year columns (for scale detection)
    page_number: int


# Tolerance for grouping words into the same row (pixels at 300 DPI)
_ROW_CLUSTER_TOLERANCE = 15

# How close a word's x-centre must be to a column centre to belong to it
_COLUMN_TOLERANCE_RATIO = 0.10  # 10% of page width


def detect_table(page_number: int, image: np.ndarray) -> DetectedTable | None:
    """Detect table structure from a preprocessed page image.

    Args:
        page_number: for tracking
        image: preprocessed grayscale/binary image

    Returns:
        DetectedTable or None if no year headers found.
    """
    # Get word-level bounding boxes from Tesseract
    data = pytesseract.image_to_data(image, config="--psm 6", output_type=pytesseract.Output.DICT)

    words = _extract_words(data)
    if not words:
        return None

    page_width = image.shape[1]

    # Step 1: Find year headers
    year_columns = _find_year_columns(words)
    if not year_columns:
        return None

    years = sorted(year_columns.keys(), reverse=True)  # most recent first

    # Step 2: Find scale text (look near the year headers, row above or same row)
    scale_text = _find_scale_text(words, year_columns)

    # Step 3: Define column boundaries
    col_tolerance = int(page_width * _COLUMN_TOLERANCE_RATIO)

    # The label column is everything to the left of the leftmost value column
    min_value_x = min(year_columns.values()) - col_tolerance

    # Step 4: Group words into rows
    rows = _build_rows(words, year_columns, col_tolerance, min_value_x)

    # Step 5: Split compound values (e.g. two years concatenated in one cell)
    _split_compound_values(rows, years)

    return DetectedTable(
        years=years,
        year_columns=year_columns,
        rows=rows,
        scale_text=scale_text,
        page_number=page_number,
    )


def _extract_words(data: dict) -> list[TableCell]:
    """Extract word-level cells from Tesseract output."""
    words = []
    n = len(data["text"])
    for i in range(n):
        text = data["text"][i].strip()
        if not text:
            continue
        conf = float(data["conf"][i])
        if conf < 0:  # Tesseract returns -1 for block/paragraph/line separators
            continue
        words.append(TableCell(
            text=text,
            x=int(data["left"][i]),
            y=int(data["top"][i]),
            width=int(data["width"][i]),
            height=int(data["height"][i]),
            confidence=conf,
        ))
    return words


def _find_year_columns(words: list[TableCell]) -> dict[str, int]:
    """Find year headers (4-digit numbers 1990-2030) and their x-centres."""
    year_pattern = re.compile(r"^(19|20)\d{2}$")
    year_cells: list[TableCell] = []

    for w in words:
        if year_pattern.match(w.text):
            year_cells.append(w)

    if not year_cells:
        return {}

    # Group year cells by y-position to find the header row
    # (there may be year references elsewhere in the document)
    # Pick the topmost cluster of years that has at least 2 years
    year_cells.sort(key=lambda c: c.y)

    clusters: list[list[TableCell]] = []
    current_cluster: list[TableCell] = [year_cells[0]]

    for cell in year_cells[1:]:
        if abs(cell.y - current_cluster[-1].y) <= _ROW_CLUSTER_TOLERANCE:
            current_cluster.append(cell)
        else:
            clusters.append(current_cluster)
            current_cluster = [cell]
    clusters.append(current_cluster)

    # Find the first cluster with 2+ distinct years
    for cluster in clusters:
        unique_years = set(c.text for c in cluster)
        if len(unique_years) >= 2:
            # Use x-centre of each year as the column position
            columns: dict[str, int] = {}
            for cell in cluster:
                x_centre = cell.x + cell.width // 2
                # If duplicate year, take the one we haven't seen
                if cell.text not in columns:
                    columns[cell.text] = x_centre
            return columns

    # Fallback: even a single year is useful
    if year_cells:
        cell = year_cells[0]
        return {cell.text: cell.x + cell.width // 2}

    return {}


def _find_scale_text(words: list[TableCell], year_columns: dict[str, int]) -> str:
    """Find scale indicator text (e.g. '£000') near the year headers."""
    if not year_columns:
        return ""

    # Look for words near the year headers (within 2 row heights above/below)
    year_ys = [w.y for w in words if w.text in year_columns]
    if not year_ys:
        # Find y by checking words at year column x positions
        return ""

    # Get approximate y of the year header row
    min_year_x = min(year_columns.values())
    header_candidates = [
        w for w in words
        if any(abs((w.x + w.width // 2) - col_x) < 100 for col_x in year_columns.values())
    ]

    # Look for scale keywords in nearby words
    scale_words = []
    for w in header_candidates:
        if any(s in w.text.lower() for s in ["£", "000", "£000", "thousand"]):
            scale_words.append(w.text)

    # Also check all words in the top portion of the page
    for w in words:
        if w.y < (min(year_ys) if year_ys else 500) + 100:
            if any(s in w.text.lower() for s in ["£", "000"]):
                if w.text not in scale_words:
                    scale_words.append(w.text)

    return " ".join(scale_words)


def _build_rows(
    words: list[TableCell],
    year_columns: dict[str, int],
    col_tolerance: int,
    min_value_x: int,
) -> list[TableRow]:
    """Group words into table rows and assign to label/value columns."""
    # Sort by y position
    sorted_words = sorted(words, key=lambda w: w.y)

    # Cluster into rows by y proximity
    if not sorted_words:
        return []

    row_clusters: list[list[TableCell]] = []
    current: list[TableCell] = [sorted_words[0]]

    for w in sorted_words[1:]:
        if abs(w.y - current[0].y) <= _ROW_CLUSTER_TOLERANCE:
            current.append(w)
        else:
            row_clusters.append(current)
            current = [w]
    row_clusters.append(current)

    # Build TableRow for each cluster
    rows: list[TableRow] = []
    years = sorted(year_columns.keys(), reverse=True)

    for cluster in row_clusters:
        # Sort words in row by x position
        cluster.sort(key=lambda w: w.x)

        # Split into label words and value words
        label_cells: list[TableCell] = []
        value_assignments: dict[str, TableCell | None] = {y: None for y in years}

        for w in cluster:
            w_centre = w.x + w.width // 2

            # Find the nearest value column within tolerance
            best_year = None
            best_dist = col_tolerance + 1
            for year, col_x in year_columns.items():
                dist = abs(w_centre - col_x)
                if dist <= col_tolerance and dist < best_dist:
                    best_dist = dist
                    best_year = year

            if best_year is not None:
                if value_assignments[best_year] is None:
                    value_assignments[best_year] = w
                else:
                    # Append to existing (e.g. parenthesised negative split across words)
                    existing = value_assignments[best_year]
                    value_assignments[best_year] = TableCell(
                        text=existing.text + " " + w.text,
                        x=existing.x,
                        y=existing.y,
                        width=(w.x + w.width) - existing.x,
                        height=max(existing.height, w.height),
                        confidence=min(existing.confidence, w.confidence),
                    )
            elif w_centre < min_value_x:
                label_cells.append(w)
            else:
                # Rescue: word is right of labels but missed all columns.
                # Assign to nearest column with extended tolerance (2x) to
                # recover values that sit slightly outside the strict zone.
                # Genuine note references sit further from columns than values.
                rescue_year = None
                rescue_dist = col_tolerance * 2
                for year, col_x in year_columns.items():
                    dist = abs(w_centre - col_x)
                    if dist < rescue_dist:
                        rescue_dist = dist
                        rescue_year = year
                if rescue_year is not None:
                    if value_assignments[rescue_year] is None:
                        value_assignments[rescue_year] = w
                    else:
                        existing = value_assignments[rescue_year]
                        value_assignments[rescue_year] = TableCell(
                            text=existing.text + " " + w.text,
                            x=existing.x,
                            y=existing.y,
                            width=(w.x + w.width) - existing.x,
                            height=max(existing.height, w.height),
                            confidence=min(existing.confidence, w.confidence),
                        )

        label_text = " ".join(c.text for c in label_cells).strip()

        # Skip rows that are just year headers or empty labels with no values
        if not label_text and not any(value_assignments.values()):
            continue

        y_centre = int(np.mean([w.y + w.height // 2 for w in cluster]))

        rows.append(TableRow(
            y_centre=y_centre,
            label=label_text,
            values=value_assignments,
            label_cells=label_cells,
        ))

    return rows


# Regex for two financial values separated by whitespace in a single cell
_COMPOUND_VALUE_RE = re.compile(
    r"^(-?\(?\d[\d,]+\)?)\s+(-?\(?\d[\d,]+\)?)$"
)


def _split_compound_values(rows: list[TableRow], years: list[str]) -> None:
    """Split cells containing two concatenated year values.

    When Tesseract merges two column values into one word
    (e.g. "(284,085) (55,657)"), split them so the first value stays
    in the current year column and the second goes to the next year.
    Years are ordered most-recent-first (left on page = first in list).
    """
    for row in rows:
        for i, year in enumerate(years):
            cell = row.values.get(year)
            if cell is None:
                continue
            m = _COMPOUND_VALUE_RE.match(cell.text.strip())
            if not m:
                continue
            next_year = years[i + 1] if i + 1 < len(years) else None
            if next_year is None:
                continue
            # Only split if the target column is empty
            if row.values.get(next_year) is not None:
                continue
            # First value stays in current column
            row.values[year] = TableCell(
                text=m.group(1),
                x=cell.x,
                y=cell.y,
                width=cell.width // 2,
                height=cell.height,
                confidence=cell.confidence,
            )
            # Second value goes to next year column
            row.values[next_year] = TableCell(
                text=m.group(2),
                x=cell.x + cell.width // 2,
                y=cell.y,
                width=cell.width // 2,
                height=cell.height,
                confidence=cell.confidence,
            )
