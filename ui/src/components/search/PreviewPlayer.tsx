import type React from "react";
import { Pause, Play } from "lucide-react";

export type CurrentTrack = {
	id: number;
	title: string;
	artist: string;
	preview?: string | null;
};

type Props = {
	currentTrack: CurrentTrack | null;
	previewingId: number | null;
	playbackProgress: number;
	onToggle: () => void;
	onSeek: (fraction: number) => void;
};

const PreviewPlayer: React.FC<Props> = ({
	currentTrack,
	previewingId,
	playbackProgress,
	onToggle,
	onSeek,
}) => (
	<div className="fixed top-4 right-4 z-30">
		{currentTrack ? (
			<div className="bg-surface/95 backdrop-blur-md border border-border rounded-lg shadow-xl p-2 w-48">
				<div className="flex items-center gap-2">
					<button
						className="h-7 w-7 rounded-full bg-success/80 text-success-foreground flex items-center justify-center hover:bg-success transition-colors flex-shrink-0"
						onClick={onToggle}
						title="再生 / 停止"
					>
						{previewingId === currentTrack.id ? (
							<Pause className="w-3 h-3" />
						) : (
							<Play className="w-3 h-3" fill="currentColor" />
						)}
					</button>
					<div className="flex-1 min-w-0">
						<div className="text-xs font-medium text-surface-foreground truncate">
							{currentTrack.title}
						</div>
						<div className="text-[10px] text-text-secondary truncate">
							{currentTrack.artist}
						</div>
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
			</div>
		) : null}
	</div>
);

export default PreviewPlayer;
