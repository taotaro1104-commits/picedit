"""傷・折れ跡の検出と除去。

細い明線（白い傷）はトップハット、細い暗線（黒い傷・折れ跡）はブラックハットで強調し、
閾値処理と小領域除去でマスク化する。最終的な穴埋めは cv2.inpaint（Telea）で行う。
"""

from __future__ import annotations

import cv2
import numpy as np

from app.core.validation import ImageValidationError, validate_ratio

KERNEL_SIZE = 11
MIN_COMPONENT_AREA = 20
THRESHOLD_MAX = 60.0  # sensitivity=0 の閾値
THRESHOLD_MIN = 12.0  # sensitivity=1 の閾値


def detect_scratches(img: np.ndarray, sensitivity: float = 0.5) -> np.ndarray:
    """傷らしい細線のマスク（0/255）を返す。sensitivity が高いほど多く拾う。"""
    validate_ratio(sensitivity, "sensitivity")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (KERNEL_SIZE, KERNEL_SIZE))
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    response = np.maximum(tophat, blackhat)

    threshold = THRESHOLD_MAX - (THRESHOLD_MAX - THRESHOLD_MIN) * sensitivity
    mask = np.where(response > threshold, 255, 0).astype(np.uint8)
    mask = _remove_small_components(mask, MIN_COMPONENT_AREA)
    return cv2.dilate(mask, np.ones((3, 3), np.uint8))


def _remove_small_components(mask: np.ndarray, min_area: int) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    keep = np.zeros(count, dtype=bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return np.where(keep[labels], 255, 0).astype(np.uint8)


def combine_masks(
    auto: np.ndarray, *, add: np.ndarray | None = None, remove: np.ndarray | None = None
) -> np.ndarray:
    """(自動検出 ∪ 追加ブラシ) − 消去ブラシ。"""
    for extra in (add, remove):
        if extra is not None and extra.shape != auto.shape:
            raise ImageValidationError("マスクのサイズが画像と一致しません。", "mask_size_mismatch")
    out = auto > 0
    if add is not None:
        out = out | (add > 0)
    if remove is not None:
        out = out & ~(remove > 0)
    return np.where(out, 255, 0).astype(np.uint8)


def inpaint_scratches(img: np.ndarray, mask: np.ndarray, radius: int = 3) -> np.ndarray:
    if mask.shape != img.shape[:2]:
        raise ImageValidationError("マスクのサイズが画像と一致しません。", "mask_size_mismatch")
    return cv2.inpaint(img, mask, radius, cv2.INPAINT_TELEA)
