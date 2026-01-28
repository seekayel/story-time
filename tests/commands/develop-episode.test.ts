import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeCharacterBrief,
	writeSeasonArc,
} from "../helpers/fixtures.ts";

// Mock the LLM module
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () =>
		"# Episode 1: The Beginning\n\n## Act 1\nHero discovers a map.\n\n## Act 2\nAdventure ensues.\n\n## Act 3\nResolution.",
}));

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-develop-episode",
);

describe("develop-episode command", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("generates episode plot", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("1", { show: showPath, season: 1 });

		const plotPath = join(
			showPath,
			"seasons",
			"season-01",
			"episodes",
			"ep-01",
			"plot.md",
		);
		expect(existsSync(plotPath)).toBe(true);

		const content = readFileSync(plotPath, "utf-8");
		expect(content).toContain("Episode 1");
	});

	test("generates plot for higher episode number", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("12", { show: showPath, season: 1 });

		const plotPath = join(
			showPath,
			"seasons",
			"season-01",
			"episodes",
			"ep-12",
			"plot.md",
		);
		expect(existsSync(plotPath)).toBe(true);
	});

	test("uses season arc and character briefs when available", async () => {
		writeSeasonArc(showPath, 1, "# Season Arc\n\nAn epic journey.");
		writeCharacterBrief(showPath, "Hero", "# Hero\n\nBrave and kind.");

		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("1", { show: showPath, season: 1 });

		const plotPath = join(
			showPath,
			"seasons",
			"season-01",
			"episodes",
			"ep-01",
			"plot.md",
		);
		expect(existsSync(plotPath)).toBe(true);
	});

	test("throws for invalid episode number", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		expect(
			developEpisode("abc", { show: showPath, season: 1 }),
		).rejects.toThrow("Episode number must be a positive integer");
	});

	test("throws for zero episode number", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		expect(developEpisode("0", { show: showPath, season: 1 })).rejects.toThrow(
			"Episode number must be a positive integer",
		);
	});

	test("throws for negative episode number", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		expect(developEpisode("-1", { show: showPath, season: 1 })).rejects.toThrow(
			"Episode number must be a positive integer",
		);
	});

	test("throws when show path is invalid", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		expect(
			developEpisode("1", { show: "/nonexistent/path" }),
		).rejects.toThrow();
	});
});
