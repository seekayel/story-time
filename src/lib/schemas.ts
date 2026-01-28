import { z } from "zod";

export const characterSchema = z.object({
	name: z.string(),
	voice_id: z.string().optional(),
});

export const narratorSchema = z.object({
	enabled: z.boolean().default(false),
	voice_id: z.string().nullable().default(null),
});

export const contentGuidelinesSchema = z.object({
	rating: z.string().default("PG-13"),
	themes_to_avoid: z.array(z.string()).default([]),
});

export const showConfigSchema = z.object({
	name: z.string(),
	description: z.string(),
	setting: z.string(),
	target_language: z.string().default("es"),
	source_language: z.string().default("en"),
	episodes_per_season: z.number().int().positive().default(24),
	episode_duration_minutes: z.number().positive().default(25),
	narrator: narratorSchema.default({ enabled: false, voice_id: null }),
	characters: z.array(characterSchema).min(1),
	content_guidelines: contentGuidelinesSchema.default({
		rating: "PG-13",
		themes_to_avoid: [],
	}),
});

export type ShowConfig = z.infer<typeof showConfigSchema>;
export type Character = z.infer<typeof characterSchema>;

export const scriptBeatSchema = z.object({
	character: z.string(),
	dialogue: z.string().optional(),
	action: z.string().optional(),
	direction: z.string().optional(),
});

export const sceneSchema = z.object({
	location: z.string(),
	beats: z.array(scriptBeatSchema),
});

export const scriptSchema = z.object({
	title: z.string(),
	episode: z.number(),
	season: z.number(),
	scenes: z.array(sceneSchema),
});

export type Script = z.infer<typeof scriptSchema>;
export type ScriptBeat = z.infer<typeof scriptBeatSchema>;
export type Scene = z.infer<typeof sceneSchema>;
