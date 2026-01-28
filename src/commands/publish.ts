import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
	getSeasonDir,
	loadShowConfig,
	resolveShowPath,
} from "../lib/config.ts";
import { isRetryableStatusCode, withRetry } from "../lib/retry.ts";

export async function publish(options: {
	show?: string;
	season?: number;
	episode?: number;
}): Promise<void> {
	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);
	const season = options.season ?? 1;

	console.log(`Publishing: ${config.name} (Season ${season})`);

	const endpoint = process.env.PODCAST_RSS_ENDPOINT;
	const apiKey = process.env.PODCAST_API_KEY;

	if (!endpoint) {
		throw new Error("PODCAST_RSS_ENDPOINT not set. Add it to your .env file.");
	}
	if (!apiKey) {
		throw new Error("PODCAST_API_KEY not set. Add it to your .env file.");
	}

	const seasonDir = getSeasonDir(showPath, season);
	const episodesDir = join(seasonDir, "episodes");

	if (!existsSync(episodesDir)) {
		throw new Error(`No episodes directory found at ${episodesDir}`);
	}

	const episodeDirs = readdirSync(episodesDir)
		.filter((d) => d.startsWith("ep-"))
		.sort();

	const episodes = options.episode
		? [`ep-${String(options.episode).padStart(2, "0")}`]
		: episodeDirs;

	for (const epDir of episodes) {
		const audioPath = join(episodesDir, epDir, "audio.mp3");
		if (!existsSync(audioPath)) {
			console.log(`  Skipping ${epDir}: no audio.mp3 found`);
			continue;
		}

		console.log(`  Publishing ${epDir}...`);

		try {
			await withRetry(
				async () => {
					// Read audio file (re-read on each attempt for fresh FormData)
					const audioFile = Bun.file(audioPath);
					const formData = new FormData();
					formData.append("audio", audioFile);
					formData.append("show_name", config.name);
					formData.append("season", String(season));
					formData.append("episode", epDir.replace("ep-", ""));

					const response = await fetch(endpoint, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${apiKey}`,
						},
						body: formData,
					});

					if (!response.ok) {
						const errorText = await response.text();
						const err = new Error(
							`Failed to publish ${epDir}: ${response.status} ${errorText}`,
						);
						(err as Error & { statusCode: number }).statusCode =
							response.status;
						throw err;
					}

					console.log(`  Published ${epDir}`);
				},
				{
					maxRetries: 3,
					initialDelayMs: 1000,
					isRetryable: (error) => {
						if (
							error &&
							typeof error === "object" &&
							"statusCode" in error &&
							typeof (error as { statusCode: unknown }).statusCode === "number"
						) {
							return isRetryableStatusCode(
								(error as { statusCode: number }).statusCode,
							);
						}
						return true; // Retry network errors
					},
					onRetry: (attempt, delayMs) => {
						console.warn(
							`  Publish failed for ${epDir}, retrying (attempt ${attempt + 1}/4) after ${delayMs}ms...`,
						);
					},
				},
			);
		} catch (err) {
			console.error(`  ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	console.log("Publishing complete.");
}
