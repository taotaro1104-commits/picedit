"""アップロード入力の検証。"""

from __future__ import annotations

from typing import Any

ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
)


class ImageValidationError(ValueError):
    """ユーザーに表示してよい検証エラー。

    code はフロントエンドで多言語メッセージに変換するためのキー、
    message は日本語の既定メッセージ（翻訳が無い場合のフォールバック）。
    """

    def __init__(self, message: str, code: str, params: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.params = params or {}


def validate_upload(*, content_type: str | None, size: int, max_bytes: int) -> None:
    if size <= 0:
        raise ImageValidationError("ファイルが空です。", "file_empty")
    if size > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise ImageValidationError(
            f"ファイルが大きすぎます（上限 {limit_mb}MB）。",
            "file_too_large",
            {"limit_mb": limit_mb},
        )
    if (content_type or "").lower() not in ALLOWED_MIME_TYPES:
        raise ImageValidationError(
            "対応していないファイル形式です。JPEG / PNG / WebP / HEIC を使用してください。",
            "unsupported_type",
        )


def validate_ratio(value: float, name: str) -> float:
    if not 0.0 <= value <= 1.0:
        raise ImageValidationError(
            f"{name} は 0〜1 の範囲で指定してください。", "param_range", {"name": name}
        )
    return value
