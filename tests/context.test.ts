import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	formatPreviousContext,
	getPreviousEpisodeContext,
} from "../src/lib/context.ts";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodePlot,
	writeEpisodeScript,
} from "./helpers/fixtures.ts";

const TEST_DIR = join(import.meta.dir, "..", ".test-shows-context");

describe("getPreviousEpisodeContext", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("returns empty array for episode 1", () => {
		const result = getPreviousEpisodeContext(showPath, 1, 1);
		expect(result).toEqual([]);
	});

	test("returns empty array when no previous episodes exist", () => {
		const result = getPreviousEpisodeContext(showPath, 1, 3);
		expect(result).toEqual([]);
	});

	test("returns plot from previous episode", () => {
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot\n\nHero starts.");

		const result = getPreviousEpisodeContext(showPath, 1, 2);
		expect(result).toHaveLength(1);
		expect(result[0].episode).toBe(1);
		expect(result[0].plot).toContain("Episode 1 Plot");
		expect(result[0].script).toBeNull();
	});

	test("returns plot and script from previous episode", () => {
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot");
		writeEpisodeScript(showPath, 1, 1, "```yaml\ntitle: Episode 1\n```");

		const result = getPreviousEpisodeContext(showPath, 1, 2);
		expect(result).toHaveLength(1);
		expect(result[0].plot).toContain("Episode 1 Plot");
		expect(result[0].script).toContain("Episode 1");
	});

	test("returns multiple previous episodes in order", () => {
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot");
		writeEpisodePlot(showPath, 1, 2, "# Episode 2 Plot");
		writeEpisodePlot(showPath, 1, 3, "# Episode 3 Plot");

		const result = getPreviousEpisodeContext(showPath, 1, 4);
		expect(result).toHaveLength(3);
		expect(result[0].episode).toBe(1);
		expect(result[1].episode).toBe(2);
		expect(result[2].episode).toBe(3);
	});

	test("skips episodes with no files", () => {
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot");
		// Episode 2 has no files
		writeEpisodePlot(showPath, 1, 3, "# Episode 3 Plot");

		const result = getPreviousEpisodeContext(showPath, 1, 4);
		expect(result).toHaveLength(2);
		expect(result[0].episode).toBe(1);
		expect(result[1].episode).toBe(3);
	});

	test("uses correct season", () => {
		writeEpisodePlot(showPath, 2, 1, "# Season 2 Episode 1");

		const resultSeason1 = getPreviousEpisodeContext(showPath, 1, 2);
		expect(resultSeason1).toHaveLength(0);

		const resultSeason2 = getPreviousEpisodeContext(showPath, 2, 2);
		expect(resultSeason2).toHaveLength(1);
		expect(resultSeason2[0].plot).toContain("Season 2");
	});
});

describe("formatPreviousContext", () => {
	test("returns empty string for no summaries", () => {
		const result = formatPreviousContext([], false);
		expect(result).toBe("");
	});

	test("formats plot-only context", () => {
		const summaries = [
			{ episode: 1, plot: "# Episode 1\n\nHero starts.", script: null },
		];
		const result = formatPreviousContext(summaries, false);
		expect(result).toContain("## Previous Episodes");
		expect(result).toContain("### Episode 1");
		expect(result).toContain("Hero starts.");
		expect(result).not.toContain("**Script:**");
	});

	test("formats context with scripts when includeScripts is true", () => {
		const summaries = [
			{
				episode: 1,
				plot: "# Episode 1 Plot",
				script: "```yaml\ntitle: Ep1\n```",
			},
		];
		const result = formatPreviousContext(summaries, true);
		expect(result).toContain("## Previous Episodes");
		expect(result).toContain("### Episode 1");
		expect(result).toContain("Episode 1 Plot");
		expect(result).toContain("**Script:**");
		expect(result).toContain("title: Ep1");
	});

	test("excludes scripts when includeScripts is false even if present", () => {
		const summaries = [
			{
				episode: 1,
				plot: "# Plot",
				script: "```yaml\ntitle: Ep1\n```",
			},
		];
		const result = formatPreviousContext(summaries, false);
		expect(result).not.toContain("**Script:**");
		expect(result).not.toContain("title: Ep1");
	});

	test("formats multiple episodes with separators", () => {
		const summaries = [
			{ episode: 1, plot: "Plot 1", script: null },
			{ episode: 2, plot: "Plot 2", script: null },
		];
		const result = formatPreviousContext(summaries, false);
		expect(result).toContain("### Episode 1");
		expect(result).toContain("### Episode 2");
		expect(result).toContain("---");
	});

	test("handles summary with only script (no plot)", () => {
		const summaries = [
			{ episode: 1, plot: null, script: "```yaml\ntitle: Ep1\n```" },
		];
		const result = formatPreviousContext(summaries, true);
		expect(result).toContain("### Episode 1");
		expect(result).toContain("**Script:**");
	});
});
