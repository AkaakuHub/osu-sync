import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Languages, RotateCcw } from "lucide-react";
import {
	apiClient,
	type QueueStatus,
	type SearchResponse,
	type IndexSummary,
} from "../hooks/useApiClient";
import { triggerDownload } from "../utils/downloadUtils";
import ResultList from "./search/ResultList";
import type { ActionState, QueueDerivedState } from "./search/helpers";
import Toggle from "./ui/Toggle";
import Button from "./ui/Button";

type Props = {
	ownedOnly: boolean;
	setOwnedOnly: (v: boolean) => void;
	onQueueUpdate: () => void;
	queue?: QueueStatus;
	searchData?: SearchResponse;
	isLoading?: boolean;
	searchQuery: string;
	searchFilters: any;
	showUnicode: boolean;
	setShowUnicode: (v: boolean) => void;
	indexSummary?: IndexSummary;
	indexLoading?: boolean;
	onRefreshIndex: () => void;
};

const SearchResults: React.FC<Props> = ({
	ownedOnly,
	setOwnedOnly,
	onQueueUpdate,
	queue,
	searchData,
	isLoading,
	searchQuery,
	searchFilters,
	showUnicode,
	setShowUnicode,
	indexSummary,
	indexLoading,
	onRefreshIndex,
}) => {
	const client = useQueryClient();

	// 無限スクロール用の状態
	const [allResults, setAllResults] = React.useState<SearchResponse["results"]>([]);
	const [internalCurrentPage, setInternalCurrentPage] = React.useState(1);
	const [hasMore, setHasMore] = React.useState(true);
	const [isFetchingMore, setIsFetchingMore] = React.useState(false);

	const data = searchData;

	// 初回データまたは検索条件変更時に結果をリセット
	React.useEffect(() => {
		if (searchData) {
			console.log("DEBUG: Resetting results with new data", searchData.results.length);
			setAllResults(searchData.results);
			setHasMore(searchData.results.length < searchData.total);
			setInternalCurrentPage(1);
		}
	}, [searchData?.results.length, searchData?.total]);

	// 次のページを読み込む
	const handleLoadMore = React.useCallback(async () => {
		if (!hasMore || isFetchingMore || !searchData) return;

		console.log("DEBUG: Loading more results, current page:", internalCurrentPage);
		setIsFetchingMore(true);
		const nextPage = internalCurrentPage + 1;

		try {
			// SearchPageのbuildSearchQueryと同じロジックでURLを構築
			const params = new URLSearchParams();

			// 基本検索クエリ
			params.set("q", searchQuery || "");

			// ページングパラメータ
			params.set("page", nextPage.toString());
			params.set("limit", "20");

			// フィルターパラメータ
			if (searchFilters.status && searchFilters.status !== "any") {
				params.set("s", searchFilters.status);
			}
			if (searchFilters.mode && searchFilters.mode !== "null") {
				params.set("m", searchFilters.mode.toString());
			}
			if (searchFilters.genre && searchFilters.genre.length > 0) {
				params.set("g", searchFilters.genre.join(","));
			}
			if (searchFilters.language && searchFilters.language.length > 0) {
				params.set("l", searchFilters.language.join(","));
			}
			if (searchFilters.extra && searchFilters.extra.length > 0) {
				params.set("e", searchFilters.extra.join("."));
			}
			if (searchFilters.general && searchFilters.general.length > 0) {
				params.set("c", searchFilters.general.join("."));
			}
			if (searchFilters.nsfw !== undefined) {
				params.set("nsfw", searchFilters.nsfw.toString());
			}
			if (searchFilters.played && searchFilters.played !== "any") {
				params.set("played", searchFilters.played);
			}
			if (searchFilters.rank && searchFilters.rank.length > 0) {
				params.set("r", searchFilters.rank.join("."));
			}
			if (searchFilters.sortField && searchFilters.sortOrder) {
				params.set("sort", `${searchFilters.sortField}_${searchFilters.sortOrder}`);
			}

			const endpoint = `/search?${params.toString()}`;
			console.log("DEBUG: Loading more results from:", endpoint);

			const newData = await apiClient.get<SearchResponse>(endpoint);

			console.log("DEBUG: Loaded", newData.results.length, "more results");
			setAllResults((prev) => [...prev, ...newData.results]);
			setInternalCurrentPage(nextPage);
			setHasMore(
				newData.results.length > 0 && allResults.length + newData.results.length < newData.total,
			);
		} catch (error) {
			console.error("Failed to load more results:", error);
		} finally {
			setIsFetchingMore(false);
		}
	}, [
		hasMore,
		isFetchingMore,
		searchData,
		internalCurrentPage,
		allResults.length,
		searchQuery,
		searchFilters,
	]);

	const queueState = React.useMemo<QueueDerivedState>(() => {
		const queued = new Set(queue?.queued ?? []);
		const runningEntries = new Map<number, QueueStatus["running"][number]>();
		queue?.running?.forEach((entry) => runningEntries.set(entry.set_id, entry));

		const doneEntries = new Map<number, QueueStatus["done"][number]>();
		const completed = new Set<number>();
		const skipped = new Set<number>();
		const failed = new Set<number>();

		queue?.done?.forEach((entry) => {
			doneEntries.set(entry.set_id, entry);
			if (entry.status === "completed") {
				completed.add(entry.set_id);
			} else if (entry.status === "skipped") {
				skipped.add(entry.set_id);
			} else if (entry.status === "failed") {
				failed.add(entry.set_id);
			}
		});

		return { queued, runningEntries, completed, skipped, failed, doneEntries };
	}, [queue]);

	const isOwned = React.useCallback(
		(setId: number, baseOwned: boolean) =>
			baseOwned || queueState.completed.has(setId) || queueState.skipped.has(setId),
		[queueState.completed, queueState.skipped],
	);

	const filtered = React.useMemo(
		() => allResults?.filter((r) => (ownedOnly ? isOwned(r.set_id, r.owned) : true)) ?? [],
		[allResults, isOwned, ownedOnly],
	);

	// utilsから移動したtriggerDownloadを使用
	const handleDownload = (setId: number) => {
		// allResultsから該当アイテムを探す
		const item = allResults.find((r) => r.set_id === setId);
		if (item) {
			const mockSearchData: SearchResponse = {
				results: allResults,
				total: data?.total || 0,
				page: internalCurrentPage,
				limit: 20,
			};
			triggerDownload(setId, mockSearchData, client, onQueueUpdate);
		}
	};

	// GlobalPreviewPlayerからグローバル関数を取得
	const togglePreview = React.useCallback((item: any) => {
		if ((window as any).togglePreview) {
			(window as any).togglePreview(item);
		}
	}, []);

	// GlobalPreviewPlayerの状態をリアルタイムで取得（useEffectで定期更新）
	const [previewState, setPreviewState] = React.useState({
		previewingId: null as number | null,
		isLoadingPreview: false,
		playbackProgress: 0,
		isActuallyPlaying: false,
	});

	// グローバル状態の監視と同期
	React.useEffect(() => {
		const updatePreviewState = () => {
			const state = (window as any).previewPlayerState || {};
			setPreviewState({
				previewingId: state.previewingId || null,
				isLoadingPreview: state.isLoadingPreview || false,
				playbackProgress: state.playbackProgress || 0,
				isActuallyPlaying: state.isActuallyPlaying || false,
			});
		};

		// 初期状態の取得
		updatePreviewState();

		// 定期的に状態を更新（100ms間隔）
		const interval = setInterval(updatePreviewState, 100);

		return () => {
			clearInterval(interval);
		};
	}, []);

	const getActionState = React.useCallback(
		(setId: number, baseOwned: boolean): ActionState => {
			const runningEntry = queueState.runningEntries.get(setId);
			if (runningEntry) {
				const pct = runningEntry.progress
					? Math.max(1, Math.floor(runningEntry.progress * 100))
					: 0;
				return { label: `Downloading ${pct}%`, disabled: true, variant: "secondary" };
			}
			if (Array.from(queueState.queued).some((entry) => entry.set_id === setId)) {
				return { label: "Queued", disabled: true, variant: "secondary" };
			}
			if (queueState.failed.has(setId)) {
				return { label: "Retry", disabled: false, variant: "danger" };
			}
			if (isOwned(setId, baseOwned)) {
				return { label: "Owned", disabled: true, variant: "secondary" };
			}
			return { label: "Download", disabled: false, variant: "primary" };
		},
		[isOwned, queueState.failed, queueState.queued, queueState.runningEntries],
	);

	if (!data) {
		return (
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">Search Results</h2>
				<p className="text-muted-foreground text-center py-12">Search to see results</p>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col pb-3">
			{/* Results Header */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">Results</h2>
					<span className="text-sm text-text-secondary bg-surface-variant/70 px-2 py-1 rounded-md border border-border">
						Total: {data.total.toLocaleString("en-US")} | Showing:{" "}
						{filtered.length.toLocaleString("en-US")}
					</span>
					{indexSummary && (
						<div className="flex items-center gap-3 text-sm text-text-secondary">
							<span className="flex items-center gap-1">
								Owned <span className="font-semibold text-text">{indexSummary.owned_sets}</span>
							</span>
							<span className="flex items-center gap-1">
								Metadata{" "}
								<span className="font-semibold text-text">{indexSummary.with_metadata}</span>
							</span>
						</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowUnicode(!showUnicode)}
						className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-variant/80 border border-border text-text-secondary hover:bg-surface-variant/60 transition-colors"
						title={showUnicode ? "Display in Normal" : "Display in Unicode"}
					>
						<Languages className="w-3.5 h-3.5" />
						{showUnicode ? "Unicode" : "Normal"}
					</button>
					<Toggle checked={ownedOnly} onChange={setOwnedOnly} label="Owned Only" />
					<Button
						variant="ghost"
						onClick={onRefreshIndex}
						disabled={indexLoading}
						size="sm"
						className="text-xs px-2 py-1 h-8"
						title="Refresh local index"
					>
						<RotateCcw className="w-3.5 h-3.5" />
					</Button>
				</div>
			</div>

			{filtered.length === 0 ? (
				<div className="flex-1 text-center py-12 rounded-2xl border border-dashed border-border bg-surface/60 flex items-center justify-center">
					{isLoading ? (
						<p className="text-muted-foreground">Loading...</p>
					) : (
						<p className="text-muted-foreground">No beatmaps were found.</p>
					)}
				</div>
			) : (
				<div className="flex-1 min-h-0">
					<ResultList
						items={filtered}
						showUnicode={showUnicode}
						previewingId={previewState.previewingId || null}
						isLoadingPreview={previewState.isLoadingPreview || false}
						playbackProgress={previewState.playbackProgress || 0}
						isActuallyPlaying={previewState.isActuallyPlaying || false}
						queueState={queueState}
						togglePreview={togglePreview}
						triggerDownload={handleDownload}
						getActionState={getActionState}
						endReached={handleLoadMore}
					/>

					{/* ローディングインジケーター */}
					{isFetchingMore && (
						<div className="text-center py-4 text-text-muted">Loading more...</div>
					)}

					{/* 終了インジケーター */}
					{!hasMore && filtered.length > 0 && (
						<div className="pt-1 text-center text-text-muted border-t border-border">
							End of results ({filtered.length} beatmaps loaded)
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SearchResults;
