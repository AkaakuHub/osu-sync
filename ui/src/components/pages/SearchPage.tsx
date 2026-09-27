import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
	apiClient,
	type IndexSummary,
	type QueueStatus,
	type SearchResponse,
} from "../../hooks/useApiClient";
import { getEventSource } from "../../utils/eventSource";
import SearchResults from "../SearchResults";
import { FilterPanel } from "../search/FilterPanel";
import { type SearchFilters } from "../search/types";
import { resetFilters } from "../search/utils";
import Input from "../ui/Input";

type Props = {
	notOwnedOnly: boolean;
	setNotOwnedOnly: (value: boolean) => void;
	searchQuery?: string;
	setSearchQuery?: (query: string) => void;
	searchFilters?: SearchFilters | null;
	setSearchFilters?: (filters: SearchFilters | null) => void;
	showUnicode: boolean;
	setShowUnicode: (v: boolean) => void;
};

const SearchPage: React.FC<Props> = ({
	notOwnedOnly,
	setNotOwnedOnly,
	searchQuery: propSearchQuery,
	setSearchQuery: propSetSearchQuery,
	searchFilters: propSearchFilters,
	setSearchFilters: propSetSearchFilters,
	showUnicode,
	setShowUnicode,
}) => {
	const initialQuery = propSearchQuery ?? "";
	const [internalSearchQuery, setInternalSearchQuery] = useState("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialQuery);
	const searchQuery = propSearchQuery ?? internalSearchQuery;
	const setSearchQuery = propSetSearchQuery ?? setInternalSearchQuery;
	const searchHistoryRef = useRef<string[]>([]);
	const historyIndexRef = useRef<number | null>(null);
	const historyDraftRef = useRef<string>("");
	// デフォルトフィルターを最初から持たせて、有効化待ちの遅延をなくす
	const [internalSearchFilters, setInternalSearchFilters] = useState<SearchFilters | null>(() =>
		resetFilters(),
	);
	const searchFilters = propSearchFilters ?? internalSearchFilters;
	const setSearchFilters = propSetSearchFilters ?? setInternalSearchFilters;
	const filtersReady = !!searchFilters;
	const [scanRevision, setScanRevision] = useState(0);

	// 500msデバウンスの実装
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	const recordSearchHistory = useCallback((value: string) => {
		const trimmed = value.trim();
		if (!trimmed) return;
		const history = searchHistoryRef.current;
		if (history.length === 0 || history[history.length - 1] !== trimmed) {
			history.push(trimmed);
		}
		historyIndexRef.current = null;
		historyDraftRef.current = "";
	}, []);

	const handleSearchKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter") {
				recordSearchHistory(searchQuery);
				return;
			}

			if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
				return;
			}

			event.preventDefault();

			const history = searchHistoryRef.current;
			if (history.length === 0) return;

			if (event.key === "ArrowUp") {
				if (historyIndexRef.current === null) {
					historyDraftRef.current = searchQuery;
					historyIndexRef.current = history.length - 1;
				} else if (historyIndexRef.current > 0) {
					historyIndexRef.current -= 1;
				}
				const nextValue = history[historyIndexRef.current];
				if (nextValue !== undefined) {
					setSearchQuery(nextValue);
				}
				return;
			}

			if (event.key === "ArrowDown") {
				if (historyIndexRef.current === null) return;
				if (historyIndexRef.current < history.length - 1) {
					historyIndexRef.current += 1;
					const nextValue = history[historyIndexRef.current];
					if (nextValue !== undefined) {
						setSearchQuery(nextValue);
					}
				} else {
					historyIndexRef.current = null;
					setSearchQuery(historyDraftRef.current);
				}
			}
		},
		[recordSearchHistory, searchQuery, setSearchQuery],
	);

	useEffect(() => {
		if (historyIndexRef.current !== null) return;
		recordSearchHistory(debouncedSearchQuery);
	}, [debouncedSearchQuery, recordSearchHistory]);

	// フィルターパラメータを構築 - 公式APIのURL短縮形に完全対応
	const buildSearchQuery = () => {
		const params = new URLSearchParams();

		const filters = searchFilters ?? resetFilters();

		// 基本検索クエリ（全検索の場合も空文字で送信）
		params.set("q", debouncedSearchQuery || "");

		// フィルターを適用 - 公式APIの短縮形パラメータ名を使用
		if (filters.status && filters.status !== "any") {
			params.set("s", filters.status);
		}

		if (filters.mode && filters.mode !== "null") {
			params.set("m", filters.mode);
		}

		// ジャンル - カンマ区切り（公式形式）
		if (filters.genre && filters.genre.length > 0) {
			params.set("g", filters.genre.join(","));
		}

		// 言語 - カンマ区切り（公式形式）
		if (filters.language && filters.language.length > 0) {
			params.set("l", filters.language.join(",")); // lang -> l (公式API)
		}

		// エクストラ - ドット区切り（公式形式）
		if (filters.extra && filters.extra.length > 0) {
			params.set("e", filters.extra.join("."));
		}

		// 一般フィルター - ドット区切り（公式形式）
		if (filters.general && filters.general.length > 0) {
			params.set("c", filters.general.join("."));
		}

		// NSFW - 文字列で送信（公式形式）
		if (filters.nsfw !== undefined) {
			params.set("nsfw", filters.nsfw.toString());
		}

		// プレイ済みフィルター
		if (filters.played && filters.played !== "any") {
			params.set("played", filters.played);
		}

		// ランクフィルター - ドット区切り（公式形式）
		if (filters.rank && filters.rank.length > 0) {
			params.set("r", filters.rank.join(".")); // rank -> r (公式API)
		}

		// ソート - field_order形式（公式形式）
		if (filters.sortField && filters.sortOrder) {
			params.set("sort", `${filters.sortField}_${filters.sortOrder}`);
		}

		// ページネーション
		params.set("limit", "20");
		params.set("page", "1");

		return params.toString();
	};

	const {
		data: searchResults,
		isFetching: searchLoading,
		error: searchError,
	} = useQuery<SearchResponse>({
		queryKey: ["search", debouncedSearchQuery, searchFilters],
		queryFn: async () => {
			const query = buildSearchQuery();
			const endpoint = `/search?${query}`;
			return apiClient.get(endpoint);
		},
		enabled: filtersReady && searchQuery === debouncedSearchQuery,
		staleTime: 60_000,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	useEffect(() => {
		if (!searchError) return;
		const message = searchError instanceof Error ? searchError.message : "Search failed";
		toast.error(`${message}\nPlease set osu! API Client ID/Secret in Settings tab.`, {
			duration: 5000,
		});
	}, [searchError]);

	const {
		data: index,
		refetch: refetchIndex,
		isFetching: indexLoading,
	} = useQuery<IndexSummary>({
		queryKey: ["index"],
		queryFn: () => apiClient.get<IndexSummary>("/local/index"),
	});

	const { data: queue, refetch: refetchQueue } = useQuery<QueueStatus>({
		queryKey: ["queue"],
		queryFn: () => apiClient.get<QueueStatus>("/queue"),
		refetchOnWindowFocus: false,
	});
	const handleFiltersChange = useCallback(
		(filters: SearchFilters) => setSearchFilters(filters),
		[setSearchFilters],
	);

	useEffect(() => {
		const es = getEventSource();
		let timer: ReturnType<typeof setTimeout> | undefined;
		let disposed = false;
		const refreshOwnership = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				refetchIndex();
				setScanRevision((revision) => revision + 1);
			}, 300);
		};
		const handler = (event: MessageEvent) => {
			try {
				const parsed = JSON.parse(event.data);
				if (parsed.topic !== "scan" || parsed.data?.status !== "completed") return;
				refreshOwnership();
			} catch (error) {
				console.error("Failed to handle scan event", error);
			}
		};
		es.addEventListener("message", handler);
		apiClient
			.get<{ status: string }>("/local/scan-status")
			.then(({ status }) => {
				if (!disposed && status === "completed") refreshOwnership();
			})
			.catch((error) => console.error("Failed to read scan status", error));
		return () => {
			disposed = true;
			clearTimeout(timer);
			es.removeEventListener("message", handler);
		};
	}, [refetchIndex]);

	return (
		<div className="h-full flex flex-col bg-surface">
			{/* Status Header */}
			{/* Main Content Area */}
			<div className="flex-1 min-h-0">
				<div className="max-w-7xl mx-auto h-full flex flex-col p-2 pt-1 gap-2">
					{/* Search Bar - osu!公式風デザイン */}
					<div className="flex-shrink-0">
						<div className="beatmapsets-search__input-container relative">
							<Input
								placeholder="Search by artist, title, or creator..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									if (historyIndexRef.current !== null) {
										historyIndexRef.current = null;
										historyDraftRef.current = e.target.value;
									}
								}}
								onKeyDown={handleSearchKeyDown}
								variant="search"
								className="beatmapsets-search__input pr-12 text-base my-1"
							/>
							{/* 検索アイコン */}
							<Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
							{/* ローディングインジケーター */}
							{searchLoading && (
								<div className="absolute right-12 top-1/2 transform -translate-y-1/2">
									<div className="animate-spin w-4 h-4 border-2 border-border border-t-accent rounded-full"></div>
								</div>
							)}
						</div>
					</div>

					{/* Filter Panel */}
					<div className="flex-shrink-0">
						<FilterPanel
							onFiltersChange={handleFiltersChange}
							isSupporter={false} // TODO: ユーザーのサポーター状態を取得
							initialFilters={searchFilters}
							searchQuery={searchQuery}
						/>
					</div>

					{/* Search Results */}
					<div className="flex-1 min-h-0">
						<SearchResults
							notOwnedOnly={notOwnedOnly}
							setNotOwnedOnly={setNotOwnedOnly}
							onQueueUpdate={refetchQueue}
							queue={queue}
							searchData={searchResults}
							scanRevision={scanRevision}
							isLoading={searchLoading}
							searchQuery={debouncedSearchQuery}
							searchFilters={searchFilters}
							showUnicode={showUnicode}
							setShowUnicode={setShowUnicode}
							indexSummary={index}
							indexLoading={indexLoading}
							onRefreshIndex={refetchIndex}
							setSearchQuery={setSearchQuery}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SearchPage;
