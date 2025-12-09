import { useQuery } from "@tanstack/react-query";
import { Download, RotateCcw } from "lucide-react";
import { apiClient, type QueueStatus } from "../../hooks/useApiClient";
import QueuePanel from "../QueuePanel";
import Button from "../ui/Button";

const QueuePage: React.FC = () => {
	const { data: queue, refetch: refetchQueue } = useQuery<QueueStatus>({
		queryKey: ["queue"],
		queryFn: () => apiClient.get<QueueStatus>("/queue"),
		refetchOnWindowFocus: false,
	});

	return (
		<div className="h-full flex flex-col bg-surface">
			{/* Compact Header */}
			<div className="bg-surface-variant/90 backdrop-blur-md border border-border rounded-lg shadow-lg px-4 py-3 m-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3 text-sm">
						<Download className="w-4 h-4 text-text" />
						<span className="font-medium text-text">Download Queue</span>
					</div>
					<Button
						variant="ghost"
						onClick={() => refetchQueue()}
						size="sm"
						className="text-xs px-2 py-1"
					>
						<RotateCcw className="w-3 h-3" />
					</Button>
				</div>
			</div>

			{/* Queue Panel */}
			<div className="flex-1 min-h-0 px-2 pb-5 overflow-hidden">
				<div className="h-full rounded-xl border border-border bg-surface p-3 shadow-sm overflow-auto">
					<QueuePanel data={queue} />
				</div>
			</div>
		</div>
	);
};

export default QueuePage;
