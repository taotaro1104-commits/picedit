"""顔領域の検出（OpenCV 同梱の Haar カスケード、追加モデル不要）。"""

from __future__ import annotations

from functools import lru_cache

import cv2
import numpy as np

from app.pipelines.restore.blend import Box


@lru_cache(maxsize=1)
def _cascade() -> cv2.CascadeClassifier:
    path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(path)
    if cascade.empty():
        raise RuntimeError(f"face cascade not found: {path}")
    return cascade


def detect_faces(img: np.ndarray) -> list[Box]:
    gray = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    min_side = max(24, min(gray.shape) // 20)
    found = _cascade().detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_side, min_side)
    )
    return [tuple(int(v) for v in box) for box in found]  # type: ignore[misc]
