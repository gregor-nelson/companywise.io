"""
Filing discovery — identify companies with PDF-only account filings.

Queries the Companies House filing history API and checks document metadata
to determine whether a filing is available only as PDF (not in bulk iXBRL data).
"""

import logging
from dataclasses import dataclass

from downloader.api_client import CompaniesHouseAPI

logger = logging.getLogger(__name__)


@dataclass
class PdfFiling:
    """A PDF-only account filing discovered via the API."""
    company_number: str
    filing_date: str           # Date the filing was made
    description: str           # e.g. "accounts-with-accounts-type-full"
    document_url: str          # document_metadata URL for downloading
    document_id: str           # Extracted from the URL
    account_type: str          # e.g. "AA" (full), "AA01" (micro), etc.
    made_up_to: str | None     # Balance sheet date if available


def extract_document_id(document_url: str) -> str:
    """Extract the document ID from a document metadata URL.

    URL format: /document/{document_id} or full URL ending in /{document_id}
    """
    return document_url.rstrip("/").split("/")[-1]


def is_pdf_only(metadata: dict) -> bool:
    """Check if a document is only available as PDF (not iXBRL).

    If application/xhtml+xml is available, the filing IS in the bulk data.
    If only application/pdf is available, it's a PDF-only filing.
    """
    resources = metadata.get("resources", {})
    has_pdf = "application/pdf" in resources
    has_ixbrl = "application/xhtml+xml" in resources
    return has_pdf and not has_ixbrl


def find_pdf_account_filings(
    company_number: str, api: CompaniesHouseAPI
) -> list[PdfFiling]:
    """Find all PDF-only account filings for a company.

    Args:
        company_number: UK company registration number
        api: Authenticated API client

    Returns:
        List of PdfFiling objects for PDF-only account filings
    """
    filings = api.get_filing_history(company_number, category="accounts")

    if not filings:
        logger.info(f"{company_number}: No account filings found")
        return []

    logger.info(f"{company_number}: Found {len(filings)} account filings, checking formats...")

    pdf_filings = []

    for filing in filings:
        # Get the document metadata link
        links = filing.get("links", {})
        document_url = links.get("document_metadata")

        if not document_url:
            continue

        # Check if this is PDF-only
        metadata = api.get_document_metadata(document_url)
        if metadata is None:
            logger.warning(f"{company_number}: Could not get metadata for {document_url}")
            continue

        if is_pdf_only(metadata):
            # Extract the made_up_to date from the description_values if available
            desc_values = filing.get("description_values", {})
            made_up_to = desc_values.get("made_up_date")

            pdf_filing = PdfFiling(
                company_number=company_number,
                filing_date=filing.get("date", "unknown"),
                description=filing.get("description", ""),
                document_url=document_url,
                document_id=extract_document_id(document_url),
                account_type=filing.get("type", "unknown"),
                made_up_to=made_up_to,
            )
            pdf_filings.append(pdf_filing)
            logger.info(
                f"  PDF-only: {pdf_filing.filing_date} "
                f"({pdf_filing.description}) "
                f"[type={pdf_filing.account_type}]"
            )
        else:
            logger.debug(
                f"  iXBRL available: {filing.get('date')} — skip (already in bulk data)"
            )

    logger.info(
        f"{company_number}: {len(pdf_filings)} PDF-only out of {len(filings)} total account filings"
    )
    return pdf_filings


def discover_from_company_list(
    company_numbers: list[str], api: CompaniesHouseAPI
) -> list[PdfFiling]:
    """Batch-discover PDF-only filings across multiple companies.

    Args:
        company_numbers: List of company registration numbers
        api: Authenticated API client

    Returns:
        All PDF-only filings found across all companies
    """
    all_filings = []
    companies_with_pdfs = 0

    for i, number in enumerate(company_numbers, 1):
        number = number.strip().upper()
        if not number:
            continue

        logger.info(f"[{i}/{len(company_numbers)}] Checking {number}...")

        try:
            pdf_filings = find_pdf_account_filings(number, api)
            if pdf_filings:
                companies_with_pdfs += 1
                all_filings.extend(pdf_filings)
        except Exception as e:
            logger.error(f"{number}: Error during discovery — {e}")

        rate_status = api.get_rate_limit_status()
        if i % 10 == 0:
            logger.info(
                f"Progress: {i}/{len(company_numbers)} companies checked, "
                f"{len(all_filings)} PDF filings found. "
                f"API: {rate_status['requests_in_window']}/{rate_status['max_requests']} in window"
            )

    logger.info(
        f"Discovery complete: {len(company_numbers)} companies checked, "
        f"{companies_with_pdfs} have PDF-only filings, "
        f"{len(all_filings)} total PDF filings found"
    )
    return all_filings
