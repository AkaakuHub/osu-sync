import { CalendarDays, Download, ExternalLink, Heart, Music4, Pause, Play } from "lucide-react";
import { defaultCover, difficultyColor, formatDate, formatNumber } from "./helpers";
import type { ResultCardProps } from "./ResultCard";

export default function ArtworkResultCard({
	item,
	showUnicode,
	action,
	isPreviewing,
	isLoadingPreview,
	playbackProgress,
	togglePreview,
	triggerDownload,
	failureMessage,
	setSearchQuery,
}: ResultCardProps) {
	const title = showUnicode && item.title_unicode ? item.title_unicode : item.title;
	const artist = showUnicode && item.artist_unicode ? item.artist_unicode : item.artist;
	const difficulties = [...(item.difficulties ?? [])].sort((a, b) => a.rating - b.rating);

	return (
		<article className="group relative m-1.5 overflow-hidden rounded-xl border border-border bg-surface-variant/40 shadow-lg transition-colors hover:border-accent/70">
			<div className="relative h-48 overflow-hidden bg-surface-variant">
				{item.cover_url ? (
					<img
						src={item.cover_url}
						alt=""
						className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
						onError={(event) => {
							if (event.currentTarget.src !== defaultCover) {
								event.currentTarget.src = defaultCover;
							}
						}}
					/>
				) : (
					<div className="flex h-full items-center justify-center">
						<Music4 className="h-12 w-12 text-text-muted" />
					</div>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
				<div className="absolute left-4 top-4 rounded-md bg-surface/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text backdrop-blur-sm">
					{item.status}
				</div>
				<a
					href={`https://osu.ppy.sh/beatmapsets/${item.set_id}`}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Open in osu! website"
					className="absolute right-4 top-4 rounded-full bg-surface/85 p-2 text-text hover:text-primary"
				>
					<ExternalLink className="h-4 w-4" />
				</a>
				<button
					type="button"
					disabled={!item.preview_url || isLoadingPreview}
					onClick={() => togglePreview(item)}
					aria-label={isPreviewing ? "Pause preview" : "Play preview"}
					className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-surface/85 text-text shadow-lg disabled:opacity-40"
					style={{
						backgroundImage: `conic-gradient(var(--color-primary) ${playbackProgress * 100}%, transparent 0)`,
					}}
				>
					<span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
						{isPreviewing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
					</span>
				</button>
			</div>
			<div className="relative -mt-9 space-y-3 px-4 pb-4">
				<div className="pr-14">
					<button
						type="button"
						onClick={() => setSearchQuery(`title=""${item.title}""`)}
						className="block max-w-full truncate text-left text-lg font-bold text-text hover:text-primary"
						title={title}
					>
						{title}
					</button>
					<button
						type="button"
						onClick={() => setSearchQuery(`artist=""${item.artist}""`)}
						className="block max-w-full truncate text-left text-sm text-text-secondary hover:text-primary"
						title={artist}
					>
						{artist}
					</button>
					<span className="block truncate text-xs text-text-muted">mapped by {item.creator}</span>
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
					<span className="inline-flex items-center gap-1">
						<Heart className="h-3.5 w-3.5 text-osu-pink" />
						{formatNumber(item.favourite_count)}
					</span>
					<span className="inline-flex items-center gap-1">
						<Play className="h-3.5 w-3.5 text-success" />
						{formatNumber(item.play_count)}
					</span>
					<span className="inline-flex items-center gap-1">
						<CalendarDays className="h-3.5 w-3.5 text-primary" />
						{formatDate(item.ranked_date)}
					</span>
				</div>
				<div className="flex items-end justify-between gap-3 border-t border-border/60 pt-3">
					<div className="flex min-w-0 flex-wrap gap-1.5">
						{difficulties.map((difficulty, index) => (
							<span
								key={`${difficulty.mode}-${difficulty.label}-${index}`}
								title={`${difficulty.mode}: ${difficulty.label} ★${difficulty.rating.toFixed(2)}`}
								className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface/80 px-2 py-1 text-[11px] text-text-secondary"
							>
								<span
									className="h-2 w-2 rounded-full"
									style={{ backgroundColor: difficultyColor(difficulty.rating) }}
								/>
								{difficulty.rating.toFixed(2)}★
							</span>
						))}
					</div>
					<button
						type="button"
						disabled={action.disabled}
						onClick={() => triggerDownload(item.set_id)}
						className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:bg-surface-variant disabled:text-text-muted"
					>
						<Download className="h-4 w-4" />
						{action.label}
					</button>
				</div>
				{failureMessage && <p className="text-xs text-error">Failed: {failureMessage}</p>}
			</div>
		</article>
	);
}
