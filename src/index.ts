#!/usr/bin/env bun
import "dotenv/config";
import { Command, Option } from "commander";
import { configCommand } from "./commands/config.ts";
import { developEpisode } from "./commands/develop-episode.ts";
import { developSeason } from "./commands/develop-season.ts";
import { developShow } from "./commands/develop-show.ts";
import { estimateDurationCommand } from "./commands/estimate-duration.ts";
import { initShow } from "./commands/init.ts";
import { publish } from "./commands/publish.ts";
import { status } from "./commands/status.ts";
import { synthesize } from "./commands/synthesize.ts";
import { translate } from "./commands/translate.ts";
import { writeScript } from "./commands/write-script.ts";
import { runBatch } from "./lib/batch.ts";
import { loadShowConfig, resolveShowPath } from "./lib/config.ts";
import { resolveEpisodes } from "./lib/episodes.ts";
import { VALID_MODELS } from "./lib/llm.ts";

const modelOption = () =>
	new Option("--model <model>", "Model to use (gemini or claude)").choices(
		VALID_MODELS,
	);

const program = new Command();

program
	.name("story-time")
	.description("CLI for generating children's audio story series")
	.version("0.1.0");

program
	.command("init")
	.description("Initialize a new show")
	.argument("<show-name>", "Name of the show")
	.action(initShow);

program
	.command("config")
	.description("View or update configuration")
	.addOption(modelOption())
	.option("--show <path>", "Set active show directory path")
	.action(configCommand);

program
	.command("develop-show")
	.description("Generate character briefs from show config")
	.option("--show <path>", "Show directory path")
	.addOption(modelOption())
	.action(developShow);

program
	.command("develop-season")
	.description("Generate season story arc")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.addOption(modelOption())
	.action((options) =>
		developSeason({
			show: options.show,
			season: Number.parseInt(options.season, 10),
			model: options.model,
		}),
	);

program
	.command("develop-episode")
	.description("Generate episode plot(s)")
	.argument("[episodes]", "Episode number, range (1-5), or list (1,3,5)")
	.option("--all", "Process all episodes in the season")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.addOption(modelOption())
	.action((episodes, options) => {
		const season = Number.parseInt(options.season, 10);
		const showPath = resolveShowPath(options.show);
		const config = loadShowConfig(showPath);
		const resolved = resolveEpisodes(
			episodes,
			!!options.all,
			config.episodes_per_season,
		);
		if (resolved.length === 1) {
			return developEpisode(String(resolved[0]), {
				show: options.show,
				season,
				model: options.model,
			});
		}
		return runBatch(resolved, "develop-episode", (ep) =>
			developEpisode(ep, {
				show: options.show,
				season,
				model: options.model,
			}),
		);
	});

program
	.command("write-script")
	.description("Generate episode script(s)")
	.argument("[episodes]", "Episode number, range (1-5), or list (1,3,5)")
	.option("--all", "Process all episodes in the season")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.addOption(modelOption())
	.action((episodes, options) => {
		const season = Number.parseInt(options.season, 10);
		const showPath = resolveShowPath(options.show);
		const config = loadShowConfig(showPath);
		const resolved = resolveEpisodes(
			episodes,
			!!options.all,
			config.episodes_per_season,
		);
		if (resolved.length === 1) {
			return writeScript(String(resolved[0]), {
				show: options.show,
				season,
				model: options.model,
			});
		}
		return runBatch(resolved, "write-script", (ep) =>
			writeScript(ep, {
				show: options.show,
				season,
				model: options.model,
			}),
		);
	});

program
	.command("translate")
	.description("Translate episode script(s) to target language")
	.argument("[episodes]", "Episode number, range (1-5), or list (1,3,5)")
	.option("--all", "Process all episodes in the season")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.addOption(modelOption())
	.action((episodes, options) => {
		const season = Number.parseInt(options.season, 10);
		const showPath = resolveShowPath(options.show);
		const config = loadShowConfig(showPath);
		const resolved = resolveEpisodes(
			episodes,
			!!options.all,
			config.episodes_per_season,
		);
		if (resolved.length === 1) {
			return translate(String(resolved[0]), {
				show: options.show,
				season,
				model: options.model,
			});
		}
		return runBatch(resolved, "translate", (ep) =>
			translate(ep, {
				show: options.show,
				season,
				model: options.model,
			}),
		);
	});

program
	.command("synthesize")
	.description("Synthesize audio from translated script(s)")
	.argument("[episodes]", "Episode number, range (1-5), or list (1,3,5)")
	.option("--all", "Process all episodes in the season")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.action((episodes, options) => {
		const season = Number.parseInt(options.season, 10);
		const showPath = resolveShowPath(options.show);
		const config = loadShowConfig(showPath);
		const resolved = resolveEpisodes(
			episodes,
			!!options.all,
			config.episodes_per_season,
		);
		if (resolved.length === 1) {
			return synthesize(String(resolved[0]), {
				show: options.show,
				season,
			});
		}
		return runBatch(resolved, "synthesize", (ep) =>
			synthesize(ep, {
				show: options.show,
				season,
			}),
		);
	});

program
	.command("estimate-duration")
	.description("Estimate audio duration from script(s)")
	.argument("[episodes]", "Episode number, range (1-5), or list (1,3,5)")
	.option("--all", "Process all episodes in the season")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.option("--translated", "Estimate from translated script instead of source")
	.action((episodes, options) => {
		const season = Number.parseInt(options.season, 10);
		const showPath = resolveShowPath(options.show);
		const config = loadShowConfig(showPath);
		const resolved = resolveEpisodes(
			episodes,
			!!options.all,
			config.episodes_per_season,
		);
		if (resolved.length === 1) {
			return estimateDurationCommand(String(resolved[0]), {
				show: options.show,
				season,
				translated: options.translated ?? false,
			});
		}
		return runBatch(resolved, "estimate-duration", (ep) =>
			estimateDurationCommand(ep, {
				show: options.show,
				season,
				translated: options.translated ?? false,
			}),
		);
	});

program
	.command("status")
	.description("Show pipeline progress for a show")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number")
	.action((options) =>
		status({
			show: options.show,
			season: options.season ? Number.parseInt(options.season, 10) : undefined,
		}),
	);

program
	.command("publish")
	.description("Publish episodes to podcast RSS feed")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.option("--episode <number>", "Specific episode number")
	.action((options) =>
		publish({
			show: options.show,
			season: options.season ? Number.parseInt(options.season, 10) : undefined,
			episode: options.episode
				? Number.parseInt(options.episode, 10)
				: undefined,
		}),
	);

program.parse();
