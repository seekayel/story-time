import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import YAML from "yaml";

const DEFAULT_SHOW_CONFIG = {
	name: "",
	description: "",
	setting: "",
	target_language: "es",
	source_language: "en",
	episodes_per_season: 24,
	episode_duration_minutes: 25,
	narrator: {
		enabled: false,
		voice_id: null,
	},
	characters: [
		{
			name: "Character Name",
			voice_id: "eleven_labs_voice_id_here",
		},
	],
	content_guidelines: {
		rating: "PG-13",
		themes_to_avoid: ["explicit violence", "adult content"],
	},
};

export async function initShow(showName: string): Promise<void> {
	const safeName = showName.replace(/\s+/g, "_");
	const showPath = resolve("shows", safeName);

	if (existsSync(showPath)) {
		throw new Error(`Show directory already exists: ${showPath}`);
	}

	// Create directory structure
	mkdirSync(join(showPath, "characters"), { recursive: true });
	mkdirSync(join(showPath, "seasons"), { recursive: true });

	// Write default show.yaml
	const config = {
		...DEFAULT_SHOW_CONFIG,
		name: showName,
		description: `A children's audio series called "${showName}"`,
	};

	writeFileSync(join(showPath, "show.yaml"), YAML.stringify(config), "utf-8");

	console.log(`Initialized show at ${showPath}`);
	console.log("Edit show.yaml to configure your show, then run:");
	console.log(`  story-time config --show=${showPath}`);
	console.log("  story-time develop-show");
}
