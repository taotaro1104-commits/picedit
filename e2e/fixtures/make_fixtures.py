"""E2E 用のサンプル画像を合成して生成する。

実行: uv run --project ../api python fixtures/make_fixtures.py
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

OUT = Path(__file__).parent


def product() -> np.ndarray:
    """白っぽい背景に置いた赤いマグカップ風の商品。"""
    img = np.full((900, 1200, 3), (238, 240, 242), np.uint8)
    cv2.rectangle(img, (480, 300), (720, 640), (40, 40, 200), -1)
    cv2.ellipse(img, (760, 470), (70, 100), 0, -90, 90, (40, 40, 200), 28)
    return img


def room(shrink: float = 0.08) -> np.ndarray:
    h, w = 900, 1200
    img = np.full((h, w, 3), (205, 215, 225), np.uint8)
    cv2.rectangle(img, (0, 700), (w, h), (90, 110, 140), -1)  # 床
    for x in range(120, w, 160):
        cv2.line(img, (x, 40), (x, 700), (70, 70, 70), 5)  # 柱・ドア枠
    cv2.rectangle(img, (500, 150), (760, 450), (250, 250, 250), -1)  # 窓
    d = w * shrink
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[d, 0], [w - d, 0], [w, h], [0, h]])
    m = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img, m, (w, h), borderValue=(205, 215, 225))


def old_photo() -> np.ndarray:
    xs = np.linspace(60, 200, 900, dtype=np.float32)
    base = np.tile(xs, (600, 1))
    img = np.dstack([base * 0.7 + 40, base * 0.85 + 30, base + 20]).astype(np.uint8)
    img = cv2.GaussianBlur(img, (0, 0), 2)
    cv2.line(img, (40, 60), (860, 540), (250, 250, 250), 2)
    cv2.line(img, (100, 560), (800, 40), (20, 20, 20), 2)
    return img


def main() -> None:
    cv2.imwrite(str(OUT / "product.png"), product())
    r = room()
    cv2.imwrite(str(OUT / "room.png"), r)
    for name, f in (("dark", 0.4), ("normal", 1.0), ("bright", 1.9)):
        cv2.imwrite(str(OUT / f"room_{name}.jpg"), np.clip(r * f, 0, 255).astype(np.uint8))
    cv2.imwrite(str(OUT / "old_photo.png"), old_photo())


if __name__ == "__main__":
    main()
