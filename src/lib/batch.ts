/**
 * Run a command function for each episode in a list, collecting errors
 * rather than aborting the entire batch on a single failure.
 */
export async function runBatch(
	episodes: number[],
	commandName: string,
	fn: (episodeNumber: string) => Promise<void>,
): Promise<void> {
	const failed: Array<{ episode: number; error: string }> = [];

	console.log(
		`\nBatch ${commandName}: processing ${episodes.length} episode(s) [${formatRange(episodes)}]\n`,
	);

	for (const ep of episodes) {
		try {
			await fn(String(ep));
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`  Error on episode ${ep}: ${message}\n`);
			failed.push({ episode: ep, error: message });
		}
	}

	console.log(`\nBatch ${commandName} complete.`);
	console.log(
		`  Processed: ${episodes.length}, Succeeded: ${episodes.length - failed.length}, Failed: ${failed.length}`,
	);

	if (failed.length > 0) {
		console.log("  Failures:");
		for (const f of failed) {
			console.log(`    Episode ${f.episode}: ${f.error}`);
		}
	}
}

function formatRange(episodes: number[]): string {
	if (episodes.length <= 5) {
		return episodes.join(", ");
	}
	return `${episodes[0]}-${episodes[episodes.length - 1]}`;
}
