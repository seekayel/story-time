import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodeAudio,
} from "../helpers/fixtures.ts";

const TEST_DIR = join(import.meta.dir, "..", "..", ".test-shows-publish");

describe("publish command", () => {
	let showPath: string;
	const originalEnv = { ...process.env };

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
		process.env.PODCAST_RSS_ENDPOINT = "https://test-podcast.example.com/api";
		process.env.PODCAST_API_KEY = "test-podcast-key";
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
		process.env = { ...originalEnv };
	});

	test("throws when PODCAST_RSS_ENDPOINT is missing", async () => {
		delete process.env.PODCAST_RSS_ENDPOINT;

		const { publish } = await import("../../src/commands/publish.ts");
		expect(publish({ show: showPath, season: 1 })).rejects.toThrow(
			"PODCAST_RSS_ENDPOINT not set",
		);
	});

	test("throws when PODCAST_API_KEY is missing", async () => {
		delete process.env.PODCAST_API_KEY;

		const { publish } = await import("../../src/commands/publish.ts");
		expect(publish({ show: showPath, season: 1 })).rejects.toThrow(
			"PODCAST_API_KEY not set",
		);
	});

	test("throws when episodes directory does not exist", async () => {
		const { publish } = await import("../../src/commands/publish.ts");
		expect(publish({ show: showPath, season: 1 })).rejects.toThrow(
			"No episodes directory found",
		);
	});

	test("publishes episodes with audio files", async () => {
		writeEpisodeAudio(showPath, 1, 1);
		writeEpisodeAudio(showPath, 1, 2);

		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response("OK", { status: 200 }),
		);

		try {
			const { publish } = await import("../../src/commands/publish.ts");
			await publish({ show: showPath, season: 1 });

			// Should have called fetch for each episode with audio
			expect(mockFetch).toHaveBeenCalledTimes(2);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("publishes single episode when --episode is specified", async () => {
		writeEpisodeAudio(showPath, 1, 1);
		writeEpisodeAudio(showPath, 1, 2);

		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response("OK", { status: 200 }),
		);

		try {
			const { publish } = await import("../../src/commands/publish.ts");
			await publish({ show: showPath, season: 1, episode: 1 });

			// Should only publish the specified episode
			expect(mockFetch).toHaveBeenCalledTimes(1);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("handles API errors gracefully without throwing", async () => {
		writeEpisodeAudio(showPath, 1, 1);

		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response("Server Error", { status: 500 }),
		);

		try {
			const { publish } = await import("../../src/commands/publish.ts");
			// Publish logs errors but does not throw for API failures
			await publish({ show: showPath, season: 1 });
			expect(mockFetch).toHaveBeenCalledTimes(1);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("throws when show path is invalid", async () => {
		const { publish } = await import("../../src/commands/publish.ts");
		expect(publish({ show: "/nonexistent/path" })).rejects.toThrow();
	});
});
