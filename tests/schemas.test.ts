import { describe, expect, test } from "bun:test";
import { scriptSchema, showConfigSchema } from "../src/lib/schemas.ts";

describe("showConfigSchema", () => {
	test("parses a valid show config", () => {
		const config = showConfigSchema.parse({
			name: "Captain Barba",
			description: "A pirate adventure",
			setting: "Caribbean",
			characters: [{ name: "Captain Barba", voice_id: "abc123" }],
		});
		expect(config.name).toBe("Captain Barba");
		expect(config.target_language).toBe("es");
		expect(config.source_language).toBe("en");
		expect(config.episodes_per_season).toBe(24);
		expect(config.episode_duration_minutes).toBe(25);
		expect(config.narrator.enabled).toBe(false);
		expect(config.content_guidelines.rating).toBe("PG-13");
	});

	test("requires at least one character", () => {
		expect(() =>
			showConfigSchema.parse({
				name: "Test",
				description: "Test",
				setting: "Test",
				characters: [],
			}),
		).toThrow();
	});

	test("requires name, description, and setting", () => {
		expect(() =>
			showConfigSchema.parse({
				characters: [{ name: "Test" }],
			}),
		).toThrow();
	});

	test("allows optional voice_id on characters", () => {
		const config = showConfigSchema.parse({
			name: "Test",
			description: "Test",
			setting: "Test",
			characters: [{ name: "Test Character" }],
		});
		expect(config.characters[0]?.voice_id).toBeUndefined();
	});
});

describe("scriptSchema", () => {
	test("parses a valid script", () => {
		const script = scriptSchema.parse({
			title: "The Mysterious Island",
			episode: 1,
			season: 1,
			scenes: [
				{
					location: "On the ship deck, sunrise",
					beats: [
						{
							character: "Captain Barba",
							dialogue: "Look, Chuck! A mysterious island.",
							direction: "pointing toward the horizon",
						},
						{
							character: "Chuck",
							action: "excited chittering",
						},
					],
				},
			],
		});
		expect(script.title).toBe("The Mysterious Island");
		expect(script.scenes).toHaveLength(1);
		expect(script.scenes[0]?.beats).toHaveLength(2);
		expect(script.scenes[0]?.beats[0]?.dialogue).toBe(
			"Look, Chuck! A mysterious island.",
		);
		expect(script.scenes[0]?.beats[1]?.action).toBe("excited chittering");
	});

	test("requires title, episode, season, and scenes", () => {
		expect(() => scriptSchema.parse({})).toThrow();
		expect(() =>
			scriptSchema.parse({ title: "Test", episode: 1, season: 1 }),
		).toThrow();
	});
});
