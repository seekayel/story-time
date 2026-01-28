import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function readFileIfExists(path: string): string | null {
	if (!existsSync(path)) {
		return null;
	}
	return readFileSync(path, "utf-8");
}

export function writeFileEnsureDir(path: string, content: string): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content, "utf-8");
}

export function extractFeedback(content: string): string[] {
	const feedbackRegex = /<!--\s*FEEDBACK:\s*(.*?)\s*-->/g;
	const matches: string[] = [];
	let match: RegExpExecArray | null;
	match = feedbackRegex.exec(content);
	while (match !== null) {
		if (match[1]) {
			matches.push(match[1]);
		}
		match = feedbackRegex.exec(content);
	}
	return matches;
}
