export interface RetryOptions {
	/** Maximum number of retry attempts (not counting the initial attempt). Default: 3 */
	maxRetries?: number;
	/** Initial delay in milliseconds before the first retry. Default: 1000 */
	initialDelayMs?: number;
	/** Multiplier applied to delay after each retry. Default: 2 */
	backoffMultiplier?: number;
	/** Maximum delay in milliseconds between retries. Default: 30000 */
	maxDelayMs?: number;
	/** Determines whether an error is retryable. Default: all errors are retryable. */
	isRetryable?: (error: unknown) => boolean;
	/** Called before each retry with attempt number and delay. */
	onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	initialDelayMs: 1000,
	backoffMultiplier: 2,
	maxDelayMs: 30000,
	isRetryable: () => true,
	onRetry: () => {},
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 * The initial call counts as attempt 1; retries start at attempt 2.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options?: RetryOptions,
): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: unknown;
	let delay = opts.initialDelayMs;

	for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt > opts.maxRetries || !opts.isRetryable(error)) {
				throw error;
			}

			opts.onRetry(attempt, delay, error);
			await sleep(delay);
			delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
		}
	}

	// Should not reach here, but satisfy TypeScript
	throw lastError;
}

/**
 * Check if an HTTP response status code is retryable (transient error).
 * Retryable: 408 (Timeout), 429 (Rate Limit), 500+.
 * Non-retryable: 4xx client errors (except 408, 429).
 */
export function isRetryableStatusCode(status: number): boolean {
	if (status === 408 || status === 429) return true;
	return status >= 500;
}
