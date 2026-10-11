"""AI 未設定時に使うプロバイダー。常に利用不可を返す。"""

from __future__ import annotations

from app.providers.base import AITask, ProviderUnavailableError


class NullProvider:
    name = "none"

    def available(self) -> bool:
        return False

    async def run(self, task: AITask, image_png: bytes) -> bytes:
        raise ProviderUnavailableError(
            "AI機能は現在利用できません（REPLICATE_API_TOKEN が未設定です）。"
        )
