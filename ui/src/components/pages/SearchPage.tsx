import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import React from "react";
import { Search } from "lucide-react";
import {
	apiClient,
	type IndexSummary,
	type QueueStatus,
	type SearchResponse,
} from "../../hooks/useApiClient";
import Input from "../ui/Input";
import SearchResults from "../SearchResults";
import { FilterPanel } from "../search/FilterPanel";
import { type SearchFilters } from "../search/types";
import { resetFilters } from "../search/utils";
import { getEventSource } from "../../utils/eventSource";

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
	const [currentPage, setCurrentPage] = useState(1);
	// デフォルトフィルターを最初から持たせて、有効化待ちの遅延をなくす
	const [internalSearchFilters, setInternalSearchFilters] = useState<SearchFilters | null>(() =>
		resetFilters(),
	);
	const searchFilters = propSearchFilters ?? internalSearchFilters;
	const setSearchFilters = propSetSearchFilters ?? setInternalSearchFilters;
	const filtersReady = !!searchFilters;
	// スキャン完了までは検索を走らせない
	const [scanReady, setScanReady] = useState(false);

	// 500msデバウンスの実装
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
			setCurrentPage(1); // 検索時にページをリセット
		}, 500);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	// currentPageの変化を監視
	useEffect(() => {
		console.log("DEBUG: currentPage changed to:", currentPage);
	}, [currentPage]);

	// フィルターパラメータを構築 - 公式APIのURL短縮形に完全対応
	const buildSearchQuery = () => {
		const params = new URLSearchParams();

		const filters: SearchFilters = searchFilters || ({} as SearchFilters);

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
		params.set("page", currentPage.toString());

		return params.toString();
	};

	const {
		data: searchResults,
		isFetching: searchLoading,
		error: searchError,
	} = useQuery<SearchResponse>({
		queryKey: ["search", debouncedSearchQuery, currentPage, searchFilters ?? "nofilters"],
		queryFn: async () => {
			const query = buildSearchQuery();
			const endpoint = `/search?${query}`;
			return apiClient.get(endpoint);
		},
		enabled: filtersReady && scanReady,
		staleTime: 60_000,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	useEffect(() => {
		if (!searchError) return;
		const anyErr = searchError as any;
		const message = anyErr?.response?.data?.detail || anyErr?.message || "Search failed";
		toast.error(`${message}\nPlease set osu! API Client ID/Secret in Settings tab.`, {
			duration: 5000,
		});
	}, [searchError]);

	// 新規クエリで検索した場合はページングをリセット
	// TODO: これがページングと干渉している可能性があるため一時的に無効化
	/*
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, searchFilters]);
	*/

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

	// スキャン完了を待ってから検索を開始する
	useEffect(() => {
		let mounted = true;
		apiClient
			.get<{ status: string }>("/local/scan-status")
			.then((res) => {
				if (!mounted) return;
				if (res.status === "completed" || res.status === "error") {
					setScanReady(true);
				}
			})
			.catch(() => mounted && setScanReady(true));

		const es = getEventSource();
		const handler = (event: MessageEvent) => {
			try {
				const parsed = JSON.parse(event.data);
				if (parsed.topic !== "scan") return;
				const st = parsed.data?.status;
				if (st === "completed" || st === "error") {
					setScanReady(true);
					refetchIndex();
					refetchQueue();
				}
			} catch (e) {
				console.error("Failed to handle scan event", e);
			}
		};
		es.addEventListener("message", handler);
		return () => {
			mounted = false;
			es.removeEventListener("message", handler);
		};
	}, [refetchIndex, refetchQueue]);

	// スキャン完了までローディング画面を出す
	if (!scanReady) {
		// Use the exact same loader style as main.py LOADING_HTML
		return (
			<div
				style={{
					height: "100vh",
					margin: 0,
					display: "grid",
					placeItems: "center",
					background: "#0f172a",
					color: "#e2e8f0",
					fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
					<div
						style={{
							width: "56px",
							height: "56px",
							border: "6px solid rgba(148, 163, 184, 0.35)",
							borderTopColor: "#34d399",
							borderRadius: "50%",
							animation: "spin 0.8s linear infinite",
							boxShadow: "0 0 16px rgba(52, 211, 153, 0.4)",
							marginTop: "-80px",
						}}
					/>
					<div
						style={{
							marginTop: "14px",
							fontSize: "13px",
							letterSpacing: "0.2px",
							color: "#cbd5e1",
						}}
					>
						Launching osu-sync…
					</div>
				</div>
				<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
			</div>
		);
	}

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
								onChange={(e) => setSearchQuery(e.target.value)}
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
							onFiltersChange={(filters) => {
								// フィルター変更時に即時反映
								setSearchFilters(filters);
								setCurrentPage(1); // ページをリセット
							}}
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
