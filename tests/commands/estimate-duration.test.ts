import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { join } from "node:path";
import YAML from "yaml";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodeScript,
	writeTranslatedScript,
} from "../helpers/fixtures.ts";

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-estimate-duration",
);

const VALID_SCRIPT_YAML = YAML.stringify({
	title: "The Beginning",
	episode: 1,
	season: 1,
	scenes: [
		{
			location: "Ship deck at sunrise",
			beats: [
				{
					character: "Hero",
					dialogue: "Look at that mysterious island over there on the horizon",
					direction: "pointing toward the horizon",
				},
				{
					character: "Sidekick",
					action: "excited chittering",
				},
				{
					character: "Hero",
					dialogue: "We should sail there and investigate what we find",
				},
			],
		},
		{
			location: "Below deck",
			beats: [
				{
					character: "Sidekick",
					dialogue: "I found an old map in the chest",
				},
			],
		},
	],
});

describe("estimate-duration command", () => {
	let showPath: string;
	let consoleSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
		consoleSpy = spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
		consoleSpy.mockRestore();
	});

	test("estimates duration from source script", async () => {
		writeEpisodeScript(
			showPath,
			1,
			1,
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		await estimateDurationCommand("1", { show: showPath, season: 1 });

		const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("Estimating duration for Episode 1");
		expect(output).toContain("Estimated duration:");
		expect(output).toContain("words");
		expect(output).toContain("dialogue beats");
		expect(output).toContain("scenes");
		expect(output).toContain("words/min");
	});

	test("estimates duration from translated script with --translated", async () => {
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		await estimateDurationCommand("1", {
			show: showPath,
			season: 1,
			translated: true,
		});

		const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("Estimating duration for Episode 1");
		expect(output).toContain("Estimated duration:");
	});

	test("shows target comparison", async () => {
		writeEpisodeScript(
			showPath,
			1,
			1,
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		await estimateDurationCommand("1", { show: showPath, season: 1 });

		const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
		// The test show has episode_duration_minutes: 25, our short script will be under
		expect(output).toContain("target");
	});

	test("throws when script is missing", async () => {
		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		expect(
			estimateDurationCommand("1", { show: showPath, season: 1 }),
		).rejects.toThrow("No script found");
	});

	test("throws when translated script is missing with --translated", async () => {
		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		expect(
			estimateDurationCommand("1", {
				show: showPath,
				season: 1,
				translated: true,
			}),
		).rejects.toThrow("No script found");
	});

	test("throws for invalid episode number", async () => {
		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		expect(
			estimateDurationCommand("abc", { show: showPath, season: 1 }),
		).rejects.toThrow("Episode number must be a positive integer");
	});

	test("throws for invalid YAML in script", async () => {
		writeEpisodeScript(showPath, 1, 1, "not: valid: yaml: [[[");

		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		expect(
			estimateDurationCommand("1", { show: showPath, season: 1 }),
		).rejects.toThrow("Failed to parse script YAML");
	});

	test("throws when show path is invalid", async () => {
		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		expect(
			estimateDurationCommand("1", { show: "/nonexistent/path" }),
		).rejects.toThrow();
	});

	test("defaults to source script when translated is false", async () => {
		writeEpisodeScript(
			showPath,
			1,
			1,
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		const { estimateDurationCommand } = await import(
			"../../src/commands/estimate-duration.ts"
		);
		await estimateDurationCommand("1", {
			show: showPath,
			season: 1,
			translated: false,
		});

		const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("Estimated duration:");
	});
});
