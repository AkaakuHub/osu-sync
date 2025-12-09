import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { ScanStatus } from "../hooks/useApiClient";
import { getEventSource } from "../utils/eventSource";

export function ScanProgress() {
	const previousStatusRef = useRef<string | null>(null);
	const lastToastKeyRef = useRef<string | null>(null);

	useEffect(() => {
		const es = getEventSource();

		const handleMessage = (event: MessageEvent) => {
			try {
				const parsed = JSON.parse(event.data);
				if (parsed.topic !== "scan") return;
				const status: ScanStatus = parsed.data;

				// Show only completion/error; suppress loading toast
				if (status.status === "completed") {
					const key = `completed:${status.processed_files ?? "?"}`;
					if (lastToastKeyRef.current !== key) {
						lastToastKeyRef.current = key;
						toast.dismiss("scan-finished");
						toast.success(`Scan finished (${status.processed_files ?? 0} files)`, {
							duration: 5000,
							id: "scan-finished",
						});
					}
				} else if (status.status === "error") {
					const key = `error:${status.error_message || ""}`;
					if (lastToastKeyRef.current !== key) {
						lastToastKeyRef.current = key;
						toast.dismiss("scan-finished");
						toast.error(`Scan failed: ${status.error_message || "Unknown error"}`, {
							duration: 5000,
							id: "scan-finished",
						});
					}
				}
				previousStatusRef.current = status.status;
			} catch (error) {
				console.error("Failed to process scan event:", error);
			}
		};

		es.addEventListener("message", handleMessage);

		return () => {
			es.removeEventListener("message", handleMessage);
			toast.dismiss("scan-finished");
		};
	}, []);

	// このコンポーネントはtoastのみを表示するので、UIは返さない
	return null;
}
