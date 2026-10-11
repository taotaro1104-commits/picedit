import io
import json

from passenger_wsgi import application


def call(path: str, script_name: str) -> tuple[str, dict]:
    environ = {
        "REQUEST_METHOD": "GET",
        "SCRIPT_NAME": script_name,
        "PATH_INFO": path,
        "QUERY_STRING": "",
        "SERVER_NAME": "localhost",
        "SERVER_PORT": "443",
        "SERVER_PROTOCOL": "HTTP/1.1",
        "wsgi.url_scheme": "https",
        "wsgi.input": io.BytesIO(b""),
        "wsgi.errors": io.StringIO(),
        "wsgi.version": (1, 0),
        "wsgi.multithread": False,
        "wsgi.multiprocess": True,
        "wsgi.run_once": False,
    }
    status: list[str] = []
    body = b"".join(application(environ, lambda s, h, *a: status.append(s)))
    return status[0], json.loads(body)


def test_health_under_api_mount_point() -> None:
    # cPanel のアプリURLを /api にすると SCRIPT_NAME=/api, PATH_INFO=/health で届く
    status, body = call("/health", "/api")
    assert status.startswith("200")
    assert body["data"]["status"] == "ok"


def test_health_without_script_name() -> None:
    status, _ = call("/api/health", "")
    assert status.startswith("200")
