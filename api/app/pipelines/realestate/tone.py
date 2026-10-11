"""1枚写真の仕上げ処理（ホワイトバランス・白飛び抑制・局所コントラスト）。"""

from __future__ import annotations

import cv2
import numpy as np

from app.core.validation import validate_ratio

HIGHLIGHT_KNEE = 0.72  # L（0〜1）がこれを超える部分を圧縮する


def gray_world_white_balance(img: np.ndarray) -> np.ndarray:
    """グレーワールド仮説で色かぶりを除去する。"""
    f = img.astype(np.float32)
    means = f.reshape(-1, 3).mean(axis=0)
    gains = means.mean() / np.maximum(means, 1e-3)
    return np.clip(f * gains, 0, 255).astype(np.uint8)


def compress_highlights(img: np.ndarray, strength: float = 0.5) -> np.ndarray:
    """明部（窓の白飛びなど）の輝度を、暗部を変えずに圧縮する。"""
    validate_ratio(strength, "highlight")
    if strength == 0.0:
        return img.copy()
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    lum = lab[..., 0] / 255.0
    over = np.clip(lum - HIGHLIGHT_KNEE, 0, None)
    span = 1.0 - HIGHLIGHT_KNEE
    # ニーより上をソフトに曲げる: strength=1 で最大値がニー＋span/2 まで下がる
    compressed = HIGHLIGHT_KNEE + over * (1.0 - 0.5 * strength * over / span)
    lab[..., 0] = np.where(lum > HIGHLIGHT_KNEE, compressed, lum) * 255.0
    return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


def clahe_enhance(img: np.ndarray, clip_limit: float = 2.0, tiles: int = 8) -> np.ndarray:
    """輝度チャンネルに CLAHE をかけ、色味を変えずに局所コントラストを上げる。"""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tiles, tiles))
    l_channel = clahe.apply(lab[..., 0])
    merged = cv2.merge([l_channel, lab[..., 1], lab[..., 2]])
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def finish_interior(
    img: np.ndarray, *, white_balance: bool = True, highlight: float = 0.5, clahe: bool = True
) -> np.ndarray:
    out = img
    if white_balance:
        out = gray_world_white_balance(out)
    if highlight > 0:
        out = compress_highlights(out, highlight)
    if clahe:
        out = clahe_enhance(out)
    return out if out is not img else img.copy()
