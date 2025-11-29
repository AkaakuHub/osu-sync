import React from "react";
import { Pause, Play, Volume2, VolumeX, Menu, X } from "lucide-react";

export type CurrentTrack = {
	id: number;
	title: string;
	artist: string;
	preview: string;
	cover_url: string;
};

type Props = {
	currentTrack: CurrentTrack | null;
	previewingId: number | null;
	playbackProgress: number;
	isActuallyPlaying: boolean;
	volume: number;
	isMuted: boolean;
	onToggle: () => void;
	onSeek: (fraction: number) => void;
	onVolumeChange: (volume: number) => void;
	onToggleMute: () => void;
	onClose: () => void;
};

const PreviewPlayer: React.FC<Props> = ({
	currentTrack,
	previewingId,
	playbackProgress,
	isActuallyPlaying,
	volume,
	isMuted,
	onToggle,
	onSeek,
	onVolumeChange,
	onToggleMute,
	onClose,
}) => {
	const [position, setPosition] = React.useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = React.useState(false);
	const dragRef = React.useRef<{
		startX: number;
		startY: number;
		initialX: number;
		initialY: number;
	} | null>(null);

	const handleMouseDown = React.useCallback(
		(e: React.MouseEvent) => {
			setIsDragging(true);
			dragRef.current = {
				startX: e.clientX,
				startY: e.clientY,
				initialX: position.x,
				initialY: position.y,
			};
			e.preventDefault();
		},
		[position],
	);

	const handleMouseMove = React.useCallback(
		(e: MouseEvent) => {
			if (!isDragging || !dragRef.current) return;

			const deltaX = e.clientX - dragRef.current.startX;
			const deltaY = e.clientY - dragRef.current.startY;

			setPosition({
				x: dragRef.current.initialX + deltaX,
				y: dragRef.current.initialY + deltaY,
			});
		},
		[isDragging],
	);

	const handleMouseUp = React.useCallback(() => {
		setIsDragging(false);
		dragRef.current = null;

		// 画面外に出た場合に位置を修正
		setPosition((currentPos) => {
			const playerWidth = 224; // w-56 = 14rem = 224px
			const playerHeight = 280; // 実際の高さ（画像+コントロール）
			const initialRight = 16; // right-4 = 16px
			const initialTop = 16; // top-4 = 16px

			// 現在の絶対位置を計算
			const currentX = window.innerWidth - initialRight - playerWidth + currentPos.x;
			const currentY = initialTop + currentPos.y;

			// 画面内に収める
			const adjustedX = Math.max(16, Math.min(currentX, window.innerWidth - playerWidth - 16));
			const adjustedY = Math.max(16, Math.min(currentY, window.innerHeight - playerHeight - 16));

			// 相対位置に戻す
			const newRelativeX = -(window.innerWidth - initialRight - playerWidth - adjustedX);
			const newRelativeY = adjustedY - initialTop;

			return {
				x: newRelativeX,
				y: newRelativeY,
			};
		});
	}, []);

	React.useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	if (!currentTrack) return null;

	return (
		<div
			className="fixed top-4 right-4 z-30"
			style={{
				transform: `translate(${position.x}px, ${position.y}px)`,
			}}
		>
			<div className="bg-surface/95 backdrop-blur-md border border-border rounded-lg shadow-xl overflow-hidden w-56">
				{/* Windows風タイトルバー */}
				<div
					className="bg-surface-variant/80 h-6 flex items-center justify-between px-2 cursor-move border-b border-border"
					onMouseDown={handleMouseDown}
				>
					<Menu className="w-3 h-3 text-text-secondary" />
					<button
						className="w-3 h-3 text-text-secondary hover:text-text-foreground transition-colors"
						onClick={(e) => {
							e.stopPropagation(); // ドラッグイベントを停止
							onClose();
						}}
						title="閉じる"
					>
						<X className="w-3 h-3" />
					</button>
				</div>

				{/* 既存のコンテンツ */}
				<div className="p-2">
					<img
						src={currentTrack.cover_url}
						alt={`${currentTrack.title} cover`}
						className="w-full h-20 object-cover rounded mb-2"
					/>
					<div className="flex items-center gap-2">
						<button
							className="h-7 w-7 rounded-full bg-success/80 text-success-foreground flex items-center justify-center hover:bg-success transition-colors flex-shrink-0"
							onClick={onToggle}
							title="play / pause"
						>
							{previewingId === currentTrack.id && isActuallyPlaying ? (
								<Pause className="w-3 h-3" />
							) : (
								<Play className="w-3 h-3" fill="currentColor" />
							)}
						</button>
						<div className="flex-1 min-w-0">
							<div className="text-xs font-medium text-surface-foreground truncate">
								{currentTrack.title}
							</div>
							<div className="text-[10px] text-text-secondary truncate">{currentTrack.artist}</div>
						</div>
					</div>
					{/* Mini Progress Bar */}
					<div
						className="h-1 bg-surface-variant rounded-full mt-2 cursor-pointer overflow-hidden"
						onClick={(e) => {
							const rect = e.currentTarget.getBoundingClientRect();
							const fraction = (e.clientX - rect.left) / rect.width;
							onSeek(Math.max(0, Math.min(1, fraction)));
						}}
					>
						<div
							className="h-full bg-gradient-to-r from-success to-accent transition-[width] duration-150"
							style={{ width: `${Math.min(playbackProgress * 100, 100)}%` }}
						/>
					</div>

					{/* Compact Volume Control */}
					<div className="flex items-center gap-1 mt-2">
						<button
							className="w-3 h-3 text-text-secondary flex-shrink-0 hover:text-text transition-colors"
							onClick={onToggleMute}
							title={isMuted ? "ミュート解除" : "ミュート"}
						>
							{isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
						</button>
						<div
							className="flex-1 h-1 bg-surface-variant rounded-full relative cursor-pointer"
							onClick={(e) => {
								const rect = e.currentTarget.getBoundingClientRect();
								const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
								onVolumeChange(fraction);
							}}
						>
							<div
								className="h-full bg-success rounded-full transition-all duration-150"
								style={{ width: `${isMuted ? 0 : volume * 100}%` }}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PreviewPlayer;
