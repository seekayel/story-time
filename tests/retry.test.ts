import { describe, expect, test } from "bun:test";
import { isRetryableStatusCode, withRetry } from "../src/lib/retry.ts";

describe("withRetry", () => {
	test("returns result on first success", async () => {
		const result = await withRetry(async () => "success", {
			maxRetries: 3,
			initialDelayMs: 1,
		});
		expect(result).toBe("success");
	});

	test("retries on failure and succeeds", async () => {
		let attempts = 0;
		const result = await withRetry(
			async () => {
				attempts++;
				if (attempts < 3) {
					throw new Error("transient failure");
				}
				return "recovered";
			},
			{ maxRetries: 3, initialDelayMs: 1 },
		);
		expect(result).toBe("recovered");
		expect(attempts).toBe(3);
	});

	test("throws after exhausting all retries", async () => {
		let attempts = 0;
		await expect(
			withRetry(
				async () => {
					attempts++;
					throw new Error("persistent failure");
				},
				{ maxRetries: 2, initialDelayMs: 1 },
			),
		).rejects.toThrow("persistent failure");
		// 1 initial + 2 retries = 3 attempts
		expect(attempts).toBe(3);
	});

	test("calls onRetry callback before each retry", async () => {
		const retryCalls: Array<{ attempt: number; delayMs: number }> = [];
		let attempts = 0;

		await withRetry(
			async () => {
				attempts++;
				if (attempts < 3) {
					throw new Error("fail");
				}
				return "ok";
			},
			{
				maxRetries: 3,
				initialDelayMs: 10,
				backoffMultiplier: 2,
				onRetry: (attempt, delayMs) => {
					retryCalls.push({ attempt, delayMs });
				},
			},
		);

		expect(retryCalls).toEqual([
			{ attempt: 1, delayMs: 10 },
			{ attempt: 2, delayMs: 20 },
		]);
	});

	test("respects isRetryable predicate", async () => {
		let attempts = 0;

		await expect(
			withRetry(
				async () => {
					attempts++;
					const err = new Error("not retryable");
					(err as Error & { code: string }).code = "AUTH_FAILED";
					throw err;
				},
				{
					maxRetries: 3,
					initialDelayMs: 1,
					isRetryable: (error) => {
						return !(
							error &&
							typeof error === "object" &&
							"code" in error &&
							(error as { code: string }).code === "AUTH_FAILED"
						);
					},
				},
			),
		).rejects.toThrow("not retryable");

		// Should only attempt once since error is not retryable
		expect(attempts).toBe(1);
	});

	test("respects maxDelayMs cap", async () => {
		const delays: number[] = [];

		await expect(
			withRetry(
				async () => {
					throw new Error("fail");
				},
				{
					maxRetries: 4,
					initialDelayMs: 100,
					backoffMultiplier: 10,
					maxDelayMs: 500,
					onRetry: (_attempt, delayMs) => {
						delays.push(delayMs);
					},
				},
			),
		).rejects.toThrow("fail");

		// Delays: 100, min(1000, 500)=500, min(5000, 500)=500, min(50000, 500)=500
		expect(delays).toEqual([100, 500, 500, 500]);
	});

	test("works with zero retries (no retry)", async () => {
		let attempts = 0;
		await expect(
			withRetry(
				async () => {
					attempts++;
					throw new Error("no retry");
				},
				{ maxRetries: 0, initialDelayMs: 1 },
			),
		).rejects.toThrow("no retry");
		expect(attempts).toBe(1);
	});
});

describe("isRetryableStatusCode", () => {
	test("returns true for 408 (Request Timeout)", () => {
		expect(isRetryableStatusCode(408)).toBe(true);
	});

	test("returns true for 429 (Too Many Requests)", () => {
		expect(isRetryableStatusCode(429)).toBe(true);
	});

	test("returns true for 500 (Internal Server Error)", () => {
		expect(isRetryableStatusCode(500)).toBe(true);
	});

	test("returns true for 502 (Bad Gateway)", () => {
		expect(isRetryableStatusCode(502)).toBe(true);
	});

	test("returns true for 503 (Service Unavailable)", () => {
		expect(isRetryableStatusCode(503)).toBe(true);
	});

	test("returns true for 504 (Gateway Timeout)", () => {
		expect(isRetryableStatusCode(504)).toBe(true);
	});

	test("returns false for 400 (Bad Request)", () => {
		expect(isRetryableStatusCode(400)).toBe(false);
	});

	test("returns false for 401 (Unauthorized)", () => {
		expect(isRetryableStatusCode(401)).toBe(false);
	});

	test("returns false for 403 (Forbidden)", () => {
		expect(isRetryableStatusCode(403)).toBe(false);
	});

	test("returns false for 404 (Not Found)", () => {
		expect(isRetryableStatusCode(404)).toBe(false);
	});

	test("returns false for 200 (OK)", () => {
		expect(isRetryableStatusCode(200)).toBe(false);
	});
});
