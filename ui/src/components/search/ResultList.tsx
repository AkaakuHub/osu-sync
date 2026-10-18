import React from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { SearchResponse } from "../../hooks/useApiClient";
import type { CardLayout } from "../../hooks/useDisplayPreferences";
import ArtworkResultCard from "./ArtworkResultCard";
import type { ActionState, QueueDerivedState } from "./helpers";
import ResultCard, { type PreviewableItem } from "./ResultCard";

type Props = {
	items: SearchResponse["results"];
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
	React.useEffect(() => {
		if (focusedIndex >= 0 && followPreviewRef.current)
			virtuosoRef.current?.scrollToIndex({
				index: Math.floor(focusedIndex / 2),
				align: "center",
				behavior: "smooth",
			});
	}, [focusedIndex]);
	const Card = cardLayout === "artwork" ? ArtworkResultCard : ResultCard;
	// Pair items for 2-column layout
	const pairedItems = items.reduce<
		Array<[SearchResponse["results"][number] | null, SearchResponse["results"][number] | null]>
	>((acc, item, index) => {
		if (index % 2 === 0) {
			acc.push([item, null]);
		} else {
			acc[acc.length - 1][1] = item;
		}
		return acc;
	}, []);

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
				itemContent={(_, pair) => {
					const [leftItem, rightItem] = pair;

					return (
						<div className="flex">
							{/* Left column */}
							<div className="flex-1">
								{leftItem &&
									(() => {
										const action = getActionState(leftItem.set_id, leftItem.owned);
										const failureMessage =
											queueState.doneEntries.get(leftItem.set_id)?.status === "failed"
												? queueState.doneEntries.get(leftItem.set_id)?.message
												: undefined;

										return (
											<Card
												key={leftItem.set_id}
												item={leftItem}
												showUnicode={showUnicode}
												action={action}
												isPreviewing={previewingId === leftItem.set_id && isActuallyPlaying}
												isLoadingPreview={isLoadingPreview}
												playbackProgress={previewingId === leftItem.set_id ? playbackProgress : 0}
												previewingId={previewingId}
												isActuallyPlaying={isActuallyPlaying}
												togglePreview={togglePreview}
												triggerDownload={triggerDownload}
												failureMessage={failureMessage}
												openSearchTab={openSearchTab}
											/>
										);
									})()}
							</div>

							{/* Right column */}
							<div className="flex-1">
								{rightItem &&
									(() => {
										const action = getActionState(rightItem.set_id, rightItem.owned);
										const failureMessage =
											queueState.doneEntries.get(rightItem.set_id)?.status === "failed"
												? queueState.doneEntries.get(rightItem.set_id)?.message
												: undefined;

										return (
											<Card
												key={rightItem.set_id}
												item={rightItem}
												showUnicode={showUnicode}
												action={action}
												isPreviewing={previewingId === rightItem.set_id && isActuallyPlaying}
												isLoadingPreview={isLoadingPreview}
												playbackProgress={previewingId === rightItem.set_id ? playbackProgress : 0}
												previewingId={previewingId}
												isActuallyPlaying={isActuallyPlaying}
												togglePreview={togglePreview}
												triggerDownload={triggerDownload}
												failureMessage={failureMessage}
												openSearchTab={openSearchTab}
											/>
										);
									})()}
							</div>
						</div>
					);
				}}
			/>
		</div>
	);
};

export default ResultList;
