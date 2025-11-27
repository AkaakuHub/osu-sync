import type React from "react";
import { Pause, Play } from "lucide-react";
import { formatTime } from "./helpers";

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
	duration: number;
	elapsed: number;
	onToggle: () => void;
	onSeek: (fraction: number) => void;
};

const PreviewPlayer: React.FC<Props> = ({
	currentTrack,
	previewingId,
	playbackProgress,
	duration,
	elapsed,
	onToggle,
	onSeek,
}) => (
	<div className="sticky bottom-3 z-20">
		<div className="rounded-xl border border-slate-700/50 bg-slate-900/85 px-4 py-3 shadow-2xl backdrop-blur min-h-[92px] flex items-center">
			{currentTrack ? (
				<>
					<button
						className="h-11 w-11 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-lg hover:scale-[1.03] transition"
						onClick={onToggle}
						title="再生 / 停止"
					>
						{previewingId === currentTrack.id ? (
							<Pause className="w-5 h-5" />
						) : (
							<Play className="w-5 h-5" fill="currentColor" />
						)}
					</button>
					<div className="flex-1 min-w-0 pl-4">
						<div className="flex items-baseline gap-2 text-sm text-slate-100 truncate">
							<span className="font-semibold truncate">{currentTrack.title}</span>
							<span className="text-slate-400 truncate">/ {currentTrack.artist}</span>
						</div>
						<div
							className="mt-2 h-2 w-full rounded-full bg-slate-800 cursor-pointer overflow-hidden"
							onClick={(e) => {
								const rect = e.currentTarget.getBoundingClientRect();
								const fraction = (e.clientX - rect.left) / rect.width;
								onSeek(Math.max(0, Math.min(1, fraction)));
							}}
						>
							<div
								className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-[width] duration-150"
								style={{ width: `${Math.min(playbackProgress * 100, 100)}%` }}
							/>
						</div>
						<div className="mt-1 text-xs text-slate-400 flex justify-between">
							<span>{formatTime(elapsed)}</span>
							<span>{formatTime(duration)}</span>
						</div>
					</div>
				</>
			) : (
				<div className="w-full text-center text-sm text-slate-500">Preview not selected</div>
			)}
		</div>
	</div>
);

export default PreviewPlayer;
