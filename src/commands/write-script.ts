import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
	getEpisodeDir,
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

export async function writeScript(
	episodeNumber: string,
	options: { show?: string; season?: number },
): Promise<void> {
	const epNum = Number.parseInt(episodeNumber, 10);
	if (Number.isNaN(epNum) || epNum < 1) {
		throw new Error("Episode number must be a positive integer.");
	}

	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);
	const season = options.season ?? 1;
	const episodeDir = getEpisodeDir(showPath, season, epNum);
	const scriptPath = join(episodeDir, "script.md");

	console.log(
		`Writing script for Episode ${epNum}: ${config.name} (Season ${season})`,
	);

	// Load episode plot
	const plotContent = readFileIfExists(join(episodeDir, "plot.md"));
	if (!plotContent) {
		throw new Error(
			`No plot found for Episode ${epNum}. Run develop-episode first.`,
		);
	}

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

	const existing = readFileIfExists(scriptPath);
	const feedback = existing ? extractFeedback(existing) : [];

	const characterNames = config.characters.map((c) => c.name).join(", ");

	const systemPrompt = `You are a scriptwriter for a children's audio series.
The show is called "${config.name}".
Description: ${config.description}
Setting: ${config.setting}
Content rating: ${config.content_guidelines.rating}
Themes to avoid: ${config.content_guidelines.themes_to_avoid.join(", ")}
Target episode duration: ${config.episode_duration_minutes} minutes
Characters: ${characterNames}

Write the script in structured YAML format suitable for audio synthesis. The script should contain scenes, each with a location and a list of beats. Each beat has a character and either dialogue or an action (for non-verbal sounds).`;

	let prompt = `Write the full script for Episode ${epNum} of Season ${season}.

Use this exact YAML format:
\`\`\`yaml
title: "Episode Title"
episode: ${epNum}
season: ${season}

scenes:
  - location: "Description of location and atmosphere"
    beats:
      - character: "Character Name"
        dialogue: "What they say"
        direction: "how they say it"
      - character: "Character Name"
        action: "non-verbal action description"
\`\`\`

Episode plot:\n${plotContent}`;

	if (characterBriefs) {
		prompt += `\n\nCharacter briefs:\n${characterBriefs}`;
	}

	if (existing) {
		prompt += `\n\nExisting script to refine:\n${existing}`;
	}

	if (feedback.length > 0) {
		prompt += `\n\nIncorporate this feedback:\n${feedback.map((f) => `- ${f}`).join("\n")}`;
	}

	console.log("  Generating script...");
	const result = await generate({ system: systemPrompt, prompt });
	writeFileEnsureDir(scriptPath, result);
	console.log(`  Wrote ${scriptPath}`);
	console.log("Script writing complete.");
}
