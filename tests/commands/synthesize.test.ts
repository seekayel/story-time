import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import {
	cleanupTestDir,
	createTestShow,
	writeTranslatedScript,
} from "../helpers/fixtures.ts";

const TEST_DIR = join(import.meta.dir, "..", "..", ".test-shows-synthesize");

const VALID_SCRIPT_YAML = YAML.stringify({
	title: "The Beginning",
	episode: 1,
	season: 1,
	scenes: [
		{
			location: "Ship deck",
			beats: [
				{
					character: "Hero",
					dialogue: "Let's go on an adventure!",
					direction: "excitedly",
				},
				{
					character: "Sidekick",
					dialogue: "Right behind you!",
				},
				{
					character: "Sidekick",
					action: "jumps excitedly",
				},
			],
		},
	],
});

describe("synthesize command", () => {
	let showPath: string;
	const originalEnv = { ...process.env };

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
		process.env.ELEVEN_LABS_API_KEY = "test-api-key";
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
		process.env = { ...originalEnv };
	});

	test("throws when translated script is missing", async () => {
		const { synthesize } = await import("../../src/commands/synthesize.ts");
		expect(synthesize("1", { show: showPath, season: 1 })).rejects.toThrow(
			"No translated script found for Episode 1",
		);
	});

	test("throws for invalid episode number", async () => {
		const { synthesize } = await import("../../src/commands/synthesize.ts");
		expect(synthesize("abc", { show: showPath, season: 1 })).rejects.toThrow(
			"Episode number must be a positive integer",
		);
	});

	test("throws when ELEVEN_LABS_API_KEY is missing", async () => {
		delete process.env.ELEVEN_LABS_API_KEY;
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		const { synthesize } = await import("../../src/commands/synthesize.ts");
		expect(synthesize("1", { show: showPath, season: 1 })).rejects.toThrow(
			"ELEVEN_LABS_API_KEY not set",
		);
	});

	test("throws when script YAML is invalid", async () => {
		writeTranslatedScript(showPath, 1, 1, "es", "not: valid: yaml: [[[");

		const { synthesize } = await import("../../src/commands/synthesize.ts");
		expect(synthesize("1", { show: showPath, season: 1 })).rejects.toThrow(
			"Failed to parse script YAML",
		);
	});

	test("synthesizes audio from valid script with mocked fetch", async () => {
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		// Mock global fetch to return fake audio data
		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () =>
				new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), {
					status: 200,
					headers: { "Content-Type": "audio/mpeg" },
				}),
		);

		try {
			const { synthesize } = await import("../../src/commands/synthesize.ts");
			await synthesize("1", { show: showPath, season: 1 });

			const audioPath = join(
				showPath,
				"seasons",
				"season-01",
				"episodes",
				"ep-01",
				"audio.mp3",
			);
			expect(existsSync(audioPath)).toBe(true);

			// Should have called fetch for each dialogue beat (2 dialogue beats, skips action)
			expect(mockFetch).toHaveBeenCalledTimes(2);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("handles ElevenLabs API error", async () => {
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () =>
				new Response("Unauthorized", {
					status: 401,
				}),
		);

		try {
			const { synthesize } = await import("../../src/commands/synthesize.ts");
			expect(synthesize("1", { show: showPath, season: 1 })).rejects.toThrow(
				"ElevenLabs API error (401)",
			);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("throws when show path is invalid", async () => {
		const { synthesize } = await import("../../src/commands/synthesize.ts");
		expect(synthesize("1", { show: "/nonexistent/path" })).rejects.toThrow();
	});
});
