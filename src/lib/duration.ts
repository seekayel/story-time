import type { Script } from "./schemas.ts";

/**
 * Average speech rates by language in words per minute.
 * Source: typical audiobook/narration rates for children's content.
 * Children's content is read slightly slower than adult content.
 */
const SPEECH_RATES_WPM: Record<string, number> = {
	en: 130, // English children's narration
	es: 140, // Spanish children's narration (slightly faster syllable rate)
};

const DEFAULT_WPM = 130;

/**
 * Average pause between dialogue beats in seconds.
 * Accounts for character transitions and dramatic pauses.
 */
const BEAT_PAUSE_SECONDS = 1.5;

/**
 * Average pause between scenes in seconds.
 */
const SCENE_PAUSE_SECONDS = 3;

/**
 * Average duration for non-verbal action beats in seconds.
 */
const ACTION_BEAT_SECONDS = 2;

export interface DurationEstimate {
	/** Estimated total duration in seconds */
	totalSeconds: number;
	/** Estimated total duration in minutes (rounded to 1 decimal) */
	totalMinutes: number;
	/** Total dialogue word count */
	dialogueWordCount: number;
	/** Number of dialogue beats */
	dialogueBeatCount: number;
	/** Number of action-only beats */
	actionBeatCount: number;
	/** Number of scenes */
	sceneCount: number;
	/** Words per minute rate used */
	wpm: number;
}

/**
 * Count words in a string. Splits on whitespace and filters empty strings.
 */
export function countWords(text: string): number {
	return text
		.trim()
		.split(/\s+/)
		.filter((w) => w.length > 0).length;
}

/**
 * Estimate the audio duration of a parsed script.
 *
 * Estimation approach:
 * - Dialogue words / speech rate = speech time
 * - Pauses between beats
 * - Pauses between scenes
 * - Time for non-verbal action beats
 */
export function estimateDuration(
	script: Script,
	language?: string,
): DurationEstimate {
	const wpm = SPEECH_RATES_WPM[language ?? "en"] ?? DEFAULT_WPM;

	let dialogueWordCount = 0;
	let dialogueBeatCount = 0;
	let actionBeatCount = 0;
	const sceneCount = script.scenes.length;

	for (const scene of script.scenes) {
		for (const beat of scene.beats) {
			if (beat.dialogue) {
				dialogueBeatCount++;
				dialogueWordCount += countWords(beat.dialogue);
			} else if (beat.action) {
				actionBeatCount++;
			}
		}
	}

	// Speech time from dialogue
	const speechSeconds = (dialogueWordCount / wpm) * 60;

	// Pauses between dialogue beats
	const beatPauseSeconds = dialogueBeatCount * BEAT_PAUSE_SECONDS;

	// Pauses between scenes
	const scenePauseSeconds = Math.max(0, sceneCount - 1) * SCENE_PAUSE_SECONDS;

	// Time for action beats (these are skipped in MVP synthesis but contribute to pacing)
	const actionSeconds = actionBeatCount * ACTION_BEAT_SECONDS;

	const totalSeconds =
		speechSeconds + beatPauseSeconds + scenePauseSeconds + actionSeconds;
	const totalMinutes = Math.round(totalSeconds / 6) / 10; // round to 1 decimal

	return {
		totalSeconds: Math.round(totalSeconds),
		totalMinutes,
		dialogueWordCount,
		dialogueBeatCount,
		actionBeatCount,
		sceneCount,
		wpm,
	};
}

/**
 * Format a duration estimate as a human-readable summary string.
 */
export function formatDurationEstimate(
	estimate: DurationEstimate,
	targetMinutes?: number,
): string {
	const lines: string[] = [];
	lines.push(
		`Estimated duration: ${estimate.totalMinutes} minutes (${estimate.totalSeconds}s)`,
	);
	lines.push(
		`  ${estimate.dialogueWordCount} words across ${estimate.dialogueBeatCount} dialogue beats`,
	);
	lines.push(
		`  ${estimate.sceneCount} scenes, ${estimate.actionBeatCount} action beats`,
	);
	lines.push(`  Speech rate: ${estimate.wpm} words/min`);

	if (targetMinutes !== undefined) {
		const diff = estimate.totalMinutes - targetMinutes;
		if (Math.abs(diff) < 1) {
			lines.push(`  Within target (${targetMinutes} min)`);
		} else if (diff > 0) {
			lines.push(
				`  ~${Math.round(diff)} min over target (${targetMinutes} min)`,
			);
		} else {
			lines.push(
				`  ~${Math.round(Math.abs(diff))} min under target (${targetMinutes} min)`,
			);
		}
	}

	return lines.join("\n");
}
