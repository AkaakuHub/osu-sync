import { Download, ExternalLink, Music4, Pause, Play } from "lucide-react";
import type React from "react";
import { tv } from "tailwind-variants";
import type { SearchResponse } from "../../hooks/useApiClient";
import Button from "../ui/Button";
import { useBeatmapMetadata } from "./BeatmapMetadata";
import { type ActionState, buildBackground, defaultCover } from "./helpers";

export type PreviewableItem = Pick<
	SearchResponse["results"][number],
	"set_id" | "title" | "artist" | "preview_url" | "cover_url"
>;

export type ResultCardProps = {
	item: SearchResponse["results"][number];
	showUnicode: boolean;
	action: ActionState;
	isPreviewing: boolean;
	isLoadingPreview: boolean;
	playbackProgress: number;
	previewingId: number | null;
	isActuallyPlaying: boolean;
	togglePreview: (item: PreviewableItem) => void;
	triggerDownload: (setId: number) => void;
	failureMessage?: string | null;
	openSearchTab: (query: string, label: string) => void;
};

// 背景色に基づいてテキスト色（黒or白）を計算する関数
const cardStyles = tv({
	slots: {
		base: "group relative rounded-xl bg-surface/80 shadow-lg backdrop-blur-xs transition-all duration-300",
		banner: "relative flex gap-3",
		thumbnail: "rounded-lg object-cover ring-2 ring-border/70 shadow-xl shrink-0",
		content: "flex-1 min-w-0 px-2 py-2 grid grid-cols-[1fr_auto] gap-3",
		header: "flex items-start gap-3",
		titleSection: "flex-1 min-w-0",
		title: "text-lg font-bold text-surface-foreground leading-tight truncate",
		artist: "text-sm font-semibold text-text-secondary leading-tight truncate",
		creator: "text-xs text-text-muted leading-tight truncate",
		stats: "flex flex-wrap items-center gap-3 text-[11px] text-text",
		statItem: "flex items-center gap-1.5",
		badge: "px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-sm",
		difficultyPreview: "inline-flex items-center gap-1",
		difficultyDot: "h-3 w-3 rounded-full border border-surface-foreground/20 shadow",
		difficultyContainer:
			"mt-2 overflow-hidden rounded-lg border border-border bg-surface/95 backdrop-blur-xs shadow-2xl transition-all duration-300 ease-out",
		difficultyList: "grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 text-sm text-surface-foreground",
		difficultyItem:
			"flex items-center gap-3 rounded-lg px-3 py-2 bg-surface-variant/80 border border-border hover:bg-surface-variant/60 transition-colors",
		difficultyIcon:
			"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-surface-foreground shrink-0",
		difficultyRating: "text-sm font-semibold text-surface-foreground",
		difficultyName: "text-sm text-text-secondary truncate",
	},
	variants: {
		status: {
			graveyard: { badge: "text-surface-foreground" },
			wip: { badge: "text-surface-foreground" },
			pending: { badge: "text-surface-foreground" },
			ranked: { badge: "text-surface-foreground" },
			approved: { badge: "text-surface-foreground" },
			qualified: { badge: "text-surface-foreground" },
			loved: { badge: "text-surface-foreground" },
		},
	},
	defaultVariants: { status: "ranked" },
});

// osu! official status colors

const ResultCard: React.FC<ResultCardProps> = ({
	item,
	showUnicode,
	action,
	isPreviewing,
	isLoadingPreview,
	playbackProgress,
	previewingId,
	isActuallyPlaying,
	togglePreview,
	triggerDownload,
	failureMessage,
	openSearchTab,
}) => {
	const card = cardStyles();
	const cardStyle = buildBackground(item.cover_url);
	const { summary, panel } = useBeatmapMetadata(item);

	const buttonVariant =
		action.variant === "danger"
			? "cardDanger"
			: action.variant === "secondary"
				? "cardSecondary"
				: "cardPrimary";

	return (
		<div className="relative m-1.5 p-1 group">
			<div className={card.base()} style={cardStyle}>
				<div className="absolute inset-0 rounded-xl border-2 border-border/80 transition-all duration-300 group-hover:border-accent/60 group-hover:shadow-[0_0_10px_rgba(153,102,255,0.6),0_0_10px_rgba(255,102,170,0.5)]"></div>
				<div className="relative rounded-xl backdrop-blur-[2px] overflow-hidden transition-all duration-300 group-hover:backdrop-blur-none">
					<div className="absolute inset-0 bg-gradient-to-r from-surface-variant/70 via-surface-variant/80 to-surface-variant/20 z-0 group-hover:opacity-80 transition-all duration-300" />

					<div className={`${card.banner()} relative z-10`}>
						{/* osu!公式サイトへのリンク */}
						<a
							href={`https://osu.ppy.sh/beatmapsets/${item.set_id}`}
							target="_blank"
							rel="noopener noreferrer"
							className="absolute top-5 right-5 rounded-full group/link"
							title="Open in osu! website"
						>
							<ExternalLink className="w-4 h-4 text-text-muted group-hover/link:text-accent transition-colors" />
						</a>

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
										if (e.currentTarget.src !== defaultCover) {
											e.currentTarget.onerror = null;
											e.currentTarget.src = defaultCover;
										}
									}}
								/>
							) : (
								<div
									className={`${card.thumbnail()} h-full w-full bg-gradient-to-br from-surface-variant to-surface flex items-center justify-center`}
								>
									<Music4 className="w-8 h-8 text-text-muted" />
								</div>
							)}

							<div className="absolute inset-0 flex items-center justify-center">
								<div className="relative bg-surface/80 rounded-full p-2 shadow-lg border border-border/20 group-hover:scale-[1.04] transition">
									{(() => {
										const isCurrentlyPreviewing = previewingId === item.set_id;
										const ringProgress = isCurrentlyPreviewing ? playbackProgress : 0;
										return (
											<div
												className="absolute inset-0 rounded-full"
												style={{
													background: `conic-gradient(${isActuallyPlaying ? "rgba(52, 211, 153,0.8)" : "rgba(255,255,255,0.25)"} ${Math.min(
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
											<Pause className="w-5 h-5 text-surface-foreground" />
										) : (
											<Play className="w-5 h-5 text-surface-foreground" fill="currentColor" />
										)}
									</div>
								</div>
							</div>
						</button>

						<div className={card.content()}>
							<div className="min-w-0 space-y-1">
								<div className="flex items-start gap-2">
									<div className={card.titleSection()}>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												openSearchTab(
													`title=""${item.title}""`,
													showUnicode && item.title_unicode ? item.title_unicode : item.title,
												);
											}}
											className={`${card.title()} text-left hover:text-primary transition-colors`}
										>
											{showUnicode && item.title_unicode ? item.title_unicode : item.title}
										</button>
										<div className="flex flex-col">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													openSearchTab(
														`artist=""${item.artist}""`,
														showUnicode && item.artist_unicode ? item.artist_unicode : item.artist,
													);
												}}
												className={`${card.artist()} text-left hover:text-primary transition-colors rounded px-0 py-0 inline-block w-fit`}
												aria-label={`Search by artist ${item.artist}`}
											>
												{showUnicode && item.artist_unicode ? item.artist_unicode : item.artist}
											</button>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													openSearchTab(`creator=""${item.creator}""`, item.creator);
												}}
												className={`${card.creator()} text-left hover:text-primary transition-colors rounded px-0 py-0 inline-block w-fit`}
												aria-label={`Search by mapper ${item.creator}`}
											>
												{item.creator}
											</button>
										</div>
									</div>
								</div>

								{summary}
								{failureMessage && <p className="text-xs text-error">Failed: {failureMessage}</p>}
							</div>

							<div className="flex items-end">
								<Button
									variant={buttonVariant}
									size="card"
									className="gap-2 rounded-lg"
									disabled={action.disabled}
									onClick={() => triggerDownload(item.set_id)}
								>
									<Download className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
			{panel}
		</div>
	);
};

export default ResultCard;
