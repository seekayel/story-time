import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodePlot,
	writeEpisodeScript,
} from "../helpers/fixtures.ts";

// Track what prompts are passed to generate
let capturedPrompts: string[] = [];

mock.module("../../src/lib/llm.ts", () => ({
	generate: async (opts: { prompt: string }) => {
		capturedPrompts.push(opts.prompt);
		return '```yaml\ntitle: "Test Episode"\nepisode: 1\nseason: 1\n\nscenes:\n  - location: "Test"\n    beats:\n      - character: "Hero"\n        dialogue: "Hello"\n```';
	},
}));

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-previous-context",
);

describe("develop-episode with previous context", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
		capturedPrompts = [];
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("episode 1 does not include previous context", async () => {
		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("1", { show: showPath, season: 1 });

		expect(capturedPrompts).toHaveLength(1);
		expect(capturedPrompts[0]).not.toContain("Previous Episodes");
	});

	test("episode 2 includes previous episode 1 plot", async () => {
		writeEpisodePlot(
			showPath,
			1,
			1,
			"# Episode 1: The Beginning\n\nHero discovers a treasure map.",
		);

		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("2", { show: showPath, season: 1 });

		expect(capturedPrompts).toHaveLength(1);
		expect(capturedPrompts[0]).toContain("Previous Episodes");
		expect(capturedPrompts[0]).toContain("Episode 1: The Beginning");
		expect(capturedPrompts[0]).toContain("treasure map");
		expect(capturedPrompts[0]).toContain("narrative continuity");
	});

	test("episode 3 includes episodes 1 and 2 context", async () => {
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot");
		writeEpisodePlot(showPath, 1, 2, "# Episode 2 Plot");

		const { developEpisode } = await import(
			"../../src/commands/develop-episode.ts"
		);
		await developEpisode("3", { show: showPath, season: 1 });

		expect(capturedPrompts).toHaveLength(1);
		expect(capturedPrompts[0]).toContain("Episode 1 Plot");
		expect(capturedPrompts[0]).toContain("Episode 2 Plot");
	});
});

describe("write-script with previous context", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
		capturedPrompts = [];
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("episode 1 does not include previous context", async () => {
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot");

		const { writeScript } = await import("../../src/commands/write-script.ts");
		await writeScript("1", { show: showPath, season: 1 });

		expect(capturedPrompts).toHaveLength(1);
		expect(capturedPrompts[0]).not.toContain("Previous Episodes");
	});

	test("episode 2 includes previous episode 1 plot and script", async () => {
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot\n\nHero finds map.");
		writeEpisodeScript(
			showPath,
			1,
			1,
			'```yaml\ntitle: "The Map"\nepisode: 1\nseason: 1\n```',
		);
		writeEpisodePlot(showPath, 1, 2, "# Episode 2 Plot\n\nHero follows map.");

		const { writeScript } = await import("../../src/commands/write-script.ts");
		await writeScript("2", { show: showPath, season: 1 });

		expect(capturedPrompts).toHaveLength(1);
		expect(capturedPrompts[0]).toContain("Previous Episodes");
		expect(capturedPrompts[0]).toContain("Episode 1 Plot");
		expect(capturedPrompts[0]).toContain("The Map");
		expect(capturedPrompts[0]).toContain("Script:");
		expect(capturedPrompts[0]).toContain("narrative continuity");
	});

	test("write-script includes scripts in context (not just plots)", async () => {
		writeEpisodePlot(showPath, 1, 1, "# Ep 1 Plot");
		writeEpisodeScript(showPath, 1, 1, "Script content for episode 1");
		writeEpisodePlot(showPath, 1, 2, "# Ep 2 Plot");

		const { writeScript } = await import("../../src/commands/write-script.ts");
		await writeScript("2", { show: showPath, season: 1 });

		expect(capturedPrompts).toHaveLength(1);
		expect(capturedPrompts[0]).toContain("Script content for episode 1");
	});
});
