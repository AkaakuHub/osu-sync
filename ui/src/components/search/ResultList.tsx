import React from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { SearchResponse } from "../../hooks/useApiClient";
import type { CardLayout } from "../../hooks/useDisplayPreferences";
import ArtworkResultCard from "./ArtworkResultCard";
import type { ActionState, QueueDerivedState } from "./helpers";
import ResultCard, { type PreviewableItem } from "./ResultCard";

type Item = SearchResponse["results"][number];
type PreparedItem = { item: Item; action: ActionState; failureMessage?: string | null };
type ItemPair = [PreparedItem, PreparedItem | null];

type Props = {
	items: Item[];
	focusedSetId: number | null;
	cardLayout: CardLayout;
	showUnicode: boolean;
	previewingId: number | null;
	isLoadingPreview: boolean;
	playbackProgress: number;
	isActuallyPlaying: boolean;
	queueState: QueueDerivedState;
	togglePreview: (item: PreviewableItem) => void;
	triggerDownload: (setId: number) => void;
	getActionState: (setId: number, baseOwned: boolean) => ActionState;
	endReached?: () => void;
	openSearchTab: (query: string, label: string) => void;
};

const ResultList: React.FC<Props> = ({
	items,
	focusedSetId,
	cardLayout,
	showUnicode,
	previewingId,
	isLoadingPreview,
	playbackProgress,
	isActuallyPlaying,
	queueState,
	togglePreview,
	triggerDownload,
	getActionState,
	endReached,
	openSearchTab,
}) => {
	const virtuosoRef = React.useRef<VirtuosoHandle>(null);
	const followPreviewRef = React.useRef(true);
	const focusedIndex = items.findIndex((item) => item.set_id === focusedSetId);
	const focusedRow = focusedIndex < 0 ? -1 : Math.floor(focusedIndex / 2);
	React.useEffect(() => {
		if (focusedRow >= 0 && followPreviewRef.current)
			virtuosoRef.current?.scrollIntoView({
				index: focusedRow,
				behavior: "smooth",
			});
	}, [focusedRow]);
	const Card = cardLayout === "artwork" ? ArtworkResultCard : ResultCard;
	const pairedItems = React.useMemo(() => {
		const pairs: ItemPair[] = [];
		for (const item of items) {
			const doneEntry = queueState.doneEntries.get(item.set_id);
			const prepared: PreparedItem = {
				item,
				action: getActionState(item.set_id, item.owned),
				failureMessage: doneEntry?.status === "failed" ? doneEntry.message : undefined,
			};
			const previous: ItemPair | undefined = pairs[pairs.length - 1];
			if (previous && previous[1] === null) previous[1] = prepared;
			else pairs.push([prepared, null]);
		}
		return pairs;
	}, [items, getActionState, queueState.doneEntries]);

	return (
		<div
			className="h-full rounded-xl border border-border bg-surface/80 shadow-2xl backdrop-blur-md"
			onWheelCapture={() => {
				followPreviewRef.current = false;
			}}
			onTouchMoveCapture={() => {
				followPreviewRef.current = false;
			}}
			onPointerDownCapture={(event) => {
				if (event.clientX >= event.currentTarget.getBoundingClientRect().right - 20)
					followPreviewRef.current = false;
			}}
			onKeyDownCapture={(event) => {
				if (["PageUp", "PageDown", "Home", "End"].includes(event.key))
					followPreviewRef.current = false;
			}}
		>
			<Virtuoso
				ref={virtuosoRef}
				style={{ height: "100%" }}
				data={pairedItems}
				endReached={endReached}
				overscan={200}
				itemContent={(_, pair) => (
					<div className="flex">
						{pair.map((prepared, index) => (
							<div className="flex-1" key={prepared?.item.set_id ?? `empty-${index}`}>
								{prepared && (
									<Card
										item={prepared.item}
										showUnicode={showUnicode}
										action={prepared.action}
										isPreviewing={previewingId === prepared.item.set_id && isActuallyPlaying}
										isLoadingPreview={previewingId === prepared.item.set_id && isLoadingPreview}
										playbackProgress={previewingId === prepared.item.set_id ? playbackProgress : 0}
										togglePreview={togglePreview}
										triggerDownload={triggerDownload}
										failureMessage={prepared.failureMessage}
										openSearchTab={openSearchTab}
									/>
								)}
							</div>
						))}
					</div>
				)}
			/>
		</div>
	);
};

export default ResultList;
