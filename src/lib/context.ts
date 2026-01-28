import { join } from "node:path";
import { getEpisodeDir } from "./config.ts";
import { readFileIfExists } from "./files.ts";

export interface EpisodeSummary {
	episode: number;
	plot: string | null;
	script: string | null;
}

/**
 * Gathers previous episode context for a given episode number.
 * Returns summaries for episodes 1 through (episodeNumber - 1) that have
 * plot or script files available.
 */
export function getPreviousEpisodeContext(
	showPath: string,
	season: number,
	episodeNumber: number,
): EpisodeSummary[] {
	const summaries: EpisodeSummary[] = [];

	for (let ep = 1; ep < episodeNumber; ep++) {
		const episodeDir = getEpisodeDir(showPath, season, ep);
		const plot = readFileIfExists(join(episodeDir, "plot.md"));
		const script = readFileIfExists(join(episodeDir, "script.md"));

		if (plot || script) {
			summaries.push({ episode: ep, plot, script });
		}
	}

	return summaries;
}

/**
 * Formats previous episode summaries into a context string for LLM prompts.
 * Uses plots only (lighter weight) for episode development,
 * or includes scripts for script writing.
 */
export function formatPreviousContext(
	summaries: EpisodeSummary[],
	includeScripts: boolean,
): string {
	if (summaries.length === 0) {
		return "";
	}

	const parts: string[] = [];
	for (const summary of summaries) {
		const lines: string[] = [`### Episode ${summary.episode}`];
		if (summary.plot) {
			lines.push(summary.plot);
		}
		if (includeScripts && summary.script) {
			lines.push(`\n**Script:**\n${summary.script}`);
		}
		parts.push(lines.join("\n"));
	}

	return `## Previous Episodes\n\n${parts.join("\n\n---\n\n")}`;
}
