"""
Configuration for the PDF pipeline.

Loads API key from pdfs/.env and defines paths + rate limit constants.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Project root is the pdfs/ directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# Companies House REST API
API_KEY = os.environ.get("API_KEY", "")
API_BASE_URL = "https://api.company-information.service.gov.uk"
DOCUMENT_API_BASE_URL = "https://document-api.company-information.service.gov.uk"

# Rate limiting: 600 requests per 5-minute window
RATE_LIMIT_REQUESTS = 600
RATE_LIMIT_WINDOW_SECONDS = 300  # 5 minutes
RATE_LIMIT_TARGET = 500  # Stay below ceiling with safety buffer

# Retry settings
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2.0  # Exponential backoff base (seconds)

# Paths
DATA_DIR = PROJECT_ROOT / "data" / "pdfs"
MANIFEST_PATH = PROJECT_ROOT / "data" / "manifest.json"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)
