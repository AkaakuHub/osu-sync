import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { ScanStatus } from "../hooks/useApiClient";
import { getEventSource } from "../utils/eventSource";

export function ScanProgress() {
	const toastIdRef = useRef<string | null>(null);
	const previousStatusRef = useRef<string | null>(null);

	useEffect(() => {
		const es = getEventSource();

		const handleMessage = (event: MessageEvent) => {
			try {
				const parsed = JSON.parse(event.data);
				if (parsed.topic !== "scan") return;
				const status: ScanStatus = parsed.data;

				// ステータス変化を検知してtoastを表示
				if (previousStatusRef.current !== status.status) {
					// 前のtoastをクリア
					if (toastIdRef.current) {
						toast.dismiss(toastIdRef.current);
						toastIdRef.current = null;
					}

					switch (status.status) {
						case "scanning":
							toastIdRef.current = toast.loading(
								`スキャン中... (${status.processed_files}/${status.total_files} ファイル)`,
								{
									duration: 5000,
								},
							);
							break;
						case "completed":
							toastIdRef.current = toast.success(
								`スキャン完了！ (${status.processed_files ?? 0} ファイル)`,
								{ duration: 5000 },
							);
							break;
						case "error":
							toastIdRef.current = toast.error(
								`スキャンエラー: ${status.error_message || "不明なエラー"}`,
								{ duration: 5000 },
							);
							break;
					}
					previousStatusRef.current = status.status;
				} else if (status.status === "scanning" && toastIdRef.current) {
					// スキャン中は進捗を更新（同じIDで上書き）
					toast.loading(
						`スキャン中... (${status.processed_files}/${status.total_files} ファイル)${status.current_file ? `\n現在: ${status.current_file}` : ""}`,
						{
							id: toastIdRef.current,
							duration: 5000,
						},
					);
				}
			} catch (error) {
				console.error("Failed to process scan event:", error);
			}
		};

		es.addEventListener("message", handleMessage);

		return () => {
			es.removeEventListener("message", handleMessage);
			// コンポーネントがアンマウントされるときはtoastをクリア
			if (toastIdRef.current) {
				toast.dismiss(toastIdRef.current);
			}
		};
	}, []);

	// このコンポーネントはtoastのみを表示するので、UIは返さない
	return null;
}
