import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodeScript,
} from "../helpers/fixtures.ts";

// Mock the LLM module
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () =>
		'```yaml\ntitle: "El Comienzo"\nepisode: 1\nseason: 1\n\nscenes:\n  - location: "Cubierta del barco"\n    beats:\n      - character: "Hero"\n        dialogue: "¡Vamos!"\n```',
}));

const TEST_DIR = join(import.meta.dir, "..", "..", ".test-shows-translate");

describe("translate command", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("translates script to target language", async () => {
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
		expect(content).toContain("El Comienzo");
	});

	test("throws when script.md is missing", async () => {
		const { translate } = await import("../../src/commands/translate.ts");
		expect(translate("1", { show: showPath, season: 1 })).rejects.toThrow(
			"No script found for Episode 1",
		);
	});

	test("throws for invalid episode number", async () => {
		const { translate } = await import("../../src/commands/translate.ts");
		expect(translate("abc", { show: showPath, season: 1 })).rejects.toThrow(
			"Episode number must be a positive integer",
		);
	});

	test("throws when show path is invalid", async () => {
		const { translate } = await import("../../src/commands/translate.ts");
		expect(translate("1", { show: "/nonexistent/path" })).rejects.toThrow();
	});
});
