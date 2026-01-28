import { describe, expect, test } from "bun:test";
import { configCommand } from "../../src/commands/config.ts";

describe("config command", () => {
	test("does not throw when called with no options", async () => {
		// Shows current config — should not throw
		await configCommand({});
	});

	test("rejects invalid model", async () => {
		expect(configCommand({ model: "invalid" })).rejects.toThrow(
			"Invalid model",
		);
	});

	test("accepts gemini model", async () => {
		// Should not throw
		await configCommand({ model: "gemini" });
	});

	test("accepts claude model", async () => {
		// Should not throw
		await configCommand({ model: "claude" });
	});

	test("accepts show path", async () => {
		// Should not throw
		await configCommand({ show: "/tmp/my-test-show" });
	});

	test("accepts both model and show path", async () => {
		// Should not throw
		await configCommand({ model: "gemini", show: "/tmp/my-test-show" });
	});
});
