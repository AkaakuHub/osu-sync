import { type UIEvent, useRef } from "react";
import type { ListItem } from "react-virtuoso";

export function useResultScrollPosition<T>(columnCount: number) {
	const renderedItems = useRef<ListItem<T>[]>([]);
	const scrollTop = useRef(0);
	const position = useRef({ itemIndex: 0, offset: 0 });

	const updatePosition = () => {
		const firstVisible = renderedItems.current.find(
			(item) => item.offset + item.size > scrollTop.current,
		);
		if (!firstVisible) return;
		const rowStart = firstVisible.index * columnCount;
		const previousItem = position.current.itemIndex;
		position.current = {
			itemIndex:
				previousItem >= rowStart && previousItem < rowStart + columnCount ? previousItem : rowStart,
			offset: scrollTop.current - firstVisible.offset,
		};
	};

	return {
		initialTopMostItemIndex: {
			index: Math.floor(position.current.itemIndex / columnCount),
			align: "start" as const,
			offset: position.current.offset,
		},
		itemsRendered: (items: ListItem<T>[]) => {
			renderedItems.current = items;
			updatePosition();
		},
		onScroll: (event: UIEvent<HTMLDivElement>) => {
			scrollTop.current = event.currentTarget.scrollTop;
			updatePosition();
		},
	};
}
