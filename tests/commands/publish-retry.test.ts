import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { join } from "node:path";
import {
	cleanupTestDir,
	createTestShow,
	writeEpisodeAudio,
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

const TEST_DIR = join(import.meta.dir, "..", "..", ".test-shows-publish-retry");

describe("publish command retry logic", () => {
	let showPath: string;
	const originalEnv = { ...process.env };

	beforeEach(() => {
		cleanupTestDir(TEST_DIR);
		showPath = createTestShow(TEST_DIR, "test-show");
		process.env.PODCAST_RSS_ENDPOINT = "https://test-podcast.example.com/api";
		process.env.PODCAST_API_KEY = "test-podcast-key";
	});

	afterEach(() => {
		cleanupTestDir(TEST_DIR);
		process.env = { ...originalEnv };
	});

	test("retries on transient 500 errors and succeeds", async () => {
		writeEpisodeAudio(showPath, 1, 1);

		let callCount = 0;
		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => {
				callCount++;
				if (callCount <= 2) {
					return new Response("Internal Server Error", { status: 500 });
				}
				return new Response("OK", { status: 200 });
			},
		);

		try {
			const { publish } = await import("../../src/commands/publish.ts");
			await publish({ show: showPath, season: 1 });

			// Initial attempt + 2 retries = 3 calls
			expect(mockFetch.mock.calls.length).toBe(3);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("does not retry on 400 client errors", async () => {
		writeEpisodeAudio(showPath, 1, 1);

		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response("Bad Request", { status: 400 }),
		);

		try {
			const { publish } = await import("../../src/commands/publish.ts");
			// Publish logs errors but does not throw for API failures
			await publish({ show: showPath, season: 1 });

			// Should only call once since 400 is not retryable
			expect(mockFetch).toHaveBeenCalledTimes(1);
		} finally {
			mockFetch.mockRestore();
		}
	});

	test("retries on 503 service unavailable and eventually fails gracefully", async () => {
		writeEpisodeAudio(showPath, 1, 1);

		const mockFetch = spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response("Service Unavailable", { status: 503 }),
		);

		try {
			const { publish } = await import("../../src/commands/publish.ts");
			// Publish should not throw, it logs errors
			await publish({ show: showPath, season: 1 });

			// Initial + 3 retries = 4 calls
			expect(mockFetch.mock.calls.length).toBe(4);
		} finally {
			mockFetch.mockRestore();
		}
	});
});
