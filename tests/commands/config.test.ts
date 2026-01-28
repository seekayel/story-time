import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Ensure llm module provides validateModelProvider (other test files mock it without)
mock.module("../../src/lib/llm.ts", () => ({
	generate: async () => "mocked",
	VALID_MODELS: ["gemini", "claude"] as readonly string[],
	validateModelProvider: (value: string) => {
		if (!["gemini", "claude"].includes(value)) {
			throw new Error(
				`Invalid model: "${value}". Must be "gemini" or "claude".`,
			);
		}
		return value;
	},
}));

import { configCommand } from "../../src/commands/config.ts";

const CONFIG_FILE = join(process.cwd(), "config.yaml");

const VALID_CONFIG = "model: gemini\nshow_path: ./shows\n";

describe("config command", () => {
	let originalConfig: string | null = null;

	beforeEach(() => {
		// Save original config so tests don't corrupt it
		if (existsSync(CONFIG_FILE)) {
			originalConfig = readFileSync(CONFIG_FILE, "utf-8");
		} else {
			originalConfig = null;
		}
		// Reset to a valid config before each test
		writeFileSync(CONFIG_FILE, VALID_CONFIG, "utf-8");
	});

	afterEach(() => {
		// Restore original config
		if (originalConfig !== null) {
			writeFileSync(CONFIG_FILE, originalConfig, "utf-8");
		}
	});

	test("does not throw when called with no options", async () => {
		await configCommand({});
	});

	test("rejects invalid model", async () => {
		expect(configCommand({ model: "invalid" })).rejects.toThrow(
			"Invalid model",
		);
	});

	test("accepts gemini model", async () => {
		await configCommand({ model: "gemini" });
	});

	test("accepts claude model", async () => {
		await configCommand({ model: "claude" });
	});

	test("accepts show path", async () => {
		await configCommand({ show: "/tmp/my-test-show" });
	});

	test("accepts both model and show path", async () => {
		await configCommand({ model: "gemini", show: "/tmp/my-test-show" });
	});
});
