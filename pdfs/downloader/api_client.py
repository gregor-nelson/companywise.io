"""
Companies House REST API client with built-in rate limiting.

Auth: HTTP Basic — API key as username, blank password.
Rate limit: 600 requests per 5-minute sliding window.
"""

import logging
import time
from collections import deque
from pathlib import Path

import requests
from requests.auth import HTTPBasicAuth

from config.settings import (
    API_BASE_URL,
    API_KEY,
    DOCUMENT_API_BASE_URL,
    MAX_RETRIES,
    RATE_LIMIT_TARGET,
    RATE_LIMIT_WINDOW_SECONDS,
    RETRY_BACKOFF_BASE,
)

logger = logging.getLogger(__name__)


class RateLimiter:
    """Sliding-window rate limiter for API requests.

    Tracks request timestamps and sleeps when approaching the ceiling.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._timestamps: deque[float] = deque()
        self._total_requests = 0

    def wait_if_needed(self):
        """Block until it's safe to make another request."""
        now = time.time()
        cutoff = now - self.window_seconds

        # Purge timestamps outside the window
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.popleft()

        if len(self._timestamps) >= self.max_requests:
            # Need to wait until the oldest request falls out of the window
            sleep_time = self._timestamps[0] - cutoff + 0.1
            logger.info(
                f"Rate limit: {len(self._timestamps)}/{self.max_requests} requests in window. "
                f"Sleeping {sleep_time:.1f}s"
            )
            time.sleep(sleep_time)
            # Purge again after sleeping
            now = time.time()
            cutoff = now - self.window_seconds
            while self._timestamps and self._timestamps[0] < cutoff:
                self._timestamps.popleft()

        self._timestamps.append(time.time())
        self._total_requests += 1

    @property
    def requests_in_window(self) -> int:
        now = time.time()
        cutoff = now - self.window_seconds
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.popleft()
        return len(self._timestamps)

    @property
    def total_requests(self) -> int:
        return self._total_requests


class CompaniesHouseAPI:
    """Wrapper for the Companies House REST API.

    Handles authentication, rate limiting, and retry logic.
    """

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or API_KEY
        if not self.api_key:
            raise ValueError(
                "No API key provided. Set API_KEY in pdfs/.env or pass api_key parameter."
            )

        self.auth = HTTPBasicAuth(self.api_key, "")
        self.session = requests.Session()
        self.session.auth = self.auth
        self.session.headers.update({"Accept": "application/json"})

        self.rate_limiter = RateLimiter(
            max_requests=RATE_LIMIT_TARGET,
            window_seconds=RATE_LIMIT_WINDOW_SECONDS,
        )

    def _request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make a rate-limited request with retry logic."""
        last_exception = None

        for attempt in range(1, MAX_RETRIES + 1):
            self.rate_limiter.wait_if_needed()

            try:
                response = self.session.request(method, url, timeout=30, **kwargs)

                if response.status_code == 429:
                    # Rate limited by the server — back off
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(
                        f"429 Too Many Requests. Retry-After: {retry_after}s (attempt {attempt}/{MAX_RETRIES})"
                    )
                    time.sleep(retry_after)
                    continue

                if response.status_code >= 500:
                    wait = RETRY_BACKOFF_BASE ** attempt
                    logger.warning(
                        f"Server error {response.status_code} on {url}. "
                        f"Retrying in {wait:.1f}s (attempt {attempt}/{MAX_RETRIES})"
                    )
                    time.sleep(wait)
                    continue

                return response

            except requests.RequestException as e:
                last_exception = e
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning(
                    f"Request error: {e}. Retrying in {wait:.1f}s (attempt {attempt}/{MAX_RETRIES})"
                )
                time.sleep(wait)

        # All retries exhausted
        if last_exception:
            raise last_exception
        raise requests.RequestException(f"Failed after {MAX_RETRIES} retries: {url}")

    def get_filing_history(
        self, company_number: str, category: str = "accounts", items_per_page: int = 25
    ) -> list[dict]:
        """Get filing history for a company, filtered by category.

        Args:
            company_number: UK company registration number
            category: Filing category filter (default: "accounts")
            items_per_page: Results per page (max 100)

        Returns:
            List of filing records from the API
        """
        url = f"{API_BASE_URL}/company/{company_number}/filing-history"
        params = {"category": category, "items_per_page": items_per_page}

        response = self._request("GET", url, params=params)

        if response.status_code == 404:
            logger.warning(f"Company {company_number} not found")
            return []

        response.raise_for_status()
        data = response.json()
        return data.get("items", [])

    def get_document_metadata(self, document_url: str) -> dict | None:
        """Get document metadata to check available formats.

        Args:
            document_url: The document_metadata URL from filing history

        Returns:
            Document metadata dict, or None if not found
        """
        # The URL from filing history is already absolute
        if document_url.startswith("/"):
            document_url = f"{DOCUMENT_API_BASE_URL}{document_url}"

        response = self._request("GET", document_url)

        if response.status_code == 404:
            return None

        response.raise_for_status()
        return response.json()

    def download_document(self, document_url: str, output_path: Path) -> bool:
        """Download a document (PDF) to disk.

        The document content endpoint returns a redirect to the actual file.

        Args:
            document_url: The document_metadata URL from filing history
            output_path: Where to save the file

        Returns:
            True if downloaded successfully
        """
        # Build the content URL
        if document_url.startswith("/"):
            content_url = f"{DOCUMENT_API_BASE_URL}{document_url}/content"
        else:
            content_url = f"{document_url}/content"

        self.rate_limiter.wait_if_needed()

        response = self.session.get(
            content_url,
            headers={"Accept": "application/pdf"},
            timeout=60,
            stream=True,
            allow_redirects=True,
        )
        response.raise_for_status()

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        size_kb = output_path.stat().st_size / 1024
        logger.info(f"Downloaded {output_path.name} ({size_kb:.0f} KB)")
        return True

    def get_rate_limit_status(self) -> dict:
        """Get current rate limit usage."""
        return {
            "requests_in_window": self.rate_limiter.requests_in_window,
            "max_requests": RATE_LIMIT_TARGET,
            "total_requests": self.rate_limiter.total_requests,
        }
