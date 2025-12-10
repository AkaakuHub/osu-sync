import { useEffect, useMemo, useState } from "react";
import { Languages } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient, type QueueEntry, type QueueStatus } from "../hooks/useApiClient";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

type Props = {
	data?: QueueStatus;
	showUnicode: boolean;
	setShowUnicode: (v: boolean) => void;
};

type RunningEntry = QueueEntry;
type RunningWithProjection = RunningEntry & { projectedProgress: number };

function QueuePanel({ data, showUnicode, setShowUnicode }: Props) {
	const [ticker, setTicker] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setTicker((tick) => (tick + 1) % Number.MAX_SAFE_INTEGER);
		}, 100);
		return () => clearInterval(id);
	}, []);

	const handleOpen = async (path?: string | null) => {
		if (!path) return;
		try {
			await apiClient.post("/local/open", { path });
		} catch (error) {
			console.error("Failed to open path", error);
			toast.error("Could not open file or folder");
		}
	};

	const getBadgeVariant = (status: string) => {
		switch (status) {
			case "failed":
				return "error";
			case "skipped":
				return "secondary";
			case "completed":
				return "success";
			case "running":
				return "warning";
			default:
				return "secondary";
		}
	};

	const formatBytes = (value?: number | null) => {
		if (!value || value <= 0) return "0 B";
		const units = ["B", "KB", "MB", "GB", "TB"];
		let idx = 0;
		let current = value;
		while (current >= 1024 && idx < units.length - 1) {
			current /= 1024;
			idx += 1;
		}
		const digits = idx === 0 ? 0 : current < 10 ? 2 : 1;
		return `${current.toFixed(digits)} ${units[idx]}`;
	};

	const formatSpeed = (value?: number | null) => {
		if (!value || value <= 0) return "";
		return `${formatBytes(value)}/s`;
	};

	const formatDisplayName = (entry: QueueEntry) => {
		const { set_id, artist, title, artist_unicode, title_unicode } = entry;
		if (showUnicode) {
			const displayArtist = artist_unicode || artist;
			const displayTitle = title_unicode || title;
			return `${set_id} ${displayArtist} - ${displayTitle}`;
		} else {
			return `${set_id} ${toNFKC(artist)} - ${toNFKC(title)}`;
		}
	};

	// Unicode conversion helper
	const toNFKC = (text: string | null | undefined) => {
		if (!text) return text;
		return text.normalize("NFKC");
	};

	const runningEntries = useMemo<RunningWithProjection[]>(() => {
		if (!data?.running) return [];
		const now = Date.now() / 1000;
		return data.running.map((entry) => {
			const total = entry.total_bytes ?? 0;
			if (!total || !entry.speed_bps || !entry.updated_at) {
				return { ...entry, projectedProgress: entry.progress ?? 0 };
			}
			const deltaSeconds = Math.max(0, now - entry.updated_at);
			const projectedBytes = Math.min(
				total,
				entry.bytes_downloaded + entry.speed_bps * deltaSeconds,
			);
			return {
				...entry,
				projectedProgress: Math.min(1, projectedBytes / total),
			};
		});
	}, [data?.running, ticker]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Download Queue</h2>
				<button
					onClick={() => setShowUnicode(!showUnicode)}
					className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-variant/80 border border-border text-text-secondary hover:bg-surface-variant/60 transition-colors"
					title={showUnicode ? "Display in Normal" : "Display in Unicode"}
				>
					<Languages className="w-3.5 h-3.5" />
					{showUnicode ? "Unicode" : "Normal"}
				</button>
			</div>

			{!data ? (
				<div className="text-center py-8">
					<p className="text-muted-foreground">Queue is empty</p>
				</div>
			) : (
				<div className="space-y-6">
					{/* Running Downloads */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
							<h3 className="text-sm font-medium">Running</h3>
						</div>
						{runningEntries.length === 0 ? (
							<p className="text-sm text-muted-foreground pl-4">No downloads running</p>
						) : (
							<div className="space-y-2 pl-4">
								{runningEntries.map((task) => (
									<div
										key={task.set_id}
										className="space-y-2 p-3 bg-surface-variant/30 rounded-lg border border-border"
									>
										<div className="flex items-center justify-between text-xs font-medium">
											<span className="font-mono text-sm">{formatDisplayName(task)}</span>
											<span>
												{`${Math.min(100, Math.round((task.projectedProgress ?? 0) * 100))}%`}
											</span>
										</div>
										<div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
											<div
												className="h-full bg-primary transition-[width] duration-75"
												style={{
													width: `${Math.min(100, Math.max(0, (task.projectedProgress ?? 0) * 100))}%`,
												}}
											/>
										</div>
										<div className="flex items-center justify-between text-[11px] text-muted-foreground">
											<span>
												{formatBytes(task.bytes_downloaded)}{" "}
												{task.total_bytes ? ` / ${formatBytes(task.total_bytes)}` : ""}
											</span>
											<span>{formatSpeed(task.speed_bps)}</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Queued Downloads */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-text-muted rounded-full"></div>
							<h3 className="text-sm font-medium">Queued</h3>
							{data.queued.length > 0 && (
								<span className="text-xs text-muted-foreground">({data.queued.length})</span>
							)}
						</div>
						{data.queued.length === 0 ? (
							<p className="text-sm text-muted-foreground pl-4">No downloads queued</p>
						) : (
							<div className="space-y-2 pl-4">
								{data.queued.map((queueEntry) => (
									<div
										key={queueEntry.set_id}
										className="flex items-center justify-between p-3 bg-surface-variant/50 rounded-lg border border-border/50"
									>
										<span className="font-mono text-sm font-medium">
											{formatDisplayName(queueEntry)}
										</span>
										<Badge variant="secondary">Queued</Badge>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Completed Downloads */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-success rounded-full"></div>
							<h3 className="text-sm font-medium">Completed</h3>
							{data.done.length > 0 && (
								<span className="text-xs text-muted-foreground">({data.done.length})</span>
							)}
						</div>
						{data.done.length === 0 ? (
							<p className="text-sm text-muted-foreground pl-4">No downloads completed</p>
						) : (
							<div className="space-y-2 pl-4 max-h-48 overflow-y-auto">
								{data.done.map((d) => (
									<div
										key={d.set_id}
										className="flex items-center justify-between p-3 bg-surface-variant/50 rounded-lg border border-border/50"
									>
										<div className="flex items-center gap-2">
											<span className="font-mono text-sm font-medium">{formatDisplayName(d)}</span>
											{d.message && (
												<span className="text-xs text-text-secondary">{d.message}</span>
											)}
										</div>
										<div className="flex items-center gap-2">
											{(d.path || d.archive_path) && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleOpen(d.path ?? d.archive_path)}
												>
													Open
												</Button>
											)}
											<Badge variant={getBadgeVariant(d.status)}>{d.status}</Badge>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default QueuePanel;
