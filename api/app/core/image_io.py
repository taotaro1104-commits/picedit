"""画像のデコード・エンコード。

Pillow で読み込み（EXIF回転・HEIC対応）、内部表現は OpenCV 互換の BGR uint8 に統一する。
"""

from __future__ import annotations

import io
import warnings

import cv2
import numpy as np
import pillow_heif
from PIL import Image, ImageOps

from app.core.validation import ImageValidationError

pillow_heif.register_heif_opener()

_ENCODE_PARAMS: dict[str, tuple[str, list[int]]] = {
    "png": (".png", [cv2.IMWRITE_PNG_COMPRESSION, 3]),
    "jpeg": (".jpg", [cv2.IMWRITE_JPEG_QUALITY, 92]),
}

MIME_BY_FORMAT: dict[str, str] = {"png": "image/png", "jpeg": "image/jpeg"}


def _open_pil(data: bytes, max_pixels: int) -> Image.Image:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            pil = Image.open(io.BytesIO(data))
            width, height = pil.size
            if width * height > max_pixels:
                raise ImageValidationError("画像の解像度が大きすぎます。", "resolution_too_large")
            pil.load()
    except ImageValidationError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImageValidationError("画像の解像度が大きすぎます。", "resolution_too_large") from exc
    except Exception as exc:  # Pillow は形式ごとに様々な例外を投げる
        raise ImageValidationError(
            "画像を読み込めませんでした。ファイルが壊れていないか確認してください。",
            "unreadable_image",
        ) from exc
    return ImageOps.exif_transpose(pil)


def decode_image(data: bytes, *, max_pixels: int) -> np.ndarray:
    """バイト列を BGR uint8 配列に変換する。透過は白背景で合成する。"""
    pil = _open_pil(data, max_pixels)
    if pil.mode in ("RGBA", "LA", "P"):
        rgba = pil.convert("RGBA")
        background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        pil = Image.alpha_composite(background, rgba)
    rgb = np.asarray(pil.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def decode_mask(data: bytes, *, max_pixels: int, threshold: int = 127) -> np.ndarray:
    """マスク画像を 0/255 の単一チャンネル配列に変換する。"""
    pil = _open_pil(data, max_pixels)
    gray = np.asarray(pil.convert("L"))
    return np.where(gray > threshold, 255, 0).astype(np.uint8)


def encode_image(img: np.ndarray, fmt: str = "png") -> bytes:
    if fmt not in _ENCODE_PARAMS:
        raise ValueError(f"unsupported format: {fmt}")
    ext, params = _ENCODE_PARAMS[fmt]
    ok, buf = cv2.imencode(ext, img, params)
    if not ok:
        raise RuntimeError("image encoding failed")
    return buf.tobytes()
