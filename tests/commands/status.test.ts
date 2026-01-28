import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { getShowStatus } from "../../src/commands/status.ts";
import {
	cleanupTestDir,
	createTestShow,
	writeCharacterBrief,
	writeEpisodeAudio,
	writeEpisodePlot,
	writeEpisodeScript,
	writeSeasonArc,
	writeTranslatedScript,
} from "../helpers/fixtures.ts";

const TEST_DIR = ".test-status";

describe("status command", () => {
	let showPath: string;

	beforeAll(() => {
		showPath = createTestShow(TEST_DIR, "status-test-show");
	});

	afterAll(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("returns show name and path", () => {
		const result = getShowStatus({ show: showPath });
		expect(result.name).toBe("status-test-show");
		expect(result.showPath).toBe(resolve(showPath));
	});

	test("returns empty characters when none generated", () => {
		const freshPath = createTestShow(TEST_DIR, "status-fresh-show");
		const result = getShowStatus({ show: freshPath });
		expect(result.characters).toEqual([]);
	});

	test("returns character names when generated", () => {
		writeCharacterBrief(showPath, "Hero", "# Hero\nA brave hero.");
		writeCharacterBrief(showPath, "Sidekick", "# Sidekick\nA loyal friend.");
		const result = getShowStatus({ show: showPath });
		expect(result.characters).toContain("hero");
		expect(result.characters).toContain("sidekick");
		expect(result.characters.length).toBe(2);
	});

	test("shows season arc status as false when not generated", () => {
		const result = getShowStatus({ show: showPath, season: 1 });
		expect(result.seasons.length).toBe(1);
		expect(result.seasons[0]?.arc).toBe(false);
	});

	test("shows season arc status as true when generated", () => {
		writeSeasonArc(showPath, 1, "# Season 1 Arc\nAn adventure begins.");
		const result = getShowStatus({ show: showPath, season: 1 });
		expect(result.seasons[0]?.arc).toBe(true);
	});

	test("tracks episode pipeline stages", () => {
		// Create episode 1 with plot only
		writeEpisodePlot(showPath, 1, 1, "# Episode 1 Plot");

		// Create episode 2 with plot + script
		writeEpisodePlot(showPath, 1, 2, "# Episode 2 Plot");
		writeEpisodeScript(showPath, 1, 2, "# Episode 2 Script\n```yaml\n```");

		// Create episode 3 fully complete
		writeEpisodePlot(showPath, 1, 3, "# Episode 3 Plot");
		writeEpisodeScript(showPath, 1, 3, "# Episode 3 Script\n```yaml\n```");
		writeTranslatedScript(
			showPath,
			1,
			3,
			"es",
			"# Episode 3 Script (es)\n```yaml\n```",
		);
		writeEpisodeAudio(showPath, 1, 3);

		const result = getShowStatus({ show: showPath, season: 1 });
		const episodes = result.seasons[0]?.episodes ?? [];

		// Find episodes by number
		const ep1 = episodes.find((e) => e.episode === 1);
		const ep2 = episodes.find((e) => e.episode === 2);
		const ep3 = episodes.find((e) => e.episode === 3);

		expect(ep1).toBeDefined();
		expect(ep1?.plot).toBe(true);
		expect(ep1?.script).toBe(false);
		expect(ep1?.translated).toBe(false);
		expect(ep1?.audio).toBe(false);

		expect(ep2).toBeDefined();
		expect(ep2?.plot).toBe(true);
		expect(ep2?.script).toBe(true);
		expect(ep2?.translated).toBe(false);
		expect(ep2?.audio).toBe(false);

		expect(ep3).toBeDefined();
		expect(ep3?.plot).toBe(true);
		expect(ep3?.script).toBe(true);
		expect(ep3?.translated).toBe(true);
		expect(ep3?.audio).toBe(true);
	});

	test("defaults to season 1 when no seasons exist", () => {
		const freshPath = createTestShow(TEST_DIR, "status-no-seasons");
		const result = getShowStatus({ show: freshPath });
		expect(result.seasons.length).toBe(1);
		expect(result.seasons[0]?.season).toBe(1);
	});

	test("scans all seasons when no season specified", () => {
		const multiPath = createTestShow(TEST_DIR, "status-multi-season");
		writeSeasonArc(multiPath, 1, "# Season 1");
		writeSeasonArc(multiPath, 2, "# Season 2");
		writeEpisodePlot(multiPath, 2, 1, "# S2E1 Plot");

		const result = getShowStatus({ show: multiPath });
		expect(result.seasons.length).toBe(2);
		expect(result.seasons[0]?.season).toBe(1);
		expect(result.seasons[1]?.season).toBe(2);
		expect(result.seasons[1]?.arc).toBe(true);
	});

	test("filters to specific season when season option provided", () => {
		const multiPath = createTestShow(TEST_DIR, "status-filter-season");
		writeSeasonArc(multiPath, 1, "# Season 1");
		writeSeasonArc(multiPath, 2, "# Season 2");

		const result = getShowStatus({ show: multiPath, season: 2 });
		expect(result.seasons.length).toBe(1);
		expect(result.seasons[0]?.season).toBe(2);
		expect(result.seasons[0]?.arc).toBe(true);
	});

	test("throws when show path is not provided and not configured", () => {
		expect(() => getShowStatus({})).toThrow();
	});
});
