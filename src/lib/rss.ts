import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { getEpisodeDir, getSeasonDir, type ShowConfig } from "./config.ts";
import { readFileIfExists } from "./files.ts";
import { extractYaml } from "./scripts.ts";

export interface EpisodeMetadata {
	title: string;
	description: string;
	season: number;
	episode: number;
	/** ISO 8601 date string */
	pubDate: string;
	/** Duration in seconds */
	durationSeconds: number;
	/** Audio file size in bytes */
	audioSizeBytes: number;
	/** Relative path to audio file from show root */
	audioPath: string;
}

export interface FeedConfig {
	/** Base URL where audio files are hosted */
	baseUrl: string;
	/** Podcast language (e.g., "es") */
	language: string;
	/** Podcast author name */
	author: string;
	/** Podcast categories (e.g., ["Kids & Family", "Stories for Kids"]) */
	categories: string[];
	/** URL to podcast artwork image */
	imageUrl: string;
	/** Contact email */
	email: string;
	/** Whether the podcast contains explicit content */
	explicit: boolean;
}

const DEFAULT_FEED_CONFIG: FeedConfig = {
	baseUrl: "",
	language: "es",
	author: "",
	categories: ["Kids & Family"],
	imageUrl: "",
	email: "",
	explicit: false,
};

/**
 * Load feed configuration from feed.yaml in the show directory.
 * Returns defaults if the file doesn't exist.
 */
export function loadFeedConfig(showPath: string): FeedConfig {
	const feedConfigPath = join(showPath, "feed.yaml");
	const content = readFileIfExists(feedConfigPath);
	if (!content) {
		return { ...DEFAULT_FEED_CONFIG };
	}
	const parsed = YAML.parse(content) as Partial<FeedConfig>;
	return { ...DEFAULT_FEED_CONFIG, ...parsed };
}

/**
 * Collect metadata for all episodes in a season that have audio files.
 */
export function collectEpisodeMetadata(
	showPath: string,
	showConfig: ShowConfig,
	season: number,
): EpisodeMetadata[] {
	const seasonDir = getSeasonDir(showPath, season);
	const episodesDir = join(seasonDir, "episodes");

	if (!existsSync(episodesDir)) {
		return [];
	}

	const epDirs = readdirSync(episodesDir)
		.filter((d) => d.startsWith("ep-"))
		.sort();

	const episodes: EpisodeMetadata[] = [];

	for (const epDir of epDirs) {
		const epNum = Number.parseInt(epDir.replace("ep-", ""), 10);
		if (Number.isNaN(epNum)) continue;

		const epPath = getEpisodeDir(showPath, season, epNum);
		const audioPath = join(epPath, "audio.mp3");

		if (!existsSync(audioPath)) {
			continue;
		}

		const audioStats = statSync(audioPath);
		const audioSizeBytes = audioStats.size;

		// Try to get title and description from script
		const scriptPath = join(epPath, `script-${showConfig.target_language}.md`);
		const scriptContent = readFileIfExists(scriptPath);

		let title = `${showConfig.name} - Season ${season}, Episode ${epNum}`;
		let description = `Episode ${epNum} of ${showConfig.name}`;
		let durationSeconds = 0;

		if (scriptContent) {
			const yamlStr = extractYaml(scriptContent);
			try {
				const parsed = YAML.parse(yamlStr) as {
					title?: string;
					scenes?: Array<{
						beats?: Array<{ dialogue?: string }>;
					}>;
				};
				if (parsed?.title) {
					title = parsed.title;
				}
			} catch {
				// Ignore parse errors, use defaults
			}
		}

		// Try to get description from plot.md
		const plotContent = readFileIfExists(join(epPath, "plot.md"));
		if (plotContent) {
			// Use first paragraph of the plot as description
			const firstParagraph = plotContent
				.split("\n\n")
				.find((p) => p.trim() && !p.startsWith("#"));
			if (firstParagraph) {
				description = firstParagraph.trim().slice(0, 400);
			}
		}

		// Estimate duration from audio file size (128 kbps MP3 = ~16 KB/s)
		durationSeconds = Math.round(audioSizeBytes / 16000);

		// Try to get a more accurate pub date from file modification time
		const pubDate = audioStats.mtime.toISOString();

		const relAudioPath = `seasons/season-${String(season).padStart(2, "0")}/episodes/${epDir}/audio.mp3`;

		episodes.push({
			title,
			description,
			season,
			episode: epNum,
			pubDate,
			durationSeconds,
			audioSizeBytes,
			audioPath: relAudioPath,
		});
	}

	return episodes;
}

/**
 * Format a duration in seconds as HH:MM:SS.
 */
export function formatDurationHMS(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Escape special XML characters in a string.
 */
export function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Generate a podcast RSS XML feed string.
 */
export function generateRssFeed(
	showConfig: ShowConfig,
	feedConfig: FeedConfig,
	episodes: EpisodeMetadata[],
): string {
	const lines: string[] = [];

	lines.push('<?xml version="1.0" encoding="UTF-8"?>');
	lines.push(
		'<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">',
	);
	lines.push("  <channel>");

	// Channel metadata
	lines.push(`    <title>${escapeXml(showConfig.name)}</title>`);
	lines.push(
		`    <description>${escapeXml(showConfig.description)}</description>`,
	);
	lines.push(`    <language>${escapeXml(feedConfig.language)}</language>`);

	if (feedConfig.baseUrl) {
		lines.push(`    <link>${escapeXml(feedConfig.baseUrl)}</link>`);
	}

	if (feedConfig.author) {
		lines.push(
			`    <itunes:author>${escapeXml(feedConfig.author)}</itunes:author>`,
		);
	}

	if (feedConfig.email) {
		lines.push(
			`    <itunes:owner><itunes:email>${escapeXml(feedConfig.email)}</itunes:email></itunes:owner>`,
		);
	}

	lines.push(
		`    <itunes:explicit>${feedConfig.explicit ? "true" : "false"}</itunes:explicit>`,
	);

	for (const category of feedConfig.categories) {
		lines.push(`    <itunes:category text="${escapeXml(category)}" />`);
	}

	if (feedConfig.imageUrl) {
		lines.push(`    <itunes:image href="${escapeXml(feedConfig.imageUrl)}" />`);
	}

	// Sort episodes by season and episode number (newest first for podcast feeds)
	const sorted = [...episodes].sort((a, b) => {
		if (a.season !== b.season) return b.season - a.season;
		return b.episode - a.episode;
	});

	for (const ep of sorted) {
		const audioUrl = feedConfig.baseUrl
			? `${feedConfig.baseUrl.replace(/\/$/, "")}/${ep.audioPath}`
			: ep.audioPath;

		lines.push("    <item>");
		lines.push(`      <title>${escapeXml(ep.title)}</title>`);
		lines.push(`      <description>${escapeXml(ep.description)}</description>`);
		lines.push(
			`      <enclosure url="${escapeXml(audioUrl)}" length="${ep.audioSizeBytes}" type="audio/mpeg" />`,
		);
		lines.push(
			`      <guid isPermaLink="false">s${ep.season}e${ep.episode}</guid>`,
		);
		lines.push(
			`      <pubDate>${new Date(ep.pubDate).toUTCString()}</pubDate>`,
		);
		lines.push(
			`      <itunes:duration>${formatDurationHMS(ep.durationSeconds)}</itunes:duration>`,
		);
		lines.push(`      <itunes:episode>${ep.episode}</itunes:episode>`);
		lines.push(`      <itunes:season>${ep.season}</itunes:season>`);
		lines.push(
			`      <itunes:explicit>${feedConfig.explicit ? "true" : "false"}</itunes:explicit>`,
		);
		lines.push("    </item>");
	}

	lines.push("  </channel>");
	lines.push("</rss>");

	return lines.join("\n");
}
