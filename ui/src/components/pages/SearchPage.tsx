import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
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
			const query = buildSearchQuery();
			console.log("DEBUG Frontend: searchQuery =", JSON.stringify(searchQuery));
			console.log("DEBUG Frontend: searchFilters =", JSON.stringify(searchFilters));
			console.log("DEBUG Frontend: buildQuery =", query);
			const endpoint = query ? `/search?${query}` : `/search?q=&limit=20&page=${currentPage}`;
			console.log("DEBUG Frontend: endpoint =", endpoint);
			return apiClient.get(endpoint);
		},
		enabled: true,
	});

	// 新規クエリで検索した場合はページングをリセット
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, searchFilters]);

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
			{/* Compact Status Bar */}
			<div className="bg-surface-variant/90 backdrop-blur-md border border-border rounded-lg shadow-lg px-4 py-2 m-4 flex-shrink-0">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-text-muted">Owned:</span>
							<span className="font-medium text-text">{index?.owned_sets ?? "-"}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-text-muted">Meta:</span>
							<span className="font-medium text-text">{index?.with_metadata ?? "-"}</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Toggle checked={ownedOnly} onChange={setOwnedOnly} label="Owned" />
						<Button
							variant="ghost"
							onClick={() => refetchIndex()}
							disabled={indexLoading}
							size="sm"
							className="text-xs px-2 py-1 h-6"
						>
							<RotateCcw className="w-3 h-3" />
						</Button>
					</div>
				</div>
			</div>

			{/* Search Bar */}
			<div className="px-4 pb-3 flex-shrink-0">
				<div className="bg-surface-variant/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-3">
					<Input
						placeholder="Search by artist, title, or creator..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						variant="search"
					/>
				</div>
			</div>

			{/* Filter Panel */}
			<div className="px-4 pb-3 flex-shrink-0">
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
			<div className="flex-1 min-h-0 px-4 pb-4">
				<SearchResults
					ownedOnly={ownedOnly}
					onQueueUpdate={refetchQueue}
					queue={queue}
					searchData={searchResults}
					isLoading={searchLoading}
					currentPage={currentPage}
					setCurrentPage={setCurrentPage}
				/>
			</div>
		</div>
	);
};

export default SearchPage;
