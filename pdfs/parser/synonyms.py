"""
Concept synonym dictionary for UK financial statement line items.

Maps iXBRL concept names to lists of label variations found across
different accounting firms' filings. Used by stage7_concepts for
fuzzy matching.

To extend: add new synonyms to existing concepts, or add new concept
entries following the same pattern.
"""

CONCEPT_SYNONYMS: dict[str, list[str]] = {
    "FixedAssets": [
        "fixed assets",
        "non-current assets",
        "non current assets",
        "total fixed assets",
        "total non-current assets",
        "tangible and intangible assets",
    ],
    "CurrentAssets": [
        "current assets",
        "total current assets",
    ],
    "CashBankOnHand": [
        "cash at bank and in hand",
        "cash at bank",
        "cash and cash equivalents",
        "cash in hand",
        "bank and cash balances",
        "cash at bank and on hand",
    ],
    "Debtors": [
        "debtors",
        "receivables",
        "trade debtors",
        "trade and other receivables",
        "receivables amounts falling due within one year",
        "amounts falling due within one year",  # when nested under current assets
    ],
    "Creditors": [
        "creditors amounts falling due within one year",
        "creditors falling due within one year",
        "payables amounts falling due within one year",
        "payables falling due within one year",
        "current liabilities",
        "creditors due within one year",
        "trade and other payables",
    ],
    "NetCurrentAssetsLiabilities": [
        "net current assets liabilities",
        "net current liabilities",
        "net current assets",
        "net current assets/(liabilities)",
        "net current (liabilities)/assets",
        "net current liabilities assets",
    ],
    "TotalAssetsLessCurrentLiabilities": [
        "total assets less current liabilities",
        "net assets employed",
        "total assets less current liabilities and provisions",
    ],
    "NetAssetsLiabilities": [
        "net assets liabilities",
        "net assets",
        "net liabilities",
        "net (liabilities)/assets",
        "net assets/(liabilities)",
        "net (liabilities)",
        "total net assets",
        "total net liabilities",
    ],
    "Equity": [
        "total equity",
        "total shareholders funds",
        "total shareholders' funds",
        "shareholders funds",
        "capital and reserves",
        "members funds",
        "total members funds",
        "equity shareholders funds",
    ],
    "ProfitLoss": [
        "profit loss for the financial year",
        "profit for the financial year",
        "loss for the financial year",
        "profit for the year",
        "loss for the year",
        "profit/(loss) for the financial year",
        "(loss)/profit for the financial year",
        "profit and loss for the year",
        "net profit",
        "net loss",
        "retained profit for the year",
        "retained loss for the year",
    ],
}


def build_label_to_concept() -> dict[str, str]:
    """Build a flat lookup: normalised label string → concept name."""
    lookup = {}
    for concept, labels in CONCEPT_SYNONYMS.items():
        for label in labels:
            lookup[label.lower().strip()] = concept
    return lookup


# Pre-built for import convenience
LABEL_TO_CONCEPT = build_label_to_concept()
