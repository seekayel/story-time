# Story Time

A Claude Code skill for developing and producing a serialized audio show. Each stage writes markdown into `story/`: vision, characters, season arc, plots, scripts, translations, and voice cast. Two small scripts then use ElevenLabs to pick voices and render each episode to MP3.

The current show is **Captain Barba y Chuck**. Its brief is in [`story/brief.md`](story/brief.md).

## Setup

You need Claude Code, Python 3.11+, and `ffmpeg` (`brew install ffmpeg`).

Set up ElevenLabs auth once, in your own terminal (the key input is hidden):

```bash
bin/story auth            # paste a key; it's verified and saved to ~/.config/story-time/elevenlabs_api_key
bin/story auth --check    # verify the active key and show remaining character quota
```

Create the key at <https://elevenlabs.io/app/settings/api-keys> with these permissions: **Text to Speech**, **Voices: read** (write too, if you want to add Voice Library voices), and optionally **User: read** for the quota display. `ELEVEN_LABS_API_KEY` in the environment overrides the saved file.

## Make the show

```bash
bin/story next                 # what exists, what's unblocked
bin/story vision               # story/vision.md
bin/story characters           # story/characters/*.md
bin/story season 1             # story/season-01/arc.md
bin/story plot 1 1-3           # story/season-01/episode-0N/plot.md
bin/story script 1 1-3         # .../script.md
bin/story translate 1 1-3 es   # .../script-es.md
bin/story cast                 # story/voice-cast.md, picked from your ElevenLabs voices
bin/story "make Chuck braver in episode 2"
```

Creative stages run `claude -p` with the `story-time` skill and can edit files directly. Add `-i` to any stage to open an interactive session instead, or run `/story-time <stage>` inside Claude Code. Review each step by editing the markdown, or by leaving `<!-- FEEDBACK: ... -->` comments, before running the next stage.

## Voices and audio

```bash
bin/story voices list --search warm                    # voices in your account
bin/story voices library --gender male --age old --use-case characters_animation --language es
bin/story voices add OWNER_ID VOICE_ID --name "Barba"  # add a library voice to your account
bin/story voices preview VOICE_ID --play               # free sample; --say "line" synthesizes (billed)

bin/story audio 1 1-3 --dry-run   # check speakers, word count, minutes, billable characters
bin/story audio 1 1-3             # → out/season-01/episode-0N.mp3
bin/story audio 1 2 --lang es     # from script-es.md
```

Each synthesized line is cached in `out/.cache/`. If you fix one line and re-run, only that line is billed again. `out/` is gitignored.

## Layout

```text
bin/story                              CLI
.claude/skills/story-time/
  SKILL.md                             stages and rules
  references/                          development, scripting, voices
  scripts/auth.py voices.py episode.py ElevenLabs helpers (stdlib only)
story/
  brief.md  vision.md  voice-cast.md
  characters/<name>.md
  season-01/arc.md
  season-01/episode-01/plot.md script.md script-es.md
out/                                   generated audio (ignored)
```
