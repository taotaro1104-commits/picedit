"""室内写真の垂直補正（キーストーン補正）。

縦線を検出し、線の傾き角を「画像内の横位置の一次関数」で近似する:
    angle(x) ≈ a * x_norm + b
左端・右端での傾きから射影変換を作り、縦線を真っ直ぐに戻す。
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import cv2
import numpy as np

from app.core.validation import ImageValidationError

MAX_TILT_DEG = 25.0  # これより傾いた線は縦線とみなさない
MIN_APPLY_DEG = 0.5  # 平均のずれがこれ未満なら補正不要
MIN_KEEP_AREA = 0.5  # 補正後に残る面積がこれ未満なら補正をやめる


@dataclass(frozen=True)
class PerspectiveResult:
    image: np.ndarray
    applied: bool
    deviation_deg: float | None


@dataclass(frozen=True)
class _Segments:
    angles: np.ndarray  # 度。正 = 上端が右に傾く
    x_norm: np.ndarray  # 線分中点の x（0〜1）
    weights: np.ndarray  # 線分の長さ


def _detect_vertical_segments(img: np.ndarray) -> _Segments | None:
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180, threshold=60, minLineLength=int(h * 0.2), maxLineGap=10
    )
    if lines is None:
        return None
    # OpenCV 4 は (N,1,4)、5 は (N,4) を返すため形状を揃える
    flat = lines.reshape(-1, 4).astype(np.float64)
    x1, y1, x2, y2 = flat.T
    top_is_1 = y1 < y2
    x_top, x_bot = np.where(top_is_1, x1, x2), np.where(top_is_1, x2, x1)
    dy = np.abs(y2 - y1)
    angles = np.degrees(np.arctan2(x_top - x_bot, dy))
    keep = np.abs(angles) < MAX_TILT_DEG
    if keep.sum() < 2:
        return None
    return _Segments(
        angles=angles[keep],
        x_norm=((x1 + x2) / 2 / w)[keep],
        weights=np.hypot(x2 - x1, y2 - y1)[keep],
    )


def measure_vertical_deviation(img: np.ndarray) -> float | None:
    """縦線の平均的な傾き（度、絶対値の加重平均）。縦線が少なければ None。"""
    seg = _detect_vertical_segments(img)
    if seg is None:
        return None
    return float(np.average(np.abs(seg.angles), weights=seg.weights))


def _fit_tilt_model(seg: _Segments) -> tuple[float, float]:
    """angle ≈ a * (x_norm - 0.5) + b を加重最小二乗で解く。"""
    xc = seg.x_norm - 0.5
    if len(seg.angles) < 3 or np.ptp(xc) < 0.2:
        return 0.0, float(np.average(seg.angles, weights=seg.weights))
    sw = np.sqrt(seg.weights)
    design = np.column_stack([xc, np.ones_like(xc)]) * sw[:, None]
    (a, b), *_ = np.linalg.lstsq(design, seg.angles * sw, rcond=None)
    return float(a), float(b)


def _valid_crop(m: np.ndarray, w: int, h: int) -> tuple[int, int, int, int]:
    corners = np.float32([[[0, 0], [w, 0], [w, h], [0, h]]])
    tl, tr, br, bl = cv2.perspectiveTransform(corners, m)[0]
    x0 = math.ceil(max(tl[0], bl[0], 0))
    x1 = math.floor(min(tr[0], br[0], w))
    y0 = math.ceil(max(tl[1], tr[1], 0))
    y1 = math.floor(min(bl[1], br[1], h))
    return x0, y0, x1, y1


def auto_vertical_correction(img: np.ndarray) -> PerspectiveResult:
    seg = _detect_vertical_segments(img)
    if seg is None:
        return PerspectiveResult(img, applied=False, deviation_deg=None)
    deviation = float(np.average(np.abs(seg.angles), weights=seg.weights))
    if deviation < MIN_APPLY_DEG:
        return PerspectiveResult(img, applied=False, deviation_deg=deviation)

    h, w = img.shape[:2]
    a, b = _fit_tilt_model(seg)
    left, right = math.radians(b - a / 2), math.radians(b + a / 2)
    src = np.float32([[h * math.tan(left), 0], [w + h * math.tan(right), 0], [w, h], [0, h]])
    dst = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    m = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(img, m, (w, h), flags=cv2.INTER_CUBIC)

    x0, y0, x1, y1 = _valid_crop(m, w, h)
    if x1 <= x0 or y1 <= y0 or (x1 - x0) * (y1 - y0) < MIN_KEEP_AREA * w * h:
        return PerspectiveResult(img, applied=False, deviation_deg=deviation)
    return PerspectiveResult(warped[y0:y1, x0:x1].copy(), applied=True, deviation_deg=deviation)


def _polygon_area(pts: np.ndarray) -> float:
    x, y = pts[:, 0], pts[:, 1]
    return 0.5 * abs(float(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))))


def manual_perspective(img: np.ndarray, points: Sequence[Sequence[float]]) -> np.ndarray:
    """ユーザー指定の4点（左上, 右上, 右下, 左下）を長方形に変換する。"""
    if len(points) != 4 or any(len(p) != 2 for p in points):
        raise ImageValidationError(
            "補正点は4点（左上・右上・右下・左下）を指定してください。", "points_invalid"
        )
    h, w = img.shape[:2]
    pts = np.clip(np.float32(points), [0, 0], [w - 1, h - 1]).astype(np.float32)
    if _polygon_area(pts) < 0.01 * w * h:
        raise ImageValidationError(
            "補正範囲が小さすぎます。4点を広げて指定してください。", "area_too_small"
        )
    tl, tr, br, bl = pts
    out_w = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    out_h = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    dst = np.float32([[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]])
    m = cv2.getPerspectiveTransform(pts, dst)
    return cv2.warpPerspective(img, m, (out_w, out_h), flags=cv2.INTER_CUBIC)
