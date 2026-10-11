"""mixhost（cPanel「Python アプリケーションのセットアップ」/ Passenger）用のエントリーポイント。

Passenger は WSGI しか話せないため、a2wsgi で FastAPI（ASGI）を包む。
cPanel のアプリケーション URL を /api にすると、Passenger は SCRIPT_NAME=/api・PATH_INFO=/health の
形で渡すので、FastAPI のルート（/api/health）と一致するよう元のパスに戻す。
"""

from __future__ import annotations

import os
import sys
from collections.abc import Callable, Iterable
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from a2wsgi import ASGIMiddleware  # noqa: E402

from app.main import app as asgi_app  # noqa: E402

_wsgi_app = ASGIMiddleware(asgi_app)


def application(environ: dict[str, Any], start_response: Callable[..., Any]) -> Iterable[bytes]:
    script_name = environ.get("SCRIPT_NAME", "")
    if script_name:
        environ = {
            **environ,
            "PATH_INFO": script_name + environ.get("PATH_INFO", ""),
            "SCRIPT_NAME": "",
        }
    return _wsgi_app(environ, start_response)
