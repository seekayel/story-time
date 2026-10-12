#!/usr/bin/env python3
"""Find, audition, and add ElevenLabs voices for casting. Output is markdown.

  voices.py list [--search Q]                 voices already in your account (usable now)
  voices.py library [--search Q] [--gender male|female|neutral] [--age young|middle_aged|old]
                    [--accent A] [--language es] [--use-case narrative_story|characters_animation|...]
                                              search the public Voice Library
  voices.py add PUBLIC_OWNER_ID VOICE_ID --name NAME
                                              add a library voice to your account (required before use)
  voices.py preview VOICE_ID [--say TEXT] [--play]
                                              fetch the free sample, or synthesize TEXT (spends credits)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import urllib.request

from _eleven import DEFAULT_MODEL, get_json, project_root, request, tts


def cell(value: object, width: int = 80) -> str:
    text = " ".join(str(value or "").split()).replace("|", "/")
    return text if len(text) <= width else text[: width - 1] + "…"


def table(headers: list[str], rows: list[list[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    lines += ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join(lines)


def command_list(args: argparse.Namespace) -> None:
    voices, token = [], None
    while True:
        page = get_json("/v2/voices", query={"page_size": 100, "search": args.search, "next_page_token": token})
        voices += page.get("voices", [])
        token = page.get("next_page_token")
        if not page.get("has_more") or not token:
            break
    rows = []
    for voice in sorted(voices, key=lambda v: str(v.get("name", "")).casefold()):
        labels = voice.get("labels") or {}
        rows.append([
            cell(voice.get("name"), 40),
            f"`{voice.get('voice_id')}`",
            cell(voice.get("category")),
            cell(labels.get("gender")),
            cell(labels.get("age")),
            cell(labels.get("accent")),
            cell(labels.get("description") or labels.get("descriptive") or voice.get("description")),
            cell(labels.get("use_case") or labels.get("use case")),
        ])
    print(f"{len(rows)} voices in your account\n")
    print(table(["Name", "Voice ID", "Category", "Gender", "Age", "Accent", "Description", "Use case"], rows))


def command_library(args: argparse.Namespace) -> None:
    page = get_json(
        "/v1/shared-voices",
        query={
            "page_size": args.limit,
            "search": args.search,
            "gender": args.gender,
            "age": args.age,
            "accent": args.accent,
            "language": args.language,
            "use_cases": args.use_case,
            "sort": "trending",
        },
    )
    rows = []
    for voice in page.get("voices", []):
        rows.append([
            cell(voice.get("name"), 40),
            f"`{voice.get('public_owner_id')}`",
            f"`{voice.get('voice_id')}`",
            cell(voice.get("gender")),
            cell(voice.get("age")),
            cell(voice.get("accent")),
            cell(voice.get("language")),
            cell(voice.get("descriptive")),
            cell(voice.get("description"), 120),
            f"[sample]({voice.get('preview_url')})" if voice.get("preview_url") else "",
        ])
    print(f"{len(rows)} library voices (add one with `voices.py add OWNER VOICE_ID --name NAME` before casting it)\n")
    print(table(["Name", "Owner ID", "Voice ID", "Gender", "Age", "Accent", "Lang", "Style", "Description", "Preview"], rows))


def command_add(args: argparse.Namespace) -> None:
    response = json.loads(
        request("POST", f"/v1/voices/add/{args.owner_id}/{args.voice_id}", body={"new_name": args.name})
    )
    print(f"Added `{args.name}` to your account as voice ID `{response.get('voice_id')}`.")


def command_preview(args: argparse.Namespace) -> None:
    out = project_root() / "out" / "previews"
    out.mkdir(parents=True, exist_ok=True)
    if args.say:
        digest = hashlib.sha256(f"{args.voice_id}\n{args.model}\n{args.say}".encode()).hexdigest()[:10]
        path = out / f"{args.voice_id}-{digest}.mp3"
        if not path.exists():
            path.write_bytes(tts(args.voice_id, args.say, args.model))
            print(f"Synthesized {len(args.say)} characters (billed).")
    else:
        voice = get_json(f"/v1/voices/{args.voice_id}")
        url = voice.get("preview_url")
        if not url:
            raise SystemExit(f"{voice.get('name', args.voice_id)} has no free sample; use --say TEXT")
        path = out / f"{args.voice_id}-sample.mp3"
        with urllib.request.urlopen(url, timeout=60) as response:
            path.write_bytes(response.read())
    print(f"Wrote {path}")
    if args.play and shutil.which("afplay"):
        subprocess.run(["afplay", str(path)], check=False)
    elif args.play and shutil.which("ffplay"):
        subprocess.run(["ffplay", "-nodisp", "-autoexit", "-loglevel", "error", str(path)], check=False)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("list", help="voices in your account")
    p.add_argument("--search")
    p.set_defaults(func=command_list)

    p = sub.add_parser("library", help="search the public Voice Library")
    p.add_argument("--search")
    p.add_argument("--gender")
    p.add_argument("--age")
    p.add_argument("--accent")
    p.add_argument("--language")
    p.add_argument("--use-case")
    p.add_argument("--limit", type=int, default=30)
    p.set_defaults(func=command_library)

    p = sub.add_parser("add", help="add a library voice to your account")
    p.add_argument("owner_id")
    p.add_argument("voice_id")
    p.add_argument("--name", required=True)
    p.set_defaults(func=command_add)

    p = sub.add_parser("preview", help="download or synthesize an audition clip")
    p.add_argument("voice_id")
    p.add_argument("--say", help="line to synthesize (spends credits)")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--play", action="store_true")
    p.set_defaults(func=command_preview)

    args = parser.parse_args()
    try:
        args.func(args)
    except RuntimeError as exc:
        raise SystemExit(f"error: {exc}") from exc


if __name__ == "__main__":
    main()
