"""ルーター共通の入出力ヘルパー。"""

from __future__ import annotations

from enum import StrEnum

import numpy as np
from fastapi import Request, UploadFile
from fastapi.responses import Response

from app.core.config import Settings
from app.core.image_io import MIME_BY_FORMAT, decode_image, decode_mask, encode_image
from app.core.validation import validate_upload
from app.providers.base import AIProvider


class OutputFormat(StrEnum):
    PNG = "png"
    JPEG = "jpeg"


def get_settings_from(request: Request) -> Settings:
    return request.app.state.settings


def get_provider(request: Request) -> AIProvider:
    return request.app.state.provider


def read_upload_bytes(file: UploadFile, settings: Settings) -> bytes:
    """上限+1バイトまでだけ読み、巨大ファイルをメモリに載せない。"""
    data = file.file.read(settings.max_upload_bytes + 1)
    validate_upload(
        content_type=file.content_type, size=len(data), max_bytes=settings.max_upload_bytes
    )
    return data


def read_image(file: UploadFile, settings: Settings) -> np.ndarray:
    return decode_image(read_upload_bytes(file, settings), max_pixels=settings.max_pixels)


def read_mask(file: UploadFile, settings: Settings) -> np.ndarray:
    return decode_mask(read_upload_bytes(file, settings), max_pixels=settings.max_pixels)


def image_response(
    img: np.ndarray, fmt: OutputFormat = OutputFormat.PNG, headers: dict[str, str] | None = None
) -> Response:
    # 処理結果はキャッシュさせない（サーバーにもブラウザにも残さない方針）
    all_headers = {"Cache-Control": "no-store", **(headers or {})}
    return Response(
        content=encode_image(img, fmt.value),
        media_type=MIME_BY_FORMAT[fmt.value],
        headers=all_headers,
    )
