"""外部AI推論プロバイダーの抽象インターフェース。"""

from __future__ import annotations

from enum import StrEnum
from typing import Protocol


class AITask(StrEnum):
    UPSCALE = "upscale"
    COLORIZE = "colorize"
    FACE_RESTORE = "face_restore"


class ProviderError(RuntimeError):
    """推論に失敗した。code はフロントエンドの多言語メッセージのキー。"""

    def __init__(self, message: str, code: str = "ai_failed") -> None:
        super().__init__(message)
        self.code = code


class ProviderUnavailableError(ProviderError):
    """プロバイダーが設定されていない。"""

    def __init__(self, message: str, code: str = "ai_unavailable") -> None:
        super().__init__(message, code)


class AIProvider(Protocol):
    name: str

    def available(self) -> bool: ...

    async def run(self, task: AITask, image_png: bytes) -> bytes:
        """PNG バイト列を受け取り、処理結果の画像バイト列を返す。"""
        ...
