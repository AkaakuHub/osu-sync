import { Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CardLayout } from "../../hooks/useDisplayPreferences";
import { PreviewContext, usePreview } from "../search/previewBridge";
import type { SearchFilters } from "../search/types";
import { resetFilters } from "../search/utils";
import SearchPage from "./SearchPage";

type SearchTab = {
	id: number;
	label: string;
	query: string;
	filters: SearchFilters;
};

type Props = {
	isActive: boolean;
	notOwnedOnly: boolean;
	setNotOwnedOnly: (value: boolean) => void;
	showUnicode: boolean;
	setShowUnicode: (value: boolean) => void;
	cardLayout: CardLayout;
	setCardLayout: (layout: CardLayout) => void;
};

export default function SearchTabsPage(props: Props) {
	const preview = usePreview();
	const handledReveal = useRef(0);
	const tabListRef = useRef<HTMLDivElement>(null);
	const activeTabRef = useRef<HTMLDivElement>(null);
	const nextId = useRef(2);
	const [tabs, setTabs] = useState<SearchTab[]>([
		{ id: 1, label: "Search", query: "", filters: resetFilters() },
	]);
	const [activeId, setActiveId] = useState(1);

	useEffect(() => {
		const tabList = tabListRef.current;
		if (!tabList) return;
		const handleWheel = (event: WheelEvent) => {
			if (event.ctrlKey || tabList.scrollWidth <= tabList.clientWidth) return;
			const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
			const unit =
				event.deltaMode === WheelEvent.DOM_DELTA_LINE
					? tabList.clientHeight
					: event.deltaMode === WheelEvent.DOM_DELTA_PAGE
						? tabList.clientWidth
						: 1;
			event.preventDefault();
			tabList.scrollBy({ left: delta * unit });
		};
		tabList.addEventListener("wheel", handleWheel, { passive: false });
		return () => tabList.removeEventListener("wheel", handleWheel);
	}, []);

	useLayoutEffect(() => {
		if (props.isActive) {
			activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
		}
	}, [activeId, props.isActive]);

	const openTab = (query = "", label = "New search") => {
		const id = nextId.current++;
		setTabs((current) => [...current, { id, label, query, filters: resetFilters() }]);
		setActiveId(id);
	};

	useEffect(() => {
		const request = preview.revealRequest;
		if (!request || handledReveal.current === request.sequence) return;
		handledReveal.current = request.sequence;
		const target = tabs.find((tab) => tab.id === request.tabId);
		if (target) setActiveId(target.id);
	}, [preview.revealRequest, tabs]);
	const updateTab = (id: number, change: Partial<Pick<SearchTab, "query" | "filters">>) => {
		setTabs((current) =>
			current.some(
				(tab) =>
					tab.id === id &&
					((change.query !== undefined && tab.query !== change.query) ||
						(change.filters !== undefined && tab.filters !== change.filters)),
			)
				? current.map((tab) =>
						tab.id === id
							? {
									...tab,
									...change,
									label: change.query === undefined ? tab.label : change.query.trim() || "Search",
								}
							: tab,
					)
				: current,
		);
	};
	const closeTab = (id: number) => {
		const index = tabs.findIndex((tab) => tab.id === id);
		if (index < 0 || tabs.length === 1) return;
		const remaining = tabs.filter((tab) => tab.id !== id);
		setTabs(remaining);
		if (activeId === id) setActiveId(remaining[Math.max(0, index - 1)].id);
	};

	return (
		<div className="flex h-full min-h-0 min-w-0 flex-col">
			<div
				ref={tabListRef}
				className="flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/70 px-2 pb-1"
				role="tablist"
				aria-label="Search tabs"
			>
				{tabs.map((tab) => (
					<div
						key={tab.id}
						ref={activeId === tab.id ? activeTabRef : undefined}
						className={`group flex min-w-28 max-w-48 shrink-0 items-center rounded-t-lg border-b-2 pl-3 pr-1 text-xs ${activeId === tab.id ? "border-primary bg-surface-variant/70 text-text" : "border-transparent text-text-secondary hover:bg-surface-variant/40"}`}
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeId === tab.id}
							onClick={() => setActiveId(tab.id)}
							className="min-w-0 flex-1 truncate py-2 text-left"
							title={tab.label}
						>
							{tab.label}
						</button>
						<button
							type="button"
							onClick={() => closeTab(tab.id)}
							disabled={tabs.length === 1}
							aria-label={`Close ${tab.label}`}
							className="rounded p-1 text-text-muted hover:bg-surface hover:text-text"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={() => openTab()}
					aria-label="New search tab"
					title="New search tab"
					className="shrink-0 rounded-md p-1.5 text-text-secondary hover:bg-surface-variant hover:text-text"
				>
					<Plus className="h-4 w-4" />
				</button>
			</div>
			<div className="min-h-0 flex-1">
				{tabs.map((tab) => (
					<div key={tab.id} role="tabpanel" hidden={activeId !== tab.id} className="h-full">
						<PreviewContext.Provider
							value={{ ...preview, togglePreview: (item) => preview.togglePreview(item, tab.id) }}
						>
							<SearchPage
								{...props}
								isActive={props.isActive && activeId === tab.id}
								searchQuery={tab.query}
								setSearchQuery={(query) => updateTab(tab.id, { query })}
								searchFilters={tab.filters}
								setSearchFilters={(filters) => updateTab(tab.id, { filters })}
								openSearchTab={(query, label) => openTab(query, label)}
							/>
						</PreviewContext.Provider>
					</div>
				))}
			</div>
		</div>
	);
}
