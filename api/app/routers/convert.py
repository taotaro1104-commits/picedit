"""ブラウザで表示できない形式（HEIC など）を JPEG に変換する。"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response

from app.core.config import Settings
from app.routers.deps import OutputFormat, get_settings_from, image_response, read_image

router = APIRouter(prefix="/api", tags=["convert"])


@router.post("/convert")
def convert(
    file: Annotated[UploadFile, File()],
    settings: Annotated[Settings, Depends(get_settings_from)],
) -> Response:
    return image_response(read_image(file, settings), OutputFormat.JPEG)
