"""FastAPI アプリのエントリーポイント。

起動: uv run uvicorn app.main:app --reload
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import Settings, get_settings
from app.core.validation import ImageValidationError
from app.providers.base import AIProvider, AITask, ProviderError, ProviderUnavailableError
from app.providers.null_provider import NullProvider
from app.providers.replicate_provider import ReplicateProvider
from app.routers import convert, health, realestate, restore

logger = logging.getLogger(__name__)


def build_provider(settings: Settings) -> AIProvider:
    if not settings.replicate_api_token:
        return NullProvider()
    return ReplicateProvider(
        token=settings.replicate_api_token,
        models={
            AITask.UPSCALE: settings.replicate_model_upscale,
            AITask.COLORIZE: settings.replicate_model_colorize,
            AITask.FACE_RESTORE: settings.replicate_model_face_restore,
        },
        timeout_seconds=settings.replicate_timeout_seconds,
    )


def _error(
    status: int, message: str, code: str, params: dict[str, Any] | None = None
) -> JSONResponse:
    content = {
        "success": False,
        "data": None,
        "error": message,
        "code": code,
        "params": params or {},
    }
    return JSONResponse(status_code=status, content=content)


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ImageValidationError)
    async def _validation(_: Request, exc: ImageValidationError) -> JSONResponse:
        return _error(400, str(exc), exc.code, exc.params)

    @app.exception_handler(ProviderUnavailableError)
    async def _unavailable(_: Request, exc: ProviderUnavailableError) -> JSONResponse:
        return _error(503, str(exc), exc.code)

    @app.exception_handler(ProviderError)
    async def _provider(_: Request, exc: ProviderError) -> JSONResponse:
        return _error(502, str(exc), exc.code)

    @app.exception_handler(RequestValidationError)
    async def _request(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _error(422, "リクエストの形式が正しくありません。", "invalid_request")

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error: %s %s", request.method, request.url.path)
        return _error(
            500, "処理中にエラーが発生しました。時間をおいて再度お試しください。", "internal_error"
        )


def create_app(provider: AIProvider | None = None, settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings().model_copy()
    app = FastAPI(title="picedit API", version="0.1.0")
    app.state.settings = settings
    app.state.provider = provider or build_provider(settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
        expose_headers=["X-Picedit-Applied", "X-Picedit-Deviation", "X-Picedit-Faces"],
    )
    _register_error_handlers(app)
    for router in (health.router, convert.router, realestate.router, restore.router):
        app.include_router(router)
    return app


app = create_app()
