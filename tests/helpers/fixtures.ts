import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

/**
 * Creates a temporary show directory with valid show.yaml for testing.
 * Returns the show path.
 */
export function createTestShow(baseDir: string, showName: string): string {
	const showPath = join(baseDir, showName);
	if (existsSync(showPath)) {
		rmSync(showPath, { recursive: true });
	}
	mkdirSync(join(showPath, "characters"), { recursive: true });
	mkdirSync(join(showPath, "seasons"), { recursive: true });

	const config = {
		name: showName,
		description: `A test show called "${showName}"`,
		setting: "Test Setting",
		target_language: "es",
		source_language: "en",
		episodes_per_season: 24,
		episode_duration_minutes: 25,
		narrator: { enabled: false, voice_id: null },
		characters: [
			{ name: "Hero", voice_id: "voice_hero_123" },
			{ name: "Sidekick", voice_id: "voice_sidekick_456" },
		],
		content_guidelines: {
			rating: "PG-13",
			themes_to_avoid: ["explicit violence"],
		},
	};

	writeFileSync(join(showPath, "show.yaml"), YAML.stringify(config), "utf-8");
	return showPath;
}

/**
 * Clean up a test directory.
 */
export function cleanupTestDir(dir: string): void {
	if (existsSync(dir)) {
		rmSync(dir, { recursive: true });
	}
}

/**
 * Writes a character brief file into the show's characters directory.
 */
export function writeCharacterBrief(
	showPath: string,
	characterName: string,
	content: string,
): void {
	const slug = characterName.toLowerCase().replace(/\s+/g, "-");
	const filePath = join(showPath, "characters", `${slug}.md`);
	writeFileSync(filePath, content, "utf-8");
}

/**
 * Writes a season arc file.
 */
export function writeSeasonArc(
	showPath: string,
	season: number,
	content: string,
): void {
	const padded = String(season).padStart(2, "0");
	const dir = join(showPath, "seasons", `season-${padded}`);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "arc.md"), content, "utf-8");
}

/**
 * Writes an episode plot file.
 */
export function writeEpisodePlot(
	showPath: string,
	season: number,
	episode: number,
	content: string,
): void {
	const seasonPad = String(season).padStart(2, "0");
	const epPad = String(episode).padStart(2, "0");
	const dir = join(
		showPath,
		"seasons",
		`season-${seasonPad}`,
		"episodes",
		`ep-${epPad}`,
	);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "plot.md"), content, "utf-8");
}

/**
 * Writes an episode script file.
 */
export function writeEpisodeScript(
	showPath: string,
	season: number,
	episode: number,
	content: string,
): void {
	const seasonPad = String(season).padStart(2, "0");
	const epPad = String(episode).padStart(2, "0");
	const dir = join(
		showPath,
		"seasons",
		`season-${seasonPad}`,
		"episodes",
		`ep-${epPad}`,
	);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "script.md"), content, "utf-8");
}

/**
 * Writes a translated script file.
 */
export function writeTranslatedScript(
	showPath: string,
	season: number,
	episode: number,
	lang: string,
	content: string,
): void {
	const seasonPad = String(season).padStart(2, "0");
	const epPad = String(episode).padStart(2, "0");
	const dir = join(
		showPath,
		"seasons",
		`season-${seasonPad}`,
		"episodes",
		`ep-${epPad}`,
	);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `script-${lang}.md`), content, "utf-8");
}

/**
 * Writes an audio file for an episode.
 */
export function writeEpisodeAudio(
	showPath: string,
	season: number,
	episode: number,
): void {
	const seasonPad = String(season).padStart(2, "0");
	const epPad = String(episode).padStart(2, "0");
	const dir = join(
		showPath,
		"seasons",
		`season-${seasonPad}`,
		"episodes",
		`ep-${epPad}`,
	);
	mkdirSync(dir, { recursive: true });
	// Write a fake MP3 (just some bytes)
	writeFileSync(join(dir, "audio.mp3"), Buffer.from("fake-mp3-data"));
}
