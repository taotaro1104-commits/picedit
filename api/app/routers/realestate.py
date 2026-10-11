"""不動産モード: 垂直補正・HDR合成・仕上げ。"""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response

from app.core.config import Settings
from app.core.validation import ImageValidationError, validate_ratio
from app.pipelines.realestate.hdr import MAX_IMAGES, merge_exposures
from app.pipelines.realestate.perspective import auto_vertical_correction, manual_perspective
from app.pipelines.realestate.tone import finish_interior
from app.routers.deps import OutputFormat, get_settings_from, image_response, read_image

router = APIRouter(prefix="/api/realestate", tags=["realestate"])

SettingsDep = Annotated[Settings, Depends(get_settings_from)]


@router.post("/auto-vertical")
def auto_vertical(
    file: Annotated[UploadFile, File()],
    settings: SettingsDep,
    format: OutputFormat = OutputFormat.PNG,
) -> Response:
    result = auto_vertical_correction(read_image(file, settings))
    deviation = "" if result.deviation_deg is None else f"{result.deviation_deg:.2f}"
    headers = {
        "X-Picedit-Applied": str(result.applied).lower(),
        "X-Picedit-Deviation": deviation,
    }
    return image_response(result.image, format, headers)


def _parse_points(raw: str) -> list[list[float]]:
    try:
        points = json.loads(raw)
        return [[float(x), float(y)] for x, y in points]
    except (ValueError, TypeError) as exc:
        raise ImageValidationError("補正点の形式が正しくありません。", "points_invalid") from exc


@router.post("/perspective")
def perspective(
    file: Annotated[UploadFile, File()],
    points: Annotated[str, Form()],
    settings: SettingsDep,
    format: OutputFormat = OutputFormat.PNG,
) -> Response:
    img = read_image(file, settings)
    return image_response(manual_perspective(img, _parse_points(points)), format)


@router.post("/hdr")
def hdr(
    files: Annotated[list[UploadFile], File()],
    settings: SettingsDep,
    format: OutputFormat = OutputFormat.PNG,
) -> Response:
    if len(files) > MAX_IMAGES:
        raise ImageValidationError(
            f"HDR合成に使える写真は最大 {MAX_IMAGES} 枚です。",
            "hdr_count",
            {"min": 2, "max": MAX_IMAGES},
        )
    images = [read_image(f, settings) for f in files]
    return image_response(merge_exposures(images), format)


@router.post("/finish")
def finish(
    file: Annotated[UploadFile, File()],
    settings: SettingsDep,
    white_balance: Annotated[bool, Form()] = True,
    highlight: Annotated[float, Form()] = 0.5,
    clahe: Annotated[bool, Form()] = True,
    format: OutputFormat = OutputFormat.PNG,
) -> Response:
    validate_ratio(highlight, "highlight")
    img = read_image(file, settings)
    out = finish_interior(img, white_balance=white_balance, highlight=highlight, clahe=clahe)
    return image_response(out, format)
