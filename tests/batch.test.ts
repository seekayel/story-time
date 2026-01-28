import { describe, expect, test } from "bun:test";
import { runBatch } from "../src/lib/batch.ts";

describe("runBatch", () => {
	test("calls function for each episode in order", async () => {
		const called: number[] = [];
		await runBatch([1, 2, 3], "test-command", async (ep) => {
			called.push(Number.parseInt(ep, 10));
		});
		expect(called).toEqual([1, 2, 3]);
	});

	test("continues processing after an error", async () => {
		const called: number[] = [];
		await runBatch([1, 2, 3], "test-command", async (ep) => {
			const num = Number.parseInt(ep, 10);
			called.push(num);
			if (num === 2) {
				throw new Error("Episode 2 failed");
			}
		});
		expect(called).toEqual([1, 2, 3]);
	});

	test("does not throw even when all episodes fail", async () => {
		await expect(
			runBatch([1, 2], "test-command", async () => {
				throw new Error("fail");
			}),
		).resolves.toBeUndefined();
	});

	test("handles single episode", async () => {
		const called: string[] = [];
		await runBatch([5], "test-command", async (ep) => {
			called.push(ep);
		});
		expect(called).toEqual(["5"]);
	});

	test("handles empty episode list", async () => {
		const called: string[] = [];
		await runBatch([], "test-command", async (ep) => {
			called.push(ep);
		});
		expect(called).toEqual([]);
	});
});
