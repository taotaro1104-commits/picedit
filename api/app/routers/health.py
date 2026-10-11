from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.providers.base import AIProvider
from app.routers.deps import get_provider

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health(provider: Annotated[AIProvider, Depends(get_provider)]) -> dict[str, Any]:
    ai = {"available": provider.available(), "provider": provider.name}
    return {"success": True, "data": {"status": "ok", "ai": ai}, "error": None}
