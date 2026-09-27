import type { PreviewableItem } from "./ResultCard";

export const PREVIEW_STATE_EVENT = "osu-sync:preview-state";

export type PreviewState = {
	previewingId: number | null;
	isLoadingPreview: boolean;
	playbackProgress: number;
	isActuallyPlaying: boolean;
};

declare global {
	interface Window {
		togglePreview?: (item: PreviewableItem) => void;
		previewPlayerState?: PreviewState;
	}
}
