import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { type QueueStatus } from "../hooks/useApiClient";
import { getEventSource } from "../utils/eventSource";

export function QueueNotificationManager() {
	const previousDoneRef = useRef<Map<number, string>>(new Map());
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

				if (!queue?.done) return;

				// 新しくcompletedになったエントリをチェック
				queue.done.forEach((entry) => {
					if (entry.status === "completed") {
						const previousStatus = previousDoneRef.current.get(entry.set_id);

						// まだ通知していない、または状態が変わった場合のみ通知
						if (previousStatus !== "completed") {
							const displayName =
								entry.artist && entry.title
									? `${entry.artist} - ${entry.title}`
									: `Set ${entry.set_id}`;

							toast.success(`${displayName}\nDownload completed!`);
						}
					}
				});

				// 現在のdone状態を保存
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
	}, [queryClient]);

	// このコンポーネントは通知のみを管理するのでUIは返さない
	return null;
}
