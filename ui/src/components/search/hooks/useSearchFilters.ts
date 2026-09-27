import { useCallback, useEffect, useRef, useState } from "react";
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
	onFiltersChange?: (filters: SearchFilters) => void;
	initialFilters?: SearchFilters | null;
	searchQuery?: string;
};

export function useSearchFilters({ onFiltersChange, initialFilters, searchQuery = "" }: Options) {
	const [filters, setFilters] = useState<SearchFilters>(() => initialFilters ?? resetFilters());
	const previousQuery = useRef("");

	useEffect(() => {
		if (initialFilters) setFilters(initialFilters);
	}, [initialFilters]);

	useEffect(() => {
		if (previousQuery.current.trim() === "" && searchQuery.trim() !== "") {
			setFilters((current) =>
				current.sortField === DEFAULT_FILTERS.sortField
					? { ...current, sortField: "relevance" }
					: current,
			);
		}
		previousQuery.current = searchQuery;
	}, [searchQuery]);

	useEffect(() => {
		onFiltersChange?.(filters);
	}, [filters, onFiltersChange]);

	const setSort = useCallback((sortField: SortField, sortOrder: SortOrder) => {
		setFilters((current) => ({ ...current, sortField, sortOrder }));
	}, []);
	const setStatus = useCallback((status: StatusFilter) => {
		setFilters((current) => ({ ...current, status }));
	}, []);
	const setMode = useCallback((mode: GameMode) => {
		setFilters((current) => ({ ...current, mode }));
	}, []);
	const toggleExtra = useCallback((extra: ExtraFilter) => {
		setFilters((current) => ({ ...current, extra: toggleArrayFilter(current.extra, extra) }));
	}, []);
	const toggleGeneral = useCallback((general: GeneralFilter) => {
		setFilters((current) => ({
			...current,
			general: toggleArrayFilter(current.general, general),
		}));
	}, []);
	const toggleGenre = useCallback((genre: string) => {
		setFilters((current) => ({
			...current,
			genre: genre === "any" ? [] : toggleArrayFilter(current.genre, genre),
		}));
	}, []);
	const toggleLanguage = useCallback((language: string) => {
		setFilters((current) => ({
			...current,
			language: language === "any" ? [] : toggleArrayFilter(current.language, language),
		}));
	}, []);
	const setNsfw = useCallback((nsfw: boolean) => {
		setFilters((current) => ({ ...current, nsfw }));
	}, []);
	const setPlayed = useCallback((played: PlayedFilter) => {
		setFilters((current) => ({ ...current, played }));
	}, []);
	const toggleRank = useCallback((rank: RankFilter) => {
		setFilters((current) => ({
			...current,
			rank: toggleArrayFilter(current.rank ?? [], rank),
		}));
	}, []);
	const resetAllFilters = useCallback(() => setFilters(resetFilters()), []);

	return {
		filters,
		setSort,
		setStatus,
		setMode,
		toggleExtra,
		toggleGeneral,
		toggleGenre,
		toggleLanguage,
		setNsfw,
		setPlayed,
		toggleRank,
		resetAllFilters,
	};
}
