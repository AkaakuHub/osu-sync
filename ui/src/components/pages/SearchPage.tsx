import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Music4, Download } from "lucide-react";
import { apiClient, type IndexSummary, type QueueStatus } from "../../hooks/useApiClient";
import SearchForm from "../SearchForm";
import SearchResults from "../SearchResults";
import StatCard from "../StatCard";
import Button from "../ui/Button";

type Props = {
	ownedOnly: boolean;
	setOwnedOnly: (value: boolean) => void;
};

const SearchPage: React.FC<Props> = ({ ownedOnly, setOwnedOnly }) => {
	const {
		data: index,
		refetch: refetchIndex,
		isFetching: indexLoading,
	} = useQuery<IndexSummary>({
		queryKey: ["index"],
		queryFn: () => apiClient.get<IndexSummary>("/local/index"),
	});

	const { data: queue, refetch: refetchQueue } = useQuery<QueueStatus>({
		queryKey: ["queue"],
		queryFn: () => apiClient.get<QueueStatus>("/queue"),
		refetchInterval: 500,
		refetchIntervalInBackground: true,
	});

	return (
		<div className="space-y-2">
			{/* Header with Stats */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Search className="w-4 h-4" />
						<span className="text-lg font-semibold text-slate-900 dark:text-white">
							Beatmap Search
						</span>
					</div>
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
							<input
								type="checkbox"
								className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
								checked={ownedOnly}
								onChange={(e) => setOwnedOnly(e.target.checked)}
							/>
							Owned only
						</label>
						<Button
							variant="secondary"
							onClick={() => refetchIndex()}
							disabled={indexLoading}
							className="text-xs px-2 py-1"
						>
							Rescan
						</Button>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-3 gap-2">
					<StatCard label="Owned Sets" value={index?.owned_sets ?? "-"} />
					<StatCard label="With Metadata" value={index?.with_metadata ?? "-"} />
					<StatCard label="Songs Dir" value={index?.songs_dir ?? "Not set"} />
				</div>
			</div>

			{/* Search Form */}
			<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
				<SearchForm ownedOnly={ownedOnly} onRescan={refetchIndex} />
			</div>

			{/* Search Results */}
			<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
				<SearchResults ownedOnly={ownedOnly} onQueueUpdate={refetchQueue} queue={queue} />
			</div>
		</div>
	);
};

export default SearchPage;
