import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodePlot,
	writeEpisodeScript,
} from "../helpers/fixtures.ts";

// Track generate calls to verify provider parameter
const generateCalls: Array<{
	prompt: string;
	system?: string;
	provider?: string;
}> = [];

const validScriptYaml = `\`\`\`yaml
title: "Test Episode"
episode: 1
season: 1

scenes:
  - location: "Test location"
    beats:
      - character: "Hero"
        dialogue: "Hello world"
        direction: "cheerfully"
\`\`\``;

mock.module("../../src/lib/llm.ts", () => ({
	generate: async (options: {
		prompt: string;
		system?: string;
		provider?: string;
	}) => {
		generateCalls.push(options);
		return "# Generated Content\n\nTest content.";
	},
}));

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-model-override",
);

describe("per-command --model flag override", () => {
	let showPath: string;

	beforeEach(() => {
		generateCalls.length = 0;
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("develop-show passes model provider when specified", async () => {
		const { developShow } = await import("../../src/commands/develop-show.ts");
		await developShow({ show: showPath, model: "claude" });

		expect(generateCalls.length).toBeGreaterThan(0);
		for (const call of generateCalls) {
			expect(call.provider).toBe("claude");
		}
	});

	test("develop-show omits provider when model not specified", async () => {
		const { developShow } = await import("../../src/commands/develop-show.ts");
		await developShow({ show: showPath });

		expect(generateCalls.length).toBeGreaterThan(0);
		for (const call of generateCalls) {
			expect(call.provider).toBeUndefined();
		}
	});

	test("develop-season passes model provider when specified", async () => {
		const { developSeason } = await import(
			"../../src/commands/develop-season.ts"
		);
		await developSeason({ show: showPath, season: 1, model: "claude" });

		expect(generateCalls.length).toBe(1);
		expect(generateCalls[0].provider).toBe("claude");
	});

	test("develop-season omits provider when model not specified", async () => {
		const { developSeason } = await import(
			"../../src/commands/develop-season.ts"
		);
		await developSeason({ show: showPath, season: 1 });

		expect(generateCalls.length).toBe(1);
		expect(generateCalls[0].provider).toBeUndefined();
	});

	test("develop-episode passes model provider when specified", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("1", {
			show: showPath,
			season: 1,
			model: "gemini",
		});

		expect(generateCalls.length).toBe(1);
		expect(generateCalls[0].provider).toBe("gemini");
	});

	test("develop-episode omits provider when model not specified", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("1", { show: showPath, season: 1 });

		expect(generateCalls.length).toBe(1);
		expect(generateCalls[0].provider).toBeUndefined();
	});

	test("write-script passes model provider when specified", async () => {
		writeEpisodePlot(showPath, 1, 1, "# Plot\n\nHero goes on an adventure.");

		// Re-mock to return valid YAML script
		mock.module("../../src/lib/llm.ts", () => ({
			generate: async (options: {
				prompt: string;
				system?: string;
				provider?: string;
			}) => {
				generateCalls.push(options);
				return validScriptYaml;
			},
		}));

		const { writeScript } = await import("../../src/commands/write-script.ts");
		await writeScript("1", { show: showPath, season: 1, model: "claude" });

		const scriptCalls = generateCalls.filter((c) => c.provider === "claude");
		expect(scriptCalls.length).toBeGreaterThan(0);
	});

	test("translate passes model provider when specified", async () => {
		writeEpisodeScript(showPath, 1, 1, validScriptYaml);

		mock.module("../../src/lib/llm.ts", () => ({
			generate: async (options: {
				prompt: string;
				system?: string;
				provider?: string;
			}) => {
				generateCalls.push(options);
				return validScriptYaml;
			},
		}));

		const { translate } = await import("../../src/commands/translate.ts");
		await translate("1", { show: showPath, season: 1, model: "gemini" });

		const translateCalls = generateCalls.filter((c) => c.provider === "gemini");
		expect(translateCalls.length).toBeGreaterThan(0);
	});
});
