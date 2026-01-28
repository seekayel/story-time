import { describe, expect, test } from "bun:test";
import {
	countWords,
	estimateDuration,
	formatDurationEstimate,
} from "../src/lib/duration.ts";
import type { Script } from "../src/lib/schemas.ts";

describe("countWords", () => {
	test("counts words in a simple sentence", () => {
		expect(countWords("Hello world")).toBe(2);
	});

	test("handles multiple spaces", () => {
		expect(countWords("Hello   world   foo")).toBe(3);
	});

	test("returns 0 for empty string", () => {
		expect(countWords("")).toBe(0);
	});

	test("returns 0 for whitespace-only string", () => {
		expect(countWords("   \t\n  ")).toBe(0);
	});

	test("handles single word", () => {
		expect(countWords("Hello")).toBe(1);
	});

	test("trims leading and trailing whitespace", () => {
		expect(countWords("  Hello world  ")).toBe(2);
	});
});

describe("estimateDuration", () => {
	const makeScript = (scenes: Script["scenes"]): Script => ({
		title: "Test Episode",
		episode: 1,
		season: 1,
		scenes,
	});

	test("returns zero duration for empty scenes", () => {
		const script = makeScript([]);
		const est = estimateDuration(script);
		expect(est.totalSeconds).toBe(0);
		expect(est.totalMinutes).toBe(0);
		expect(est.dialogueWordCount).toBe(0);
		expect(est.dialogueBeatCount).toBe(0);
		expect(est.actionBeatCount).toBe(0);
		expect(est.sceneCount).toBe(0);
	});

	test("estimates duration for dialogue beats", () => {
		const script = makeScript([
			{
				location: "Ship deck",
				beats: [
					{ character: "Hero", dialogue: "Hello there friend how are you" },
				],
			},
		]);
		const est = estimateDuration(script, "en");
		// 6 words / 130 wpm * 60 = ~2.77s speech + 1.5s beat pause + 0s scene pause
		expect(est.dialogueWordCount).toBe(6);
		expect(est.dialogueBeatCount).toBe(1);
		expect(est.actionBeatCount).toBe(0);
		expect(est.sceneCount).toBe(1);
		expect(est.totalSeconds).toBeGreaterThan(0);
		expect(est.wpm).toBe(130);
	});

	test("counts action-only beats", () => {
		const script = makeScript([
			{
				location: "Ship deck",
				beats: [
					{ character: "Hero", action: "waves hand" },
					{ character: "Sidekick", action: "jumps up and down" },
				],
			},
		]);
		const est = estimateDuration(script);
		expect(est.actionBeatCount).toBe(2);
		expect(est.dialogueBeatCount).toBe(0);
		expect(est.dialogueWordCount).toBe(0);
		// 2 action beats * 2s = 4s
		expect(est.totalSeconds).toBe(4);
	});

	test("uses Spanish speech rate for es language", () => {
		const script = makeScript([
			{
				location: "Cubierta",
				beats: [{ character: "Hero", dialogue: "Hola amigo como estas" }],
			},
		]);
		const est = estimateDuration(script, "es");
		expect(est.wpm).toBe(140);
	});

	test("uses default rate for unknown language", () => {
		const script = makeScript([
			{
				location: "Ship",
				beats: [{ character: "Hero", dialogue: "Hello" }],
			},
		]);
		const est = estimateDuration(script, "fr");
		expect(est.wpm).toBe(130);
	});

	test("adds scene pauses between multiple scenes", () => {
		const script = makeScript([
			{
				location: "Scene 1",
				beats: [{ character: "Hero", action: "walks" }],
			},
			{
				location: "Scene 2",
				beats: [{ character: "Hero", action: "runs" }],
			},
			{
				location: "Scene 3",
				beats: [{ character: "Hero", action: "stops" }],
			},
		]);
		const est = estimateDuration(script);
		// 3 action beats * 2s + 2 scene gaps * 3s = 6 + 6 = 12
		expect(est.totalSeconds).toBe(12);
		expect(est.sceneCount).toBe(3);
	});

	test("handles mixed dialogue and action beats", () => {
		const script = makeScript([
			{
				location: "Ship deck",
				beats: [
					{ character: "Hero", dialogue: "Look at that island" },
					{ character: "Sidekick", action: "excited chittering" },
					{ character: "Hero", dialogue: "We should go there" },
				],
			},
		]);
		const est = estimateDuration(script);
		expect(est.dialogueBeatCount).toBe(2);
		expect(est.actionBeatCount).toBe(1);
		expect(est.dialogueWordCount).toBe(8); // 4 + 4 words
	});

	test("totalMinutes is rounded to 1 decimal", () => {
		// Create a script with enough dialogue to get a non-trivial duration
		const longDialogue = Array(100).fill("word").join(" "); // 100 words
		const script = makeScript([
			{
				location: "Ship",
				beats: [{ character: "Hero", dialogue: longDialogue }],
			},
		]);
		const est = estimateDuration(script, "en");
		// totalMinutes should be a number with at most 1 decimal place
		const decimalPart = est.totalMinutes.toString().split(".")[1];
		expect(!decimalPart || decimalPart.length <= 1).toBe(true);
	});
});

describe("formatDurationEstimate", () => {
	test("formats estimate without target", () => {
		const est = {
			totalSeconds: 1500,
			totalMinutes: 25,
			dialogueWordCount: 3000,
			dialogueBeatCount: 150,
			actionBeatCount: 20,
			sceneCount: 8,
			wpm: 130,
		};
		const output = formatDurationEstimate(est);
		expect(output).toContain("25 minutes");
		expect(output).toContain("1500s");
		expect(output).toContain("3000 words");
		expect(output).toContain("150 dialogue beats");
		expect(output).toContain("8 scenes");
		expect(output).toContain("20 action beats");
		expect(output).toContain("130 words/min");
		expect(output).not.toContain("target");
	});

	test("formats estimate within target", () => {
		const est = {
			totalSeconds: 1500,
			totalMinutes: 25,
			dialogueWordCount: 3000,
			dialogueBeatCount: 150,
			actionBeatCount: 20,
			sceneCount: 8,
			wpm: 130,
		};
		const output = formatDurationEstimate(est, 25);
		expect(output).toContain("Within target (25 min)");
	});

	test("formats estimate over target", () => {
		const est = {
			totalSeconds: 2100,
			totalMinutes: 35,
			dialogueWordCount: 4000,
			dialogueBeatCount: 200,
			actionBeatCount: 25,
			sceneCount: 10,
			wpm: 130,
		};
		const output = formatDurationEstimate(est, 25);
		expect(output).toContain("over target");
		expect(output).toContain("25 min");
	});

	test("formats estimate under target", () => {
		const est = {
			totalSeconds: 600,
			totalMinutes: 10,
			dialogueWordCount: 1000,
			dialogueBeatCount: 50,
			actionBeatCount: 5,
			sceneCount: 3,
			wpm: 130,
		};
		const output = formatDurationEstimate(est, 25);
		expect(output).toContain("under target");
		expect(output).toContain("25 min");
	});
});
