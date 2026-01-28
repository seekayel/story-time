import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import YAML from "yaml";
import { type ShowConfig, showConfigSchema } from "./schemas.ts";

const CONFIG_DIR = join(
	process.env.HOME || process.env.USERPROFILE || "~",
	".story-time",
);
const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");

export interface AppConfig {
	model: "gemini" | "claude";
	show_path: string | null;
}

const DEFAULT_APP_CONFIG: AppConfig = {
	model: "gemini",
	show_path: null,
};

export function loadAppConfig(): AppConfig {
	if (!existsSync(CONFIG_FILE)) {
		return { ...DEFAULT_APP_CONFIG };
	}
	const raw = readFileSync(CONFIG_FILE, "utf-8");
	const parsed = YAML.parse(raw) as Partial<AppConfig> | null;
	return {
		...DEFAULT_APP_CONFIG,
		...parsed,
	};
}

export function saveAppConfig(config: AppConfig): void {
	mkdirSync(CONFIG_DIR, { recursive: true });
	writeFileSync(CONFIG_FILE, YAML.stringify(config), "utf-8");
}

export function resolveShowPath(showPathArg?: string): string {
	if (showPathArg) {
		return resolve(showPathArg);
	}
	const appConfig = loadAppConfig();
	if (appConfig.show_path) {
		return resolve(appConfig.show_path);
	}
	throw new Error(
		"No show path specified. Use --show <path> or run: story-time config --show=<path>",
	);
}

export function loadShowConfig(showPath: string): ShowConfig {
	const configPath = join(showPath, "show.yaml");
	if (!existsSync(configPath)) {
		throw new Error(`show.yaml not found at ${configPath}`);
	}
	const raw = readFileSync(configPath, "utf-8");
	const parsed = YAML.parse(raw);
	return showConfigSchema.parse(parsed);
}

export function getShowDir(showPath: string, ...parts: string[]): string {
	return join(showPath, ...parts);
}

export function getSeasonDir(showPath: string, season: number): string {
	const padded = String(season).padStart(2, "0");
	return join(showPath, "seasons", `season-${padded}`);
}

export function getEpisodeDir(
	showPath: string,
	season: number,
	episode: number,
): string {
	const seasonDir = getSeasonDir(showPath, season);
	const padded = String(episode).padStart(2, "0");
	return join(seasonDir, "episodes", `ep-${padded}`);
}
