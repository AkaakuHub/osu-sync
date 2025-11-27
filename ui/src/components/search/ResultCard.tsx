import type React from "react";
import { useState } from "react";
import { Download, Heart, Music4, Play, Pause, CalendarDays } from "lucide-react";
import { tv } from "tailwind-variants";
import type { SearchResponse } from "../../hooks/useApiClient";
import {
	type ActionState,
	buildBackground,
	difficultyColor,
	formatDate,
	formatNumber,
} from "./helpers";

export type PreviewableItem = Pick<
	SearchResponse["results"][number],
	"set_id" | "title" | "artist" | "preview_url"
>;

type Props = {
	item: SearchResponse["results"][number];
	showUnicode: boolean;
	action: ActionState;
	isPreviewing: boolean;
	isLoadingPreview: boolean;
	playbackProgress: number;
	togglePreview: (item: PreviewableItem) => void;
	triggerDownload: (setId: number) => void;
	failureMessage?: string | null;
};

const cardStyles = tv({
	slots: {
		base: "group relative overflow-hidden rounded-xl border-slate-700/60 bg-slate-900/80 shadow-lg backdrop-blur-md transition-all duration-200 hover:-translate-y-[1px] hover:shadow-2xl",
		banner: "relative flex gap-3",
		thumbnail: "rounded-lg object-cover ring-2 ring-slate-800/70 shadow-xl shrink-0",
		content: "flex-1 min-w-0 flex flex-col gap-2 px-1 py-3",
		header: "flex items-start gap-3",
		titleSection: "flex-1 min-w-0",
		title: "text-lg font-bold text-white leading-tight truncate",
		artist: "text-sm font-semibold text-sky-100 leading-tight truncate",
		creator: "text-xs text-slate-300 leading-tight truncate",
		stats: "flex flex-wrap items-center gap-3 text-[11px] text-slate-200",
		statItem: "flex items-center gap-1.5",
		badge: "px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-sm",
		difficultyPreview: "inline-flex items-center gap-1",
		difficultyDot: "h-3 w-3 rounded-full border border-white/20 shadow",
		difficultyContainer:
			"mt-2 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-800/95 backdrop-blur-md shadow-2xl transition-all duration-300 ease-out",
		difficultyList: "grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 text-sm text-slate-100",
		difficultyItem:
			"flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-700/80 border border-slate-600/60 hover:bg-slate-600/80 transition-colors",
		difficultyIcon:
			"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
		difficultyRating: "text-sm font-semibold text-white",
		difficultyName: "text-sm text-slate-200 truncate",
	},
	variants: {
		status: {
			ranked: { badge: "bg-gradient-to-r from-emerald-500 to-green-600 text-white" },
			approved: { badge: "bg-gradient-to-r from-blue-500 to-cyan-600 text-white" },
			qualified: { badge: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white" },
			loved: { badge: "bg-gradient-to-r from-pink-500 to-rose-600 text-white" },
			pending: { badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900" },
			wip: { badge: "bg-gradient-to-r from-orange-400 to-red-500 text-slate-900" },
		},
	},
	defaultVariants: { status: "ranked" },
});

const ResultCard: React.FC<Props> = ({
	item,
	showUnicode,
	action,
	isPreviewing,
	isLoadingPreview,
	playbackProgress,
	togglePreview,
	triggerDownload,
	failureMessage,
}) => {
	const [isHovered, setIsHovered] = useState(false);

	const statusKey =
		(item.status?.toLowerCase() as keyof typeof cardStyles.variants.status) || "ranked";
	const card = cardStyles({ status: statusKey });
	const cardStyle = buildBackground(item.cover_url);

	const buttonClass =
		action.variant === "danger"
			? "bg-red-500/20 text-red-300 border border-red-500/70 hover:bg-red-500/30"
			: action.variant === "secondary"
				? "bg-slate-700/40 text-slate-200 border border-slate-600/60 hover:bg-slate-700/60"
				: "bg-gradient-to-r from-emerald-500 to-lime-400 text-slate-950 hover:from-emerald-400 hover:to-lime-300 shadow-lg shadow-emerald-500/20";

	const difficulties = (item.difficulties ?? [])
		.map((d) => ({ ...d, value: parseFloat(d.rating) }))
		.sort((a, b) => a.value - b.value)
		.slice(0, 6);

	return (
		<div className="relative m-1.5">
			<div className="relative overflow-hidden">
				<div className={card.base()} style={cardStyle}>
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/90 to-slate-900/70 z-0" />

					<div className={`${card.banner()} relative z-10`}>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								togglePreview(item);
							}}
							className="relative h-30 w-30 shrink-0 overflow-hidden rounded-lg cursor-pointer group"
							title={item.preview_url ? "play preview" : "no preview available"}
							disabled={!item.preview_url || isLoadingPreview}
						>
							{item.cover_url ? (
								<img
									src={item.cover_url}
									alt={item.title}
									className={`${card.thumbnail()} cursor-pointer h-full w-full`}
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
								/>
							) : (
								<div
									className={`${card.thumbnail()} h-full w-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center`}
								>
									<Music4 className="w-8 h-8 text-slate-500" />
								</div>
							)}

							<div className="absolute inset-0 flex items-center justify-center">
								<div className="relative bg-black/55 rounded-full p-2 shadow-lg border border-white/10 group-hover:scale-[1.04] transition">
									{(() => {
										const ringProgress = isPreviewing ? playbackProgress : 0;
										return (
											<div
												className="absolute inset-0 rounded-full"
												style={{
													background: `conic-gradient(${isPreviewing ? "rgba(52, 211, 153,0.8)" : "rgba(255,255,255,0.25)"} ${Math.min(
														ringProgress * 100,
														100,
													)}%, rgba(255,255,255,0.08) 0)`,
													opacity: item.preview_url ? 1 : 0.3,
												}}
											/>
										);
									})()}
									<div className="relative z-10 flex items-center justify-center">
										{isPreviewing ? (
											<Pause className="w-5 h-5 text-white" />
										) : (
											<Play className="w-5 h-5 text-white" fill="white" />
										)}
									</div>
								</div>
							</div>
						</button>

						<div className={`${card.content()} grid grid-cols-[1fr_auto] gap-3`}>
							<div className="min-w-0 space-y-1">
								<div className="flex items-start gap-2">
									<div className={card.titleSection()}>
										<h3 className={card.title()}>
											{showUnicode && item.title_unicode ? item.title_unicode : item.title}
										</h3>
										<p className={card.artist()}>
											{showUnicode && item.artist_unicode ? item.artist_unicode : item.artist}
										</p>
										<p className={card.creator()}>{item.creator}</p>
									</div>
									<span className={card.badge()}>{item.status?.toUpperCase()}</span>
								</div>

								<div className={card.stats()}>
									<div className={card.statItem()}>
										<Heart className="w-4 h-4 text-rose-300" />
										<span>{formatNumber(item.favourite_count)}</span>
									</div>
									<div className={card.statItem()}>
										<Play className="w-4 h-4 text-emerald-300" />
										<span>{formatNumber(item.play_count)}</span>
									</div>
									<div className={card.statItem()}>
										<CalendarDays className="w-4 h-4 text-sky-200" />
										<span>{formatDate(item.ranked_date)}</span>
									</div>
								</div>

								{difficulties.length > 0 && (
									<div
										className="flex gap-1 overflow-x-auto scrollbar-hide"
										style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
										onMouseEnter={() => setIsHovered(true)}
										onMouseLeave={() => setIsHovered(false)}
									>
										{difficulties.map((d, idx) => (
											<div
												key={idx}
												className="h-[15px] w-[11px] rounded-full flex-shrink-0 relative"
												title={`${d.label} - ★${d.rating}`}
											>
												<div
													className="absolute inset-0 rounded-full"
													style={{
														background: "none",
														borderColor: difficultyColor(d.value),
														borderWidth: "2px",
													}}
												/>
												<div
													className="absolute inset-[4px] rounded-full"
													style={{
														backgroundColor: difficultyColor(d.value),
													}}
												/>
											</div>
										))}
									</div>
								)}

								{failureMessage && (
									<p className="text-xs text-rose-300">Failed: {failureMessage}</p>
								)}
							</div>

							<div className="flex items-end">
								<button
									className={`${buttonClass} inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
									disabled={action.disabled}
									onClick={() => triggerDownload(item.set_id)}
								>
									<Download className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* カード外側の下に配置される難易度リスト */}
			{difficulties.length > 0 && (
				<div
					className={`absolute left-0 right-0 z-20 mt-1 ${!isHovered ? "pointer-events-none" : ""}`}
					style={{
						maxHeight: isHovered ? "24rem" : "0",
						opacity: isHovered ? 1 : 0,
						transition: "all 0.3s ease-out",
					}}
				>
					<div className={card.difficultyContainer()}>
						<div className={card.difficultyList()}>
							{difficulties.map((d, idx) => (
								<div key={idx} className={card.difficultyItem()}>
									<div
										className={card.difficultyIcon()}
										style={{ backgroundColor: difficultyColor(d.value) }}
									>
										{idx + 1}
									</div>
									<span className="text-sm font-semibold text-white">★{d.rating}</span>
									<span className="text-sm text-slate-200 truncate">{d.label}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ResultCard;
