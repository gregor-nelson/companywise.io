"""
Stage 7: Concept mapping — OCR'd row labels → iXBRL concept names.

Uses exact match first (fast, deterministic), then falls back to
rapidfuzz for fuzzy matching with a confidence gate.
"""

import re
from dataclasses import dataclass

from rapidfuzz import fuzz, process

from .synonyms import CONCEPT_SYNONYMS, LABEL_TO_CONCEPT


@dataclass
class ConceptMatch:
    label: str            # original OCR'd label
    concept: str | None   # matched iXBRL concept, or None
    score: float          # 0-100 confidence
    match_type: str       # "exact", "fuzzy", "none"


def _normalise(text: str) -> str:
    """Normalise a label for matching: lowercase, strip punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s/()]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# Pre-build the list of all known labels for fuzzy matching
_ALL_LABELS = list(LABEL_TO_CONCEPT.keys())


def map_concept(label: str, score_cutoff: float = 75.0) -> ConceptMatch:
    """Map an OCR'd row label to an iXBRL concept.

    Args:
        label: raw text from the label column of a table row
        score_cutoff: minimum rapidfuzz score to accept a fuzzy match

    Returns:
        ConceptMatch with the best match or None.
    """
    normalised = _normalise(label)

    if not normalised:
        return ConceptMatch(label=label, concept=None, score=0.0, match_type="none")

    # Try exact match first
    if normalised in LABEL_TO_CONCEPT:
        return ConceptMatch(
            label=label,
            concept=LABEL_TO_CONCEPT[normalised],
            score=100.0,
            match_type="exact",
        )

    # Fuzzy match against all known labels
    result = process.extractOne(
        normalised,
        _ALL_LABELS,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=score_cutoff,
    )

    if result is not None:
        matched_label, score, _idx = result
        return ConceptMatch(
            label=label,
            concept=LABEL_TO_CONCEPT[matched_label],
            score=score,
            match_type="fuzzy",
        )

    return ConceptMatch(label=label, concept=None, score=0.0, match_type="none")
