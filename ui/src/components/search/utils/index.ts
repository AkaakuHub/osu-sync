import { DEFAULT_FILTERS, type SearchFilters } from "../types";

export function activeFilterFlags(filters: Partial<SearchFilters>) {
	return {
		sort:
			(filters.sortField ?? DEFAULT_FILTERS.sortField) !== DEFAULT_FILTERS.sortField ||
			(filters.sortOrder ?? DEFAULT_FILTERS.sortOrder) !== DEFAULT_FILTERS.sortOrder,
		status: Boolean(filters.status && filters.status !== "any"),
		mode: Boolean(filters.mode && filters.mode !== "null"),
		extra: Boolean(filters.extra?.length),
		general: Boolean(filters.general?.length),
		genre: Boolean(filters.genre?.length),
		language: Boolean(filters.language?.length),
		nsfw: filters.nsfw === true,
		played: Boolean(filters.played && filters.played !== "any"),
		rank: Boolean(filters.rank?.length),
	};
}

export function hasActiveFilters(filters: Partial<SearchFilters>): boolean {
	return Object.values(activeFilterFlags(filters)).some(Boolean);
}

export function resetFilters(): SearchFilters {
	return { ...DEFAULT_FILTERS };
}

export function toggleArrayFilter<T>(current: T[], item: T): T[] {
	return current.includes(item) ? current.filter((value) => value !== item) : [...current, item];
}
