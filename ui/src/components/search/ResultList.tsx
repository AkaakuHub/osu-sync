import type React from "react";
import { Virtuoso } from "react-virtuoso";
import type { SearchResponse } from "../../hooks/useApiClient";
import ResultCard, { type PreviewableItem } from "./ResultCard";
import type { ActionState, QueueDerivedState } from "./helpers";

type Props = {
	items: SearchResponse["results"];
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
	setSearchQuery: (value: string) => void;
};

const ResultList: React.FC<Props> = ({
	items,
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
	setSearchQuery,
}) => {
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
		<div className="h-full rounded-xl border border-border bg-surface/80 shadow-2xl backdrop-blur-md">
			<Virtuoso
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
											<ResultCard
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
												setSearchQuery={setSearchQuery}
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
											<ResultCard
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
												setSearchQuery={setSearchQuery}
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
