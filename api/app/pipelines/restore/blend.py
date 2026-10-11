"""AI処理結果と元画像のブレンド（忠実度の調整）。

顔復元などで「別人のようになる」問題を避けるため、AI結果をそのまま使わず、
元画像との混合率（strength）や適用範囲（顔領域のみ）をユーザーが選べるようにする。
"""

from __future__ import annotations

from collections.abc import Sequence

import cv2
import numpy as np

from app.core.validation import validate_ratio

Box = tuple[int, int, int, int]  # x, y, w, h


def match_size(img: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    """img を (width, height) に合わせる。同じサイズならそのまま返す。"""
    w, h = size
    if img.shape[1] == w and img.shape[0] == h:
        return img
    interp = cv2.INTER_CUBIC if w > img.shape[1] else cv2.INTER_AREA
    return cv2.resize(img, (w, h), interpolation=interp)


def blend_strength(original: np.ndarray, processed: np.ndarray, strength: float) -> np.ndarray:
    """strength=0 で元画像、1 で AI 結果。解像度は AI 結果に合わせる。"""
    validate_ratio(strength, "strength")
    base = match_size(original, (processed.shape[1], processed.shape[0]))
    if strength == 0.0:
        return base.copy()
    if strength == 1.0:
        return processed.copy()
    return cv2.addWeighted(base, 1.0 - strength, processed, strength, 0.0)


def _region_mask(shape: tuple[int, int], boxes: Sequence[Box], feather: float) -> np.ndarray:
    h, w = shape
    mask = np.zeros((h, w), np.float32)
    for x, y, bw, bh in boxes:
        pad_w, pad_h = int(bw * 0.15), int(bh * 0.2)
        center = (x + bw // 2, y + bh // 2)
        axes = (bw // 2 + pad_w, bh // 2 + pad_h)
        cv2.ellipse(mask, center, axes, 0, 0, 360, 1.0, thickness=-1)
    if boxes and feather > 0:
        sigma = max(1.0, feather * float(np.mean([min(b[2], b[3]) for b in boxes])))
        # 楕円の内側は 1 のまま、外側へだけなだらかに減衰させる
        mask = np.maximum(mask, cv2.GaussianBlur(mask, (0, 0), sigma))
    return np.clip(mask, 0, 1)


def blend_in_regions(
    original: np.ndarray,
    processed: np.ndarray,
    boxes: Sequence[Box],
    *,
    strength: float,
    feather: float = 0.08,
) -> np.ndarray:
    """指定領域（顔など）だけ AI 結果を混ぜる。領域外は元画像のまま。"""
    validate_ratio(strength, "strength")
    processed = match_size(processed, (original.shape[1], original.shape[0]))
    if not boxes or strength == 0.0:
        return original.copy()
    alpha = _region_mask(original.shape[:2], boxes, feather)[..., None] * strength
    mixed = original.astype(np.float32) * (1 - alpha) + processed.astype(np.float32) * alpha
    return np.clip(mixed + 0.5, 0, 255).astype(np.uint8)
