import { Download, ExternalLink, Music4, Pause, Play } from "lucide-react";
import type React from "react";
import { memo, useMemo } from "react";
import { tv } from "tailwind-variants";
import type { SearchResponse } from "../../hooks/useApiClient";
import type { CardLayout } from "../../hooks/useDisplayPreferences";
import Button from "../ui/Button";
import { useBeatmapMetadata } from "./BeatmapMetadata";
import { type ActionState, artworkCoverUrl, buildBackground, defaultCover } from "./helpers";
import { usePreview } from "./previewBridge";

type ResultCardProps = {
	layout: CardLayout;
	item: SearchResponse["results"][number];
	showUnicode: boolean;
	dateField?: "ranked" | "updated";
	action: ActionState;
	triggerDownload: (setId: number) => void;
	failureMessage?: string | null;
	openSearchTab: (query: string, label: string) => void;
};

const cardStyles = tv({
	slots: {
		wrapper: "relative m-1.5 p-1 group",
		base: "group relative rounded-xl bg-surface/80 shadow-lg backdrop-blur-xs transition-shadow duration-200",
		banner: "relative flex gap-3",
		thumbnail: "rounded-lg object-cover ring-2 ring-border/70 shadow-xl shrink-0",
		content: "flex-1 min-w-0 px-2 py-2 grid grid-cols-[1fr_auto] gap-3",
		coverButton: "relative h-30 w-30 shrink-0 overflow-hidden rounded-lg cursor-pointer group",
		previewPosition: "absolute inset-0 flex items-center justify-center",
		titleSection: "flex-1 min-w-0",
		title: "max-w-full text-lg font-bold text-surface-foreground leading-tight truncate",
		artist: "max-w-full text-sm font-semibold text-text-secondary leading-tight truncate",
		creator: "max-w-full text-xs text-text-muted leading-tight truncate",
	},
	variants: {
		playing: {
			true: {
				base: "ring-2 ring-primary/60 shadow-[0_0_24px_3px] shadow-primary/25",
			},
		},
		layout: {
			classic: {},
			artwork: {
				wrapper: "m-0",
				base: "h-[188px]",
				banner: "h-full grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-0 p-1.5",
				coverButton: "h-full w-full rounded-lg",
				thumbnail: "relative rounded-lg object-contain ring-0 shadow-none",
				previewPosition: "inset-auto bottom-3 right-3",
				content: "relative block px-3 py-1.5",
				title: "line-clamp-2 whitespace-normal break-words text-lg leading-5 tracking-tight",
				artist: "line-clamp-2 whitespace-normal break-words font-medium",
			},
		},
	},
	defaultVariants: { layout: "classic" },
});

const ResultCard: React.FC<ResultCardProps> = ({
	layout,
	item,
	showUnicode,
	dateField,
	action,
	triggerDownload,
	failureMessage,
	openSearchTab,
}) => {
	const preview = usePreview();
	const isCurrentTrack = preview.previewingId === item.set_id;
	const isPreviewing = isCurrentTrack && preview.isActuallyPlaying;
	const isLoadingPreview = isCurrentTrack && preview.isLoadingPreview;
	const playbackProgress = isCurrentTrack ? preview.playbackProgress : 0;
	const { togglePreview } = preview;
	const card = cardStyles({ layout, playing: isPreviewing });
	const coverUrl = useMemo(
		() =>
			layout === "artwork" && item.cover_url ? artworkCoverUrl(item.cover_url) : item.cover_url,
		[layout, item.cover_url],
	);
	const cardStyle = buildBackground(coverUrl);
	const { summary, panel } = useBeatmapMetadata(item, layout, dateField);

	const buttonVariant =
		action.variant === "danger"
			? "cardDanger"
			: action.variant === "secondary"
				? "cardSecondary"
				: "cardPrimary";

	return (
		<div className={card.wrapper()}>
			<div className={card.base()} style={cardStyle}>
				<div className="absolute inset-0 rounded-xl border-2 border-border/80 group-hover:border-accent/60" />
				<div
					className={`relative rounded-xl backdrop-blur-[2px] overflow-hidden ${layout === "artwork" ? "h-full" : ""}`}
				>
					<div className="absolute inset-0 bg-gradient-to-r from-surface-variant/70 via-surface-variant/80 to-surface-variant/20 z-0" />

					<div className={`${card.banner()} relative z-10`}>
						<a
							href={`https://osu.ppy.sh/beatmapsets/${item.set_id}`}
							target="_blank"
							rel="noopener noreferrer"
							className={`absolute z-20 rounded-full group/link ${layout === "artwork" ? "left-3 top-3 bg-surface/90 p-1.5" : "top-5 right-5"}`}
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
							className={card.coverButton()}
							aria-label={
								isLoadingPreview
									? "Loading preview"
									: isPreviewing
										? "Pause preview"
										: "Play preview"
							}
							title={item.preview_url ? "play preview" : "no preview available"}
							disabled={!item.preview_url || isLoadingPreview}
						>
							{coverUrl ? (
								<img
									src={coverUrl}
									alt={item.title}
									decoding="async"
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

							<div className={card.previewPosition()}>
								<div className="relative bg-surface/90 rounded-full p-2 shadow-lg border border-border/20">
									{(() => {
										const ringProgress = playbackProgress;
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
											title={showUnicode && item.title_unicode ? item.title_unicode : item.title}
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
												title={
													showUnicode && item.artist_unicode ? item.artist_unicode : item.artist
												}
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
								{failureMessage && (
									<p className="break-words text-xs text-error">{failureMessage}</p>
								)}
							</div>

							<div
								className={layout === "artwork" ? "absolute bottom-3 right-3" : "flex items-end"}
							>
								<Button
									variant={buttonVariant}
									size="card"
									className="gap-2 rounded-lg transition-none"
									disabled={action.disabled}
									aria-label={action.label}
									title={action.label}
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

export default memo(ResultCard);
