import { getDateSearchField } from "./dateSearch";
import type { SearchFilters } from "./types";

export function buildSearchParams(query: string, active: SearchFilters, page = 1) {
	const dateField = getDateSearchField(active.sortField);
	const terms = [
		query.trim(),
		active.dateAfter && `${dateField}>=${active.dateAfter}`,
		active.dateBefore && `${dateField}<=${active.dateBefore}`,
	].filter(Boolean);
	const params = new URLSearchParams({ q: terms.join(" "), page: String(page), limit: "20" });

	params.set("s", active.status);
	if (active.mode !== "null") params.set("m", active.mode);
	if (active.genre.length > 0) params.set("g", active.genre.join(","));
	if (active.language.length > 0) params.set("l", active.language.join(","));
	if (active.extra.length > 0) params.set("e", active.extra.join("."));
	if (active.general.length > 0) params.set("c", active.general.join("."));
	params.set("nsfw", String(active.nsfw));
	if (active.played && active.played !== "any") params.set("played", active.played);
	if (active.rank?.length) params.set("r", active.rank.join("."));
	params.set("sort", `${active.sortField}_${active.sortOrder}`);

	return params;
}
