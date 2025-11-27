import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { apiClient, type QueueStatus } from "../hooks/useApiClient";

export function QueueNotificationManager() {
	const previousDoneRef = useRef<Map<number, any>>(new Map());

	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const queue = await apiClient.get<QueueStatus>("/queue");

				if (!queue?.done) return;

				// 新しくcompletedになったエントリをチェック
				queue.done.forEach((entry) => {
					if (entry.status === "completed") {
						const previousEntry = previousDoneRef.current.get(entry.set_id);

						// まだ通知していない、または状態が変わった場合のみ通知
						if (!previousEntry || previousEntry.status !== "completed") {
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
					previousDoneRef.current.set(entry.set_id, {
						status: entry.status,
						updated_at: entry.updated_at,
					});
				});
			} catch (error) {
				console.error("Failed to fetch queue status:", error);
				// APIエラーはtoast表示しない
			}
		}, 2000); // 2秒ごとにチェック

		return () => clearInterval(interval);
	}, []);

	// このコンポーネントは通知のみを管理するのでUIは返さない
	return null;
}
