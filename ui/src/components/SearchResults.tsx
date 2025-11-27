import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Howl } from "howler";
import { Languages } from "lucide-react";
import { apiClient, type QueueStatus, type SearchResponse } from "../hooks/useApiClient";
import ResultList from "./search/ResultList";
import PreviewPlayer, { type CurrentTrack } from "./search/PreviewPlayer";
import Button from "./ui/Button";
import type { ActionState, QueueDerivedState } from "./search/helpers";
import type { PreviewableItem } from "./search/ResultCard";

type Props = {
	ownedOnly: boolean;
	onQueueUpdate: () => void;
	queue?: QueueStatus;
	searchData?: SearchResponse;
	isLoading?: boolean;
	currentPage?: number;
	setCurrentPage?: (page: number) => void;
};

const SearchResults: React.FC<Props> = ({ ownedOnly, onQueueUpdate, queue, searchData, currentPage = 1, setCurrentPage }) => {
	const client = useQueryClient();
	const [showUnicode, setShowUnicode] = React.useState(false);
	const [previewingId, setPreviewingId] = React.useState<number | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
	const howlRef = React.useRef<Howl | null>(null);
	const progressTimer = React.useRef<number | null>(null);
	const [playbackProgress, setPlaybackProgress] = React.useState(0);
	const [duration, setDuration] = React.useState(0);
	const [currentTrack, setCurrentTrack] = React.useState<CurrentTrack | null>(null);

	const data = searchData;

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
		() => data?.results?.filter((r) => (ownedOnly ? isOwned(r.set_id, r.owned) : true)) ?? [],
		[data?.results, isOwned, ownedOnly],
	);

	const triggerDownload = async (setId: number) => {
		await apiClient.post("/download", { set_ids: [setId] });
		client.invalidateQueries({ queryKey: ["queue"] });
		onQueueUpdate();
	};

	const stopPreview = React.useCallback(() => {
		if (howlRef.current) {
			howlRef.current.stop();
			howlRef.current.unload();
			howlRef.current = null;
		}
		if (progressTimer.current) {
			window.clearInterval(progressTimer.current);
			progressTimer.current = null;
		}
		setPlaybackProgress(0);
		setDuration(0);
		setPreviewingId(null);
		setIsLoadingPreview(false);
		setCurrentTrack(null);
	}, []);

	const togglePreview = React.useCallback(
		(item: PreviewableItem) => {
			if (!item.preview_url) return;

			if (previewingId === item.set_id) {
				stopPreview();
				return;
			}

			// Stop current preview without clearing the current track state
			if (howlRef.current) {
				howlRef.current.stop();
				howlRef.current.unload();
				howlRef.current = null;
			}
			if (progressTimer.current) {
				window.clearInterval(progressTimer.current);
				progressTimer.current = null;
			}
			setPreviewingId(item.set_id);
			setIsLoadingPreview(true);
			setCurrentTrack({
				id: item.set_id,
				title: item.title,
				artist: item.artist,
				preview: item.preview_url,
			});

			const howl = new Howl({
				src: [item.preview_url],
				volume: 0.7,
				html5: true,
				onend: () => {
					setPreviewingId(null);
					setIsLoadingPreview(false);
					setPlaybackProgress(0);
					setCurrentTrack(null);
					if (progressTimer.current) {
						window.clearInterval(progressTimer.current);
						progressTimer.current = null;
					}
				},
				onplay: () => {
					setIsLoadingPreview(false);
					setPreviewingId(item.set_id);
					setDuration(howl.duration());
					if (progressTimer.current) {
						window.clearInterval(progressTimer.current);
					}
					progressTimer.current = window.setInterval(() => {
						const position = howl.seek() as number;
						const dur = howl.duration() || 0;
						setDuration(dur);
						setPlaybackProgress(dur ? Math.min(position / dur, 1) : 0);
					}, 200);
				},
				onloaderror: () => {
					setIsLoadingPreview(false);
					setPreviewingId(null);
					setCurrentTrack(null);
				},
				onplayerror: () => {
					setIsLoadingPreview(false);
					setPreviewingId(null);
					setCurrentTrack(null);
				},
			});

			howlRef.current = howl;
			howl.play();
		},
		[previewingId, stopPreview],
	);

	React.useEffect(() => stopPreview, [stopPreview]);

	const seekTo = (fraction: number) => {
		if (!howlRef.current || !duration || fraction < 0 || fraction > 1) return;
		const target = duration * fraction;
		howlRef.current.seek(target);
		setPlaybackProgress(fraction);
	};

	const getActionState = React.useCallback(
		(setId: number, baseOwned: boolean): ActionState => {
			const runningEntry = queueState.runningEntries.get(setId);
			if (runningEntry) {
				const pct = runningEntry.progress
					? Math.max(1, Math.floor(runningEntry.progress * 100))
					: 0;
				return { label: `Downloading ${pct}%`, disabled: true, variant: "secondary" };
			}
			if (queueState.queued.has(setId)) {
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

	const handlePlayerToggle = React.useCallback(() => {
		if (!currentTrack) return;

		if (previewingId === currentTrack.id && howlRef.current) {
			// Toggle pause/play for current track
			if (howlRef.current.playing()) {
				howlRef.current.pause();
			} else {
				howlRef.current.play();
			}
		} else if (currentTrack.preview) {
			// Start new preview
			togglePreview({
				set_id: currentTrack.id,
				title: currentTrack.title,
				artist: currentTrack.artist,
				preview_url: currentTrack.preview,
			});
		}
	}, [currentTrack, previewingId, togglePreview]);

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
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">Results</h2>
					<span className="text-xs text-text-secondary bg-surface-variant/70 px-2 py-1 rounded-md border border-border">
						{filtered.length.toLocaleString("en-US")} / {data.total.toLocaleString("en-US")}
					</span>
					<button
						onClick={() => setShowUnicode((prev) => !prev)}
						className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-variant/80 border border-border text-text-secondary hover:bg-surface-variant/60 transition-colors"
						title={showUnicode ? "Display in Normal" : "Display in Unicode"}
					>
						<Languages className="w-3.5 h-3.5" />
						{showUnicode ? "Unicode" : "Normal"}
					</button>
				</div>

				{/* Pagination */}
				{data.total > 20 && (
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage <= 1}
							onClick={() => setCurrentPage?.(Math.max(1, currentPage - 1))}
						>
							←
						</Button>
						<span className="text-xs text-text px-2 py-1 bg-surface-variant/50 rounded">
							Page {currentPage} / {Math.ceil(data.total / 20)}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage >= Math.ceil(data.total / 20)}
							onClick={() => setCurrentPage?.(currentPage + 1)}
						>
							→
						</Button>
					</div>
				)}
			</div>

			{filtered.length === 0 ? (
				<div className="flex-1 text-center py-12 rounded-2xl border border-dashed border-border bg-surface/60 flex items-center justify-center">
					<p className="text-muted-foreground">No beatmaps matching the criteria were found.</p>
				</div>
			) : (
				<div className="flex-1 min-h-0">
					<ResultList
						items={filtered}
						showUnicode={showUnicode}
						previewingId={previewingId}
						isLoadingPreview={isLoadingPreview}
						playbackProgress={playbackProgress}
						queueState={queueState}
						togglePreview={togglePreview}
						triggerDownload={triggerDownload}
						getActionState={getActionState}
					/>
				</div>
			)}

			<PreviewPlayer
				currentTrack={currentTrack}
				previewingId={previewingId}
				playbackProgress={playbackProgress}
				onToggle={handlePlayerToggle}
				onSeek={seekTo}
			/>
		</div>
	);
};

export default SearchResults;
