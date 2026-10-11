"""テスト共通のフィクスチャと合成画像ヘルパー。"""

from __future__ import annotations

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.providers.null_provider import NullProvider


def encode(img: np.ndarray, ext: str = ".png") -> bytes:
    ok, buf = cv2.imencode(ext, img)
    assert ok
    return buf.tobytes()


def gradient_image(width: int = 200, height: int = 150) -> np.ndarray:
    """横方向グラデーション＋縦方向の色変化を持つ BGR 画像。"""
    xs = np.linspace(40, 215, width, dtype=np.float32)
    ys = np.linspace(60, 190, height, dtype=np.float32)
    b = np.tile(xs, (height, 1))
    g = np.tile(ys[:, None], (1, width))
    r = (b + g) / 2
    return np.dstack([b, g, r]).astype(np.uint8)


@pytest.fixture
def client() -> TestClient:
    app = create_app(provider=NullProvider())
    return TestClient(app)
