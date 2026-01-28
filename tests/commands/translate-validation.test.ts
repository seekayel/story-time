import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodeScript,
} from "../helpers/fixtures.ts";

let callCount = 0;

// Mock LLM to return invalid YAML first, then valid YAML on retry
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () => {
		callCount++;
		if (callCount % 2 === 1) {
			// First attempt: invalid output
			return "Translation failed to produce proper YAML structure.";
		}
		// Second attempt: valid YAML
		return '```yaml\ntitle: "El Comienzo"\nepisode: 1\nseason: 1\n\nscenes:\n  - location: "Cubierta del barco"\n    beats:\n      - character: "Hero"\n        dialogue: "¡Vamos!"\n```';
	},
}));

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-translate-validation",
);

describe("translate validation and retry", () => {
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
		writeEpisodeScript(
			showPath,
			1,
			1,
			'```yaml\ntitle: "The Beginning"\nepisode: 1\nseason: 1\nscenes:\n  - location: "Ship deck"\n    beats:\n      - character: "Hero"\n        dialogue: "Let\'s go!"\n```',
		);

		const { translate } = await import("../../src/commands/translate.ts");
		await translate("1", { show: showPath, season: 1 });

		const translatedPath = join(
			showPath,
			"seasons",
			"season-01",
			"episodes",
			"ep-01",
			"script-es.md",
		);
		expect(existsSync(translatedPath)).toBe(true);

		const content = readFileSync(translatedPath, "utf-8");
		// Should contain valid YAML from the second attempt
		expect(content).toContain("El Comienzo");
		expect(content).toContain("scenes:");
		// LLM was called twice (first failed validation, second passed)
		expect(callCount).toBe(2);
	});
});
