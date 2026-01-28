import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeCharacterBrief,
} from "../helpers/fixtures.ts";

// Mock the LLM module
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () =>
		"# Season 1 Arc\n\nA 24-episode arc about adventure and friendship.",
}));

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-develop-season",
);

describe("develop-season command", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("generates season arc file", async () => {
		const { developSeason } = await import(
			"../../src/commands/develop-season.ts"
		);
		await developSeason({ show: showPath, season: 1 });

		const arcPath = join(showPath, "seasons", "season-01", "arc.md");
		expect(existsSync(arcPath)).toBe(true);

		const content = readFileSync(arcPath, "utf-8");
		expect(content).toContain("Season 1 Arc");
	});

	test("defaults to season 1", async () => {
		const { developSeason } = await import(
			"../../src/commands/develop-season.ts"
		);
		await developSeason({ show: showPath });

		const arcPath = join(showPath, "seasons", "season-01", "arc.md");
		expect(existsSync(arcPath)).toBe(true);
	});

	test("generates arc for season 2", async () => {
		const { developSeason } = await import(
			"../../src/commands/develop-season.ts"
		);
		await developSeason({ show: showPath, season: 2 });

		const arcPath = join(showPath, "seasons", "season-02", "arc.md");
		expect(existsSync(arcPath)).toBe(true);
	});

	test("incorporates character briefs when available", async () => {
		writeCharacterBrief(showPath, "Hero", "# Hero\n\nBrave and kind.");

		const { developSeason } = await import(
			"../../src/commands/develop-season.ts"
		);
		await developSeason({ show: showPath, season: 1 });

		const arcPath = join(showPath, "seasons", "season-01", "arc.md");
		expect(existsSync(arcPath)).toBe(true);
	});

	test("throws when show path is invalid", async () => {
		const { developSeason } = await import(
			"../../src/commands/develop-season.ts"
		);
		expect(developSeason({ show: "/nonexistent/path" })).rejects.toThrow();
	});
});
