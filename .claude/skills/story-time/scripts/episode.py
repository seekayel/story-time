#!/usr/bin/env python3
"""Turn a markdown episode script into one MP3 with ElevenLabs.

  episode.py 1 3             synthesize story/season-01/episode-03/script.md
  episode.py 1 3 --lang es   use script-es.md instead
  episode.py 1 1-4 --dry-run check speakers and report characters/minutes; no API calls

Script lines that are spoken (everything else is ignored):

  NARRATOR: The fog lay thick over the harbor.
  CAPTAIN BARBA: (quiet wonder) There—beyond the mist.

`## ` headings start a new scene (longer pause). `[PAUSE]` inserts a beat.
`[SFX: ...]`, `[MUSIC: ...]`, notes, and HTML comments are not spoken.
Speakers map to voices through the table in story/voice-cast.md.

Each line's audio is cached in out/.cache, so re-running after editing one line
only pays for that line. Output: out/season-NN/episode-NN[-lang].mp3
"""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from _eleven import api_key, die, project_root, read_voice_cast, tts

SPOKEN = re.compile(r"^\s*\**([A-Z][A-Z0-9 .'’-]*?)\**\s*:\**\s*(?:\(([^)]*)\)\s*)?(.+?)\s*$")
WORDS_PER_MINUTE = 150


@dataclass
class Line:
    speaker: str
    text: str
    direction: str
    scene: int


@dataclass
class Pause:
    seconds: float


def episode_list(spec: str) -> list[int]:
    numbers: list[int] = []
    for part in spec.split(","):
        start, _, end = part.strip().partition("-")
        numbers += range(int(start), int(end or start) + 1)
    return numbers


def parse_script(path: Path) -> list[Line | Pause]:
    text = re.sub(r"<!--.*?-->", "", path.read_text(encoding="utf-8"), flags=re.S)
    items: list[Line | Pause] = []
    scene = 0
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("## "):
            scene += 1
            if items:
                items.append(Pause(1.2))
        elif line.upper() == "[PAUSE]":
            items.append(Pause(0.8))
        elif match := SPOKEN.match(line):
            speaker, direction, spoken = match.groups()
            items.append(Line(speaker.strip(), spoken.strip(), (direction or "").strip(), scene))
    while items and isinstance(items[-1], Pause):
        items.pop()
    return items


def unspoken_cast_lines(path: Path, voices: dict[str, str]) -> list[str]:
    """Lines like `Captain Barba: ...` that name a cast member but won't be spoken."""
    text = re.sub(r"<!--.*?-->", "", path.read_text(encoding="utf-8"), flags=re.S)
    misses = []
    for raw in text.splitlines():
        match = re.match(r"^\s*\**([^:*]{1,40}?)\**\s*:", raw)
        if match and match.group(1).strip().casefold() in voices and not SPOKEN.match(raw.strip()):
            misses.append(raw.strip())
    return misses


def speech_text(line: Line, model: str) -> str:
    # eleven_v3 understands inline audio tags; other models would read them aloud.
    if line.direction and model.startswith("eleven_v3"):
        return f"[{line.direction}] {line.text}"
    return line.text


def silence(path: Path, seconds: float) -> None:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
         "-i", "anullsrc=r=44100:cl=mono", "-t", f"{seconds}", "-c:a", "libmp3lame", "-b:a", "128k", str(path)],
        check=True,
    )


def produce(root: Path, season: int, episode: int, lang: str | None, dry_run: bool) -> None:
    folder = root / "story" / f"season-{season:02d}" / f"episode-{episode:02d}"
    script = folder / (f"script-{lang}.md" if lang else "script.md")
    if not script.exists():
        die(f"Missing {script.relative_to(root)}")
    model, voices = read_voice_cast(root / "story" / "voice-cast.md")
    items = parse_script(script)
    lines = [item for item in items if isinstance(item, Line)]
    if not lines:
        die(f"No spoken lines found in {script.relative_to(root)} (expected `SPEAKER: text`)")
    missing = sorted({line.speaker for line in lines if line.speaker.casefold() not in voices})
    chars = sum(len(speech_text(line, model)) for line in lines)
    words = sum(len(line.text.split()) for line in lines)
    print(f"S{season:02d}E{episode:02d}{f' [{lang}]' if lang else ''}: {len(lines)} lines, "
          f"{words:,} words (~{words / WORDS_PER_MINUTE:.0f} min), {chars:,} characters, model {model}")
    for miss in unspoken_cast_lines(script, voices):
        print(f"  warning: not spoken (speaker must be in capitals): {miss[:80]}")
    if missing:
        die(f"No voice in story/voice-cast.md for: {', '.join(missing)}")
    if dry_run:
        return

    cache = root / "out" / ".cache"
    cache.mkdir(parents=True, exist_ok=True)
    output = root / "out" / f"season-{season:02d}" / f"episode-{episode:02d}{f'-{lang}' if lang else ''}.mp3"
    output.parent.mkdir(parents=True, exist_ok=True)
    billed = 0
    with tempfile.TemporaryDirectory(prefix="story-time-") as temp_dir:
        temp = Path(temp_dir)
        parts: list[Path] = []
        previous: Line | Pause | None = None
        for index, item in enumerate(items):
            if isinstance(item, Pause):
                parts.append(temp / f"pause-{item.seconds}.mp3")
            else:
                if isinstance(previous, Line):
                    parts.append(temp / "pause-0.35.mp3")
                voice = voices[item.speaker.casefold()]
                text = speech_text(item, model)
                clip = cache / (hashlib.sha256(f"{voice}\n{model}\n{text}".encode()).hexdigest() + ".mp3")
                if not clip.exists():
                    print(f"  [{index + 1}/{len(items)}] {item.speaker}: {item.text[:60]}")
                    clip.write_bytes(tts(voice, text, model))
                    billed += len(text)
                parts.append(clip)
            previous = item
        for seconds in {0.35, 0.8, 1.2}:
            silence(temp / f"pause-{seconds}.mp3", seconds)
        manifest = temp / "concat.txt"
        manifest.write_text("".join(f"file '{part.as_posix()}'\n" for part in parts), encoding="utf-8")
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
             "-i", str(manifest), "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", str(output)],
            check=True,
        )
    print(f"  billed {billed:,} new characters ({chars - billed:,} from cache) → {output.relative_to(root)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("season", type=int)
    parser.add_argument("episodes", help="episode number, range, or list: 3, 1-4, 1,3")
    parser.add_argument("--lang", help="use script-<lang>.md")
    parser.add_argument("--dry-run", action="store_true", help="validate and estimate without API calls")
    args = parser.parse_args()

    if not args.dry_run:
        if shutil.which("ffmpeg") is None:
            die("ffmpeg is required (brew install ffmpeg)")
        api_key()
    root = project_root()
    try:
        for episode in episode_list(args.episodes):
            produce(root, args.season, episode, args.lang, args.dry_run)
    except RuntimeError as exc:
        die(str(exc))


if __name__ == "__main__":
    main()
