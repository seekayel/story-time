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
	.description("Generate episode plot")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.addOption(modelOption())
	.action((episodeNumber, options) =>
		developEpisode(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
			model: options.model,
		}),
	);

program
	.command("write-script")
	.description("Generate episode script")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.addOption(modelOption())
	.action((episodeNumber, options) =>
		writeScript(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
			model: options.model,
		}),
	);

program
	.command("translate")
	.description("Translate episode script to target language")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.addOption(modelOption())
	.action((episodeNumber, options) =>
		translate(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
			model: options.model,
		}),
	);

program
	.command("synthesize")
	.description("Synthesize audio from translated script")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.action((episodeNumber, options) =>
		synthesize(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
		}),
	);

program
	.command("estimate-duration")
	.description("Estimate audio duration from a script")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.option("--translated", "Estimate from translated script instead of source")
	.action((episodeNumber, options) =>
		estimateDurationCommand(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
			translated: options.translated ?? false,
		}),
	);

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
