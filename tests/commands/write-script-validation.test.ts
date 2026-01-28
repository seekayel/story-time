import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodePlot,
} from "../helpers/fixtures.ts";

let callCount = 0;

// Mock LLM to return invalid YAML first, then valid YAML on retry
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () => {
		callCount++;
		if (callCount % 2 === 1) {
			// First attempt: invalid output (no scenes)
			return "Here is your script:\n\nSome plain text, not valid YAML.";
		}
		// Second attempt: valid YAML
		return '```yaml\ntitle: "The Beginning"\nepisode: 1\nseason: 1\n\nscenes:\n  - location: "Ship deck"\n    beats:\n      - character: "Hero"\n        dialogue: "Let\'s go!"\n```';
	},
}));

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-write-script-validation",
);

describe("write-script validation and retry", () => {
	let showPath: string;

	beforeEach(() => {
		callCount = 0;
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("retries when first LLM output fails validation", async () => {
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
		// Should contain valid YAML from the second attempt
		expect(content).toContain("The Beginning");
		expect(content).toContain("scenes:");
		// LLM was called twice (first failed validation, second passed)
		expect(callCount).toBe(2);
	});
});
