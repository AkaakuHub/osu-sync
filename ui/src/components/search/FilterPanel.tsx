// 検索フィルターパネル - osu!公式風のシンプルなレイアウト

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { tv } from "tailwind-variants";
import {
	ArrayFilterControls,
	ModeControls,
	NsfwToggle,
	SelectFilter,
	SortControls,
	StatusControls,
} from "./filter-components";
import { useSearchFilters } from "./hooks/useSearchFilters";
import {
	AVAILABLE_EXTRAS,
	AVAILABLE_GENERAL,
	AVAILABLE_RANKS,
	AVAILABLE_SORT_FIELDS,
	AVAILABLE_STATUSES,
	GAME_MODES,
	type PlayedFilter,
	type SearchFilters,
	SORT_FIELD_LABELS,
	STATUS_LABELS,
} from "./types";
import { activeFilterFlags } from "./utils";

// 手動定義のジャンルと言語
const GENRES = [
	{ value: "any", label: "Any" },
	{ value: "unspecified", label: "Unspecified" },
	{ value: "video-game", label: "Video Game" },
	{ value: "anime", label: "Anime" },
	{ value: "rock", label: "Rock" },
	{ value: "pop", label: "Pop" },
	{ value: "other", label: "Other" },
	{ value: "novelty", label: "Novelty" },
	{ value: "hip-hop", label: "Hip Hop" },
	{ value: "electronic", label: "Electronic" },
	{ value: "metal", label: "Metal" },
	{ value: "classical", label: "Classical" },
	{ value: "folk", label: "Folk" },
	{ value: "jazz", label: "Jazz" },
];

const LANGUAGES = [
	{ value: "any", label: "Any" },
	{ value: "english", label: "English" },
	{ value: "chinese", label: "Chinese" },
	{ value: "french", label: "French" },
	{ value: "german", label: "German" },
	{ value: "italian", label: "Italian" },
	{ value: "japanese", label: "Japanese" },
	{ value: "korean", label: "Korean" },
	{ value: "spanish", label: "Spanish" },
	{ value: "swedish", label: "Swedish" },
	{ value: "russian", label: "Russian" },
	{ value: "polish", label: "Polish" },
	{ value: "instrumental", label: "Instrumental" },
	{ value: "other", label: "Other" },
	{ value: "unspecified", label: "Unspecified" },
];

interface FilterPanelProps {
	onFiltersChange?: (filters: SearchFilters) => void;
	className?: string;
	initialFilters?: SearchFilters | null;
	searchQuery?: string;
}

const PLAYED_OPTIONS: { value: PlayedFilter; label: string }[] = [
	{ value: "any", label: "Any" },
	{ value: "played", label: "Played" },
	{ value: "unplayed", label: "Unplayed" },
];

export function FilterPanel({
	onFiltersChange,
	className = "",
	initialFilters,
	searchQuery,
}: FilterPanelProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const {
		filters,
		setSort,
		setStatus,
		setMode,
		toggleExtra,
		toggleGeneral,
		setNsfw,
		setPlayed,
		toggleRank,
		resetAllFilters,
		toggleGenre,
		toggleLanguage,
	} = useSearchFilters({ onFiltersChange, initialFilters, searchQuery });

	const activeFilterCount = Object.values(activeFilterFlags(filters)).filter(Boolean).length;

	const headerClass = tv({
		base: "flex items-center justify-between px-4 py-1 cursor-pointer border-b hover:bg-surface-variant/50 transition-colors",
		variants: {
			expanded: {
				true: "border-border",
				false: "border-border/0",
			},
		},
	});

	return (
		<div
			className={`bg-surface/95 backdrop-blur-md border border-border rounded-lg shadow-lg ${className}`}
		>
			{/* ヘッダー */}
			<div
				className={headerClass({ expanded: isExpanded })}
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center gap-2">
					<span className="font-medium text-text">Filters</span>
					{activeFilterCount > 0 && (
						<span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 bg-accent text-accent-foreground text-xs font-medium rounded-full">
							{activeFilterCount}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{activeFilterCount > 0 && (
						<button
							onClick={(e) => {
								e.stopPropagation(); // ヘッダーのクリックイベントを伝播させない
								resetAllFilters();
							}}
							className="px-2 py-1 text-xs text-text-secondary hover:text-text transition-colors"
						>
							Reset
						</button>
					)}
					<ChevronDown
						className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? "rotate-180" : ""}`}
					/>
				</div>
			</div>

			{/* フィルター内容 - osu!公式風の横並びレイアウト */}
			{isExpanded && (
				<div className="max-h-[calc(50vh-200px)] overflow-y-auto p-4 space-y-3">
					{/* ソート */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">Sort:</span>
						<div className="flex flex-wrap gap-2">
							<SortControls
								field={filters.sortField}
								order={filters.sortOrder}
								onChange={setSort}
								sortFields={AVAILABLE_SORT_FIELDS}
								sortLabels={SORT_FIELD_LABELS}
							/>
						</div>
					</div>

					{/* ステータス */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">Status:</span>
						<div className="flex flex-wrap gap-2">
							<StatusControls
								value={filters.status}
								onChange={setStatus}
								statuses={AVAILABLE_STATUSES}
								statusLabels={STATUS_LABELS}
							/>
						</div>
					</div>

					{/* モード */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">Mode:</span>
						<div className="flex flex-wrap gap-2">
							<ModeControls value={filters.mode} onChange={setMode} modes={GAME_MODES} />
						</div>
					</div>

					{/* ジャンル */}
					<div className="flex items-start gap-3">
						<span className="text-sm font-medium text-text w-20 pt-1">Genre:</span>
						<div className="flex flex-wrap gap-2 flex-1">
							<ArrayFilterControls
								items={GENRES}
								selectedValues={filters.genre || []}
								onToggle={toggleGenre}
							/>
						</div>
					</div>

					{/* 言語 */}
					<div className="flex items-start gap-3">
						<span className="text-sm font-medium text-text w-20 pt-1">Language:</span>
						<div className="flex flex-wrap gap-2 flex-1">
							<ArrayFilterControls
								items={LANGUAGES}
								selectedValues={filters.language || []}
								onToggle={toggleLanguage}
							/>
						</div>
					</div>

					{/* エクストラ */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">Extra:</span>
						<div className="flex flex-wrap gap-2">
							<ArrayFilterControls
								items={AVAILABLE_EXTRAS.map((value) => ({
									value,
									label: value === "video" ? "Video" : "Storyboard",
								}))}
								selectedValues={filters.extra || []}
								onToggle={toggleExtra}
							/>
						</div>
					</div>

					{/* 一般フィルター */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">General:</span>
						<div className="flex flex-wrap gap-2">
							<ArrayFilterControls
								items={AVAILABLE_GENERAL.map((value) => ({
									value,
									label: value.charAt(0).toUpperCase() + value.slice(1),
								}))}
								selectedValues={filters.general || []}
								onToggle={toggleGeneral}
							/>
						</div>
					</div>

					{/* NSFW */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">NSFW:</span>
						<div className="flex items-center gap-3">
							<NsfwToggle value={filters.nsfw || false} onChange={setNsfw} />
						</div>
					</div>

					{/* ランク */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">Rank:</span>
						<div className="flex flex-wrap gap-2">
							<ArrayFilterControls
								items={AVAILABLE_RANKS.map((value) => ({
									value,
									label: value.toUpperCase(),
								}))}
								selectedValues={filters.rank || []}
								onToggle={toggleRank}
							/>
						</div>
					</div>

					{/* プレイ済み */}
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-text w-20">Played:</span>
						<div className="flex flex-wrap gap-2">
							<SelectFilter
								value={filters.played || "any"}
								onChange={setPlayed}
								options={PLAYED_OPTIONS}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
