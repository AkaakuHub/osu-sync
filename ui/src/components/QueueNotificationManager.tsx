import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { type QueueStatus } from "../hooks/useApiClient";
import { beatmapName } from "../utils/beatmapName";
import { getEventSource } from "../utils/eventSource";

export function QueueNotificationManager({ showUnicode }: { showUnicode: boolean }) {
	const previousDoneRef = useRef<Map<number, string>>(new Map());
	const previousProgressRef = useRef<Map<number, number>>(new Map());
	const queryClient = useQueryClient();

	useEffect(() => {
		const es = getEventSource();

		const handleMessage = (event: MessageEvent) => {
			try {
				const parsed = JSON.parse(event.data);
				if (parsed.topic !== "queue") return;
				const queue: QueueStatus = parsed.data;

				// react-query キャッシュを即時更新
				queryClient.setQueryData<QueueStatus>(["queue"], queue);

				queue.running.forEach((entry) => {
					const percent = Math.min(100, Math.max(0, Math.round((entry.progress ?? 0) * 100)));
					if (previousProgressRef.current.get(entry.set_id) === percent) return;
					previousProgressRef.current.set(entry.set_id, percent);
					toast.loading(
						<div className="min-w-0 space-y-1">
							<div className="text-xs font-semibold text-text">Downloading · {percent}%</div>
							<div
								className="max-w-64 truncate text-xs text-text-secondary"
								title={beatmapName(entry, showUnicode)}
							>
								{beatmapName(entry, showUnicode)}
							</div>
							<div className="h-1.5 overflow-hidden rounded-full bg-surface-variant">
								<div
									className="h-full bg-primary transition-[width]"
									style={{ width: `${percent}%` }}
								/>
							</div>
						</div>,
						{ id: `download-${entry.set_id}`, duration: Infinity },
					);
				});
				for (const setId of previousProgressRef.current.keys()) {
					if (queue.running.some((entry) => entry.set_id === setId)) continue;
					toast.dismiss(`download-${setId}`);
					previousProgressRef.current.delete(setId);
				}

				queue.done.forEach((entry) => {
					if (previousDoneRef.current.get(entry.set_id) === entry.status) return;
					const name = beatmapName(entry, showUnicode);
					if (entry.status === "completed") toast.success(`Download completed\n${name}`);
					if (entry.status === "failed") {
						toast.error(`Download failed\n${name}${entry.message ? `\n${entry.message}` : ""}`);
					}
				});

				previousDoneRef.current.clear();
				queue.done.forEach((entry) => {
					previousDoneRef.current.set(entry.set_id, entry.status);
				});
			} catch (error) {
				console.error("Failed to process queue event:", error);
			}
		};

		es.addEventListener("message", handleMessage);
		return () => es.removeEventListener("message", handleMessage);
	}, [queryClient, showUnicode]);

	// このコンポーネントは通知のみを管理するのでUIは返さない
	return null;
}
