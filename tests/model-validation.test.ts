import { describe, expect, test } from "bun:test";
import { VALID_MODELS, validateModelProvider } from "../src/lib/llm.ts";

describe("model validation", () => {
	test("VALID_MODELS contains gemini and claude", () => {
		expect(VALID_MODELS).toContain("gemini");
		expect(VALID_MODELS).toContain("claude");
		expect(VALID_MODELS).toHaveLength(2);
	});

	test("validateModelProvider accepts gemini", () => {
		expect(validateModelProvider("gemini")).toBe("gemini");
	});

	test("validateModelProvider accepts claude", () => {
		expect(validateModelProvider("claude")).toBe("claude");
	});

	test("validateModelProvider rejects invalid model", () => {
		expect(() => validateModelProvider("invalid")).toThrow(
			'Invalid model: "invalid". Must be "gemini" or "claude".',
		);
	});

	test("validateModelProvider rejects empty string", () => {
		expect(() => validateModelProvider("")).toThrow("Invalid model");
	});

	test("validateModelProvider rejects similar but wrong names", () => {
		expect(() => validateModelProvider("Gemini")).toThrow("Invalid model");
		expect(() => validateModelProvider("Claude")).toThrow("Invalid model");
		expect(() => validateModelProvider("gpt-4")).toThrow("Invalid model");
	});
});
