import { type UIEvent, useRef } from "react";
import type { IndexLocationWithAlign, ListItem } from "react-virtuoso";

export function useResultScrollPosition<T>() {
	const renderedItems = useRef<ListItem<T>[]>([]);
	const scrollTop = useRef(0);
	const position = useRef<IndexLocationWithAlign>({ index: 0, align: "start" });

	const updatePosition = () => {
		const firstVisible = renderedItems.current.find(
			(item) => item.offset + item.size > scrollTop.current,
		);
		if (!firstVisible) return;
		position.current = {
			index: firstVisible.index,
			align: "start",
			offset: scrollTop.current - firstVisible.offset,
		};
	};

	return {
		initialTopMostItemIndex: position.current,
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
