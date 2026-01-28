import { join } from "node:path";
import YAML from "yaml";
import {
	getEpisodeDir,
	loadShowConfig,
	resolveShowPath,
} from "../lib/config.ts";
import { readFileIfExists, writeFileEnsureDir } from "../lib/files.ts";
import { type Script, scriptSchema } from "../lib/schemas.ts";

export async function synthesize(
	episodeNumber: string,
	options: { show?: string; season?: number },
): Promise<void> {
	const epNum = Number.parseInt(episodeNumber, 10);
	if (Number.isNaN(epNum) || epNum < 1) {
		throw new Error("Episode number must be a positive integer.");
	}

	const showPath = resolveShowPath(options.show);
	const config = loadShowConfig(showPath);
	const season = options.season ?? 1;
	const episodeDir = getEpisodeDir(showPath, season, epNum);
	const translatedPath = join(
		episodeDir,
		`script-${config.target_language}.md`,
	);
	const audioPath = join(episodeDir, "audio.mp3");

	console.log(
		`Synthesizing Episode ${epNum} audio: ${config.name} (Season ${season})`,
	);

	const scriptContent = readFileIfExists(translatedPath);
	if (!scriptContent) {
		throw new Error(
			`No translated script found for Episode ${epNum}. Run translate first.`,
		);
	}

	// Extract YAML from markdown
	const yamlMatch = scriptContent.match(/```yaml\n([\s\S]*?)```/);
	const yamlContent = yamlMatch ? yamlMatch[1] : scriptContent;

	let script: Script;
	try {
		const parsed = YAML.parse(yamlContent ?? "");
		script = scriptSchema.parse(parsed);
	} catch (err) {
		throw new Error(
			`Failed to parse script YAML: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	// Build voice map from config
	const voiceMap = new Map<string, string>();
	for (const character of config.characters) {
		if (character.voice_id) {
			voiceMap.set(character.name.toLowerCase(), character.voice_id);
		}
	}

	// Collect dialogue beats for synthesis
	const dialogueBeats: Array<{
		character: string;
		text: string;
		voiceId: string;
	}> = [];
	for (const scene of script.scenes) {
		for (const beat of scene.beats) {
			if (!beat.dialogue) continue; // Skip non-verbal actions
			const voiceId = voiceMap.get(beat.character.toLowerCase());
			if (!voiceId) {
				console.warn(
					`  Warning: No voice ID for character "${beat.character}", skipping.`,
				);
				continue;
			}
			dialogueBeats.push({
				character: beat.character,
				text: beat.dialogue,
				voiceId,
			});
		}
	}

	console.log(`  Found ${dialogueBeats.length} dialogue beats to synthesize.`);

	const apiKey = process.env.ELEVEN_LABS_API_KEY;
	if (!apiKey) {
		throw new Error("ELEVEN_LABS_API_KEY not set. Add it to your .env file.");
	}

	// Synthesize each beat and concatenate
	const audioChunks: Uint8Array[] = [];
	for (let i = 0; i < dialogueBeats.length; i++) {
		const beat = dialogueBeats[i];
		if (!beat) continue;
		console.log(
			`  [${i + 1}/${dialogueBeats.length}] ${beat.character}: "${beat.text.slice(0, 50)}..."`,
		);

		const response = await fetch(
			`https://api.elevenlabs.io/v1/text-to-speech/${beat.voiceId}`,
			{
				method: "POST",
				headers: {
					"xi-api-key": apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text: beat.text,
					model_id: "eleven_multilingual_v2",
				}),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`ElevenLabs API error (${response.status}): ${errorText}`,
			);
		}

		const buffer = new Uint8Array(await response.arrayBuffer());
		audioChunks.push(buffer);
	}

	// Concatenate audio chunks (simple concatenation — works for MP3)
	const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const combined = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of audioChunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}

	writeFileEnsureDir(audioPath, ""); // Create dir
	await Bun.write(audioPath, combined);
	console.log(`  Wrote ${audioPath}`);
	console.log("Audio synthesis complete.");
}
