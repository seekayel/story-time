import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestDir, createTestShow } from "../helpers/fixtures.ts";

// Mock the LLM module
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () =>
		"# Episode Plot\n\n## Act 1\nHero discovers a map.\n\n## Act 2\nAdventure ensues.\n\n## Act 3\nResolution.",
	VALID_MODELS: ["gemini", "claude"],
	validateModelProvider: (v: string) => v,
}));

const TEST_DIR = join(import.meta.dir, "..", "..", ".test-shows-batch-ep");

describe("batch develop-episode", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("processes a range of episodes", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		const { runBatch } = await import("../../src/lib/batch.ts");
		const { parseEpisodeRange } = await import("../../src/lib/episodes.ts");

		const episodes = parseEpisodeRange("1-3");
		await runBatch(episodes, "develop-episode", (ep) =>
			developEpisode(ep, { show: showPath, season: 1 }),
		);

		for (const epNum of [1, 2, 3]) {
			const padded = String(epNum).padStart(2, "0");
			const plotPath = join(
				showPath,
				"seasons",
				"season-01",
				"episodes",
				`ep-${padded}`,
				"plot.md",
			);
			expect(existsSync(plotPath)).toBe(true);
		}
	});

	test("processes comma-separated episode list", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		const { runBatch } = await import("../../src/lib/batch.ts");
		const { parseEpisodeRange } = await import("../../src/lib/episodes.ts");

		const episodes = parseEpisodeRange("1,3,5");
		await runBatch(episodes, "develop-episode", (ep) =>
			developEpisode(ep, { show: showPath, season: 1 }),
		);

		for (const epNum of [1, 3, 5]) {
			const padded = String(epNum).padStart(2, "0");
			const plotPath = join(
				showPath,
				"seasons",
				"season-01",
				"episodes",
				`ep-${padded}`,
				"plot.md",
			);
			expect(existsSync(plotPath)).toBe(true);
		}

		// Episode 2 should NOT exist
		expect(
			existsSync(
				join(showPath, "seasons", "season-01", "episodes", "ep-02", "plot.md"),
			),
		).toBe(false);
	});

	test("--all resolves to all episodes in season", async () => {
		const { resolveEpisodes } = await import("../../src/lib/episodes.ts");

		const episodes = resolveEpisodes(undefined, true, 24);
		expect(episodes.length).toBe(24);
		expect(episodes[0]).toBe(1);
		expect(episodes[23]).toBe(24);
	});

	test("continues after individual episode errors", async () => {
		const { runBatch } = await import("../../src/lib/batch.ts");

		let callCount = 0;
		await runBatch([1, 2, 3], "develop-episode", async (ep) => {
			callCount++;
			if (ep === "2") {
				throw new Error("Simulated failure for episode 2");
			}
		});

		// All 3 episodes should be attempted even though episode 2 failed
		expect(callCount).toBe(3);
	});
});
