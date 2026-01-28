import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadShowConfig, resolveShowPath } from "../lib/config.ts";
import { writeFileEnsureDir } from "../lib/files.ts";
import {
	collectEpisodeMetadata,
	type EpisodeMetadata,
	generateRssFeed,
	loadFeedConfig,
} from "../lib/rss.ts";

export async function generateFeed(options: {
	show?: string;
	season?: number;
	output?: string;
}): Promise<void> {
	const showPath = resolveShowPath(options.show);
	const showConfig = loadShowConfig(showPath);
	const feedConfig = loadFeedConfig(showPath);

	console.log(`Generating RSS feed: ${showConfig.name}`);

	if (!feedConfig.baseUrl) {
		console.warn(
			"  Warning: No baseUrl in feed.yaml. Audio URLs will be relative paths.",
		);
		console.warn(
			"  Create feed.yaml in your show directory to configure the feed.",
		);
	}

	// Collect episodes across seasons
	const allEpisodes: EpisodeMetadata[] = [];

	if (options.season !== undefined) {
		const episodes = collectEpisodeMetadata(
			showPath,
			showConfig,
			options.season,
		);
		allEpisodes.push(...episodes);
	} else {
		// Scan all seasons
		const seasonsBase = join(showPath, "seasons");
		if (existsSync(seasonsBase)) {
			const seasonDirs = readdirSync(seasonsBase)
				.filter((d) => d.startsWith("season-"))
				.sort();
			for (const dir of seasonDirs) {
				const seasonNum = Number.parseInt(dir.replace("season-", ""), 10);
				if (Number.isNaN(seasonNum)) continue;
				const episodes = collectEpisodeMetadata(
					showPath,
					showConfig,
					seasonNum,
				);
				allEpisodes.push(...episodes);
			}
		}
	}

	if (allEpisodes.length === 0) {
		console.log("  No episodes with audio found. Synthesize episodes first.");
		return;
	}

	const rssXml = generateRssFeed(showConfig, feedConfig, allEpisodes);
	const outputPath = options.output ?? join(showPath, "feed.xml");
	writeFileEnsureDir(outputPath, rssXml);

	console.log(`  Found ${allEpisodes.length} episodes with audio.`);
	console.log(`  Wrote ${outputPath}`);
	console.log("Feed generation complete.");
}
