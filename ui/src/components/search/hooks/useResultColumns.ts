import { useLayoutEffect, useRef, useState } from "react";

export function useResultColumns() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [columnCount, setColumnCount] = useState(2);
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const updateColumns = () => {
			const columns = Number(getComputedStyle(container).getPropertyValue("--result-columns"));
			if (columns === 1 || columns === 2 || columns === 3) setColumnCount(columns);
		};
		updateColumns();
		const observer = new ResizeObserver(updateColumns);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);
	return { containerRef, columnCount };
}
