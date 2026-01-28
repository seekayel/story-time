/**
 * Parse an episode range string into an array of episode numbers.
 *
 * Supported formats:
 *   "3"       → [3]
 *   "1-5"     → [1, 2, 3, 4, 5]
 *   "1,3,5"   → [1, 3, 5]
 *   "1-3,7,9-11" → [1, 2, 3, 7, 9, 10, 11]
 */
export function parseEpisodeRange(input: string): number[] {
	const episodes: Set<number> = new Set();
	const parts = input.split(",");

	for (const part of parts) {
		const trimmed = part.trim();
		if (trimmed === "") continue;

		if (trimmed.includes("-")) {
			const [startStr, endStr] = trimmed.split("-");
			const start = Number.parseInt(startStr?.trim() ?? "", 10);
			const end = Number.parseInt(endStr?.trim() ?? "", 10);

			if (Number.isNaN(start) || Number.isNaN(end) || start < 1 || end < 1) {
				throw new Error(
					`Invalid episode range: "${trimmed}". Use positive integers, e.g. "1-5".`,
				);
			}
			if (start > end) {
				throw new Error(
					`Invalid episode range: "${trimmed}". Start must not be greater than end.`,
				);
			}
			for (let i = start; i <= end; i++) {
				episodes.add(i);
			}
		} else {
			const num = Number.parseInt(trimmed, 10);
			if (Number.isNaN(num) || num < 1) {
				throw new Error(
					`Invalid episode number: "${trimmed}". Must be a positive integer.`,
				);
			}
			episodes.add(num);
		}
	}

	if (episodes.size === 0) {
		throw new Error("No episode numbers provided.");
	}

	return [...episodes].sort((a, b) => a - b);
}

/**
 * Resolve episode numbers from either --all flag or a range string.
 * When --all is used, returns [1..episodesPerSeason].
 */
export function resolveEpisodes(
	episodeArg: string | undefined,
	all: boolean,
	episodesPerSeason: number,
): number[] {
	if (all) {
		return Array.from({ length: episodesPerSeason }, (_, i) => i + 1);
	}
	if (!episodeArg) {
		throw new Error(
			"Episode number or range required. Use a number (1), range (1-5), list (1,3,5), or --all.",
		);
	}
	return parseEpisodeRange(episodeArg);
}
