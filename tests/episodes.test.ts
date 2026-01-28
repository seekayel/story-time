import { describe, expect, test } from "bun:test";
import { parseEpisodeRange, resolveEpisodes } from "../src/lib/episodes.ts";

describe("parseEpisodeRange", () => {
	test("parses single episode number", () => {
		expect(parseEpisodeRange("3")).toEqual([3]);
	});

	test("parses range", () => {
		expect(parseEpisodeRange("1-5")).toEqual([1, 2, 3, 4, 5]);
	});

	test("parses comma-separated list", () => {
		expect(parseEpisodeRange("1,3,5")).toEqual([1, 3, 5]);
	});

	test("parses mixed ranges and numbers", () => {
		expect(parseEpisodeRange("1-3,7,9-11")).toEqual([1, 2, 3, 7, 9, 10, 11]);
	});

	test("deduplicates overlapping ranges", () => {
		expect(parseEpisodeRange("1-3,2-4")).toEqual([1, 2, 3, 4]);
	});

	test("handles whitespace in input", () => {
		expect(parseEpisodeRange(" 1 , 3 , 5 ")).toEqual([1, 3, 5]);
	});

	test("returns sorted output", () => {
		expect(parseEpisodeRange("5,1,3")).toEqual([1, 3, 5]);
	});

	test("throws for non-numeric input", () => {
		expect(() => parseEpisodeRange("abc")).toThrow(
			'Invalid episode number: "abc"',
		);
	});

	test("throws for zero", () => {
		expect(() => parseEpisodeRange("0")).toThrow('Invalid episode number: "0"');
	});

	test("throws for negative number", () => {
		expect(() => parseEpisodeRange("-1")).toThrow("Invalid episode range");
	});

	test("throws for reversed range", () => {
		expect(() => parseEpisodeRange("5-1")).toThrow(
			"Start must not be greater than end",
		);
	});

	test("throws for empty string", () => {
		expect(() => parseEpisodeRange("")).toThrow("No episode numbers provided");
	});

	test("throws for invalid range format", () => {
		expect(() => parseEpisodeRange("a-b")).toThrow("Invalid episode range");
	});
});

describe("resolveEpisodes", () => {
	test("returns all episodes when --all is true", () => {
		const result = resolveEpisodes(undefined, true, 24);
		expect(result).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
	});

	test("returns all episodes with smaller season", () => {
		const result = resolveEpisodes(undefined, true, 6);
		expect(result).toEqual([1, 2, 3, 4, 5, 6]);
	});

	test("parses range when --all is false", () => {
		expect(resolveEpisodes("1-3", false, 24)).toEqual([1, 2, 3]);
	});

	test("parses single number when --all is false", () => {
		expect(resolveEpisodes("5", false, 24)).toEqual([5]);
	});

	test("throws when no argument and --all is false", () => {
		expect(() => resolveEpisodes(undefined, false, 24)).toThrow(
			"Episode number or range required",
		);
	});

	test("--all flag takes precedence over episode argument", () => {
		const result = resolveEpisodes("1-3", true, 6);
		expect(result).toEqual([1, 2, 3, 4, 5, 6]);
	});
});
