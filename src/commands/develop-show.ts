import { join } from "node:path";
import { getShowDir, loadShowConfig, resolveShowPath } from "../lib/config.ts";
import {
	extractFeedback,
	readFileIfExists,
	writeFileEnsureDir,
} from "../lib/files.ts";
import { generate } from "../lib/llm.ts";

export async function developShow(options: { show?: string }): Promise<void> {
	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);
	const charactersDir = getShowDir(showPath, "characters");

	console.log(`Developing show: ${config.name}`);

	for (const character of config.characters) {
		const filePath = join(
			charactersDir,
			`${character.name.toLowerCase().replace(/\s+/g, "-")}.md`,
		);
		const existing = readFileIfExists(filePath);
		const feedback = existing ? extractFeedback(existing) : [];

		const systemPrompt = `You are a creative writer developing character briefs for a children's audio series.
The show is called "${config.name}".
Description: ${config.description}
Setting: ${config.setting}
Content rating: ${config.content_guidelines.rating}
Themes to avoid: ${config.content_guidelines.themes_to_avoid.join(", ")}`;

		let prompt = `Write a detailed character brief for "${character.name}" in the show "${config.name}".

Include:
- Physical description
- Personality traits
- Backstory
- Speech patterns and mannerisms
- Relationships with other characters: ${config.characters.map((c) => c.name).join(", ")}
- Character arc potential

Format as a markdown document with clear headings.`;

		if (existing) {
			prompt += `\n\nExisting character brief to refine:\n${existing}`;
		}

		if (feedback.length > 0) {
			prompt += `\n\nIncorporate this feedback:\n${feedback.map((f) => `- ${f}`).join("\n")}`;
		}

		console.log(`  Generating brief for ${character.name}...`);
		const result = await generate({ system: systemPrompt, prompt });
		writeFileEnsureDir(filePath, result);
		console.log(`  Wrote ${filePath}`);
	}

	console.log("Show development complete.");
}
