import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
	getEpisodeDir,
	getSeasonDir,
	getShowDir,
	loadShowConfig,
	resolveShowPath,
} from "../lib/config.ts";
import {
	formatPreviousContext,
	getPreviousEpisodeContext,
} from "../lib/context.ts";
import {
	extractFeedback,
	readFileIfExists,
	writeFileEnsureDir,
} from "../lib/files.ts";
import { generate, type ModelProvider } from "../lib/llm.ts";

export async function developEpisode(
	episodeNumber: string,
	options: { show?: string; season?: number; model?: ModelProvider },
): Promise<void> {
	const epNum = Number.parseInt(episodeNumber, 10);
	if (Number.isNaN(epNum) || epNum < 1) {
		throw new Error("Episode number must be a positive integer.");
	}

	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);
	const season = options.season ?? 1;
	const episodeDir = getEpisodeDir(showPath, season, epNum);
	const plotPath = join(episodeDir, "plot.md");

	console.log(
		`Developing Episode ${epNum} plot for: ${config.name} (Season ${season})`,
	);

	// Load season arc
	const seasonDir = getSeasonDir(showPath, season);
	const arcContent = readFileIfExists(join(seasonDir, "arc.md"));

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

	const existing = readFileIfExists(plotPath);
	const feedback = existing ? extractFeedback(existing) : [];

	const systemPrompt = `You are a creative writer developing episode plots for a children's audio series.
The show is called "${config.name}".
Description: ${config.description}
Setting: ${config.setting}
Content rating: ${config.content_guidelines.rating}
Themes to avoid: ${config.content_guidelines.themes_to_avoid.join(", ")}
Target episode duration: ${config.episode_duration_minutes} minutes`;

	let prompt = `Write a detailed plot for Episode ${epNum} of Season ${season} of "${config.name}".

The episode should be standalone (viewers can start at any episode) but additive (plot points build toward the season arc).

Include:
- Episode title
- Cold open / hook
- Act structure (3 acts)
- Key scenes and dialogue moments
- Character moments
- How this episode connects to the season arc
- Episode resolution

Format as a markdown document with clear headings.`;

	if (arcContent) {
		prompt += `\n\nSeason arc:\n${arcContent}`;
	}

	if (characterBriefs) {
		prompt += `\n\nCharacter briefs:\n${characterBriefs}`;
	}

	// Load previous episode context for narrative continuity
	const previousSummaries = getPreviousEpisodeContext(showPath, season, epNum);
	if (previousSummaries.length > 0) {
		const previousContext = formatPreviousContext(previousSummaries, false);
		prompt += `\n\n${previousContext}\n\nUse the above previous episodes for context to maintain narrative continuity. Do not contradict established events or character developments.`;
	}

	if (existing) {
		prompt += `\n\nExisting plot to refine:\n${existing}`;
	}

	if (feedback.length > 0) {
		prompt += `\n\nIncorporate this feedback:\n${feedback.map((f) => `- ${f}`).join("\n")}`;
	}

	console.log("  Generating episode plot...");
	const result = await generate({
		system: systemPrompt,
		prompt,
		provider: options.model,
	});
	writeFileEnsureDir(plotPath, result);
	console.log(`  Wrote ${plotPath}`);
	console.log("Episode development complete.");
}
