"""露出ブラケット写真の合成（Mertens 露出融合）。

露出時間などのメタデータが不要で、トーンマッピングも不要なため、
スマホで撮った写真を後から合成する用途に向いている。
"""

from __future__ import annotations

from collections.abc import Sequence

import cv2
import numpy as np

from app.core.validation import ImageValidationError

MIN_IMAGES = 2
MAX_IMAGES = 5


def merge_exposures(images: Sequence[np.ndarray], *, align: bool = True) -> np.ndarray:
    if not MIN_IMAGES <= len(images) <= MAX_IMAGES:
        raise ImageValidationError(
            f"HDR合成には露出の異なる写真を {MIN_IMAGES}〜{MAX_IMAGES} 枚指定してください。",
            "hdr_count",
            {"min": MIN_IMAGES, "max": MAX_IMAGES},
        )
    h, w = images[0].shape[:2]
    resized = [
        img if img.shape[:2] == (h, w) else cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
        for img in images
    ]
    if align:
        # 手持ち撮影のわずかなズレを補正する（元リストは変更しない）
        aligned: list[np.ndarray] = [img.copy() for img in resized]
        cv2.createAlignMTB().process(resized, aligned)
        resized = aligned
    fused = cv2.createMergeMertens().process(resized)
    return np.clip(fused * 255.0, 0, 255).astype(np.uint8)
