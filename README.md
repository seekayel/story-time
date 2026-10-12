# Story Time Studio

This repository is a Codex skill for developing and producing serialized audio fiction. It carries a project from series vision through character development, season architecture, episode plots, audio-first scripts, localization, voice casting, ElevenLabs synthesis, and an RSS podcast delivered to a Yoto Player through GitHub Pages.

Creative work lives in [`story/`](story/). The skill lives in [`.agents/skills/story-time/`](.agents/skills/story-time/) so Codex discovers it automatically when working in this repository.

## Work locally

Invoke the skill in Codex:

```text
Use $story-time to develop the series vision from story/brief.md.
Use $story-time to plan season 1.
Use $story-time to write episodes 1-3 of season 1.
Use $story-time to cast voices for the recurring characters.
```

The skill reads prior artifacts, incorporates direct edits and `<!-- FEEDBACK: ... -->` comments, and writes reviewable Markdown back into `story/`.

Check the current pipeline state and validate existing artifacts:

```bash
python3 .agents/skills/story-time/scripts/storyctl.py status
python3 .agents/skills/story-time/scripts/storyctl.py validate --allow-incomplete
```

To start a different series, move the existing `story/` directory elsewhere and run:

```bash
python3 .agents/skills/story-time/scripts/storyctl.py init
```

## Repository layout

```text
.agents/skills/story-time/       Codex skill, references, templates, tools
.github/workflows/story-develop.yml
.github/workflows/story-produce.yml
.github/workflows/validate.yml
story/
  project.toml                   Human-owned format/provider configuration
  brief.md                       Initial creative input
  vision.md                      Generated series bible/vision
  characters/*.md               Character briefs
  seasons/season-NN/
    architecture.md
    episodes/episode-NN/
      plot.md
      script.md                  Markdown containing canonical JSON
      script-<language>.md       Optional localized script
      release.md
  production/
    voice-cast.md                Markdown containing provider assignments
    voice-catalog.json           Temporary provider inventory (ignored)
    audio/...                    Generated MP3 files (ignored)
    feed.xml                     Generated RSS (ignored)
    yoto.md                      Yoto setup and delivery state
    site/...                     Rebuildable GitHub Pages payload (ignored)
```

## GitHub Actions

`Story development` is a manual, stage-scoped workflow. It runs the repository skill with the official `openai/codex-action`, validates the result, pushes a run-specific branch, and opens a pull request containing the `story/` text changes. Configure these repository secrets:

- `OPENAI_API_KEY` — required for Codex runs.
- `ELEVEN_LABS_API_KEY` — optional for the `voices` stage; lets the workflow fetch a real catalog before Codex casts voices.

`Story production` is a separate manual workflow. It validates, performs a dry run, restores any episodes already on Pages, synthesizes the selected episodes, generates RSS, and uploads a review artifact. Set `publish_pages=true` to deploy the feed and MP3s to GitHub Pages. Production requires:

- `ELEVEN_LABS_API_KEY`

Before the first deployment, open **Settings → Pages** in GitHub and select **GitHub Actions** as the source. The expected feed URL for this repository is `https://seekayel.github.io/story-time/feed.xml`; the workflow uses GitHub's configured Pages URL automatically, including a custom domain if one is added later.

### Add the feed to Yoto

After the first Pages deployment:

1. Open `https://yotoplay.com/create` using the same account as the Yoto app.
2. Select **Podcasts → Add Podcast**.
3. Paste the deployed `feed.xml` URL and retrieve the podcast details.
4. Save it, find it under **Make Your Own** in the Yoto app, and choose **Link to a Card**.

GitHub Pages must serve the RSS and audio without authentication, so these stories are publicly accessible to anyone who has or discovers the URLs. GitHub currently caps a published Pages site at 1 GB; the build stops at 950 MB so the audio can be migrated before reaching that limit.

## Produce locally

Fetch a current voice catalog, then ask Codex to create `voice-cast.md`:

```bash
ELEVEN_LABS_API_KEY=... python3 .agents/skills/story-time/scripts/storyctl.py voice-catalog
```

Preview and synthesize a selection:

```bash
python3 .agents/skills/story-time/scripts/storyctl.py synthesize --season 1 --episodes 1-3 --dry-run
ELEVEN_LABS_API_KEY=... python3 .agents/skills/story-time/scripts/storyctl.py synthesize --season 1 --episodes 1-3
python3 .agents/skills/story-time/scripts/storyctl.py feed
python3 .agents/skills/story-time/scripts/storyctl.py pages \
  --base-url https://seekayel.github.io/story-time
```

Synthesis requires Python 3.11+ and `ffmpeg`. Running `pages` locally stages the deployable files but does not publish them; Pages deployment remains an explicit GitHub Actions input.

The old Bun CLI has been removed. The user-modified root `config.yaml` remains as unmigrated legacy state; the active skill configuration is `story/project.toml`.
