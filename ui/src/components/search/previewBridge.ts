import { createContext, useContext } from "react";
import type { SearchResponse } from "../../hooks/useApiClient";

export const PREVIEW_ENDED_EVENT = "osu-sync:preview-ended";

export type PreviewableItem = Pick<
	SearchResponse["results"][number],
	"set_id" | "title" | "artist" | "preview_url" | "cover_url"
>;

type PreviewState = {
	previewingId: number | null;
	isLoadingPreview: boolean;
	playbackProgress: number;
	isActuallyPlaying: boolean;
};

type PreviewContextValue = PreviewState & {
	togglePreview: (item: PreviewableItem) => void;
};

export const PreviewContext = createContext<PreviewContextValue | null>(null);

export function usePreview() {
	const preview = useContext(PreviewContext);
	if (!preview) throw new Error("PreviewProvider is required");
	return preview;
}
