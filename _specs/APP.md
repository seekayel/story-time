# Story Time - Audio Story Generation Pipeline

## Overview

Story Time is a CLI application that runs a full content generation pipeline for children's audio series. It generates character briefs, season arcs, episode plots, scripts, and synthesizes them into audio files for podcast distribution.

**Target Audience**: Children ages 6-10  
**Content Rating**: PG / PG-13  
**Episode Length**: 20-30 minutes (soft target)  
**Output Language**: Spanish (scripts written in English for human review, then translated)

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Linting**: Biome
- **Testing**: Bun test
- **LLM**: Vercel AI SDK
  - Default: Gemini 2.5 Pro
  - Configurable: Claude Sonnet 4.5
- **Speech Synthesis**: 11 Labs
- **Distribution**: Apple Podcasts via RSS

## Pipeline Stages

The pipeline consists of 7 stages. Each stage can be run multiple times—human edits or comments in the output files are incorporated on the next run.

| Stage | Command | Input | Output |
|-------|---------|-------|--------|
| 1. Show Development | `story-time develop-show` | show.yaml | characters/*.md |
| 2. Season Arc | `story-time develop-season` | characters, show config | seasons/season-XX/arc.md |
| 3. Episode Plots | `story-time develop-episode <num>` | arc, characters | episodes/ep-XX/plot.md |
| 4. Episode Scripts | `story-time write-script <num>` | plot, characters | episodes/ep-XX/script.md |
| 5. Translation | `story-time translate <num>` | script.md | episodes/ep-XX/script-es.md |
| 6. Audio Synthesis | `story-time synthesize <num>` | script-es.md, voice config | episodes/ep-XX/audio.mp3 |
| 7. Publish | `story-time publish` | audio files, metadata | RSS feed update |

## File Structure

```
/shows/<show-name>/
  show.yaml                    # Show configuration
  /characters/
    <character-name>.md        # Character briefs
  /seasons/season-<XX>/
    arc.md                     # Season story arc
    /episodes/ep-<XX>/
      plot.md                  # Episode plot
      script.md                # Episode script (English)
      script-es.md             # Episode script (Spanish)
      audio.mp3                # Synthesized audio
```

## Configuration

### show.yaml

```yaml
name: "Captain Barba and His Monkey Chuck"
description: "A pirate captain and his monkey companion have adventures in the Caribbean while trying to clear the captain's name."
setting: "Caribbean"
target_language: "es"  # Spanish
source_language: "en"  # English (for human review)
episodes_per_season: 24
episode_duration_minutes: 25  # Target, not enforced

narrator:
  enabled: false
  voice_id: null  # 11 Labs voice ID if enabled

characters:
  - name: "Captain Barba"
    voice_id: "eleven_labs_voice_id_here"
  - name: "Chuck"
    voice_id: "eleven_labs_voice_id_here"

content_guidelines:
  rating: "PG-13"
  themes_to_avoid:
    - explicit violence
    - adult content
```

### Environment Variables

Create a `.env` file (git-ignored) based on `.env.example`:

```bash
# LLM Providers
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# Speech Synthesis
ELEVEN_LABS_API_KEY=

# Podcast Hosting (RSS)
PODCAST_RSS_ENDPOINT=
PODCAST_API_KEY=
```

## Episode Structure

- Episodes are **standalone**—viewers can start at any episode
- Episodes are **additive**—plot points build toward the season arc
- Each season has an overarching 24-episode story arc

## Script Format

Scripts use a structured YAML format optimized for synthesis:

```yaml
title: "The Mysterious Island"
episode: 1
season: 1

scenes:
  - location: "On the ship deck, sunrise"
    beats:
      - character: "Captain Barba"
        dialogue: "Look, Chuck! A mysterious island."
        direction: "pointing toward the horizon"
      
      - character: "Chuck"
        action: "excited chittering"
        # Non-verbal actions are skipped during synthesis
      
      - character: "Captain Barba"
        dialogue: "This could be where we find the proof we need."
```

## Sound Effects

- Non-verbal actions (e.g., monkey sounds) are **skipped** during synthesis for MVP
- Future: integrate a sound effect library

## Human-in-the-Loop Workflow

1. Run a pipeline stage (e.g., `story-time write-script 1`)
2. Review the generated output file
3. Edit the file directly or add comments
4. Re-run the same command—edits and comments are incorporated
5. Repeat until satisfied
6. Proceed to next stage

Comments in markdown files can use a special format for feedback:

```markdown
<!-- FEEDBACK: Make the dialogue more playful here -->
```

## CLI Reference

```bash
# Initialize a new show
story-time init <show-name>

# Stage 1: Develop show (characters, backstories)
story-time develop-show

# Stage 2: Develop season arc
story-time develop-season [--season=1]

# Stage 3: Develop episode plot
story-time develop-episode <episode-number> [--season=1]

# Stage 4: Write episode script (English)
story-time write-script <episode-number> [--season=1]

# Stage 5: Translate script to Spanish
story-time translate <episode-number> [--season=1]

# Stage 6: Synthesize audio
story-time synthesize <episode-number> [--season=1]

# Stage 7: Publish to podcast RSS
story-time publish [--season=1] [--episode=<num>]

# Configuration
story-time config --model=gemini    # or claude
story-time config --show=<path>     # set active show directory
```

## Future Work

- **Multi-show support**: Manage multiple shows from one installation
- **Google Drive integration**: Store all files in Google Drive (Docs/Sheets)
- **Web UI**: Browser-based interface for producers
- **Sound effects library**: Integrate ambient sounds and effects
- **Narrator support**: Add optional narrator voice
- **Duration estimation**: Estimate episode length before synthesis
- **Batch processing**: Run multiple episodes through pipeline at once

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Lint
bun run lint

# Build
bun run build
```

## Example: First Show

The first show to be generated is "Captain Barba and His Monkey Chuck":

- **Setting**: Caribbean
- **Language**: Spanish
- **Premise**: A pirate captain and his monkey companion have adventures while trying to clear Captain Barba's name
- **Characters**: Defined in Google Drive / flat files (not hardcoded)
