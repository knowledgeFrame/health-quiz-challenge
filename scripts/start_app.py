"""Start the local Next.js dev server for health-quiz-challenge."""

from __future__ import annotations

import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import IO


def start_local_app(
    project_dir: str | Path | None = None,
    *,
    port: int = 3000,
    host: str = "localhost",
    wait_until_ready: bool = True,
    timeout: float = 60.0,
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

    process = subprocess.Popen(
        ["npm", "run", "dev", "--", "-p", str(port), "-H", host],
        cwd=root,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    if wait_until_ready:
        _wait_for_server(f"http://{host}:{port}", process, timeout=timeout)

    return process


def _wait_for_server(url: str, process: subprocess.Popen[str], *, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            output = _read_process_output(process)
            raise RuntimeError(
                f"Dev server exited with code {process.returncode} before becoming ready.\n{output}"
            )

        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status < 500:
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.5)

    output = _read_process_output(process)
    process.terminate()
    raise TimeoutError(f"Dev server did not become ready within {timeout}s.\n{output}")


def _read_process_output(process: subprocess.Popen[str]) -> str:
    stream: IO[str] | None = process.stdout
    if stream is None:
        return ""
    try:
        return stream.read()
    except Exception:
        return ""


if __name__ == "__main__":
    proc = start_local_app()
    print(f"Dev server running at http://localhost:3000 (pid={proc.pid})")
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        proc.wait()
