import YAML from "yaml";
import { type Script, scriptSchema } from "./schemas.ts";

/**
 * Extract YAML content from a markdown string that may contain a ```yaml code block.
 * Returns the raw YAML string (without fences) or the original string if no code block found.
 */
export function extractYaml(content: string): string {
	const match = content.match(/```yaml\n([\s\S]*?)```/);
	return match?.[1] ?? content;
}

/**
 * Validate that a string contains valid script YAML matching the scriptSchema.
 * Returns the parsed Script on success, or an error message string on failure.
 */
export function validateScriptYaml(
	content: string,
): { ok: true; script: Script } | { ok: false; error: string } {
	const yamlContent = extractYaml(content);
	try {
		const parsed = YAML.parse(yamlContent);
		const script = scriptSchema.parse(parsed);
		return { ok: true, script };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, error: message };
	}
}
