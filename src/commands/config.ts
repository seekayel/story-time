import { resolve } from "node:path";
import { loadAppConfig, saveAppConfig } from "../lib/config.ts";
import type { ModelProvider } from "../lib/llm.ts";

export interface ConfigOptions {
	model?: string;
	show?: string;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
	const config = loadAppConfig();

	if (options.model) {
		if (options.model !== "gemini" && options.model !== "claude") {
			throw new Error(
				`Invalid model: ${options.model}. Must be "gemini" or "claude".`,
			);
		}
		config.model = options.model as ModelProvider;
		console.log(`Model set to: ${config.model}`);
	}

	if (options.show) {
		config.show_path = resolve(options.show);
		console.log(`Show path set to: ${config.show_path}`);
	}

	if (options.model || options.show) {
		saveAppConfig(config);
		console.log("Configuration saved.");
	} else {
		console.log("Current configuration:");
		console.log(`  model: ${config.model}`);
		console.log(`  show_path: ${config.show_path ?? "(not set)"}`);
	}
}
