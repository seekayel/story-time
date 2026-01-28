import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { initShow } from "../src/commands/init.ts";

const TEST_SHOWS_DIR = join(import.meta.dir, "..", "shows");
const TEST_SHOW_NAME = "test-show-unit";

describe("initShow", () => {
	beforeEach(() => {
		// Clean up test show if it exists
		const showPath = join(TEST_SHOWS_DIR, TEST_SHOW_NAME);
		if (existsSync(showPath)) {
			rmSync(showPath, { recursive: true });
		}
	});

	afterEach(() => {
		const showPath = join(TEST_SHOWS_DIR, TEST_SHOW_NAME);
		if (existsSync(showPath)) {
			rmSync(showPath, { recursive: true });
		}
	});

	test("creates show directory structure", async () => {
		await initShow(TEST_SHOW_NAME);
		const showPath = join(TEST_SHOWS_DIR, TEST_SHOW_NAME);

		expect(existsSync(showPath)).toBe(true);
		expect(existsSync(join(showPath, "characters"))).toBe(true);
		expect(existsSync(join(showPath, "seasons"))).toBe(true);
		expect(existsSync(join(showPath, "show.yaml"))).toBe(true);
	});

	test("creates valid show.yaml", async () => {
		await initShow(TEST_SHOW_NAME);
		const showPath = join(TEST_SHOWS_DIR, TEST_SHOW_NAME);
		const configContent = readFileSync(join(showPath, "show.yaml"), "utf-8");
		const config = YAML.parse(configContent);

		expect(config.name).toBe(TEST_SHOW_NAME);
		expect(config.target_language).toBe("es");
		expect(config.source_language).toBe("en");
		expect(config.episodes_per_season).toBe(24);
		expect(config.characters).toBeArray();
		expect(config.characters.length).toBeGreaterThan(0);
	});

	test("throws if show already exists", async () => {
		await initShow(TEST_SHOW_NAME);
		expect(initShow(TEST_SHOW_NAME)).rejects.toThrow(
			"Show directory already exists",
		);
	});
});
