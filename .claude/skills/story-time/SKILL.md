---
name: story-time
description: Develop and produce a serialized audio-fiction series stored as markdown in story/ — series vision, characters, season arcs, episode plots, audio-first scripts, translations, ElevenLabs voice casting, and episode audio. Use when creating, revising, continuing, casting, or producing the show in this repository.
argument-hint: "<stage> [season] [episodes] — e.g. vision | characters | season 1 | plot 1 1-3 | script 1 2 | translate 1 2 es | cast | audio 1 2 | next"
---

# Story Time

Build a coherent, reviewable audio series. Every artifact is a markdown file under `story/`; those files — not chat history — are the source of truth.

## Layout

```text
story/
  brief.md                          human input: premise, audience, format, languages, boundaries
  vision.md                         series bible
  characters/<kebab-name>.md        one per recurring character
  season-01/
    arc.md                          season architecture + episode grid
    episode-01/
      plot.md
      script.md                     source-language script (speakable format, see scripting.md)
      script-es.md                  optional translation
  voice-cast.md                     character → ElevenLabs voice table
out/                                generated audio (gitignored)
```

Seasons and episodes use two-digit, one-based numbers.

## Stages

`$ARGUMENTS` names the stage. Read `story/brief.md` plus every upstream artifact the stage depends on before writing.

| Stage | Writes | Read first |
|---|---|---|
| `vision` | `story/vision.md` | [development.md](references/development.md) |
| `characters` | `story/characters/*.md` | development.md |
| `season N` | `story/season-NN/arc.md` | development.md |
| `plot N E` | `episode-EE/plot.md` | development.md |
| `script N E` | `episode-EE/script.md` | [scripting.md](references/scripting.md) |
| `translate N E LANG` | `episode-EE/script-LANG.md` | scripting.md |
| `cast` | `story/voice-cast.md` | [voices.md](references/voices.md) |
| `audio N E` | `out/season-NN/episode-EE.mp3` | voices.md |
| `next` | — | list existing artifacts and say which stage is unblocked next |

`E` may be a range (`1-3`) or list (`1,4`); handle each episode in turn. With no stage, infer it from the request, or behave like `next`.

When a requested stage is missing an upstream artifact, write only the minimum upstream work needed and say so. Never regenerate an upstream artifact the user did not ask to change.

## Rules

- Preserve canon. Surface contradictions instead of silently resolving them; retcon only on request.
- Treat direct human edits and `<!-- FEEDBACK: ... -->` comments as binding. Address the feedback, then leave the comment in place unless the user says it is resolved.
- When a missing choice would materially change the series, ask one concise question. Otherwise make a conservative choice and write it into the artifact as plain fact. Story files describe the show; they never contain `## Assumptions` sections or notes about who decided what. Mention judgment calls in your reply instead.
- Every episode works standalone for a new listener and moves the season arc forward.
- Write for the ear: no information that only exists visually.
- Never invent ElevenLabs voice IDs. Only use IDs printed by `voices.py`.
- Synthesis spends ElevenLabs credits. Run `episode.py --dry-run` first and get the user's go-ahead before a paid run unless they already asked for audio of those exact episodes.

Scripts live in `.claude/skills/story-time/scripts/` and run from the repository root with `python3` (3.11+, stdlib only; `ffmpeg` for audio). If the API key is missing, tell the user to run `bin/story auth` in their own terminal — never ask them to paste the key into chat.

Finish by listing the files written, the judgment calls you made, and the next unblocked stage.
