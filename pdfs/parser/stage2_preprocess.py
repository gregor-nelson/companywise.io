"""
Stage 2: Image preprocessing — cleanup scanned page images for OCR.

Applies deterministic pixel operations: grayscale, thresholding, deskew,
light denoise. All operations are OpenCV-based and CPU-only.
"""

from dataclasses import dataclass

import cv2
import numpy as np

from .stage1_render import PageImage


@dataclass
class PreprocessedPage:
    page_number: int
    image: np.ndarray       # cleaned grayscale image
    original_image: np.ndarray  # keep original for debug
    skew_angle: float       # detected skew in degrees
    threshold_value: float  # Otsu threshold used


def preprocess(page: PageImage) -> PreprocessedPage:
    """Clean up a scanned page image for OCR.

    Pipeline: RGB → grayscale → Otsu threshold → deskew → denoise

    Args:
        page: raw rendered page image

    Returns:
        PreprocessedPage with cleaned binary image.
    """
    img = page.image.copy()

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    # Otsu's binarisation — good for scanned docs with uniform background
    thresh_val, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Deskew if needed
    skew = _detect_skew(binary)
    if abs(skew) > 0.5:
        binary = _rotate(binary, skew)

    # Light denoise — median filter removes salt-and-pepper noise from scans
    cleaned = cv2.medianBlur(binary, 3)

    return PreprocessedPage(
        page_number=page.page_number,
        image=cleaned,
        original_image=img,
        skew_angle=skew,
        threshold_value=float(thresh_val),
    )


def _detect_skew(binary: np.ndarray) -> float:
    """Detect page skew angle using Hough line transform."""
    # Invert for line detection (text = white)
    inverted = cv2.bitwise_not(binary)

    # Find lines
    lines = cv2.HoughLinesP(
        inverted,
        rho=1,
        theta=np.pi / 180,
        threshold=200,
        minLineLength=binary.shape[1] // 4,
        maxLineGap=20,
    )

    if lines is None or len(lines) == 0:
        return 0.0

    # Calculate angles of detected lines
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 - x1 == 0:
            continue
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        # Only consider near-horizontal lines (within ±10°)
        if abs(angle) < 10:
            angles.append(angle)

    if not angles:
        return 0.0

    return float(np.median(angles))


def _rotate(image: np.ndarray, angle: float) -> np.ndarray:
    """Rotate image to correct skew."""
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image, matrix, (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return rotated
