# Scripting and translation

Read the plot, `arc.md`, `vision.md`, the relevant character files, and the previous episode's script before writing.

## Script format — `script.md`

`episode.py` turns this file straight into audio, so the speakable lines must follow one rule: **a spoken line is `SPEAKER NAME: text` on its own line, speaker in capitals.** Everything else is for humans and is not spoken.

```markdown
# S01E01 — The Fog Lantern

> Logline: When a lantern washes ashore with Barba's old crest, Chuck has to keep the captain from chasing it into a trap.

## Scene 1 — The deck of the Gaviota, dawn

_Ambience: creaking rigging, distant gulls, small waves._

NARRATOR: The fog lay so thick that morning, you could have spread it on toast.
CAPTAIN BARBA: (quiet wonder) There. Beyond the mist.
CHUCK: (alarmed chittering) Eek-eek!

[SFX: A sail snaps full in the wind.]
[PAUSE]

CAPTAIN BARBA: Hold on, Chuck. Hold on!

## Scene 2 — The harbor market, later

...

## Notes

- Continuity outputs, pronunciation notes.
```

Rules the parser relies on:

- Speaker names are the character's `# Name` in capitals (`CAPTAIN BARBA`), exactly matching a row in `story/voice-cast.md` (case-insensitive). Narration is `NARRATOR:`.
- One line per utterance. Split long speeches into several lines with the same speaker.
- A short performance note may open the line in parentheses: `(whispering)`. It is dropped for `eleven_multilingual_v2` and sent as an audio tag for `eleven_v3`, so keep it to a few words and never put story information in it.
- `## ` headings start scenes (longer pause). `[PAUSE]` adds a beat. `[SFX: …]` and `[MUSIC: …]` are production notes only — they are not synthesized.
- Never write a line like `NOTE: …` or `TODO: …` in capitals; it would be read as a speaker. Put notes in the `## Notes` section as list items, or in HTML comments.
- Spell out anything the voice might stumble on: numbers, abbreviations, invented words (add a pronunciation note too).

## Writing for the ear

- Enter scenes late, leave right after the turn.
- Make speakers distinguishable by intent, rhythm, and vocabulary, not only by name. Use names in dialogue more than you would on the page, especially when three or more characters share a scene.
- Anything the listener must know is said aloud — by narration or dialogue. Sound effects never carry essential information alone, because they aren't synthesized yet.
- Every scene changes knowledge, power, a relationship, a plan, or a feeling.
- Length: about 150 spoken words per minute. A 25-minute episode is roughly 3,500–3,800 spoken words. Check with `python3 .claude/skills/story-time/scripts/episode.py N E --dry-run`.

Before finishing, check: title and numbering, canonical speaker names, continuity with earlier episodes, content boundaries, and the dry run.

## Translation — `script-LANG.md`

Localize meaning, humor, rhythm, and age-appropriateness rather than translating word for word. Keep the structure identical: same scenes, same order, same speaker names in the same capitalized form (names are voice-cast keys — don't translate them). Translate spoken text, performance notes, headings, and SFX notes. Record cultural adaptations under `## Notes`, and re-run the dry run since speech length changes by language.
