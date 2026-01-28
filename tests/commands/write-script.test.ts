import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodePlot,
} from "../helpers/fixtures.ts";

// Mock the LLM module
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () =>
		'```yaml\ntitle: "The Beginning"\nepisode: 1\nseason: 1\n\nscenes:\n  - location: "Ship deck"\n    beats:\n      - character: "Hero"\n        dialogue: "Let\'s go!"\n```',
}));

const TEST_DIR = join(import.meta.dir, "..", "..", ".test-shows-write-script");

describe("write-script command", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("generates script from plot", async () => {
		writeEpisodePlot(
			showPath,
			1,
			1,
			"# Episode 1 Plot\n\nHero goes on adventure.",
		);

		const { writeScript } = await import("../../src/commands/write-script.ts");
		await writeScript("1", { show: showPath, season: 1 });

		const scriptPath = join(
			showPath,
			"seasons",
			"season-01",
			"episodes",
			"ep-01",
			"script.md",
		);
		expect(existsSync(scriptPath)).toBe(true);

		const content = readFileSync(scriptPath, "utf-8");
		expect(content).toContain("yaml");
	});

	test("throws when plot.md is missing", async () => {
		const { writeScript } = await import("../../src/commands/write-script.ts");
		expect(writeScript("1", { show: showPath, season: 1 })).rejects.toThrow(
			"No plot found for Episode 1",
		);
	});

	test("throws for invalid episode number", async () => {
		const { writeScript } = await import("../../src/commands/write-script.ts");
		expect(writeScript("abc", { show: showPath, season: 1 })).rejects.toThrow(
			"Episode number must be a positive integer",
		);
	});

	test("throws when show path is invalid", async () => {
		const { writeScript } = await import("../../src/commands/write-script.ts");
		expect(writeScript("1", { show: "/nonexistent/path" })).rejects.toThrow();
	});
});
