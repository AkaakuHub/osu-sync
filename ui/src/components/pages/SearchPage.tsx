import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient, type IndexSummary, type QueueStatus, type SearchResponse } from "../../hooks/useApiClient";
import Input from "../ui/Input";
import Button from "../ui/Button";
import SearchResults from "../SearchResults";

type Props = {
	ownedOnly: boolean;
	setOwnedOnly: (value: boolean) => void;
};

const SearchPage: React.FC<Props> = ({ ownedOnly, setOwnedOnly }) => {
	const [searchQuery, setSearchQuery] = useState("");

	const {
		data: searchResults,
		isFetching: searchLoading,
	} = useQuery<SearchResponse>({
		queryKey: ["search", searchQuery],
		queryFn: async () => {
			if (searchQuery.length < 2) return { results: [], total: 0, page: 1, limit: 20 };
			return apiClient.get(`/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
		},
		enabled: searchQuery.length >= 2,
	});

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
		<div className="min-h-screen bg-surface">
			{/* Compact Status Bar */}
			<div className="fixed top-4 right-4 z-50">
				<div className="bg-surface-variant/90 backdrop-blur-md border border-border rounded-lg shadow-lg px-3 py-2">
					<div className="flex items-center gap-3 text-xs">
						<div className="flex items-center gap-1">
							<span className="text-text-muted">Owned:</span>
							<span className="font-medium text-text">{index?.owned_sets ?? "-"}</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-text-muted">Meta:</span>
							<span className="font-medium text-text">{index?.with_metadata ?? "-"}</span>
						</div>
						<div className="flex items-center gap-1">
							<input
								type="checkbox"
								className="w-3 h-3 rounded border-border text-primary focus:ring-primary/30 bg-surface/50"
								checked={ownedOnly}
								onChange={(e) => setOwnedOnly(e.target.checked)}
							/>
							<span className="text-text text-xs cursor-pointer">Owned</span>
							<Button
								variant="ghost"
								onClick={() => refetchIndex()}
								disabled={indexLoading}
								size="sm"
								className="text-xs px-1 py-0 h-5"
							>
								Rescan
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Floating Search Bar - Left Bottom */}
			<div className="fixed bottom-4 left-4 z-50">
				<div className="bg-surface-variant/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-3 w-80">
					<Input
						placeholder="Search by artist, title, or creator..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						variant="search"
					/>
				</div>
			</div>

			{/* Main Content */}
			<div className="min-h-screen">
				{/* Search Results */}
				<div className="p-4">
					<SearchResults
						ownedOnly={ownedOnly}
						onQueueUpdate={refetchQueue}
						queue={queue}
						searchData={searchResults}
						isLoading={searchLoading}
					/>
				</div>
			</div>
		</div>
	);
};

export default SearchPage;
