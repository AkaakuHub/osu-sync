import { useEffect, useState } from "react";
import { apiClient, ScanStatus } from "../hooks/useApiClient";

export function ScanProgress() {
	const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		// スキャン状態をポーリング
		const interval = setInterval(async () => {
			try {
				const status = await apiClient.get<ScanStatus>("/local/scan-status");
				setScanStatus(status);

				// スキャン中の場合のみ表示
				if (status.status === "scanning") {
					setIsVisible(true);
				} else if (status.status === "completed") {
					// 完了したら3秒後に非表示
					setTimeout(() => {
						setIsVisible(false);
					}, 3000);
				} else if (status.status === "error") {
					// エラーの場合は表示維持
					setIsVisible(true);
				}
			} catch (error) {
				console.error("Failed to fetch scan status:", error);
			}
		}, 1000); // 1秒ごとに更新

		return () => clearInterval(interval);
	}, []);

	if (!isVisible || !scanStatus) {
		return null;
	}

	const progress =
		scanStatus.total_files > 0 ? (scanStatus.processed_files / scanStatus.total_files) * 100 : 0;

	const getStatusText = () => {
		switch (scanStatus.status) {
			case "scanning":
				return `スキャン中... (${scanStatus.processed_files}/${scanStatus.total_files} ファイル)`;
			case "completed":
				return `スキャン完了！ (${scanStatus.processed_files} ファイル)`;
			case "error":
				return `スキャンエラー: ${scanStatus.error_message}`;
			default:
				return "準備中...";
		}
	};

	const getStatusColor = () => {
		switch (scanStatus.status) {
			case "scanning":
				return "bg-primary";
			case "completed":
				return "bg-success";
			case "error":
				return "bg-error";
			default:
				return "bg-text-muted";
		}
	};

	return (
		<div className="fixed top-4 right-4 w-80 bg-surface rounded-lg shadow-lg border border-border p-4 z-50">
			<div className="flex items-center justify-between mb-2">
				<h3 className="font-semibold text-surface-foreground">楽曲ライブラリスキャン</h3>
				{scanStatus.status === "scanning" && (
					<div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
				)}
			</div>

			<div className="space-y-2">
				<div className="text-sm text-text">{getStatusText()}</div>

				{scanStatus.status === "scanning" && (
					<div className="w-full bg-surface-variant rounded-full h-2">
						<div
							className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
							style={{ width: `${progress}%` }}
						/>
					</div>
				)}

				{scanStatus.current_file && scanStatus.status === "scanning" && (
					<div className="text-xs text-text-muted truncate">現在: {scanStatus.current_file}</div>
				)}

				{scanStatus.status === "error" && scanStatus.error_message && (
					<div className="text-xs text-error bg-error/10 p-2 rounded">
						{scanStatus.error_message}
					</div>
				)}
			</div>
		</div>
	);
}
