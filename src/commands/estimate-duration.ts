import { join } from "node:path";
import YAML from "yaml";
import {
	getEpisodeDir,
	loadShowConfig,
	resolveShowPath,
} from "../lib/config.ts";
import { estimateDuration, formatDurationEstimate } from "../lib/duration.ts";
import { readFileIfExists } from "../lib/files.ts";
import { type Script, scriptSchema } from "../lib/schemas.ts";

export async function estimateDurationCommand(
	episodeNumber: string,
	options: { show?: string; season?: number; translated?: boolean },
): Promise<void> {
	const epNum = Number.parseInt(episodeNumber, 10);
	if (Number.isNaN(epNum) || epNum < 1) {
		throw new Error("Episode number must be a positive integer.");
	}

	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);
	const season = options.season ?? 1;
	const episodeDir = getEpisodeDir(showPath, season, epNum);

	// Determine which script to read
	const useTranslated = options.translated ?? false;
	const scriptFile = useTranslated
		? `script-${config.target_language}.md`
		: "script.md";
	const language = useTranslated
		? config.target_language
		: config.source_language;
	const scriptPath = join(episodeDir, scriptFile);

	console.log(
		`Estimating duration for Episode ${epNum}: ${config.name} (Season ${season})`,
	);

	const content = readFileIfExists(scriptPath);
	if (!content) {
		const hint = useTranslated
			? "Run translate first."
			: "Run write-script first.";
		throw new Error(`No script found at ${scriptPath}. ${hint}`);
	}

	// Extract and parse YAML
	const yamlMatch = content.match(/```yaml\n([\s\S]*?)```/);
	const yamlContent = yamlMatch ? yamlMatch[1] : content;

	let script: Script;
	try {
		const parsed = YAML.parse(yamlContent ?? "");
		script = scriptSchema.parse(parsed);
	} catch (err) {
		throw new Error(
			`Failed to parse script YAML: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	const estimate = estimateDuration(script, language);
	console.log(
		formatDurationEstimate(estimate, config.episode_duration_minutes),
	);
}
