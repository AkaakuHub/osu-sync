import React from "react";
import { Howl } from "howler";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PreviewPlayer, { type CurrentTrack } from "./search/PreviewPlayer";
import type { PreviewableItem } from "./search/ResultCard";
import { apiClient, type Settings } from "../hooks/useApiClient";

// SearchResults.tsxから移動した状態
const GlobalPreviewPlayer: React.FC = () => {
	// 設定を取得
	const { data: settings } = useQuery<Settings>({
		queryKey: ["settings"],
		queryFn: () => apiClient.get<Settings>("/settings"),
	});
	const queryClient = useQueryClient();

	// すべての状態を初期化（フックは条件付きで呼ばれないようにする）
	const [previewingId, setPreviewingId] = React.useState<number | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
	const [isActuallyPlaying, setIsActuallyPlaying] = React.useState(false);
	const [isMinimized, setIsMinimized] = React.useState(false);
	const howlRef = React.useRef<Howl | null>(null);
	const progressTimer = React.useRef<number | null>(null);
	const [playbackProgress, setPlaybackProgress] = React.useState(0);
	const [duration, setDuration] = React.useState(0);
	const [currentTrack, setCurrentTrack] = React.useState<CurrentTrack | null>(null);

	// 設定読み込み状態を管理
	const [isSettingsLoaded, setIsSettingsLoaded] = React.useState<boolean>(false);

	// プレビューキュー（設定読み込み中のリクエストを保持）
	const queuedPreviewRef = React.useRef<PreviewableItem | null>(null);

	// 音量状態を管理（設定読み込み後のみ有効）
	const [isMuted, setIsMuted] = React.useState<boolean>(false);
	const [volume, setVolume] = React.useState<number>(0.5);
	const [previousVolume, setPreviousVolume] = React.useState<number>(0.5);

	// 設定が読み込まれたら音量状態を初期化
	React.useEffect(() => {
		if (settings) {
			const backendVolume = settings.player_volume;
			setVolume(backendVolume);
			setPreviousVolume(backendVolume);
			setIsSettingsLoaded(true);

			// キューされたプレビューがあれば処理
			if (queuedPreviewRef.current) {
				// 少し遅延して実行（状態更新が完了するのを待つ）
				setTimeout(() => {
					if (queuedPreviewRef.current && isSettingsLoaded) {
						// 直接実行（togglePreviewを呼ぶと循環参照になるため）
						const item = queuedPreviewRef.current;
						queuedPreviewRef.current = null;

						// ここからtogglePreviewのロジックを再実装
						if (item.preview_url && !isMuted) {
							// プレビュー開始処理
							if (howlRef.current) {
								howlRef.current.stop();
								howlRef.current.unload();
								howlRef.current = null;
							}
							if (progressTimer.current) {
								window.clearInterval(progressTimer.current);
								progressTimer.current = null;
							}

							setPreviewingId(null);
							setPlaybackProgress(0);
							setDuration(0);
							setIsLoadingPreview(true);

							setTimeout(() => {
								setPreviewingId(item.set_id);
								setCurrentTrack({
									id: item.set_id,
									title: item.title,
									artist: item.artist,
									preview: item.preview_url as string,
									cover_url: item.cover_url as string,
								});

								const howl = new Howl({
									src: [item.preview_url || ""],
									volume: volume,
									html5: true,
									preload: true,
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
										}, 100);
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
							}, 50);
						}
					}
				}, 0);
			}
		}
	}, [settings, volume, isMuted, isSettingsLoaded]);

	// 設定が更新されたら音量を同期
	React.useEffect(() => {
		if (settings) {
			const newVolume = settings.player_volume;
			setVolume(newVolume);
			if (!isMuted) {
				setPreviousVolume(newVolume);
			}
			// 既存のHowlerに即時適用
			if (howlRef.current) {
				howlRef.current.volume(isMuted ? 0 : newVolume);
			}
		}
	}, [settings?.player_volume, isMuted]);

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

			// 設定読み込み中はキューに入れる
			if (!isSettingsLoaded) {
				queuedPreviewRef.current = item;
				return;
			}

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
					preview: item.preview_url as string,
					cover_url: item.cover_url as string,
				});

				// 設定から正しい音量を取得
				const initialVolume = isMuted ? 0 : volume;

				const howl = new Howl({
					src: [item.preview_url || ""],
					volume: initialVolume,
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
		[previewingId, stopPreview, isSettingsLoaded],
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

	const seekTo = React.useCallback(
		(fraction: number) => {
			if (!howlRef.current || !duration || fraction < 0 || fraction > 1) return;
			const target = duration * fraction;
			howlRef.current.seek(target);
			setPlaybackProgress(fraction);
		},
		[duration],
	);

	const handleVolumeChange = React.useCallback(
		(newVolume: number) => {
			if (!isMuted) {
				setPreviousVolume(newVolume);
			}
			if (howlRef.current) {
				howlRef.current.volume(isMuted ? 0 : newVolume);
			}

			// 音量設定をバックエンドに保存
			apiClient
				.post("/settings", { player_volume: newVolume })
				.then(() => {
					// 設定キャッシュを更新
					queryClient.invalidateQueries({ queryKey: ["settings"] });
				})
				.catch((error) => {
					console.error("Failed to save volume setting:", error);
				});
		},
		[isMuted, queryClient],
	);

	const handleToggleMute = React.useCallback(() => {
		if (isMuted) {
			// ミュート解除：previousVolumeに保存された音量に戻す
			setIsMuted(false);
			if (howlRef.current) {
				howlRef.current.volume(previousVolume);
			}
		} else {
			// ミュート：現在の音量をpreviousVolumeに保存して0に設定
			setIsMuted(true);
			setPreviousVolume(volume);
			if (howlRef.current) {
				howlRef.current.volume(0);
			}
		}
	}, [isMuted, volume, previousVolume]);

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

	// グローバルに機能を提供
	React.useEffect(() => {
		// グローバルにtogglePreview関数を公開
		(window as any).togglePreview = togglePreview;
		(window as any).previewPlayerState = {
			previewingId,
			isLoadingPreview,
			isActuallyPlaying,
			playbackProgress,
			currentTrack,
		};

		return () => {
			delete (window as any).togglePreview;
			delete (window as any).previewPlayerState;
		};
	}, [
		togglePreview,
		previewingId,
		isLoadingPreview,
		isActuallyPlaying,
		playbackProgress,
		currentTrack,
	]);

	// 設定読み込み前のみ非表示
	if (!isSettingsLoaded) {
		return null;
	}

	return (
		<div className="fixed top-4 right-4 z-50">
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
				isMinimized={isMinimized}
				onToggleMinimize={() => setIsMinimized((v) => !v)}
			/>
		</div>
	);
};

export default GlobalPreviewPlayer;
