import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ScanStatus } from "../hooks/useApiClient";
import { getEventSource } from "../utils/eventSource";

export function ScanProgress() {
	const toastIdRef = useRef<string | null>(null);
	const previousStatusRef = useRef<string | null>(null);
	const queryClient = useQueryClient();

	useEffect(() => {
		const es = getEventSource();

		const handleMessage = (event: MessageEvent) => {
			try {
				const parsed = JSON.parse(event.data);
				if (parsed.topic !== "scan") return;
				const status: ScanStatus = parsed.data;

				// Detect status change and show toast
				if (previousStatusRef.current !== status.status) {
					// Clear previous toast
					if (toastIdRef.current) {
						toast.dismiss(toastIdRef.current);
						toastIdRef.current = null;
					}

					switch (status.status) {
						case "scanning":
							(() => {
								const total = status.total_files ?? 0;
								const processed = status.processed_files ?? 0;
								const label = total === 0 ? "Scanning..." : `Scanning... (${processed}/${total})`;
								toastIdRef.current = toast.loading(label, { duration: 5000 });
							})();
							break;
						case "completed":
							toastIdRef.current = toast.success(
								`Scan finished (${status.processed_files ?? 0} files)`,
								{ duration: 5000 },
							);
							// 完了したらインデックスとキューを即時リフレッシュ
							queryClient.invalidateQueries({ queryKey: ["index"] });
							queryClient.invalidateQueries({ queryKey: ["queue"] });
							break;
						case "error":
							toastIdRef.current = toast.error(
								`Scan failed: ${status.error_message || "Unknown error"}`,
								{ duration: 5000 },
							);
							break;
					}
					previousStatusRef.current = status.status;
				} else if (status.status === "scanning" && toastIdRef.current) {
					// Update progress on the same toast
					const total = status.total_files ?? 0;
					const processed = status.processed_files ?? 0;
					const label =
						total === 0
							? "Scanning..."
							: `Scanning... (${processed}/${total})${
									status.current_file ? `\nNow: ${status.current_file}` : ""
								}`;
					toast.loading(label, {
						id: toastIdRef.current,
						duration: 5000,
					});
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
	}, [queryClient]);

	// このコンポーネントはtoastのみを表示するので、UIは返さない
	return null;
}
