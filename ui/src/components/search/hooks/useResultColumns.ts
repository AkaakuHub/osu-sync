import { useEffect, useRef, useState } from "react";

export function useResultColumns() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [columnCount, setColumnCount] = useState(2);
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const updateColumns = () => {
			const width = container.clientWidth;
			if (width === 0) return;
			setColumnCount(width >= 1500 ? 3 : width >= 900 ? 2 : 1);
		};
		updateColumns();
		const observer = new ResizeObserver(updateColumns);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);
	return { containerRef, columnCount };
}
