import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { loadAppConfig } from "./config.ts";
import { withRetry } from "./retry.ts";

export type ModelProvider = "gemini" | "claude";

function getModel(provider?: ModelProvider) {
	const modelProvider = provider ?? loadAppConfig().model;

	if (modelProvider === "claude") {
		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error("ANTHROPIC_API_KEY not set. Add it to your .env file.");
		}
		const anthropic = createAnthropic({ apiKey });
		return anthropic("claude-sonnet-4-5-20250514");
	}

	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY not set. Add it to your .env file.");
	}
	const google = createGoogleGenerativeAI({ apiKey });
	return google("gemini-2.5-pro-preview-05-06");
}

export interface GenerateOptions {
	prompt: string;
	system?: string;
	provider?: ModelProvider;
}

export async function generate(options: GenerateOptions): Promise<string> {
	const model = getModel(options.provider);
	return withRetry(
		async () => {
			const result = await generateText({
				model,
				system: options.system,
				prompt: options.prompt,
			});
			return result.text;
		},
		{
			maxRetries: 3,
			initialDelayMs: 1000,
			onRetry: (attempt, delayMs) => {
				console.warn(
					`  LLM request failed, retrying (attempt ${attempt + 1}/4) after ${delayMs}ms...`,
				);
			},
		},
	);
}
