# Story Time

A CLI tool that generates children's audio story series using AI. It automates the entire pipeline from character development to podcast distribution.

## Features

- AI-powered script generation (Gemini or Claude)
- Multi-language support with translation
- Audio synthesis via ElevenLabs
- Podcast RSS feed generation
- Batch processing for multiple episodes
- Human-in-the-loop feedback workflow

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd story-time

# Install dependencies
bun install

# Build the CLI
bun run build

# Install globally
bun link
```

For development without building:

```bash
bun run dev story-time <command>
```

## Configuration

### API Keys

Create a `.env` file in the project root:

```bash
# LLM Provider (at least one required)
GEMINI_API_KEY=your-google-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Audio synthesis (required for audio generation)
ELEVEN_LABS_API_KEY=your-elevenlabs-api-key
```

### Initialize a Show

```bash
story-time init "My Adventure Show"
```

This creates a show directory with a `show.yaml` configuration file. Edit it to define your characters, voices, and settings:

```yaml
name: "My Adventure Show"
description: "Two friends explore magical lands..."
target_language: "es"
source_language: "en"
episodes_per_season: 12
episode_duration_minutes: 25

characters:
  - name: "Hero"
    voice_id: "elevenlabs_voice_id_here"
  - name: "Sidekick"
    voice_id: "elevenlabs_voice_id_here"
```

### Set Active Show

```bash
story-time config --show shows/my-adventure-show
```

### Set Default LLM

```bash
story-time config --model gemini   # or claude
```

## Usage

### The Pipeline

Story Time uses a 7-stage pipeline. Run each stage in order:

| Stage | Command | Output |
|-------|---------|--------|
| 1 | `develop-show` | Character briefs |
| 2 | `develop-season` | Season story arc |
| 3 | `develop-episode` | Episode plots |
| 4 | `write-script` | English scripts |
| 5 | `translate` | Translated scripts |
| 6 | `synthesize` | MP3 audio files |
| 7 | `generate-feed` | Podcast RSS feed |

### Example Workflow

```bash
# 1. Develop character briefs
story-time develop-show

# 2. Create the season arc
story-time develop-season --season 1

# 3. Generate episode plots
story-time develop-episode 1
story-time develop-episode 2-5      # Range of episodes
story-time develop-episode 1,3,5    # Specific episodes
story-time develop-episode --all    # All episodes in season

# 4. Write scripts
story-time write-script 1

# 5. Translate to target language
story-time translate 1

# 6. Estimate duration before synthesis
story-time estimate-duration 1 --translated

# 7. Generate audio
story-time synthesize 1

# 8. Generate podcast feed
story-time generate-feed --season 1
```

### Check Progress

```bash
story-time status
story-time status --season 2
```

Example output:

```
Season 1: arc [+]
  Ep  | Plot  | Script | Translated | Audio
  ----|-------|--------|------------|------
  1   |  [+]  |  [+]   |    [+]     | [+]
  2   |  [+]  |  [+]   |    [-]     | [-]
  3   |  [+]  |  [-]   |    [-]     | [-]
```

### Command Options

Most commands support these flags:

```bash
--show <path>      # Specify show directory
--season <number>  # Specify season (default: 1)
--model <name>     # Override LLM (gemini or claude)
```

### Human Feedback

Edit any generated markdown file and add feedback comments:

```markdown
<!-- FEEDBACK: Make this dialogue more playful -->
```

Re-run the same command to incorporate your feedback into the regenerated content.

## Directory Structure

```
shows/
  my-show/
    show.yaml
    characters/
      hero.md
      sidekick.md
    seasons/
      season-01/
        arc.md
        episodes/
          ep-01/
            plot.md
            script.md
            script-es.md
            audio.mp3
```

## Development

```bash
# Run linter
bun run lint

# Fix linting issues
bun run lint:fix

# Run tests
bun test

# Build
bun run build
```

## License

MIT
