import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
	getEpisodeDir,
	getSeasonDir,
	getShowDir,
	loadShowConfig,
	resolveShowPath,
} from "../lib/config.ts";

interface EpisodeStatus {
	episode: number;
	plot: boolean;
	script: boolean;
	translated: boolean;
	audio: boolean;
}

interface SeasonStatus {
	season: number;
	arc: boolean;
	episodes: EpisodeStatus[];
}

interface ShowStatus {
	name: string;
	showPath: string;
	characters: string[];
	seasons: SeasonStatus[];
}

export function getShowStatus(options: {
	show?: string;
	season?: number;
}): ShowStatus {
	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);

	// Check characters
	const charactersDir = getShowDir(showPath, "characters");
	let characters: string[] = [];
	try {
		characters = readdirSync(charactersDir)
			.filter((f) => f.endsWith(".md"))
			.map((f) => f.replace(/\.md$/, ""));
	} catch {
		// characters dir may not exist
	}

	// Determine which seasons to check
	const seasonsToCheck: number[] = [];
	if (options.season !== undefined) {
		seasonsToCheck.push(options.season);
	} else {
		// Scan for all season directories
		const seasonsBase = join(showPath, "seasons");
		if (existsSync(seasonsBase)) {
			const dirs = readdirSync(seasonsBase)
				.filter((d) => d.startsWith("season-"))
				.sort();
			for (const dir of dirs) {
				const num = Number.parseInt(dir.replace("season-", ""), 10);
				if (!Number.isNaN(num)) {
					seasonsToCheck.push(num);
				}
			}
		}
		// If no seasons found, default to season 1
		if (seasonsToCheck.length === 0) {
			seasonsToCheck.push(1);
		}
	}

	const seasons: SeasonStatus[] = [];
	for (const seasonNum of seasonsToCheck) {
		const seasonDir = getSeasonDir(showPath, seasonNum);
		const arcExists = existsSync(join(seasonDir, "arc.md"));

		const episodes: EpisodeStatus[] = [];
		const episodesDir = join(seasonDir, "episodes");
		if (existsSync(episodesDir)) {
			const epDirs = readdirSync(episodesDir)
				.filter((d) => d.startsWith("ep-"))
				.sort();
			for (const epDir of epDirs) {
				const epNum = Number.parseInt(epDir.replace("ep-", ""), 10);
				if (Number.isNaN(epNum)) continue;
				const epPath = getEpisodeDir(showPath, seasonNum, epNum);
				episodes.push({
					episode: epNum,
					plot: existsSync(join(epPath, "plot.md")),
					script: existsSync(join(epPath, "script.md")),
					translated: existsSync(
						join(epPath, `script-${config.target_language}.md`),
					),
					audio: existsSync(join(epPath, "audio.mp3")),
				});
			}
		}

		// Include configured episode count for context
		// Show up to episodes_per_season if no episodes exist yet
		if (episodes.length === 0) {
			for (let i = 1; i <= config.episodes_per_season; i++) {
				const epPath = getEpisodeDir(showPath, seasonNum, i);
				episodes.push({
					episode: i,
					plot: existsSync(join(epPath, "plot.md")),
					script: existsSync(join(epPath, "script.md")),
					translated: existsSync(
						join(epPath, `script-${config.target_language}.md`),
					),
					audio: existsSync(join(epPath, "audio.mp3")),
				});
			}
		}

		seasons.push({
			season: seasonNum,
			arc: arcExists,
			episodes,
		});
	}

	return {
		name: config.name,
		showPath,
		characters,
		seasons,
	};
}

function stageIcon(done: boolean): string {
	return done ? "+" : "-";
}

export async function status(options: {
	show?: string;
	season?: number;
}): Promise<void> {
	const showStatus = getShowStatus(options);

	console.log(`Show: ${showStatus.name}`);
	console.log(`Path: ${showStatus.showPath}`);
	console.log("");

	// Characters
	if (showStatus.characters.length > 0) {
		console.log(
			`Characters: ${showStatus.characters.map((c) => c.replace(/-/g, " ")).join(", ")}`,
		);
	} else {
		console.log("Characters: (none generated yet — run develop-show)");
	}
	console.log("");

	// Seasons
	for (const season of showStatus.seasons) {
		console.log(`Season ${season.season}: arc ${season.arc ? "[+]" : "[-]"}`);
		console.log("");
		console.log("  Ep  | Plot  | Script | Translated | Audio");
		console.log("  ----|-------|--------|------------|------");

		for (const ep of season.episodes) {
			const epLabel = String(ep.episode).padStart(3, " ");
			const plot = `  [${stageIcon(ep.plot)}]  `;
			const script = `  [${stageIcon(ep.script)}]   `;
			const translated = `    [${stageIcon(ep.translated)}]     `;
			const audio = ` [${stageIcon(ep.audio)}]`;
			console.log(`  ${epLabel} |${plot}|${script}|${translated}|${audio}`);
		}

		// Summary
		const total = season.episodes.length;
		const plotsDone = season.episodes.filter((e) => e.plot).length;
		const scriptsDone = season.episodes.filter((e) => e.script).length;
		const translatedDone = season.episodes.filter((e) => e.translated).length;
		const audioDone = season.episodes.filter((e) => e.audio).length;
		console.log("");
		console.log(
			`  Summary: ${plotsDone}/${total} plots, ${scriptsDone}/${total} scripts, ${translatedDone}/${total} translated, ${audioDone}/${total} audio`,
		);

		// Next suggested action
		if (!season.arc) {
			console.log(
				`\n  Next: story-time develop-season --season=${season.season}`,
			);
		} else if (plotsDone < total) {
			const nextEp = season.episodes.find((e) => !e.plot);
			if (nextEp) {
				console.log(
					`\n  Next: story-time develop-episode ${nextEp.episode} --season=${season.season}`,
				);
			}
		} else if (scriptsDone < total) {
			const nextEp = season.episodes.find((e) => !e.script);
			if (nextEp) {
				console.log(
					`\n  Next: story-time write-script ${nextEp.episode} --season=${season.season}`,
				);
			}
		} else if (translatedDone < total) {
			const nextEp = season.episodes.find((e) => !e.translated);
			if (nextEp) {
				console.log(
					`\n  Next: story-time translate ${nextEp.episode} --season=${season.season}`,
				);
			}
		} else if (audioDone < total) {
			const nextEp = season.episodes.find((e) => !e.audio);
			if (nextEp) {
				console.log(
					`\n  Next: story-time synthesize ${nextEp.episode} --season=${season.season}`,
				);
			}
		} else {
			console.log(`\n  Next: story-time publish --season=${season.season}`);
		}
		console.log("");
	}
}
