import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { apiClient, ScanStatus } from "../hooks/useApiClient";

export function ScanProgress() {
	const toastIdRef = useRef<string | null>(null);
	const previousStatusRef = useRef<string | null>(null);

	useEffect(() => {
		// スキャン状態をポーリング
		const interval = setInterval(async () => {
			try {
				const status = await apiClient.get<ScanStatus>("/local/scan-status");

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
									duration: Infinity,
								},
							);
							break;
						case "completed":
							toastIdRef.current = toast.success(
								`スキャン完了！ (${status.processed_files} ファイル)`,
							);
							// 完了toastは5秒後に自動で消える
							setTimeout(() => {
								if (toastIdRef.current) {
									toastIdRef.current = null;
								}
							}, 5000);
							break;
						case "error":
							toastIdRef.current = toast.error(
								`スキャンエラー: ${status.error_message || "不明なエラー"}`,
							);
							break;
					}
					previousStatusRef.current = status.status;
				} else if (status.status === "scanning" && toastIdRef.current) {
					// スキャン中は進捗を更新
					toast.loading(
						`スキャン中... (${status.processed_files}/${status.total_files} ファイル)${status.current_file ? `\n現在: ${status.current_file}` : ""}`,
						{
							id: toastIdRef.current,
							duration: Infinity,
						},
					);
				}
			} catch (error) {
				console.error("Failed to fetch scan status:", error);
				// APIエラーはtoast表示しない（コンソールのみ）
			}
		}, 1000); // 1秒ごとに更新

		return () => {
			clearInterval(interval);
			// コンポーネントがアンマウントされるときはtoastをクリア
			if (toastIdRef.current) {
				toast.dismiss(toastIdRef.current);
			}
		};
	}, []);

	// このコンポーネントはtoastのみを表示するので、UIは返さない
	return null;
}
