import { describe, expect, test } from "bun:test";
import {
	type EpisodeMetadata,
	escapeXml,
	type FeedConfig,
	formatDurationHMS,
	generateRssFeed,
} from "../src/lib/rss.ts";
import type { ShowConfig } from "../src/lib/schemas.ts";

describe("escapeXml", () => {
	test("escapes ampersand", () => {
		expect(escapeXml("Tom & Jerry")).toBe("Tom &amp; Jerry");
	});

	test("escapes angle brackets", () => {
		expect(escapeXml("<hello>")).toBe("&lt;hello&gt;");
	});

	test("escapes quotes", () => {
		expect(escapeXml("\"hello\" & 'world'")).toBe(
			"&quot;hello&quot; &amp; &apos;world&apos;",
		);
	});

	test("returns empty string for empty input", () => {
		expect(escapeXml("")).toBe("");
	});

	test("leaves plain text unchanged", () => {
		expect(escapeXml("plain text")).toBe("plain text");
	});
});

describe("formatDurationHMS", () => {
	test("formats zero seconds", () => {
		expect(formatDurationHMS(0)).toBe("00:00:00");
	});

	test("formats seconds only", () => {
		expect(formatDurationHMS(45)).toBe("00:00:45");
	});

	test("formats minutes and seconds", () => {
		expect(formatDurationHMS(125)).toBe("00:02:05");
	});

	test("formats hours, minutes and seconds", () => {
		expect(formatDurationHMS(3661)).toBe("01:01:01");
	});

	test("pads single digits", () => {
		expect(formatDurationHMS(61)).toBe("00:01:01");
	});

	test("formats 25 minutes", () => {
		expect(formatDurationHMS(1500)).toBe("00:25:00");
	});
});

const makeShowConfig = (overrides?: Partial<ShowConfig>): ShowConfig => ({
	name: "Test Show",
	description: "A test show description",
	setting: "Test Setting",
	target_language: "es",
	source_language: "en",
	episodes_per_season: 24,
	episode_duration_minutes: 25,
	narrator: { enabled: false, voice_id: null },
	characters: [{ name: "Hero", voice_id: "voice_hero_123" }],
	content_guidelines: {
		rating: "PG-13",
		themes_to_avoid: [],
	},
	...overrides,
});

const makeFeedConfig = (overrides?: Partial<FeedConfig>): FeedConfig => ({
	baseUrl: "https://example.com/podcast",
	language: "es",
	author: "Test Author",
	categories: ["Kids & Family"],
	imageUrl: "https://example.com/artwork.jpg",
	email: "test@example.com",
	explicit: false,
	...overrides,
});

const makeEpisode = (
	overrides?: Partial<EpisodeMetadata>,
): EpisodeMetadata => ({
	title: "Test Episode",
	description: "A test episode",
	season: 1,
	episode: 1,
	pubDate: "2025-01-15T00:00:00.000Z",
	durationSeconds: 1500,
	audioSizeBytes: 24000000,
	audioPath: "seasons/season-01/episodes/ep-01/audio.mp3",
	...overrides,
});

describe("generateRssFeed", () => {
	test("generates valid RSS XML with channel metadata", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig();
		const xml = generateRssFeed(showConfig, feedConfig, []);

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain("<rss version=");
		expect(xml).toContain("<channel>");
		expect(xml).toContain("<title>Test Show</title>");
		expect(xml).toContain("<description>A test show description</description>");
		expect(xml).toContain("<language>es</language>");
		expect(xml).toContain("<link>https://example.com/podcast</link>");
		expect(xml).toContain("<itunes:author>Test Author</itunes:author>");
		expect(xml).toContain("<itunes:explicit>false</itunes:explicit>");
		expect(xml).toContain('itunes:category text="Kids &amp; Family"');
		expect(xml).toContain(
			'itunes:image href="https://example.com/artwork.jpg"',
		);
		expect(xml).toContain("</channel>");
		expect(xml).toContain("</rss>");
	});

	test("generates episode items", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig();
		const episodes = [makeEpisode()];
		const xml = generateRssFeed(showConfig, feedConfig, episodes);

		expect(xml).toContain("<item>");
		expect(xml).toContain("<title>Test Episode</title>");
		expect(xml).toContain("<description>A test episode</description>");
		expect(xml).toContain('type="audio/mpeg"');
		expect(xml).toContain(
			"https://example.com/podcast/seasons/season-01/episodes/ep-01/audio.mp3",
		);
		expect(xml).toContain('length="24000000"');
		expect(xml).toContain('<guid isPermaLink="false">s1e1</guid>');
		expect(xml).toContain("<itunes:duration>00:25:00</itunes:duration>");
		expect(xml).toContain("<itunes:episode>1</itunes:episode>");
		expect(xml).toContain("<itunes:season>1</itunes:season>");
		expect(xml).toContain("</item>");
	});

	test("sorts episodes newest first", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig();
		const episodes = [
			makeEpisode({ episode: 1, title: "First" }),
			makeEpisode({ episode: 3, title: "Third" }),
			makeEpisode({ episode: 2, title: "Second" }),
		];
		const xml = generateRssFeed(showConfig, feedConfig, episodes);

		const thirdIdx = xml.indexOf("Third");
		const secondIdx = xml.indexOf("Second");
		const firstIdx = xml.indexOf("First");

		// Newest first
		expect(thirdIdx).toBeLessThan(secondIdx);
		expect(secondIdx).toBeLessThan(firstIdx);
	});

	test("sorts by season then episode", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig();
		const episodes = [
			makeEpisode({ season: 1, episode: 2, title: "S1E2" }),
			makeEpisode({ season: 2, episode: 1, title: "S2E1" }),
			makeEpisode({ season: 1, episode: 1, title: "S1E1" }),
		];
		const xml = generateRssFeed(showConfig, feedConfig, episodes);

		const s2e1Idx = xml.indexOf("S2E1");
		const s1e2Idx = xml.indexOf("S1E2");
		const s1e1Idx = xml.indexOf("S1E1");

		expect(s2e1Idx).toBeLessThan(s1e2Idx);
		expect(s1e2Idx).toBeLessThan(s1e1Idx);
	});

	test("escapes special characters in episode data", () => {
		const showConfig = makeShowConfig({
			name: 'Show "With" <Special> & Chars',
		});
		const feedConfig = makeFeedConfig();
		const xml = generateRssFeed(showConfig, feedConfig, []);

		expect(xml).toContain("Show &quot;With&quot; &lt;Special&gt; &amp; Chars");
	});

	test("generates feed without baseUrl using relative paths", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig({ baseUrl: "" });
		const episodes = [makeEpisode()];
		const xml = generateRssFeed(showConfig, feedConfig, episodes);

		expect(xml).toContain('url="seasons/season-01/episodes/ep-01/audio.mp3"');
		expect(xml).not.toContain("<link>");
	});

	test("omits optional fields when not configured", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig({
			author: "",
			email: "",
			imageUrl: "",
		});
		const xml = generateRssFeed(showConfig, feedConfig, []);

		expect(xml).not.toContain("<itunes:author>");
		expect(xml).not.toContain("<itunes:owner>");
		expect(xml).not.toContain("<itunes:image");
	});

	test("sets explicit to true when configured", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig({ explicit: true });
		const xml = generateRssFeed(showConfig, feedConfig, []);

		expect(xml).toContain("<itunes:explicit>true</itunes:explicit>");
	});

	test("includes email in owner element", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig({ email: "podcast@example.com" });
		const xml = generateRssFeed(showConfig, feedConfig, []);

		expect(xml).toContain("podcast@example.com");
		expect(xml).toContain("<itunes:owner>");
	});

	test("supports multiple categories", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig({
			categories: ["Kids & Family", "Education"],
		});
		const xml = generateRssFeed(showConfig, feedConfig, []);

		expect(xml).toContain('text="Kids &amp; Family"');
		expect(xml).toContain('text="Education"');
	});

	test("strips trailing slash from baseUrl", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig({
			baseUrl: "https://example.com/podcast/",
		});
		const episodes = [makeEpisode()];
		const xml = generateRssFeed(showConfig, feedConfig, episodes);

		expect(xml).toContain(
			"https://example.com/podcast/seasons/season-01/episodes/ep-01/audio.mp3",
		);
		expect(xml).not.toContain("podcast//seasons");
	});

	test("handles empty episodes list", () => {
		const showConfig = makeShowConfig();
		const feedConfig = makeFeedConfig();
		const xml = generateRssFeed(showConfig, feedConfig, []);

		expect(xml).not.toContain("<item>");
		expect(xml).toContain("<channel>");
		expect(xml).toContain("</channel>");
	});
});
