from __future__ import annotations

import argparse
import os
import signal
import socket
import subprocess
import sys
import time
from collections.abc import Sequence
from contextlib import suppress
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

DEFAULT_DATABASE_URL = "postgresql://postgres:password@localhost:5432/moneytrack"
DEFAULT_BOT_TOKEN = "test-token"


def _wait_for_health(base_url: str, timeout_seconds: float = 30.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    health_url = f"{base_url}/health"
    while time.monotonic() < deadline:
        try:
            with urlopen(health_url, timeout=2.0) as response:  # noqa: S310
                if response.status == 200:
                    return
        except (TimeoutError, URLError, OSError):
            pass
        time.sleep(0.2)
    raise RuntimeError(f"Timed out waiting for health endpoint: {health_url}")


def _assert_port_free(port: int) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(f"Port {port} is already in use")


def _start_api_process(
    port: int, environment: str, database_url: str, bot_token: str
) -> subprocess.Popen[bytes]:
    env = os.environ.copy()
    env["ENVIRONMENT"] = environment
    env["DATABASE_URL"] = database_url
    env["TELEGRAM_BOT_TOKEN"] = bot_token
    env.setdefault("API_HOST", "127.0.0.1")
    env["API_PORT"] = str(port)
    return subprocess.Popen(  # noqa: S603
        [
            "uv",
            "run",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )


def _stop_process(proc: subprocess.Popen[bytes]) -> None:
    if proc.poll() is not None:
        return
    with suppress(ProcessLookupError):
        proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        with suppress(ProcessLookupError):
            proc.kill()
        proc.wait(timeout=5)


def _read_stderr_tail(proc: subprocess.Popen[bytes]) -> str:
    stderr = proc.stderr
    if stderr is None:
        return ""
    with suppress(Exception):
        data = stderr.read()
        if data:
            return data.decode("utf-8", errors="replace").strip()[-1500:]
    return ""


def _pytest_command() -> Sequence[str]:
    venv_pytest = Path(".venv/bin/pytest")
    if venv_pytest.exists():
        return [str(venv_pytest), "tests/integration", "-q"]
    return ["uv", "run", "--no-project", "pytest", "tests/integration", "-q"]


def _run_integration_suite(*, dev_base_url: str, prod_base_url: str, test_database_url: str) -> int:
    env = os.environ.copy()
    env["BASE_URL"] = dev_base_url
    env["PRODUCTION_BASE_URL"] = prod_base_url
    env["TEST_DATABASE_URL"] = test_database_url
    return subprocess.run(_pytest_command(), env=env, check=False).returncode  # noqa: S603


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run integration suite against local development and production API instances."
    )
    parser.add_argument("--dev-port", type=int, default=5000)
    parser.add_argument("--prod-port", type=int, default=5001)
    parser.add_argument(
        "--database-url", default=os.getenv("TEST_DATABASE_URL", DEFAULT_DATABASE_URL)
    )
    parser.add_argument("--bot-token", default=os.getenv("TELEGRAM_BOT_TOKEN", DEFAULT_BOT_TOKEN))
    args = parser.parse_args()

    _assert_port_free(args.dev_port)
    _assert_port_free(args.prod_port)

    dev_api = _start_api_process(args.dev_port, "Development", args.database_url, args.bot_token)
    prod_api = _start_api_process(args.prod_port, "Production", args.database_url, args.bot_token)
    dev_url = f"http://127.0.0.1:{args.dev_port}"
    prod_url = f"http://127.0.0.1:{args.prod_port}"
    try:
        _wait_for_health(dev_url)
        _wait_for_health(prod_url)
        return _run_integration_suite(
            dev_base_url=dev_url,
            prod_base_url=prod_url,
            test_database_url=args.database_url,
        )
    except Exception as exc:
        dev_stderr = _read_stderr_tail(dev_api)
        prod_stderr = _read_stderr_tail(prod_api)
        print(f"Dual-mode integration run failed: {exc}", file=sys.stderr)
        if dev_stderr:
            print(f"[dev stderr tail]\n{dev_stderr}", file=sys.stderr)
        if prod_stderr:
            print(f"[prod stderr tail]\n{prod_stderr}", file=sys.stderr)
        return 1
    finally:
        _stop_process(prod_api)
        _stop_process(dev_api)


if __name__ == "__main__":
    raise SystemExit(main())
