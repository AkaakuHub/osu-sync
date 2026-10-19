import React from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { SearchResponse } from "../../hooks/useApiClient";
import type { CardLayout } from "../../hooks/useDisplayPreferences";
import type { ActionState, QueueDerivedState } from "./helpers";
import { useResultColumns } from "./hooks/useResultColumns";
import ResultCard, { type PreviewableItem } from "./ResultCard";

type Item = SearchResponse["results"][number];
type PreparedItem = { item: Item; action: ActionState; failureMessage?: string | null };

type Props = {
	items: Item[];
	focusedSetId: number | null;
	cardLayout: CardLayout;
	showUnicode: boolean;
	dateField?: "ranked" | "updated";
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
	dateField,
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
	const { containerRef, columnCount } = useResultColumns();
	const followPreviewRef = React.useRef(true);
	const focusedIndex = items.findIndex((item) => item.set_id === focusedSetId);
	const focusedRow = focusedIndex < 0 ? -1 : Math.floor(focusedIndex / columnCount);
	React.useEffect(() => {
		if (focusedRow >= 0 && followPreviewRef.current)
			virtuosoRef.current?.scrollIntoView({
				index: focusedRow,
				behavior: "smooth",
			});
	}, [focusedRow]);
	const rows = React.useMemo(() => {
		const result: PreparedItem[][] = [];
		for (const item of items) {
			const doneEntry = queueState.doneEntries.get(item.set_id);
			const prepared: PreparedItem = {
				item,
				action: getActionState(item.set_id, item.owned),
				failureMessage: doneEntry?.status === "failed" ? doneEntry.message : undefined,
			};
			const previous: PreparedItem[] | undefined = result[result.length - 1];
			if (previous && previous.length < columnCount) previous.push(prepared);
			else result.push([prepared]);
		}
		return result;
	}, [items, getActionState, queueState.doneEntries, columnCount]);

	return (
		<div
			ref={containerRef}
			className={`[--result-columns:1] min-[950px]:[--result-columns:2] min-[1550px]:[--result-columns:3] ${
				cardLayout === "artwork"
					? "h-full"
					: "h-full rounded-xl border border-border bg-surface/80 shadow-2xl backdrop-blur-md"
			}`}
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
				data={rows}
				endReached={endReached}
				overscan={200}
				itemContent={(_, row) => (
					<div
						className={cardLayout === "artwork" ? "grid gap-5 px-1 pt-1 pb-5" : "grid"}
						style={{ gridTemplateColumns: "repeat(var(--result-columns), minmax(0, 1fr))" }}
					>
						{row.map((prepared) => (
							<div className="min-w-0" key={prepared.item.set_id}>
								<ResultCard
									dateField={dateField}
									layout={cardLayout}
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
							</div>
						))}
					</div>
				)}
			/>
		</div>
	);
};

export default ResultList;
