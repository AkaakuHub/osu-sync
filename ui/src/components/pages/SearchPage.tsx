import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import React from "react";
import { RotateCcw, Search } from "lucide-react";
import {
	apiClient,
	type IndexSummary,
	type QueueStatus,
	type SearchResponse,
} from "../../hooks/useApiClient";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Toggle from "../ui/Toggle";
import SearchResults from "../SearchResults";
import { FilterPanel } from "../search/FilterPanel";

type Props = {
	ownedOnly: boolean;
	setOwnedOnly: (value: boolean) => void;
	searchQuery?: string;
	setSearchQuery?: (query: string) => void;
};

const SearchPage: React.FC<Props> = ({
	ownedOnly,
	setOwnedOnly,
	searchQuery: propSearchQuery,
	setSearchQuery: propSetSearchQuery,
}) => {
	const [internalSearchQuery, setInternalSearchQuery] = useState("");
	const searchQuery = propSearchQuery ?? internalSearchQuery;
	const setSearchQuery = propSetSearchQuery ?? setInternalSearchQuery;
	const [currentPage, setCurrentPage] = useState(1);

	// currentPageの変化を監視
	useEffect(() => {
		console.log("DEBUG: currentPage changed to:", currentPage);
	}, [currentPage]);
	const [searchFilters, setSearchFilters] = useState<any>({});

	// フィルターパラメータを構築 - 公式APIのURL短縮形に完全対応
	const buildSearchQuery = () => {
		const params = new URLSearchParams();

		// 基本検索クエリ（全検索の場合も空文字で送信）
		params.set("q", searchQuery || "");

		// フィルターを適用 - 公式APIの短縮形パラメータ名を使用
		if (searchFilters.status && searchFilters.status !== "any") {
			params.set("s", searchFilters.status);
		}

		if (searchFilters.mode && searchFilters.mode !== "null") {
			params.set("m", searchFilters.mode);
		}

		// ジャンル - カンマ区切り（公式形式）
		if (searchFilters.genre && searchFilters.genre.length > 0) {
			params.set("g", searchFilters.genre.join(","));
		}

		// 言語 - カンマ区切り（公式形式）
		if (searchFilters.language && searchFilters.language.length > 0) {
			params.set("l", searchFilters.language.join(",")); // lang -> l (公式API)
		}

		// エクストラ - ドット区切り（公式形式）
		if (searchFilters.extra && searchFilters.extra.length > 0) {
			params.set("e", searchFilters.extra.join("."));
		}

		// 一般フィルター - ドット区切り（公式形式）
		if (searchFilters.general && searchFilters.general.length > 0) {
			params.set("c", searchFilters.general.join("."));
		}

		// NSFW - 文字列で送信（公式形式）
		if (searchFilters.nsfw !== undefined) {
			params.set("nsfw", searchFilters.nsfw.toString());
		}

		// プレイ済みフィルター
		if (searchFilters.played && searchFilters.played !== "any") {
			params.set("played", searchFilters.played);
		}

		// ランクフィルター - ドット区切り（公式形式）
		if (searchFilters.rank && searchFilters.rank.length > 0) {
			params.set("r", searchFilters.rank.join(".")); // rank -> r (公式API)
		}

		// ソート - field_order形式（公式形式）
		if (searchFilters.sortField && searchFilters.sortOrder) {
			params.set("sort", `${searchFilters.sortField}_${searchFilters.sortOrder}`);
		}

		// ページネーション
		params.set("limit", "20");
		params.set("page", currentPage.toString());

		return params.toString();
	};

	const { data: searchResults, isFetching: searchLoading } = useQuery<SearchResponse>({
		queryKey: ["search", searchQuery, currentPage, searchFilters],
		queryFn: async () => {
			console.log("=== QUERY EXECUTION START ===");
			console.log("DEBUG Frontend: searchQuery =", JSON.stringify(searchQuery));
			console.log("DEBUG Frontend: searchFilters =", JSON.stringify(searchFilters));
			console.log("DEBUG Frontend: currentPage =", currentPage);

			const query = buildSearchQuery();
			console.log("DEBUG Frontend: buildQuery =", query);

			const endpoint = `/search?${query}`;
			console.log("DEBUG Frontend: endpoint =", endpoint);
			console.log("=== QUERY EXECUTION END ===");

			return apiClient.get(endpoint);
		},
		enabled: true,
		staleTime: 0, // 常に再取得
	});

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
		refetchInterval: 500,
		refetchIntervalInBackground: true,
	});

	return (
		<div className="h-full flex flex-col bg-surface">
			{/* Status Header */}
			<div className="bg-surface-variant/80 backdrop-blur-sm border-b border-border px-6 py-3 flex-shrink-0">
				<div className="max-w-7xl mx-auto flex items-center justify-between">
					<div className="flex items-center gap-6 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-text-muted">Owned:</span>
							<span className="font-semibold text-text">{index?.owned_sets ?? "-"}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-text-muted">With Metadata:</span>
							<span className="font-semibold text-text">{index?.with_metadata ?? "-"}</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Toggle checked={ownedOnly} onChange={setOwnedOnly} label="Owned Only" />
						<Button
							variant="ghost"
							onClick={() => refetchIndex()}
							disabled={indexLoading}
							size="sm"
							className="text-xs px-3 py-1.5 h-7"
						>
							<RotateCcw className="w-3.5 h-3.5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 min-h-0">
				<div className="max-w-7xl mx-auto h-full flex flex-col p-4 gap-4">
					{/* Search Bar - osu!公式風デザイン */}
					<div className="flex-shrink-0">
						<div className="beatmapsets-search__input-container relative">
							<Input
								placeholder="Search by artist, title, or creator..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								variant="search"
								className="beatmapsets-search__input pr-12 text-base"
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
						/>
					</div>

					{/* Search Results */}
					<div className="flex-1 min-h-0">
						<SearchResults
							ownedOnly={ownedOnly}
							onQueueUpdate={refetchQueue}
							queue={queue}
							searchData={searchResults}
							isLoading={searchLoading}
							searchQuery={searchQuery}
							searchFilters={searchFilters}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SearchPage;
