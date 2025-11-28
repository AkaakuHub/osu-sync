import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Howl } from "howler";
import { Languages } from "lucide-react";
import toast from "react-hot-toast";
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

const SearchResults: React.FC<Props> = ({
	ownedOnly,
	onQueueUpdate,
	queue,
	searchData,
	currentPage = 1,
	setCurrentPage,
}) => {
	const client = useQueryClient();
	const [showUnicode, setShowUnicode] = React.useState(false);
	const [previewingId, setPreviewingId] = React.useState<number | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
	const [isActuallyPlaying, setIsActuallyPlaying] = React.useState(false);
	const howlRef = React.useRef<Howl | null>(null);
	const progressTimer = React.useRef<number | null>(null);
	const [playbackProgress, setPlaybackProgress] = React.useState(0);
	const [duration, setDuration] = React.useState(0);
	const [currentTrack, setCurrentTrack] = React.useState<CurrentTrack | null>(null);
	const [volume, setVolume] = React.useState(0.7);
	const [isMuted, setIsMuted] = React.useState(false);
	const [previousVolume, setPreviousVolume] = React.useState(0.7);

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
		// Find the search result for this set_id to get metadata
		const searchResult = data?.results?.find((r) => r.set_id === setId);
		const displayName = searchResult
			? `${searchResult.artist} - ${searchResult.title}`
			: `セット ${setId}`;

		const metadata = searchResult
			? {
					[setId]: {
						artist: searchResult.artist,
						title: searchResult.title,
						artist_unicode: searchResult.artist_unicode,
						title_unicode: searchResult.title_unicode,
					},
				}
			: undefined;

		try {
			await apiClient.post("/download", { set_ids: [setId], metadata });
			client.invalidateQueries({ queryKey: ["queue"] });
			onQueueUpdate();

			// DL queue追加の通知
			toast.success(`${displayName}\nAdded to download queue`);
		} catch (error) {
			console.error("Failed to add to download queue:", error);
			toast.error(`${displayName}\nFailed to add to download queue`);
		}
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
		setIsActuallyPlaying(false);
		setCurrentTrack(null);
	}, []);

	const togglePreview = React.useCallback(
		(item: PreviewableItem) => {
			if (!item.preview_url) return;

			if (previewingId === item.set_id && howlRef.current) {
				// Toggle pause/play for current track (ミニプレイヤーと同じ動作)
				if (howlRef.current.playing()) {
					howlRef.current.pause();
					setIsActuallyPlaying(false);
				} else {
					howlRef.current.play();
					setIsActuallyPlaying(true);
				}
				return;
			}

			// 即時状態更新で遅延を削減
			if (howlRef.current) {
				howlRef.current.stop();
				howlRef.current.unload();
				howlRef.current = null;
			}
			if (progressTimer.current) {
				window.clearInterval(progressTimer.current);
				progressTimer.current = null;
			}

			// 状態を即時クリアしてから新しいトラックを設定
			setPreviewingId(null);
			setPlaybackProgress(0);
			setDuration(0);
			setIsLoadingPreview(true);

			// 少し遅延して新しいトラックを設定（前の状態が完全にクリアされるのを待つ）
			setTimeout(() => {
				setPreviewingId(item.set_id);
				setCurrentTrack({
					id: item.set_id,
					title: item.title,
					artist: item.artist,
					preview: item.preview_url || "",
				});

				const howl = new Howl({
					src: [item.preview_url || ""],
					volume: volume,
					html5: true,
					preload: true, // プリロードを有効化
					onend: () => {
						setPreviewingId(null);
						setIsLoadingPreview(false);
						setIsActuallyPlaying(false);
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
						setIsActuallyPlaying(true);
						setDuration(howl.duration());
						if (progressTimer.current) {
							window.clearInterval(progressTimer.current);
						}
						progressTimer.current = window.setInterval(() => {
							const position = howl.seek() as number;
							const dur = howl.duration() || 0;
							setDuration(dur);
							setPlaybackProgress(dur ? Math.min(position / dur, 1) : 0);
						}, 100); // 頻度を上げてレスポンスを改善
					},
					onpause: () => {
						setIsActuallyPlaying(false);
					},
					onloaderror: () => {
						setIsLoadingPreview(false);
						setPreviewingId(null);
						setIsActuallyPlaying(false);
						setCurrentTrack(null);
					},
					onplayerror: () => {
						setIsLoadingPreview(false);
						setPreviewingId(null);
						setIsActuallyPlaying(false);
						setCurrentTrack(null);
					},
				});

				howlRef.current = howl;
				howl.play();
			}, 50); // 50msの遅延で確実なクリアを確保
		},
		[previewingId, stopPreview],
	);

	// ページのvisibility changeを監視してタブが非表示になっても再生を継続
	React.useEffect(() => {
		const handleVisibilityChange = () => {
			// 何もしない - ミニプレイヤーは継続させる
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	// アプリ終了時のみクリーンアップ
	React.useEffect(() => {
		return () => {
			// コンポーネント完全破棄時のみクリーンアップ
			if (howlRef.current) {
				howlRef.current.stop();
				howlRef.current.unload();
			}
			if (progressTimer.current) {
				window.clearInterval(progressTimer.current);
			}
		};
	}, []);

	const seekTo = (fraction: number) => {
		if (!howlRef.current || !duration || fraction < 0 || fraction > 1) return;
		const target = duration * fraction;
		howlRef.current.seek(target);
		setPlaybackProgress(fraction);
	};

	const handleVolumeChange = (newVolume: number) => {
		setVolume(newVolume);
		if (!isMuted) {
			setPreviousVolume(newVolume);
		}
		if (howlRef.current) {
			howlRef.current.volume(isMuted ? 0 : newVolume);
		}
	};

	const handleToggleMute = () => {
		if (isMuted) {
			// ミュート解除：直前の音量に戻す
			setIsMuted(false);
			setVolume(previousVolume);
			if (howlRef.current) {
				howlRef.current.volume(previousVolume);
			}
		} else {
			// ミュート：現在の音量を保存して0に設定
			setIsMuted(true);
			setPreviousVolume(volume);
			if (howlRef.current) {
				howlRef.current.volume(0);
			}
		}
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

	const handlePlayerToggle = React.useCallback(() => {
		if (!currentTrack) return;

		if (previewingId === currentTrack.id && howlRef.current) {
			// Toggle pause/play for current track
			if (howlRef.current.playing()) {
				howlRef.current.pause();
				setIsActuallyPlaying(false);
			} else {
				howlRef.current.play();
				setIsActuallyPlaying(true);
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
						isActuallyPlaying={isActuallyPlaying}
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
				isActuallyPlaying={isActuallyPlaying}
				volume={volume}
				isMuted={isMuted}
				onToggle={handlePlayerToggle}
				onSeek={seekTo}
				onVolumeChange={handleVolumeChange}
				onToggleMute={handleToggleMute}
			/>
		</div>
	);
};

export default SearchResults;
