import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
	getSeasonDir,
	getShowDir,
	loadShowConfig,
	resolveShowPath,
} from "../lib/config.ts";
import {
	extractFeedback,
	readFileIfExists,
	writeFileEnsureDir,
} from "../lib/files.ts";
import { generate } from "../lib/llm.ts";

export async function developSeason(options: {
	show?: string;
	season?: number;
}): Promise<void> {
	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);
	const season = options.season ?? 1;
	const seasonDir = getSeasonDir(showPath, season);
	const arcPath = join(seasonDir, "arc.md");

	console.log(`Developing Season ${season} arc for: ${config.name}`);

	// Load character briefs
	const charactersDir = getShowDir(showPath, "characters");
	let characterBriefs = "";
	try {
		const files = readdirSync(charactersDir).filter((f) => f.endsWith(".md"));
		for (const file of files) {
			const content = readFileIfExists(join(charactersDir, file));
			if (content) {
				characterBriefs += `\n---\n${content}\n`;
			}
		}
	} catch {
		// characters dir may not exist yet
	}

	const existing = readFileIfExists(arcPath);
	const feedback = existing ? extractFeedback(existing) : [];

	const systemPrompt = `You are a creative writer developing season story arcs for a children's audio series.
The show is called "${config.name}".
Description: ${config.description}
Setting: ${config.setting}
Episodes per season: ${config.episodes_per_season}
Content rating: ${config.content_guidelines.rating}
Themes to avoid: ${config.content_guidelines.themes_to_avoid.join(", ")}`;

	let prompt = `Write a detailed season arc for Season ${season} of "${config.name}".

The arc should span ${config.episodes_per_season} episodes. Each episode should be standalone (viewers can start at any episode) but additive (plot points build toward the season arc).

Include:
- Season theme and overarching conflict
- Episode-by-episode summary (one paragraph per episode)
- Character development arcs for the season
- Season climax and resolution

Format as a markdown document with clear headings.`;

	if (characterBriefs) {
		prompt += `\n\nCharacter briefs:\n${characterBriefs}`;
	}

	if (existing) {
		prompt += `\n\nExisting season arc to refine:\n${existing}`;
	}

	if (feedback.length > 0) {
		prompt += `\n\nIncorporate this feedback:\n${feedback.map((f) => `- ${f}`).join("\n")}`;
	}

	console.log("  Generating season arc...");
	const result = await generate({ system: systemPrompt, prompt });
	writeFileEnsureDir(arcPath, result);
	console.log(`  Wrote ${arcPath}`);
	console.log("Season development complete.");
}
