"""古い写真の修復モード: 色あせ補正・傷除去・AI処理。"""

from __future__ import annotations

from typing import Annotated

import numpy as np
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.core.config import Settings
from app.core.image_io import decode_image, encode_image
from app.core.validation import validate_ratio
from app.pipelines.restore.blend import blend_in_regions, blend_strength, match_size
from app.pipelines.restore.faces import detect_faces
from app.pipelines.restore.fade import restore_faded
from app.pipelines.restore.scratch import detect_scratches, inpaint_scratches
from app.providers.base import AIProvider, AITask
from app.routers.deps import (
    OutputFormat,
    get_provider,
    get_settings_from,
    image_response,
    read_image,
    read_mask,
)

router = APIRouter(prefix="/api/restore", tags=["restore"])

# 顔が検出できなかった時は、顔向けモデルの結果を全体に弱めにだけ反映する
NO_FACE_STRENGTH_FACTOR = 0.3

SettingsDep = Annotated[Settings, Depends(get_settings_from)]


@router.post("/fade")
def fade(
    file: Annotated[UploadFile, File()],
    settings: SettingsDep,
    clahe: Annotated[bool, Form()] = True,
    format: OutputFormat = OutputFormat.PNG,
) -> Response:
    return image_response(restore_faded(read_image(file, settings), clahe=clahe), format)


@router.post("/scratch-mask")
def scratch_mask(
    file: Annotated[UploadFile, File()],
    settings: SettingsDep,
    sensitivity: Annotated[float, Form()] = 0.5,
) -> Response:
    validate_ratio(sensitivity, "sensitivity")
    mask = detect_scratches(read_image(file, settings), sensitivity)
    return image_response(mask, OutputFormat.PNG)


@router.post("/inpaint")
def inpaint(
    file: Annotated[UploadFile, File()],
    mask: Annotated[UploadFile, File()],
    settings: SettingsDep,
    format: OutputFormat = OutputFormat.PNG,
) -> Response:
    img = read_image(file, settings)
    return image_response(inpaint_scratches(img, read_mask(mask, settings)), format)


def _apply_ai_result(
    task: AITask, original: np.ndarray, processed: np.ndarray, strength: float
) -> tuple[np.ndarray, dict[str, str]]:
    if task is not AITask.FACE_RESTORE:
        return blend_strength(original, processed, strength), {}
    # 顔復元は元の解像度を保ち、顔領域だけに適用する（顔が無ければ全体に弱く適用）
    faces = detect_faces(original)
    headers = {"X-Picedit-Faces": str(len(faces))}
    if faces:
        return blend_in_regions(original, processed, faces, strength=strength), headers
    resized = match_size(processed, (original.shape[1], original.shape[0]))
    return blend_strength(original, resized, strength * NO_FACE_STRENGTH_FACTOR), headers


@router.post("/ai/{task}")
async def ai_process(
    task: AITask,
    file: Annotated[UploadFile, File()],
    settings: SettingsDep,
    provider: Annotated[AIProvider, Depends(get_provider)],
    strength: Annotated[float, Form()] = 0.8,
    format: OutputFormat = OutputFormat.PNG,
) -> Response:
    validate_ratio(strength, "strength")
    original = await run_in_threadpool(read_image, file, settings)
    png = await run_in_threadpool(encode_image, original, "png")
    result_bytes = await provider.run(task, png)
    processed = await run_in_threadpool(
        decode_image, result_bytes, max_pixels=settings.max_pixels * 4
    )
    out, headers = await run_in_threadpool(_apply_ai_result, task, original, processed, strength)
    return image_response(out, format, headers)
