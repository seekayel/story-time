"""Shared ElevenLabs helpers: API key lookup, HTTP, and markdown voice-cast parsing."""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

API = "https://api.elevenlabs.io"
DEFAULT_MODEL = "eleven_multilingual_v2"
KEY_FILE = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "story-time" / "elevenlabs_api_key"
ENV_VARS = ("ELEVEN_LABS_API_KEY", "ELEVENLABS_API_KEY")


def die(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def project_root() -> Path:
    """Nearest ancestor of the working directory that contains story/."""
    cwd = Path.cwd().resolve()
    for candidate in (cwd, *cwd.parents):
        if (candidate / "story").is_dir():
            return candidate
    return cwd


def api_key() -> str:
    for name in ENV_VARS:
        if os.environ.get(name):
            return os.environ[name].strip()
    if KEY_FILE.exists():
        return KEY_FILE.read_text(encoding="utf-8").strip()
    die("No ElevenLabs API key. Run `bin/story auth` (or set ELEVEN_LABS_API_KEY).")
    return ""


def request(
    method: str,
    path: str,
    *,
    key: str | None = None,
    query: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
    accept: str = "application/json",
    retries: int = 3,
) -> bytes:
    url = API + path
    if query:
        url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v not in (None, "")})
    headers = {"xi-api-key": key or api_key(), "Accept": accept}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=180) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            if exc.code in (408, 429) or exc.code >= 500:
                if attempt < retries:
                    time.sleep(2**attempt)
                    continue
            raise RuntimeError(f"ElevenLabs {method} {path} failed ({exc.code}): {detail}") from exc
        except urllib.error.URLError as exc:
            if attempt < retries:
                time.sleep(2**attempt)
                continue
            raise RuntimeError(f"ElevenLabs {method} {path} failed: {exc.reason}") from exc
    raise AssertionError("unreachable")


def get_json(path: str, **kwargs: Any) -> dict[str, Any]:
    return json.loads(request("GET", path, **kwargs))


def tts(voice_id: str, text: str, model_id: str, output_format: str = "mp3_44100_128") -> bytes:
    return request(
        "POST",
        f"/v1/text-to-speech/{voice_id}",
        query={"output_format": output_format},
        body={"text": text, "model_id": model_id},
        accept="audio/mpeg",
    )


def read_voice_cast(path: Path) -> tuple[str, dict[str, str]]:
    """Return (model_id, {character.casefold(): voice_id}) from story/voice-cast.md.

    The file is markdown: an optional `Model: <id>` line and a table whose first
    two columns are Character and Voice ID. Rows with an empty Voice ID are skipped.
    """
    if not path.exists():
        die(f"Missing {path}. Cast voices first (`bin/story cast`).")
    text = re.sub(r"<!--.*?-->", "", path.read_text(encoding="utf-8"), flags=re.S)
    model = DEFAULT_MODEL
    voices: dict[str, str] = {}
    for line in text.splitlines():
        match = re.match(r"^\s*\**model\**\s*:\s*`?([\w.-]+)`?", line, re.I)
        if match:
            model = match.group(1)
            continue
        if not line.strip().startswith("|"):
            continue
        cells = [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
        if len(cells) < 2 or set(cells[0]) <= set("-: ") or cells[0].lower() == "character":
            continue
        if cells[1]:
            voices[cells[0].casefold()] = cells[1]
    return model, voices
