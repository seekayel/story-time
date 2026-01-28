import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodeAudio,
	writeEpisodePlot,
	writeTranslatedScript,
} from "../helpers/fixtures.ts";

const TEST_DIR = join(import.meta.dir, "..", "..", ".test-shows-generate-feed");

describe("generate-feed command", () => {
	let showPath: string;

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
	});

	test("generates feed.xml with audio episodes", async () => {
		writeEpisodeAudio(showPath, 1, 1);
		writeEpisodeAudio(showPath, 1, 2);

		// Write feed config
		const feedConfig = {
			baseUrl: "https://example.com/podcast",
			language: "es",
			author: "Test Author",
			categories: ["Kids & Family"],
			imageUrl: "https://example.com/art.jpg",
			email: "test@example.com",
			explicit: false,
		};
		writeFileSync(
			join(showPath, "feed.yaml"),
			YAML.stringify(feedConfig),
			"utf-8",
		);

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath });

		const feedPath = join(showPath, "feed.xml");
		expect(existsSync(feedPath)).toBe(true);

		const xml = readFileSync(feedPath, "utf-8");
		expect(xml).toContain('<?xml version="1.0"');
		expect(xml).toContain("<channel>");
		expect(xml).toContain("<title>test-show</title>");
		expect(xml).toContain("<item>");
		expect(xml).toContain("audio.mp3");
		expect(xml).toContain("<itunes:episode>1</itunes:episode>");
		expect(xml).toContain("<itunes:episode>2</itunes:episode>");
	});

	test("uses episode title from translated script", async () => {
		writeEpisodeAudio(showPath, 1, 1);
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml
title: "La Isla Misteriosa"
episode: 1
season: 1
scenes:
  - location: "On the ship"
    beats:
      - character: "Hero"
        dialogue: "Hola"
\`\`\``,
		);

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath });

		const xml = readFileSync(join(showPath, "feed.xml"), "utf-8");
		expect(xml).toContain("La Isla Misteriosa");
	});

	test("uses plot description for episode", async () => {
		writeEpisodeAudio(showPath, 1, 1);
		writeEpisodePlot(
			showPath,
			1,
			1,
			"# Episode 1\n\nThe heroes discover a hidden cave behind the waterfall.\n\nMore details here.",
		);

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath });

		const xml = readFileSync(join(showPath, "feed.xml"), "utf-8");
		expect(xml).toContain("hidden cave behind the waterfall");
	});

	test("filters by season when --season is specified", async () => {
		writeEpisodeAudio(showPath, 1, 1);
		writeEpisodeAudio(showPath, 2, 1);

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath, season: 1 });

		const xml = readFileSync(join(showPath, "feed.xml"), "utf-8");
		expect(xml).toContain("<itunes:season>1</itunes:season>");
		expect(xml).not.toContain("<itunes:season>2</itunes:season>");
	});

	test("includes all seasons when --season is not specified", async () => {
		writeEpisodeAudio(showPath, 1, 1);
		writeEpisodeAudio(showPath, 2, 1);

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath });

		const xml = readFileSync(join(showPath, "feed.xml"), "utf-8");
		expect(xml).toContain("<itunes:season>1</itunes:season>");
		expect(xml).toContain("<itunes:season>2</itunes:season>");
	});

	test("writes to custom output path", async () => {
		writeEpisodeAudio(showPath, 1, 1);

		const outputPath = join(TEST_DIR, "custom-feed.xml");

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath, output: outputPath });

		expect(existsSync(outputPath)).toBe(true);
		const xml = readFileSync(outputPath, "utf-8");
		expect(xml).toContain("<channel>");
	});

	test("handles no audio files gracefully", async () => {
		// Create season directory but no audio
		const seasonDir = join(
			showPath,
			"seasons",
			"season-01",
			"episodes",
			"ep-01",
		);
		mkdirSync(seasonDir, { recursive: true });
		writeFileSync(join(seasonDir, "plot.md"), "# Plot", "utf-8");

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath });

		// Should not create feed.xml when no audio found
		expect(existsSync(join(showPath, "feed.xml"))).toBe(false);
	});

	test("works without feed.yaml (uses defaults)", async () => {
		writeEpisodeAudio(showPath, 1, 1);

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: showPath });

		const xml = readFileSync(join(showPath, "feed.xml"), "utf-8");
		expect(xml).toContain("<channel>");
		// Default language should be es
		expect(xml).toContain("<language>es</language>");
	});

	test("throws when show path is invalid", async () => {
		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		expect(generateFeed({ show: "/nonexistent/path" })).rejects.toThrow();
	});

	test("escapes special characters in feed output", async () => {
		// Create show with special characters in name
		const specialShowPath = join(TEST_DIR, "special-show");
		mkdirSync(join(specialShowPath, "characters"), { recursive: true });
		mkdirSync(join(specialShowPath, "seasons"), { recursive: true });
		const config = {
			name: 'Show "With" <Special> & Chars',
			description: "Test & <description>",
			setting: "Test",
			characters: [{ name: "Hero", voice_id: "v1" }],
		};
		writeFileSync(
			join(specialShowPath, "show.yaml"),
			YAML.stringify(config),
			"utf-8",
		);

		// Add audio
		const epDir = join(
			specialShowPath,
			"seasons",
			"season-01",
			"episodes",
			"ep-01",
		);
		mkdirSync(epDir, { recursive: true });
		writeFileSync(join(epDir, "audio.mp3"), Buffer.from("fake-mp3"));

		const { generateFeed } = await import(
			"../../src/commands/generate-feed.ts"
		);
		await generateFeed({ show: specialShowPath });

		const xml = readFileSync(join(specialShowPath, "feed.xml"), "utf-8");
		expect(xml).toContain("&amp;");
		expect(xml).toContain("&lt;Special&gt;");
		expect(xml).toContain("&quot;With&quot;");
	});
});
