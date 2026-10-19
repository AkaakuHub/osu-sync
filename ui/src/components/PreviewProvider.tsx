import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Howl } from "howler";
import React from "react";
import { apiClient, type Settings } from "../hooks/useApiClient";
import PreviewPlayer, { type CurrentTrack } from "./search/PreviewPlayer";
import {
	PREVIEW_ENDED_EVENT,
	type PreviewableItem,
	PreviewContext,
	type PreviewRevealRequest,
} from "./search/previewBridge";

const PreviewProvider: React.FC<React.PropsWithChildren<{ onRevealTrack: () => void }>> = ({
	children,
	onRevealTrack,
}) => {
	const { data: settings } = useQuery<Settings>({
		queryKey: ["settings"],
		queryFn: () => apiClient.get<Settings>("/settings"),
	});
	const queryClient = useQueryClient();
	const [previewingId, setPreviewingId] = React.useState<number | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
	const [isActuallyPlaying, setIsActuallyPlaying] = React.useState(false);
	const [isMinimized, setIsMinimized] = React.useState(false);
	const [playbackProgress, setPlaybackProgress] = React.useState(0);
	const [duration, setDuration] = React.useState(0);
	const [currentTrack, setCurrentTrack] = React.useState<CurrentTrack | null>(null);
	const [isMuted, setIsMuted] = React.useState(false);
	const [volume, setVolume] = React.useState(0.5);
	const [previousVolume, setPreviousVolume] = React.useState(0.5);
	const howlRef = React.useRef<Howl | null>(null);
	const progressTimer = React.useRef<number | null>(null);
	const queuedPreviewRef = React.useRef<PreviewableItem | null>(null);
	const sourceTabIdRef = React.useRef<number | null>(null);
	const [revealRequest, setRevealRequest] = React.useState<PreviewRevealRequest | null>(null);

	React.useEffect(() => {
		if (!settings) return;
		setVolume(settings.player_volume);
		if (!isMuted) setPreviousVolume(settings.player_volume);
		howlRef.current?.volume(isMuted ? 0 : settings.player_volume);
	}, [settings, isMuted]);

	const stopPreview = React.useCallback(() => {
		const howl = howlRef.current;
		howlRef.current = null;
		howl?.unload();
		if (progressTimer.current !== null) {
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
		(item: PreviewableItem, tabId?: number) => {
			if (!item.preview_url) return;
			if (tabId !== undefined) sourceTabIdRef.current = tabId;
			if (!settings) {
				queuedPreviewRef.current = item;
				return;
			}
			if (previewingId === item.set_id && howlRef.current) {
				if (howlRef.current.playing()) howlRef.current.pause();
				else howlRef.current.play();
				return;
			}

			const previous = howlRef.current;
			howlRef.current = null;
			previous?.unload();
			if (progressTimer.current !== null) {
				window.clearInterval(progressTimer.current);
				progressTimer.current = null;
			}
			setPreviewingId(item.set_id);
			setPlaybackProgress(0);
			setDuration(0);
			setIsLoadingPreview(true);
			setIsActuallyPlaying(false);
			setCurrentTrack({
				id: item.set_id,
				title: item.title,
				artist: item.artist,
				preview: item.preview_url,
				cover_url: item.cover_url,
			});

			const howl = new Howl({
				src: [item.preview_url],
				volume: isMuted ? 0 : volume,
				html5: true,
				preload: true,
				onend: () => {
					if (howlRef.current !== howl) return;
					const event = new CustomEvent<number>(PREVIEW_ENDED_EVENT, {
						detail: item.set_id,
						cancelable: true,
					});
					if (window.dispatchEvent(event)) stopPreview();
				},
				onplay: () => {
					if (howlRef.current !== howl) return;
					setIsLoadingPreview(false);
					setIsActuallyPlaying(true);
					setDuration(howl.duration());
					if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
					progressTimer.current = window.setInterval(() => {
						const position = howl.seek();
						const trackDuration = howl.duration();
						if (typeof position === "number")
							setPlaybackProgress(trackDuration ? Math.min(position / trackDuration, 1) : 0);
					}, 100);
				},
				onpause: () => {
					if (howlRef.current !== howl) return;
					setIsActuallyPlaying(false);
					if (progressTimer.current !== null) {
						window.clearInterval(progressTimer.current);
						progressTimer.current = null;
					}
				},
				onloaderror: () => {
					if (howlRef.current === howl) stopPreview();
				},
				onplayerror: () => {
					if (howlRef.current === howl) stopPreview();
				},
			});
			howlRef.current = howl;
			howl.play();
		},
		[settings, previewingId, isMuted, volume, stopPreview],
	);

	React.useEffect(() => {
		if (!settings || !queuedPreviewRef.current) return;
		const item = queuedPreviewRef.current;
		queuedPreviewRef.current = null;
		togglePreview(item);
	}, [settings, togglePreview]);

	React.useEffect(
		() => () => {
			howlRef.current?.unload();
			if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
		},
		[],
	);

	const seekTo = React.useCallback(
		(fraction: number) => {
			if (!howlRef.current || !duration || fraction < 0 || fraction > 1) return;
			howlRef.current.seek(duration * fraction);
			setPlaybackProgress(fraction);
		},
		[duration],
	);

	const handleVolumeChange = React.useCallback(
		(newVolume: number) => {
			setVolume(newVolume);
			if (!isMuted) setPreviousVolume(newVolume);
			howlRef.current?.volume(isMuted ? 0 : newVolume);
			apiClient
				.post("/settings", { player_volume: newVolume })
				.then(() => queryClient.invalidateQueries({ queryKey: ["settings"] }))
				.catch((error) => console.error("Failed to save volume setting:", error));
		},
		[isMuted, queryClient],
	);

	const handleToggleMute = React.useCallback(() => {
		if (isMuted) {
			setIsMuted(false);
			howlRef.current?.volume(previousVolume);
		} else {
			setIsMuted(true);
			setPreviousVolume(volume);
			howlRef.current?.volume(0);
		}
	}, [isMuted, volume, previousVolume]);

	const handlePlayerToggle = React.useCallback(() => {
		if (!currentTrack) return;
		togglePreview({
			set_id: currentTrack.id,
			title: currentTrack.title,
			artist: currentTrack.artist,
			preview_url: currentTrack.preview,
			cover_url: currentTrack.cover_url,
		});
	}, [currentTrack, togglePreview]);

	const preview = React.useMemo(
		() => ({
			previewingId,
			isLoadingPreview,
			isActuallyPlaying,
			playbackProgress,
			togglePreview,
			revealRequest,
		}),
		[
			previewingId,
			isLoadingPreview,
			isActuallyPlaying,
			playbackProgress,
			togglePreview,
			revealRequest,
		],
	);

	return (
		<PreviewContext.Provider value={preview}>
			{children}
			{settings && (
				<PreviewPlayer
					currentTrack={currentTrack}
					previewingId={previewingId}
					playbackProgress={playbackProgress}
					isActuallyPlaying={isActuallyPlaying}
					volume={volume}
					isMuted={isMuted}
					onToggle={handlePlayerToggle}
					onReveal={() => {
						if (previewingId === null) return;
						onRevealTrack();
						setRevealRequest((current) => ({
							setId: previewingId,
							tabId: sourceTabIdRef.current,
							sequence: (current?.sequence ?? 0) + 1,
						}));
					}}
					onSeek={seekTo}
					onVolumeChange={handleVolumeChange}
					onToggleMute={handleToggleMute}
					isMinimized={isMinimized}
					onToggleMinimize={() => setIsMinimized((value) => !value)}
				/>
			)}
		</PreviewContext.Provider>
	);
};

export default PreviewProvider;
