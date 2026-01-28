#!/usr/bin/env bun
import "dotenv/config";
import { Command } from "commander";
import { configCommand } from "./commands/config.ts";
import { developEpisode } from "./commands/develop-episode.ts";
import { developSeason } from "./commands/develop-season.ts";
import { developShow } from "./commands/develop-show.ts";
import { initShow } from "./commands/init.ts";
import { publish } from "./commands/publish.ts";
import { status } from "./commands/status.ts";
import { synthesize } from "./commands/synthesize.ts";
import { translate } from "./commands/translate.ts";
import { writeScript } from "./commands/write-script.ts";

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
	.option("--model <model>", "Set default model (gemini or claude)")
	.option("--show <path>", "Set active show directory path")
	.action(configCommand);

program
	.command("develop-show")
	.description("Generate character briefs from show config")
	.option("--show <path>", "Show directory path")
	.action(developShow);

program
	.command("develop-season")
	.description("Generate season story arc")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.action((options) =>
		developSeason({
			show: options.show,
			season: Number.parseInt(options.season, 10),
		}),
	);

program
	.command("develop-episode")
	.description("Generate episode plot")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.action((episodeNumber, options) =>
		developEpisode(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
		}),
	);

program
	.command("write-script")
	.description("Generate episode script")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.action((episodeNumber, options) =>
		writeScript(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
		}),
	);

program
	.command("translate")
	.description("Translate episode script to target language")
	.argument("<episode-number>", "Episode number")
	.option("--show <path>", "Show directory path")
	.option("--season <number>", "Season number", "1")
	.action((episodeNumber, options) =>
		translate(episodeNumber, {
			show: options.show,
			season: Number.parseInt(options.season, 10),
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
