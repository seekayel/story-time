import { join } from "node:path";
import {
	getEpisodeDir,
	loadShowConfig,
	resolveShowPath,
} from "../lib/config.ts";
import {
	extractFeedback,
	readFileIfExists,
	writeFileEnsureDir,
} from "../lib/files.ts";
import { generate } from "../lib/llm.ts";

export async function translate(
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
	const translatedPath = join(
		episodeDir,
		`script-${config.target_language}.md`,
	);

	console.log(
		`Translating Episode ${epNum} script to ${config.target_language}: ${config.name} (Season ${season})`,
	);

	const scriptContent = readFileIfExists(scriptPath);
	if (!scriptContent) {
		throw new Error(
			`No script found for Episode ${epNum}. Run write-script first.`,
		);
	}

	const existing = readFileIfExists(translatedPath);
	const feedback = existing ? extractFeedback(existing) : [];

	const systemPrompt = `You are a professional translator specializing in children's content.
Translate from ${config.source_language} to ${config.target_language}.
Maintain the same YAML structure and format.
Keep character names unchanged.
Translate all dialogue naturally, preserving tone and character voice.
Keep action descriptions in the target language.
Preserve all YAML formatting exactly.`;

	let prompt = `Translate this script from ${config.source_language} to ${config.target_language}:\n\n${scriptContent}`;

	if (existing) {
		prompt += `\n\nExisting translation to refine:\n${existing}`;
	}

	if (feedback.length > 0) {
		prompt += `\n\nIncorporate this feedback:\n${feedback.map((f) => `- ${f}`).join("\n")}`;
	}

	console.log("  Translating script...");
	const result = await generate({ system: systemPrompt, prompt });
	writeFileEnsureDir(translatedPath, result);
	console.log(`  Wrote ${translatedPath}`);
	console.log("Translation complete.");
}
