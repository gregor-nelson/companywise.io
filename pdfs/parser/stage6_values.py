"""
Stage 6: Value parsing — OCR'd text → numeric values.

Handles:
- Parenthesised negatives: (279,477) → -279477
- Comma removal: 487,516 → 487516
- Dash as zero: - → 0
- Common OCR misreads in numeric context: l→1, O→0, S→5, I→1
- Scale detection: "£000" → 1000
"""

import re
from dataclasses import dataclass


@dataclass
class ParsedValue:
    raw_text: str
    value: int | None
    negative: bool
    corrections: list[str]  # what OCR fixes were applied

    @property
    def is_valid(self) -> bool:
        return self.value is not None


# OCR misread corrections applied only when the text looks numeric
_OCR_CORRECTIONS = [
    ("l", "1"),
    ("I", "1"),
    ("O", "0"),
    ("o", "0"),
    ("S", "5"),
    ("s", "5"),
    ("B", "8"),
    ("g", "9"),
    ("Z", "2"),
]


def parse_value(text: str, scale: int = 1) -> ParsedValue:
    """Parse a single OCR'd cell value into a number.

    Args:
        text: raw OCR text from a single table cell
        scale: multiplier (e.g. 1000 for £000 filings)

    Returns:
        ParsedValue with the parsed integer (already scaled) or None if unparseable.
    """
    raw = text.strip()
    corrections: list[str] = []

    if not raw:
        return ParsedValue(raw_text=text, value=None, negative=False, corrections=[])

    # Dash or em-dash means zero
    if raw in ("-", "—", "–", "~"):
        return ParsedValue(raw_text=text, value=0, negative=False, corrections=[])

    # Detect parenthesised negatives: (123,456)
    negative = False
    if raw.startswith("(") and raw.endswith(")"):
        negative = True
        raw = raw[1:-1].strip()

    # Also handle explicit minus sign
    if raw.startswith("-"):
        negative = True
        raw = raw[1:].strip()

    # Remove currency symbols and whitespace
    raw = raw.replace("£", "").replace("$", "").replace(" ", "")

    # Remove commas
    raw = raw.replace(",", "")

    # Apply OCR corrections if the result isn't already pure digits
    if not raw.isdigit():
        for wrong, right in _OCR_CORRECTIONS:
            if wrong in raw:
                corrections.append(f"{wrong}→{right}")
                raw = raw.replace(wrong, right)

    # Remove any trailing dots or periods (OCR artifact)
    raw = raw.rstrip(".")

    # Final check: should be digits only now
    if not raw.isdigit():
        return ParsedValue(raw_text=text, value=None, negative=negative, corrections=corrections)

    value = int(raw) * scale
    if negative:
        value = -value

    return ParsedValue(raw_text=text, value=value, negative=negative, corrections=corrections)


# Scale detection patterns
_SCALE_PATTERNS = [
    (re.compile(r"£\s*000", re.IGNORECASE), 1000),
    (re.compile(r"£\s*'000", re.IGNORECASE), 1000),
    (re.compile(r"in thousands", re.IGNORECASE), 1000),
    (re.compile(r"£\s*millions?", re.IGNORECASE), 1_000_000),
    (re.compile(r"£\s*m\b", re.IGNORECASE), 1_000_000),
]


def detect_scale(header_text: str) -> int:
    """Detect the numeric scale from page header text.

    Returns:
        Multiplier (1000 for £000, 1 if no scale indicator found).
    """
    for pattern, scale in _SCALE_PATTERNS:
        if pattern.search(header_text):
            return scale
    return 1
