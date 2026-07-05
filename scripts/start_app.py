#!/usr/bin/env python3
"""Start the local Next.js dev server for health-quiz-challenge."""

from __future__ import annotations

import os
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


def start_local_app(
    project_dir: str | Path | None = None,
    *,
    port: int = 3000,
    host: str = "localhost",
    wait_until_ready: bool = True,
    timeout: float = 120.0,
) -> subprocess.Popen[str]:
    """Start `npm run dev` for the Next.js app in `app/`.

    Returns the running subprocess. Call `.terminate()` or `.kill()` when done.
    """
    root = Path(project_dir) if project_dir is not None else Path(__file__).resolve().parents[1]
    package_json = root / "package.json"
    if not package_json.is_file():
        raise FileNotFoundError(f"package.json not found under {root}")

    env = os.environ.copy()
    env["PORT"] = str(port)

    # Do not capture stdout/stderr into a pipe: Next.js is verbose and can
    # block once the pipe buffer fills, preventing the server from starting.
    process = subprocess.Popen(
        ["npm", "run", "dev", "--", "-p", str(port), "-H", host],
        cwd=root,
        env=env,
    )

    if wait_until_ready:
        _wait_for_server(f"http://{host}:{port}", process, timeout=timeout)

    return process


def _wait_for_server(url: str, process: subprocess.Popen[str], *, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(
                f"Dev server exited with code {process.returncode} before becoming ready."
            )

        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status < 500:
                    return
        except (urllib.error.URLError, TimeoutError, socket.timeout, ConnectionResetError):
            time.sleep(0.5)

    process.terminate()
    raise TimeoutError(f"Dev server did not become ready within {timeout}s at {url}")


if __name__ == "__main__":
    proc = start_local_app()
    print(f"Dev server running (pid={proc.pid}). Press Ctrl+C to stop.")
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        proc.wait()
