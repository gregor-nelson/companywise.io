"""
Stage 1: PDF → page images using PyMuPDF.

Renders each page of a scanned PDF to a numpy array at a given DPI.
For TIFF-in-PDF scans, this extracts the embedded image directly.
"""

from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np


@dataclass
class PageImage:
    page_number: int  # 0-indexed
    image: np.ndarray  # HxWx3 RGB numpy array
    width: int
    height: int


def render_pages(pdf_path: str | Path, dpi: int = 300) -> list[PageImage]:
    """Render all pages of a PDF to RGB numpy arrays.

    Args:
        pdf_path: path to the PDF file
        dpi: rendering resolution (300 is good for OCR)

    Returns:
        List of PageImage, one per page.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    doc = fitz.open(str(pdf_path))
    pages: list[PageImage] = []

    zoom = dpi / 72  # PyMuPDF default is 72 DPI
    matrix = fitz.Matrix(zoom, zoom)

    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB)

        # Convert to numpy array (RGB)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, 3
        )

        pages.append(PageImage(
            page_number=page_num,
            image=img.copy(),  # copy so pixmap can be freed
            width=pix.width,
            height=pix.height,
        ))

    doc.close()
    return pages


def save_debug_images(pages: list[PageImage], output_dir: str | Path) -> None:
    """Save page images to disk for visual inspection."""
    import cv2

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for page in pages:
        path = output_dir / f"page_{page.page_number:03d}.png"
        # Convert RGB to BGR for OpenCV
        bgr = cv2.cvtColor(page.image, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(path), bgr)
