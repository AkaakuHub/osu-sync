import type { QueueEntry } from "../hooks/useApiClient";

export function beatmapName(entry: QueueEntry, showUnicode: boolean) {
	const artist =
		(showUnicode && entry.artist_unicode ? entry.artist_unicode : entry.artist) || "Unknown artist";
	const title =
		(showUnicode && entry.title_unicode ? entry.title_unicode : entry.title) ||
		`Set ${entry.set_id}`;
	return showUnicode
		? `${artist} - ${title}`
		: `${artist.normalize("NFKC")} - ${title.normalize("NFKC")}`;
}
