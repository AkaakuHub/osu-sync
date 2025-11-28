import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiClient, type SearchResponse } from "../hooks/useApiClient";

// SearchResults.tsxから移動した関数（機能は変更なし）
export const triggerDownload = async (
	setId: number,
	searchData: SearchResponse | undefined,
	client: ReturnType<typeof useQueryClient>,
	onQueueUpdate: () => void,
) => {
	// Find the search result for this set_id to get metadata
	const searchResult = searchData?.results?.find((r) => r.set_id === setId);
	const displayName = searchResult
		? `${searchResult.artist} - ${searchResult.title}`
		: `セット ${setId}`;

	const metadata = searchResult
		? {
				[setId]: {
					artist: searchResult.artist,
					title: searchResult.title,
					artist_unicode: searchResult.artist_unicode,
					title_unicode: searchResult.title_unicode,
				},
			}
		: undefined;

	try {
		await apiClient.post("/download", { set_ids: [setId], metadata });
		client.invalidateQueries({ queryKey: ["queue"] });
		onQueueUpdate();

		// DL queue追加の通知
		toast.success(`${displayName}\nAdded to download queue`);
	} catch (error) {
		console.error("Failed to add to download queue:", error);
		toast.error(`${displayName}\nFailed to add to download queue`);
	}
};
