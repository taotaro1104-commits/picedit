"""色あせ・黄ばみの補正。"""

from __future__ import annotations

import numpy as np

from app.core.validation import ImageValidationError
from app.pipelines.realestate.tone import clahe_enhance


def auto_levels(img: np.ndarray, clip_percent: float = 1.0) -> np.ndarray:
    """チャンネルごとに上下 clip_percent% を切り捨ててレンジを引き伸ばす。

    チャンネルごとに独立して伸ばすため、黄ばみ・赤かぶりも同時に補正される。
    """
    if not 0.0 <= clip_percent < 25.0:
        raise ImageValidationError(
            "clip_percent は 0〜25 の範囲で指定してください。",
            "param_range",
            {"name": "clip_percent"},
        )
    f = img.astype(np.float32)
    out = np.empty_like(f)
    for c in range(img.shape[2]):
        lo, hi = np.percentile(f[..., c], [clip_percent, 100.0 - clip_percent])
        if hi - lo < 1.0:
            out[..., c] = f[..., c]
            continue
        out[..., c] = (f[..., c] - lo) * (255.0 / (hi - lo))
    return np.clip(out, 0, 255).astype(np.uint8)


def restore_faded(img: np.ndarray, *, clahe: bool = True) -> np.ndarray:
    out = auto_levels(img, clip_percent=1.0)
    return clahe_enhance(out, clip_limit=1.5) if clahe else out
