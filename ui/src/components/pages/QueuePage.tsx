import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { apiClient, type QueueStatus } from "../../hooks/useApiClient";
import QueuePanel from "../QueuePanel";
import Button from "../ui/Button";

const QueuePage: React.FC = () => {
	const { data: queue, refetch: refetchQueue } = useQuery<QueueStatus>({
		queryKey: ["queue"],
		queryFn: () => apiClient.get<QueueStatus>("/queue"),
		refetchInterval: 1000,
		refetchIntervalInBackground: true,
	});

	return (
		<div className="space-y-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Download className="w-4 h-4" />
					<span className="text-lg font-semibold text-slate-900 dark:text-white">
						Download Queue
					</span>
				</div>
				<Button variant="secondary" onClick={() => refetchQueue()} className="text-xs px-2 py-1">
					Refresh
				</Button>
			</div>

			{/* Queue Panel */}
			<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
				<QueuePanel data={queue} />
			</div>
		</div>
	);
};

export default QueuePage;
