import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import {
	cleanupTestDir,
	createTestShow,
	writeTranslatedScript,
} from "../helpers/fixtures.ts";

// Mock the retry module to use zero-delay sleep
mock.module("../../src/lib/retry.ts", () => {
	async function withRetry<T>(
		fn: () => Promise<T>,
		options?: {
			maxRetries?: number;
			initialDelayMs?: number;
			backoffMultiplier?: number;
			maxDelayMs?: number;
			isRetryable?: (error: unknown) => boolean;
			onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
		},
	): Promise<T> {
		const maxRetries = options?.maxRetries ?? 3;
		const isRetryable = options?.isRetryable ?? (() => true);
		const onRetry = options?.onRetry ?? (() => {});
		const initialDelayMs = options?.initialDelayMs ?? 1000;
		const backoffMultiplier = options?.backoffMultiplier ?? 2;
		const maxDelayMs = options?.maxDelayMs ?? 30000;

		let lastError: unknown;
		let delay = initialDelayMs;

		for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error;
				if (attempt > maxRetries || !isRetryable(error)) {
					throw error;
				}
				onRetry(attempt, delay, error);
				// No sleep - instant retry for tests
				delay = Math.min(delay * backoffMultiplier, maxDelayMs);
			}
		}
		throw lastError;
	}

	function isRetryableStatusCode(status: number): boolean {
		if (status === 408 || status === 429) return true;
		return status >= 500;
	}

	return { withRetry, isRetryableStatusCode };
});

const TEST_DIR = join(
	import.meta.dir,
	"..",
	"..",
	".test-shows-synthesize-retry",
);

const VALID_SCRIPT_YAML = YAML.stringify({
	title: "The Beginning",
	episode: 1,
	season: 1,
	scenes: [
		{
			location: "Ship deck",
			beats: [
				{
					character: "Hero",
					dialogue: "Let's go on an adventure!",
					direction: "excitedly",
				},
				{
					character: "Sidekick",
					dialogue: "Right behind you!",
				},
			],
		},
	],
});

describe("synthesize command retry logic", () => {
	let showPath: string;
	const originalEnv = { ...process.env };

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
		process.env.ELEVEN_LABS_API_KEY = "test-api-key";
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
		process.env = { ...originalEnv };
	});

	test("retries on transient 500 errors and succeeds", async () => {
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		let callCount = 0;
		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => {
				callCount++;
				if (callCount <= 2) {
					return new Response("Internal Server Error", { status: 500 });
				}
				return new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), {
					status: 200,
					headers: { "Content-Type": "audio/mpeg" },
				});
			},
		);

		try {
			const { synthesize } = await import("../../src/commands/synthesize.ts");
			await synthesize("1", { show: showPath, season: 1 });

			const audioPath = join(
				showPath,
				"seasons",
				"season-01",
				"episodes",
				"ep-01",
				"audio.mp3",
			);
			expect(existsSync(audioPath)).toBe(true);
			// First beat fails twice then succeeds (3 calls),
			// second beat succeeds (1 call) = 4 total
			expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(3);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("does not retry on 401 unauthorized errors", async () => {
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response("Unauthorized", { status: 401 }),
		);

		try {
			const { synthesize } = await import("../../src/commands/synthesize.ts");
			await expect(
				synthesize("1", { show: showPath, season: 1 }),
			).rejects.toThrow("ElevenLabs API error (401)");
			// Should only call once since 401 is not retryable
			expect(mockFetch).toHaveBeenCalledTimes(1);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("retries on 429 rate limit errors", async () => {
		writeTranslatedScript(
			showPath,
			1,
			1,
			"es",
			`\`\`\`yaml\n${VALID_SCRIPT_YAML}\`\`\``,
		);

		let callCount = 0;
		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => {
				callCount++;
				if (callCount === 1) {
					return new Response("Rate Limited", { status: 429 });
				}
				return new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), {
					status: 200,
					headers: { "Content-Type": "audio/mpeg" },
				});
			},
		);

		try {
			const { synthesize } = await import("../../src/commands/synthesize.ts");
			await synthesize("1", { show: showPath, season: 1 });

			const audioPath = join(
				showPath,
				"seasons",
				"season-01",
				"episodes",
				"ep-01",
				"audio.mp3",
			);
			expect(existsSync(audioPath)).toBe(true);
		} finally {
			mockFetch.mockRestore();
		}
	});
});
