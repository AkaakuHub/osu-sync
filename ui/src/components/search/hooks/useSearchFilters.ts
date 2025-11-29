// 検索フィルター用のカスタムフック
import { useState, useEffect, useCallback } from "react";
import {
	SearchFilters,
	SortField,
	SortOrder,
	StatusFilter,
	GameMode,
	ExtraFilter,
	GeneralFilter,
	PlayedFilter,
	RankFilter,
	AdvancedSearchQuery,
	Genre,
	Language,
} from "../types";
import {
	filtersToParams,
	advancedQueryToString,
	parseAdvancedQuery,
	resetFilters,
	resetFilterType,
	toggleArrayFilter,
	getDefaultSortField,
	hasActiveFilters,
	needsSupporter,
} from "../utils";

interface UseSearchFiltersOptions {
	onFiltersChange?: (filters: SearchFilters) => void;
}

export function useSearchFilters(options: UseSearchFiltersOptions = {}) {
	const { onFiltersChange } = options;

	// フィルター状態の初期化
	const [filters, setFiltersState] = useState<SearchFilters>(() => {
		return resetFilters();
	});

	// ジャンルと言語のデータ（将来的にAPIから取得）
	const [genres] = useState<Genre[]>([]);
	const [languages] = useState<Language[]>([]);

	// フィルター変更通知
	useEffect(() => {
		onFiltersChange?.(filters);
	}, [filters, onFiltersChange]);

	// フィルター更新関数
	const setFilters = useCallback((newFilters: Partial<SearchFilters>) => {
		setFiltersState((prev) => {
			const updated = { ...prev, ...newFilters };

			// ソートフィールドが未設定の場合は自動設定
			if (!newFilters.sortField && !prev.sortField) {
				updated.sortField = getDefaultSortField(updated);
			}

			return updated;
		});
	}, []);

	// ソート設定
	const setSort = useCallback(
		(field: SortField, order: SortOrder) => {
			setFilters({ sortField: field, sortOrder: order });
		},
		[setFilters],
	);

	// ステータス設定
	const setStatus = useCallback(
		(status: StatusFilter) => {
			setFilters({ status });
		},
		[setFilters],
	);

	// モード設定
	const setMode = useCallback(
		(mode: GameMode) => {
			setFilters({ mode });
		},
		[setFilters],
	);

	// エクストラフィルター設定
	const setExtra = useCallback(
		(extra: ExtraFilter[]) => {
			setFilters({ extra });
		},
		[setFilters],
	);

	// エクストラフィルターの切り替え
	const toggleExtra = useCallback((extra: ExtraFilter) => {
		setFiltersState((prev) => ({
			...prev,
			extra: toggleArrayFilter(prev.extra, extra),
		}));
	}, []);

	// 一般フィルター設定
	const setGeneral = useCallback(
		(general: GeneralFilter[]) => {
			setFilters({ general });
		},
		[setFilters],
	);

	// 一般フィルターの切り替え
	const toggleGeneral = useCallback((general: GeneralFilter) => {
		setFiltersState((prev) => ({
			...prev,
			general: toggleArrayFilter(prev.general, general),
		}));
	}, []);

	// ジャンル設定
	const setGenre = useCallback(
		(genre: string[]) => {
			setFilters({ genre });
		},
		[setFilters],
	);

	// ジャンルの切り替え
	const toggleGenre = useCallback((genreId: string) => {
		setFiltersState((prev) => ({
			...prev,
			genre: toggleArrayFilter(prev.genre, genreId),
		}));
	}, []);

	// 言語設定
	const setLanguage = useCallback(
		(language: string[]) => {
			setFilters({ language });
		},
		[setFilters],
	);

	// 言語の切り替え
	const toggleLanguage = useCallback((languageId: string) => {
		setFiltersState((prev) => ({
			...prev,
			language: toggleArrayFilter(prev.language, languageId),
		}));
	}, []);

	// NSFW設定
	const setNsfw = useCallback(
		(nsfw: boolean) => {
			setFilters({ nsfw });
		},
		[setFilters],
	);

	// プレイ済みフィルター設定（サポーター用）
	const setPlayed = useCallback(
		(played: PlayedFilter) => {
			setFilters({ played });
		},
		[setFilters],
	);

	// ランクフィルター設定（サポーター用）
	const setRank = useCallback(
		(rank: RankFilter[]) => {
			setFilters({ rank });
		},
		[setFilters],
	);

	// ランクフィルターの切り替え（サポーター用）
	const toggleRank = useCallback((rank: RankFilter) => {
		setFiltersState((prev) => ({
			...prev,
			rank: toggleArrayFilter(prev.rank || [], rank),
		}));
	}, []);

	// 高度な検索クエリ設定
	const setAdvancedQuery = useCallback(
		(query: AdvancedSearchQuery) => {
			setFilters({ advancedQuery: query });
		},
		[setFilters],
	);

	// 高度な検索クエリ文字列から設定
	const setAdvancedQueryString = useCallback(
		(queryString: string) => {
			const query = parseAdvancedQuery(queryString);
			setAdvancedQuery(query);
		},
		[setAdvancedQuery],
	);

	// すべてのフィルターをリセット
	const resetAllFilters = useCallback(() => {
		setFilters(resetFilters());
	}, [setFilters]);

	// 特定のフィルタータイプをリセット
	const resetFilter = useCallback(<T extends keyof SearchFilters>(filterType: T) => {
		setFiltersState((prev) => resetFilterType(prev, filterType));
	}, []);

	// APIパラメータを取得
	const getApiParams = useCallback(() => {
		const params = filtersToParams(filters);

		// 高度な検索クエリを追加
		if (filters.advancedQuery && Object.keys(filters.advancedQuery).length > 0) {
			const queryString = advancedQueryToString(filters.advancedQuery);
			if (queryString) {
				params.q = (params.q || "") + " " + queryString;
			}
		}

		return params;
	}, [filters]);

	// フィルターがアクティブかチェック
	const isActive = hasActiveFilters(filters);

	// サポーター機能が必要かチェック
	const requiresSupporter = needsSupporter(filters);

	// フィルターの統計情報
	const getFilterStats = useCallback(() => {
		return {
			totalActive: Object.entries(filters).filter(([key, value]) => {
				if (key === "sortField" || key === "sortOrder") return false;
				if (Array.isArray(value)) return value.length > 0;
				return (
					value !== undefined &&
					value !== null &&
					value !== "" &&
					value !== "any" &&
					value !== "null"
				);
			}).length,
			activeFilters: {
				sort: filters.sortField !== "relevance" || filters.sortOrder !== "desc",
				status: filters.status !== "any",
				mode: filters.mode !== "null",
				extra: filters.extra.length > 0,
				general: filters.general.length > 0,
				genre: filters.genre.length > 0,
				language: filters.language.length > 0,
				nsfw: filters.nsfw,
				played: filters.played && filters.played !== "any",
				rank: filters.rank && filters.rank.length > 0,
				advanced: filters.advancedQuery && Object.keys(filters.advancedQuery).length > 0,
			},
		};
	}, [filters]);

	return {
		// 状態
		filters,
		genres,
		languages,
		isActive,
		requiresSupporter,

		// 更新関数
		setFilters,
		setSort,
		setStatus,
		setMode,
		setExtra,
		toggleExtra,
		setGeneral,
		toggleGeneral,
		setGenre,
		toggleGenre,
		setLanguage,
		toggleLanguage,
		setNsfw,
		setPlayed,
		setRank,
		toggleRank,
		setAdvancedQuery,
		setAdvancedQueryString,

		// リセット関数
		resetAllFilters,
		resetFilter,

		// ユーティリティ
		getApiParams,
		getFilterStats,
	};
}
