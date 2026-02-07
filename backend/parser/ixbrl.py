# iXBRL parser for HTML files
# See docs/DATA_SPECIFICATION.md Section 4 for format details
"""
iXBRL Parser for Companies House bulk accounts data.

Extracts structured data from iXBRL HTML files:
- Contexts: period and dimension definitions
- Units: currency/measure definitions
- Numeric facts: <ix:nonFraction> elements with all attributes
- Text facts: <ix:nonNumeric> elements

Key features:
- Dual-value storage: concept_raw (uk-core:Equity) + concept (Equity)
- Dual-value storage: value_raw (762,057) + value (-762057.0 with sign/scale)
- Full attribute preservation: name, contextRef, unitRef, decimals, scale, format, sign
- Handles sign="-" attribute for negative values
- Handles format variations (ixt:numcommadot, ixt2:numdotdecimal, ixt2:zerodash)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from bs4 import BeautifulSoup, Tag


@dataclass
class Context:
    """Parsed context from <xbrli:context> element."""
    context_ref: str
    entity_identifier: str | None = None
    entity_scheme: str | None = None
    period_type: str = "instant"
    instant_date: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    dimensions: dict[str, Any] | None = None
    segment_raw: str | None = None


@dataclass
class Unit:
    """Parsed unit from <xbrli:unit> element."""
    unit_ref: str
    measure_raw: str
    measure: str


@dataclass
class NumericFact:
    """Parsed numeric fact from <ix:nonFraction> element."""
    concept_raw: str
    concept: str
    context_ref: str
    unit_ref: str | None = None
    value_raw: str = ""
    value: float | None = None
    sign: str | None = None
    decimals: int | None = None
    scale: int | None = None
    format: str | None = None


@dataclass
class TextFact:
    """Parsed text fact from <ix:nonNumeric> element."""
    concept_raw: str
    concept: str
    context_ref: str
    value: str | None = None
    format: str | None = None
    escape: str | None = None


@dataclass
class ParsedIXBRL:
    """Complete parsed result from an iXBRL file."""
    contexts: list[Context] = field(default_factory=list)
    units: list[Unit] = field(default_factory=list)
    numeric_facts: list[NumericFact] = field(default_factory=list)
    text_facts: list[TextFact] = field(default_factory=list)
    company_number: str | None = None
    company_name: str | None = None
    balance_sheet_date: str | None = None
    period_start_date: str | None = None
    period_end_date: str | None = None


def parse_numeric_value(
    raw: str,
    sign: str | None = None,
    scale: int | None = None,
    format_attr: str | None = None,
) -> float | None:
    """
    Parse raw text to numeric value.

    Handles:
    - Comma-separated thousands: "762,057" -> 762057
    - Dash as zero: "-" -> 0 (when format is zerodash/numdash)
    - Sign attribute: sign="-" makes value negative
    - Scale attribute: scale=3 multiplies by 1000, scale=-2 divides by 100
    - European format: "1.234,56" -> 1234.56 (ixt:numcommadot)
    """
    if raw is None:
        return None

    text = raw.strip()
    if not text:
        return None

    # Handle dash/zero formats
    if text == "-":
        if format_attr and ("zerodash" in format_attr.lower() or "numdash" in format_attr.lower()):
            return 0.0
        return 0.0

    # Handle parentheses as negative
    is_negative_parens = False
    if text.startswith("(") and text.endswith(")"):
        is_negative_parens = True
        text = text[1:-1].strip()

    # UK Companies House data: comma is always thousands separator
    # (regardless of format attribute like ixt:numcommadot)
    text = text.replace(",", "")

    try:
        value = float(text)
    except ValueError:
        cleaned = re.sub(r"[^\d.\-]", "", text)
        if not cleaned or cleaned in ("-", "."):
            return None
        try:
            value = float(cleaned)
        except ValueError:
            return None

    if is_negative_parens:
        value = -abs(value)

    if sign == "-":
        value = -abs(value)

    if scale is not None:
        value *= (10 ** scale)

    return value


def normalize_concept(concept_raw: str) -> str:
    """Strip namespace prefix: uk-core:Equity -> Equity"""
    return concept_raw.split(":")[-1] if ":" in concept_raw else concept_raw


def normalize_measure(measure_raw: str) -> str:
    """Strip namespace prefix: iso4217:GBP -> GBP"""
    return measure_raw.split(":")[-1] if ":" in measure_raw else measure_raw


def parse_int_attr(value: str | None) -> int | None:
    """Parse integer attribute, handling INF as None."""
    if value is None:
        return None
    value = value.strip()
    if value.upper() == "INF":
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _find_first(elem: Tag, names: list[str]):
    """Find first matching child element from list of possible tag names."""
    for name in names:
        found = elem.find(name)
        if found:
            return found
    return None


def parse_context(context_elem: Tag) -> Context:
    """Parse a <xbrli:context> element."""
    context_ref = context_elem.get("id", "")

    identifier_elem = _find_first(context_elem, ["identifier", "xbrli:identifier"])
    entity_identifier = identifier_elem.get_text(strip=True) if identifier_elem else None
    entity_scheme = identifier_elem.get("scheme") if identifier_elem else None

    period_elem = _find_first(context_elem, ["period", "xbrli:period"])
    period_type = "forever"
    instant_date = start_date = end_date = None

    if period_elem:
        instant_elem = _find_first(period_elem, ["instant", "xbrli:instant"])
        if instant_elem:
            period_type = "instant"
            instant_date = instant_elem.get_text(strip=True)
        else:
            start_elem = _find_first(period_elem, ["startDate", "xbrli:startDate"])
            end_elem = _find_first(period_elem, ["endDate", "xbrli:endDate"])
            if start_elem or end_elem:
                period_type = "duration"
                start_date = start_elem.get_text(strip=True) if start_elem else None
                end_date = end_elem.get_text(strip=True) if end_elem else None

    segment_elem = _find_first(context_elem, ["segment", "xbrli:segment"])
    segment_raw = None
    dimensions: dict[str, Any] = {"explicit": [], "typed": []}

    if segment_elem:
        segment_raw = str(segment_elem)

        for member in segment_elem.find_all(["explicitMember", "xbrldi:explicitMember"]):
            dimensions["explicit"].append({
                "dimension": member.get("dimension", ""),
                "member": member.get_text(strip=True)
            })

        for member in segment_elem.find_all(["typedMember", "xbrldi:typedMember"]):
            children = [c for c in member.children if isinstance(c, Tag)]
            dimensions["typed"].append({
                "dimension": member.get("dimension", ""),
                "value": children[0].get_text(strip=True) if children else ""
            })

    dimensions_json = dimensions if (dimensions["explicit"] or dimensions["typed"]) else None

    return Context(
        context_ref=context_ref,
        entity_identifier=entity_identifier,
        entity_scheme=entity_scheme,
        period_type=period_type,
        instant_date=instant_date,
        start_date=start_date,
        end_date=end_date,
        dimensions=dimensions_json,
        segment_raw=segment_raw,
    )


def parse_unit(unit_elem: Tag) -> Unit:
    """Parse a <xbrli:unit> element."""
    unit_ref = unit_elem.get("id", "")
    measure_elem = _find_first(unit_elem, ["measure", "xbrli:measure"])
    measure_raw = measure_elem.get_text(strip=True) if measure_elem else ""
    return Unit(unit_ref=unit_ref, measure_raw=measure_raw, measure=normalize_measure(measure_raw))


def parse_numeric_fact(elem: Tag) -> NumericFact:
    """Parse an <ix:nonFraction> element."""
    concept_raw = elem.get("name", "")
    value_raw = elem.get_text(strip=True)
    sign = elem.get("sign")
    decimals = parse_int_attr(elem.get("decimals"))
    scale = parse_int_attr(elem.get("scale"))
    format_attr = elem.get("format")

    return NumericFact(
        concept_raw=concept_raw,
        concept=normalize_concept(concept_raw),
        context_ref=elem.get("contextRef", ""),
        unit_ref=elem.get("unitRef"),
        value_raw=value_raw,
        value=parse_numeric_value(value_raw, sign, scale, format_attr),
        sign=sign,
        decimals=decimals,
        scale=scale,
        format=format_attr,
    )


def parse_text_fact(elem: Tag) -> TextFact:
    """Parse an <ix:nonNumeric> element."""
    concept_raw = elem.get("name", "")
    escape_attr = elem.get("escape")

    if escape_attr:
        value = "".join(str(child) for child in elem.children)
    else:
        value = elem.get_text(strip=True)

    return TextFact(
        concept_raw=concept_raw,
        concept=normalize_concept(concept_raw),
        context_ref=elem.get("contextRef", ""),
        value=value if value else None,
        format=elem.get("format"),
        escape=escape_attr,
    )


def parse_ixbrl(html_content: str | bytes) -> ParsedIXBRL:
    """
    Parse an iXBRL HTML file and extract all structured data.

    Args:
        html_content: The HTML content as string or bytes

    Returns:
        ParsedIXBRL containing all extracted contexts, units, and facts
    """
    # Suppress the XML-parsed-as-HTML warning
    import warnings
    from bs4 import XMLParsedAsHTMLWarning
    warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

    # Try XML parser first (better namespace handling), fall back to lxml-html
    try:
        soup = BeautifulSoup(html_content, "lxml-xml")
    except Exception:
        try:
            soup = BeautifulSoup(html_content, "lxml")
        except Exception:
            soup = BeautifulSoup(html_content, "html.parser")

    result = ParsedIXBRL()

    # Helper to find elements with namespace prefixes (handles lxml normalization)
    def find_all_ns(tag_names: list[str], search_in=None):
        """Find all elements matching any of the tag names (with or without ns prefix)."""
        if search_in is None:
            search_in = soup
        results = []
        for tag in tag_names:
            results.extend(search_in.find_all(tag))
            # Also try with common variations
            if ":" in tag:
                base = tag.split(":")[-1]
                results.extend(search_in.find_all(base))
        return results

    # Find contexts and units in ix:resources or whole document
    header = soup.find("header") or soup.find("ix:header")
    resources = None
    if header:
        resources = header.find("resources") or header.find("ix:resources")
    search_area = resources if resources else soup

    seen_ctx = set()
    for context_elem in find_all_ns(["context", "xbrli:context"], search_area):
        ctx_id = context_elem.get("id")
        if ctx_id and ctx_id not in seen_ctx:
            seen_ctx.add(ctx_id)
            result.contexts.append(parse_context(context_elem))

    seen_units = set()
    for unit_elem in find_all_ns(["unit", "xbrli:unit"], search_area):
        unit_id = unit_elem.get("id")
        if unit_id and unit_id not in seen_units:
            seen_units.add(unit_id)
            result.units.append(parse_unit(unit_elem))

    # Parse facts from entire document
    for elem in find_all_ns(["nonFraction", "ix:nonFraction", "nonfraction"]):
        if elem.get("name"):
            result.numeric_facts.append(parse_numeric_fact(elem))

    for elem in find_all_ns(["nonNumeric", "ix:nonNumeric", "nonnumeric"]):
        if elem.get("name"):
            result.text_facts.append(parse_text_fact(elem))

    # Extract metadata
    for fact in result.text_facts:
        if fact.concept in ("UKCompaniesHouseRegisteredNumber", "CompaniesHouseRegisteredNumber"):
            result.company_number = fact.value
        elif fact.concept in ("EntityCurrentLegalOrRegisteredName", "EntityCurrentLegalName"):
            result.company_name = fact.value
        elif fact.concept == "BalanceSheetDate":
            result.balance_sheet_date = fact.value
        elif fact.concept == "StartDateForPeriodCoveredByReport":
            result.period_start_date = fact.value
        elif fact.concept == "EndDateForPeriodCoveredByReport":
            result.period_end_date = fact.value

    return result


def parse_ixbrl_file(filepath: str) -> ParsedIXBRL:
    """Parse an iXBRL file from disk."""
    with open(filepath, "rb") as f:
        return parse_ixbrl(f.read())


def get_facts_by_concept(result: ParsedIXBRL, concept: str, numeric: bool = True):
    """Get all facts for a given normalized concept name."""
    facts = result.numeric_facts if numeric else result.text_facts
    return [f for f in facts if f.concept == concept]


def to_dict(result: ParsedIXBRL) -> dict[str, Any]:
    """Convert ParsedIXBRL to a dictionary for serialization."""
    return {
        "company_number": result.company_number,
        "company_name": result.company_name,
        "balance_sheet_date": result.balance_sheet_date,
        "period_start_date": result.period_start_date,
        "period_end_date": result.period_end_date,
        "contexts": [
            {k: getattr(c, k) for k in ("context_ref", "entity_identifier", "entity_scheme",
             "period_type", "instant_date", "start_date", "end_date", "dimensions", "segment_raw")}
            for c in result.contexts
        ],
        "units": [{"unit_ref": u.unit_ref, "measure_raw": u.measure_raw, "measure": u.measure}
                  for u in result.units],
        "numeric_facts": [
            {k: getattr(f, k) for k in ("concept_raw", "concept", "context_ref", "unit_ref",
             "value_raw", "value", "sign", "decimals", "scale", "format")}
            for f in result.numeric_facts
        ],
        "text_facts": [
            {k: getattr(f, k) for k in ("concept_raw", "concept", "context_ref", "value", "format", "escape")}
            for f in result.text_facts
        ],
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python ixbrl.py <filepath>")
        sys.exit(1)

    result = parse_ixbrl_file(sys.argv[1])
    print(f"Company: {result.company_name} ({result.company_number})")
    print(f"Balance Sheet Date: {result.balance_sheet_date}")
    print(f"Period: {result.period_start_date} to {result.period_end_date}")
    print(f"\nContexts: {len(result.contexts)}")
    print(f"Units: {len(result.units)}")
    print(f"Numeric Facts: {len(result.numeric_facts)}")
    print(f"Text Facts: {len(result.text_facts)}")

    print("\n--- Sample Numeric Facts ---")
    for fact in result.numeric_facts[:5]:
        print(f"  {fact.concept}: {fact.value_raw} -> {fact.value} (sign={fact.sign})")

    print("\n--- Sample Text Facts ---")
    for fact in result.text_facts[:5]:
        val = (fact.value[:50] + "...") if fact.value and len(fact.value) > 50 else fact.value
        print(f"  {fact.concept}: {val}")
