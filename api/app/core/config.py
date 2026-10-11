"""環境変数から読み込むアプリ設定。"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    replicate_api_token: str | None = None
    replicate_model_upscale: str = "nightmareai/real-esrgan"
    replicate_model_colorize: str = "piddnad/ddcolor"
    replicate_model_face_restore: str = "tencentarc/gfpgan"
    replicate_timeout_seconds: float = 180.0

    max_upload_bytes: int = 20 * 1024 * 1024
    max_side_pixels: int = 8000
    max_hdr_images: int = 5
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def max_pixels(self) -> int:
        return self.max_side_pixels * self.max_side_pixels


@lru_cache
def get_settings() -> Settings:
    return Settings()
