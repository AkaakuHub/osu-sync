import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { apiClient, type IndexSummary, type QueueStatus, type SearchResponse } from "../../hooks/useApiClient";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Toggle from "../ui/Toggle";
import SearchResults from "../SearchResults";

type Props = {
	ownedOnly: boolean;
	setOwnedOnly: (value: boolean) => void;
	searchQuery?: string;
	setSearchQuery?: (query: string) => void;
};

const SearchPage: React.FC<Props> = ({ ownedOnly, setOwnedOnly, searchQuery: propSearchQuery, setSearchQuery: propSetSearchQuery }) => {
	const [internalSearchQuery, setInternalSearchQuery] = useState("");
	const searchQuery = propSearchQuery ?? internalSearchQuery;
	const setSearchQuery = propSetSearchQuery ?? setInternalSearchQuery;

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
		<div className="h-full flex flex-col bg-surface">
			{/* Compact Status Bar */}
			<div className="bg-surface-variant/90 backdrop-blur-md border border-border rounded-lg shadow-lg px-4 py-3 m-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-text-muted">Owned:</span>
							<span className="font-medium text-text">{index?.owned_sets ?? "-"}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-text-muted">Meta:</span>
							<span className="font-medium text-text">{index?.with_metadata ?? "-"}</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Toggle
							checked={ownedOnly}
							onChange={setOwnedOnly}
							label="Owned"
						/>
						<Button
							variant="ghost"
							onClick={() => refetchIndex()}
							disabled={indexLoading}
							size="sm"
							className="text-xs px-2 py-1 h-6"
						>
							<RotateCcw className="w-3 h-3" />
						</Button>
					</div>
				</div>
			</div>

			{/* Search Bar */}
			<div className="px-4 pb-3">
				<div className="bg-surface-variant/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-4">
					<Input
						placeholder="Search by artist, title, or creator..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						variant="search"
					/>
				</div>
			</div>

			{/* Search Results */}
			<div className="flex-1 min-h-0 px-4 pb-4 overflow-hidden">
				<SearchResults
					ownedOnly={ownedOnly}
					onQueueUpdate={refetchQueue}
					queue={queue}
					searchData={searchResults}
					isLoading={searchLoading}
				/>
			</div>
		</div>
	);
};

export default SearchPage;
