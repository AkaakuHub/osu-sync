import { useCallback, useEffect, useRef } from "react";
import { getDateSearchField } from "../dateSearch";
import {
	DEFAULT_FILTERS,
	type ExtraFilter,
	type GameMode,
	type GeneralFilter,
	type PlayedFilter,
	type RankFilter,
	type SearchFilters,
	type SortField,
	type SortOrder,
	type StatusFilter,
} from "../types";
import { resetFilters, toggleArrayFilter } from "../utils";

type Options = {
	onFiltersChange: (filters: SearchFilters) => void;
	filters: SearchFilters;
	searchQuery?: string;
};

export function useSearchFilters({ onFiltersChange, filters, searchQuery = "" }: Options) {
	const setFilters = useCallback(
		(change: (current: SearchFilters) => SearchFilters) => onFiltersChange(change(filters)),
		[filters, onFiltersChange],
	);
	const previousQuery = useRef("");

	useEffect(() => {
		if (previousQuery.current.trim() === "" && searchQuery.trim() !== "") {
			setFilters((current) =>
				current.sortField === DEFAULT_FILTERS.sortField
					? { ...current, sortField: "relevance" }
					: current,
			);
		}
		previousQuery.current = searchQuery;
	}, [searchQuery, setFilters]);

	const setSort = useCallback(
		(sortField: SortField, sortOrder: SortOrder) => {
			setFilters((current) => ({ ...current, sortField, sortOrder }));
		},
		[setFilters],
	);
	const setStatus = useCallback(
		(status: StatusFilter) => {
			setFilters((current) => ({ ...current, status }));
		},
		[setFilters],
	);
	const setMode = useCallback(
		(mode: GameMode) => {
			setFilters((current) => ({ ...current, mode }));
		},
		[setFilters],
	);
	const toggleExtra = useCallback(
		(extra: ExtraFilter) => {
			setFilters((current) => ({ ...current, extra: toggleArrayFilter(current.extra, extra) }));
		},
		[setFilters],
	);
	const toggleGeneral = useCallback(
		(general: GeneralFilter) => {
			setFilters((current) => ({
				...current,
				general: toggleArrayFilter(current.general, general),
			}));
		},
		[setFilters],
	);
	const toggleGenre = useCallback(
		(genre: string) => {
			setFilters((current) => ({
				...current,
				genre: genre === "any" ? [] : toggleArrayFilter(current.genre, genre),
			}));
		},
		[setFilters],
	);
	const toggleLanguage = useCallback(
		(language: string) => {
			setFilters((current) => ({
				...current,
				language: language === "any" ? [] : toggleArrayFilter(current.language, language),
			}));
		},
		[setFilters],
	);
	const setNsfw = useCallback(
		(nsfw: boolean) => {
			setFilters((current) => ({ ...current, nsfw }));
		},
		[setFilters],
	);
	const setDateRange = useCallback(
		(dateAfter: string, dateBefore: string) => {
			setFilters((current) => ({
				...current,
				dateAfter,
				dateBefore,
				sortField:
					dateAfter || dateBefore ? getDateSearchField(current.sortField) : current.sortField,
				sortOrder: dateAfter || dateBefore ? "desc" : current.sortOrder,
			}));
		},
		[setFilters],
	);
	const setPlayed = useCallback(
		(played: PlayedFilter) => {
			setFilters((current) => ({ ...current, played }));
		},
		[setFilters],
	);
	const toggleRank = useCallback(
		(rank: RankFilter) => {
			setFilters((current) => ({
				...current,
				rank: toggleArrayFilter(current.rank ?? [], rank),
			}));
		},
		[setFilters],
	);
	const resetAllFilters = useCallback(() => onFiltersChange(resetFilters()), [onFiltersChange]);

	return {
		setSort,
		setStatus,
		setMode,
		toggleExtra,
		toggleGeneral,
		toggleGenre,
		toggleLanguage,
		setNsfw,
		setDateRange,
		setPlayed,
		toggleRank,
		resetAllFilters,
	};
}
