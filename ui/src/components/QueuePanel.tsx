import { useEffect, useMemo, useState } from "react";
import { apiClient, type QueueEntry, type QueueStatus } from "../hooks/useApiClient";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

type Props = {
	data?: QueueStatus;
};

type RunningEntry = QueueEntry;
type RunningWithProjection = RunningEntry & { projectedProgress: number };

function QueuePanel({ data }: Props) {
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
			<h2 className="text-lg font-semibold">Download Queue</h2>

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
											<span className="font-mono text-sm">
												{task.display_name ?? `${task.set_id}`}
											</span>
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
								{data.queued.map((setId) => (
									<div
										key={setId}
										className="flex items-center justify-between p-3 bg-surface-variant/50 rounded-lg border border-border/50"
									>
										<span className="font-mono text-sm font-medium">{setId}</span>
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
											<span className="font-mono text-sm font-medium">
												{d.display_name ?? `${d.set_id}`}
											</span>
											{d.message && (
												<span className="text-xs text-text-secondary">
													{d.message}
												</span>
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
