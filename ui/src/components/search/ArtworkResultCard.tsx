import { Download, ExternalLink, Music4, Pause, Play } from "lucide-react";
import { useBeatmapMetadata } from "./BeatmapMetadata";
import { defaultCover } from "./helpers";
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
	openSearchTab,
}: ResultCardProps) {
	const title = showUnicode && item.title_unicode ? item.title_unicode : item.title;
	const artist = showUnicode && item.artist_unicode ? item.artist_unicode : item.artist;
	const { summary, panel } = useBeatmapMetadata(item);

	return (
		<article className="group relative m-1.5 rounded-xl border border-border bg-surface-variant/40 shadow-lg transition-colors hover:border-accent/70">
			<div className="relative h-56 overflow-hidden rounded-t-xl bg-surface-variant">
				{item.cover_url ? (
					<img
						src={item.cover_url}
						alt=""
						className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
						onError={(event) => {
							if (event.currentTarget.src !== defaultCover) event.currentTarget.src = defaultCover;
						}}
					/>
				) : (
					<div className="flex h-full items-center justify-center">
						<Music4 className="h-12 w-12 text-text-muted" />
					</div>
				)}
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
			<div className="space-y-3 px-4 pb-4 pt-3">
				<div className="min-w-0 text-text">
					<button
						type="button"
						onClick={() => openSearchTab(`title=""${item.title}""`, title)}
						className="block max-w-full truncate text-left text-lg font-bold hover:text-primary"
						title={title}
					>
						{title}
					</button>
					<button
						type="button"
						onClick={() => openSearchTab(`artist=""${item.artist}""`, artist)}
						className="block max-w-full truncate text-left text-sm text-text-secondary hover:text-primary"
						title={artist}
					>
						{artist}
					</button>
					<button
						type="button"
						onClick={() => openSearchTab(`creator=""${item.creator}""`, item.creator)}
						className="block max-w-full truncate text-left text-xs text-text-muted hover:text-primary"
					>
						mapped by {item.creator}
					</button>
				</div>
				{summary}
				<div className="flex justify-end border-t border-border/60 pt-3">
					<button
						type="button"
						disabled={action.disabled}
						onClick={() => triggerDownload(item.set_id)}
						className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:bg-surface-variant disabled:text-text-muted"
					>
						<Download className="h-4 w-4" />
						{action.label}
					</button>
				</div>
				{failureMessage && <p className="text-xs text-error">Failed: {failureMessage}</p>}
			</div>
			{panel}
		</article>
	);
}
