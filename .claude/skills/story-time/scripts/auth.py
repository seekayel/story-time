#!/usr/bin/env python3
"""Store and verify the ElevenLabs API key used by voices.py and episode.py.

  auth.py              prompt for a key (hidden input), verify it, save it
  auth.py --from-env   save the key already in ELEVEN_LABS_API_KEY / ELEVENLABS_API_KEY
  auth.py --check      verify whatever key the scripts would use and show quota

The key is saved to ~/.config/story-time/elevenlabs_api_key (mode 600) so every
checkout and worktree can use it. Environment variables take precedence.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from _eleven import ENV_VARS, KEY_FILE, api_key, die, get_json


def verify(key: str) -> None:
    try:
        get_json("/v2/voices", key=key, query={"page_size": 1}, retries=1)
    except RuntimeError as exc:
        die(f"key rejected: {exc}\nThe key needs at least the Voices (read) and Text to Speech permissions.")
    print("Key works (voices readable).")
    try:
        sub = get_json("/v1/user/subscription", key=key, retries=1)
        used, limit = sub.get("character_count"), sub.get("character_limit")
        print(f"Plan: {sub.get('tier', '?')} — {used:,} of {limit:,} characters used this period.")
    except (RuntimeError, TypeError, ValueError):
        print("(Quota not visible — the key lacks User (read) permission. That's fine.)")


def save(key: str) -> None:
    KEY_FILE.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(KEY_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(key + "\n")
    os.chmod(KEY_FILE, 0o600)
    print(f"Saved to {KEY_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--from-env", action="store_true", help="save the key from the environment")
    mode.add_argument("--check", action="store_true", help="verify the active key without saving")
    args = parser.parse_args()

    if args.check:
        verify(api_key())
        return
    if args.from_env:
        key = next((os.environ[name].strip() for name in ENV_VARS if os.environ.get(name)), "")
        if not key:
            die(f"none of {', '.join(ENV_VARS)} is set")
    else:
        if not sys.stdin.isatty():
            die("run this in a terminal (input is hidden), or use --from-env")
        print("Create a key at https://elevenlabs.io/app/settings/api-keys")
        print("Permissions needed: Text to Speech, Voices (read + write to add library voices), User (read, optional).")
        key = getpass.getpass("ElevenLabs API key: ").strip()
        if not key:
            die("no key entered")
    verify(key)
    save(key)


if __name__ == "__main__":
    main()
