import { useQueryClient } from "@tanstack/react-query";
import { Download, Languages } from "lucide-react";
import React from "react";
import toast from "react-hot-toast";
import {
	apiClient,
	type IndexSummary,
	type QueueStatus,
	type SearchResponse,
} from "../hooks/useApiClient";
import { triggerDownload } from "../utils/downloadUtils";
import { buildSearchParams } from "./search/buildSearchParams";
import type { ActionState, QueueDerivedState } from "./search/helpers";
import { PREVIEW_STATE_EVENT, type PreviewState } from "./search/previewBridge";
import type { PreviewableItem } from "./search/ResultCard";
import ResultList from "./search/ResultList";
import type { SearchFilters } from "./search/types";
import { hasActiveFilters } from "./search/utils";
import Button from "./ui/Button";
import Toggle from "./ui/Toggle";

type Props = {
	notOwnedOnly: boolean;
	setNotOwnedOnly: (v: boolean) => void;
	onQueueUpdate: () => void;
	queue?: QueueStatus;
	searchData?: SearchResponse;
	scanRevision: number;
	isLoading?: boolean;
	searchQuery: string;
	searchFilters: SearchFilters | null;
	showUnicode: boolean;
	setShowUnicode: (v: boolean) => void;
	indexSummary?: IndexSummary;
	setSearchQuery: (value: string) => void;
};

const SearchResults: React.FC<Props> = ({
	notOwnedOnly,
	setNotOwnedOnly,
	onQueueUpdate,
	queue,
	searchData,
	scanRevision,
	isLoading,
	searchQuery,
	searchFilters,
	showUnicode,
	setShowUnicode,
	indexSummary,
	setSearchQuery,
}) => {
	const client = useQueryClient();

	// 無限スクロール用の状態
	const [allResults, setAllResults] = React.useState<SearchResponse["results"]>([]);
	const [internalCurrentPage, setInternalCurrentPage] = React.useState(1);
	const [hasMore, setHasMore] = React.useState(true);
	const [isFetchingMore, setIsFetchingMore] = React.useState(false);
	const checkedOwnershipKey = React.useRef<string | null>(null);

	const data = searchData;

	// 初回データまたは検索条件変更時に結果をリセット
	React.useEffect(() => {
		if (searchData) {
			setAllResults(searchData.results);
			setHasMore(searchData.results.length < searchData.total);
			setInternalCurrentPage(1);
		}
	}, [searchData]);

	React.useEffect(() => {
		if (scanRevision === 0 || allResults.length === 0) return;
		const setIds = allResults.map((item) => item.set_id);
		const key = `${scanRevision}:${setIds.join(",")}`;
		if (checkedOwnershipKey.current === key) return;
		let cancelled = false;
		apiClient
			.post<{ set_ids: number[] }>("/local/owned", { set_ids: setIds })
			.then(({ set_ids }) => {
				if (cancelled) return;
				checkedOwnershipKey.current = key;
				const owned = new Set(set_ids);
				setAllResults((items) => {
					if (items.every((item) => item.owned === owned.has(item.set_id))) return items;
					return items.map((item) => ({ ...item, owned: owned.has(item.set_id) }));
				});
			})
			.catch((error) => console.error("Failed to update ownership", error));
		return () => {
			cancelled = true;
		};
	}, [allResults, scanRevision]);

	// 次のページを読み込む
	const handleLoadMore = React.useCallback(async () => {
		if (!hasMore || isFetchingMore || !searchData) return;

		setIsFetchingMore(true);
		const nextPage = internalCurrentPage + 1;

		try {
			const endpoint = `/search?${buildSearchParams(searchQuery, searchFilters, nextPage)}`;
			const newData = await apiClient.get<SearchResponse>(endpoint);

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
		() => allResults?.filter((r) => (notOwnedOnly ? !isOwned(r.set_id, r.owned) : true)) ?? [],
		[allResults, isOwned, notOwnedOnly],
	);
	const filtersActive = React.useMemo(() => {
		if (!searchFilters) return notOwnedOnly || !!searchQuery?.trim();
		return hasActiveFilters(searchFilters) || notOwnedOnly || !!searchQuery?.trim();
	}, [notOwnedOnly, searchFilters, searchQuery]);

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
	const togglePreview = React.useCallback((item: PreviewableItem) => {
		window.togglePreview?.(item);
	}, []);

	const [previewState, setPreviewState] = React.useState<PreviewState>({
		previewingId: null,
		isLoadingPreview: false,
		playbackProgress: 0,
		isActuallyPlaying: false,
	});

	React.useEffect(() => {
		const updatePreviewState = () => {
			if (window.previewPlayerState) setPreviewState(window.previewPlayerState);
		};
		updatePreviewState();
		window.addEventListener(PREVIEW_STATE_EVENT, updatePreviewState);
		return () => window.removeEventListener(PREVIEW_STATE_EVENT, updatePreviewState);
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

	const eligibleItems = React.useMemo(
		() => filtered.filter((item) => !getActionState(item.set_id, item.owned).disabled),
		[filtered, getActionState],
	);
	const eligibleCount = eligibleItems.length;

	const handleQueueFiltered = React.useCallback(async () => {
		if (eligibleItems.length === 0) return;
		const setIds = eligibleItems.map((item) => item.set_id);
		const metadata = eligibleItems.reduce<Record<number, Record<string, string>>>((acc, item) => {
			acc[item.set_id] = {
				artist: item.artist,
				title: item.title,
				artist_unicode: item.artist_unicode || item.artist,
				title_unicode: item.title_unicode || item.title,
			};
			return acc;
		}, {});

		try {
			await apiClient.post("/download", { set_ids: setIds, metadata });
			client.invalidateQueries({ queryKey: ["queue"] });
			onQueueUpdate();
			toast.success(`Queued ${setIds.length} beatmaps`);
		} catch (error) {
			console.error("Failed to queue filtered results:", error);
			toast.error("Failed to queue filtered results");
		}
	}, [eligibleItems, client, onQueueUpdate]);

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
						</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					{filtersActive && (
						<Button
							variant="osu"
							onClick={handleQueueFiltered}
							disabled={eligibleCount === 0}
							size="sm"
							className="text-xs px-2 py-1 h-8"
							title={
								eligibleCount === 0
									? "No eligible beatmaps to queue"
									: `Queue ${eligibleCount} beatmaps`
							}
						>
							<Download className="w-3.5 h-3.5 mr-1" />
							Download filtered{eligibleCount > 0 ? ` (${eligibleCount})` : ""}
						</Button>
					)}
					<button
						onClick={() => setShowUnicode(!showUnicode)}
						className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-variant/80 border border-border text-text-secondary hover:bg-surface-variant/60 transition-colors"
						title={showUnicode ? "Display in Normal" : "Display in Unicode"}
					>
						<Languages className="w-3.5 h-3.5" />
						{showUnicode ? "Unicode" : "Normal"}
					</button>
					<Toggle checked={notOwnedOnly} onChange={setNotOwnedOnly} label="Not Owned Only" />
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
						setSearchQuery={setSearchQuery}
					/>

					{/* ローディングインジケーター */}
					{isFetchingMore && (
						<div className="text-center py-4 text-text-muted">Loading more...</div>
					)}

					{/* 終了インジケーター */}
					{!hasMore && filtered.length > 0 && (
						<div className="pt-1 text-center text-text-muted">
							End of results ({filtered.length} beatmaps loaded)
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SearchResults;
