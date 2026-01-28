import { describe, expect, test } from "bun:test";
import { extractFeedback } from "../src/lib/files.ts";

describe("extractFeedback", () => {
	test("extracts feedback comments from markdown", () => {
		const content = `# Character Brief

Some content here.

<!-- FEEDBACK: Make the dialogue more playful here -->

More content.

<!-- FEEDBACK: Add more backstory -->
`;
		const feedback = extractFeedback(content);
		expect(feedback).toHaveLength(2);
		expect(feedback[0]).toBe("Make the dialogue more playful here");
		expect(feedback[1]).toBe("Add more backstory");
	});

	test("returns empty array when no feedback found", () => {
		const content = "# Just a regular document\n\nNo feedback here.";
		const feedback = extractFeedback(content);
		expect(feedback).toHaveLength(0);
	});

	test("handles feedback with extra whitespace", () => {
		const content = "<!--   FEEDBACK:   Trim this   -->";
		const feedback = extractFeedback(content);
		expect(feedback).toHaveLength(1);
		expect(feedback[0]).toBe("Trim this");
	});
});
