import { describe, expect, test } from "bun:test";
import { getEpisodeDir, getSeasonDir } from "../src/lib/config.ts";

describe("path helpers", () => {
	test("getSeasonDir returns correct path", () => {
		const dir = getSeasonDir("/shows/test-show", 1);
		expect(dir).toBe("/shows/test-show/seasons/season-01");
	});

	test("getSeasonDir pads season number", () => {
		const dir = getSeasonDir("/shows/test-show", 3);
		expect(dir).toBe("/shows/test-show/seasons/season-03");
	});

	test("getEpisodeDir returns correct path", () => {
		const dir = getEpisodeDir("/shows/test-show", 1, 5);
		expect(dir).toBe("/shows/test-show/seasons/season-01/episodes/ep-05");
	});

	test("getEpisodeDir pads episode number", () => {
		const dir = getEpisodeDir("/shows/test-show", 2, 12);
		expect(dir).toBe("/shows/test-show/seasons/season-02/episodes/ep-12");
	});
});
