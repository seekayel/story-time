# Voice casting and episode audio

All commands run from the repository root. Script path prefix: `python3 .claude/skills/story-time/scripts/`.

## Auth

The scripts read `ELEVEN_LABS_API_KEY` (or `ELEVENLABS_API_KEY`) from the environment, then `~/.config/story-time/elevenlabs_api_key`. The user sets it up once in their own terminal with `bin/story auth`; `auth.py --check` verifies it and shows remaining quota. Never ask for the key in chat.

## Casting — `story/voice-cast.md`

Casting is an editorial decision backed by real inventory.

1. Read every character file's **Casting notes**, plus `vision.md`'s audio identity and the release languages in `brief.md`.
2. Look at what's usable now: `voices.py list` (add `--search WORD` to narrow).
3. If nothing fits, search the public library with filters that come from the casting notes, e.g.
   `voices.py library --gender male --age old --use-case characters_animation --search pirate`
   and `--language es` when Spanish is a release language. Library voices must be added before use: `voices.py add OWNER_ID VOICE_ID --name "Barba - gravelly"` — this changes the user's account, so propose the additions and get approval first. Use the voice ID it prints.
4. Cast the ensemble, not individuals: characters who share scenes must differ in pitch, pace, texture, and energy so a listener knows who's talking within a word or two. The narrator must sit apart from everyone.
5. For multilingual releases, prefer voices labelled for (or proven in) every release language with `eleven_multilingual_v2`.
6. Auditions: `voices.py preview VOICE_ID --play` downloads the free sample. `--say "a line in character"` synthesizes a custom line and costs credits — offer it, don't do it unasked. Never claim an audition happened unless the user listened.

Write `story/voice-cast.md` in this shape (the script reads the `Model:` line and the first two table columns; keep extra columns after them):

```markdown
# Voice Cast

Model: eleven_multilingual_v2

| Character | Voice ID | Voice | Why | Auditioned |
|---|---|---|---|---|
| Narrator | `abc123` | Grandpa Spuds | Warm, unhurried storyteller; lowest pitch in the cast | no |
| Captain Barba | `def456` | ... | ... | yes — 2026-10-12 |

## Candidates considered

Shortlist per character with IDs and why each lost, so recasting is quick.
```

`Character` must equal the name used in scripts (case-insensitive). Leave a row's Voice ID empty while uncast; `episode.py` refuses to run until every speaker has one.

Model choice: `eleven_multilingual_v2` is the stable default. `eleven_v3` is more expressive and turns script performance notes into audio tags; suggest it if the user wants more acted performances, then audition before switching.

## Episode audio

```bash
python3 .claude/skills/story-time/scripts/episode.py 1 1-3 --dry-run         # speakers, words, minutes, characters
python3 .claude/skills/story-time/scripts/episode.py 1 1-3                   # synthesize (billed per character)
python3 .claude/skills/story-time/scripts/episode.py 1 2 --lang es           # use script-es.md
```

The dry run makes no API calls; it reports unmapped speakers and the character count that will be billed. Each line is cached in `out/.cache/` by voice, model, and text, so fixing one line and re-running re-bills only that line. Output lands at `out/season-NN/episode-EE[-lang].mp3`.

After a run, ask the user to listen for mispronunciations, speaker confusion, clipped lines, and pacing. Fix the script text (spelling, punctuation, splitting lines) rather than re-rolling synthesis.
