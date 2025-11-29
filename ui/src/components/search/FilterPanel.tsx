// 検索フィルターパネル - 統合されたフィルター管理コンポーネント
import { useState, useMemo } from "react";
import { useSearchFilters } from "./hooks/useSearchFilters";
import {
	FilterPanelHeader,
	FilterSection,
	SortControls,
	StatusControls,
	ModeControls,
	ArrayFilterControls,
	NsfwToggle,
	SupporterFilters,
	SelectFilter,
	AdvancedSearchInput,
} from "./filter-components";
import {
	AVAILABLE_SORT_FIELDS,
	AVAILABLE_STATUSES,
	AVAILABLE_EXTRAS,
	AVAILABLE_GENERAL,
	AVAILABLE_RANKS,
	GAME_MODES,
	GENRES,
	LANGUAGES,
	SORT_FIELD_LABELS,
	STATUS_LABELS,
} from "./types";

interface FilterPanelProps {
	onFiltersChange?: (filters: any) => void;
	isSupporter?: boolean;
	className?: string;
}

export function FilterPanel({
	onFiltersChange,
	isSupporter = false,
	className = "",
}: FilterPanelProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);

	const {
		filters,
		isActive,
		requiresSupporter,
		setSort,
		setStatus,
		setMode,
		toggleExtra,
		toggleGeneral,
		setNsfw,
		setPlayed,
		toggleRank,
		setAdvancedQueryString,
		resetAllFilters,
		getFilterStats,
		setGenre,
		setLanguage,
	} = useSearchFilters({ onFiltersChange });

	const filterStats = useMemo(() => getFilterStats(), [getFilterStats]);

	const handleSortChange = (field: string, order: "asc" | "desc") => {
		setSort(field as any, order);
	};

	const handleStatusChange = (status: string) => {
		setStatus(status as any);
	};

	const handleModeChange = (mode: string) => {
		setMode(mode as any);
	};

	const handleAdvancedSearchSubmit = (queryString: string) => {
		setAdvancedQueryString(queryString);
	};

	// 現在のフィルター設定
	const sortValue = `${filters.sortField}_${filters.sortOrder}`;

	return (
		<div className={`bg-surface border border-border rounded-lg ${className}`}>
			{/* ヘッダー */}
			<FilterPanelHeader
				isExpanded={isExpanded}
				onToggleExpand={() => setIsExpanded(!isExpanded)}
				isActive={isActive}
				activeCount={filterStats.totalActive}
				onReset={resetAllFilters}
			/>

			{/* フィルター内容 */}
			{isExpanded && (
				<div className="p-6 space-y-6 border-t border-border-muted max-h-[500px] overflow-y-auto">
					{/* ソートコントロール */}
					<FilterSection title="並び替え" className="grid grid-cols-2 gap-4">
						<SortControls
							value={sortValue}
							onChange={handleSortChange}
							sortFields={AVAILABLE_SORT_FIELDS}
							sortLabels={SORT_FIELD_LABELS}
						/>
					</FilterSection>

					{/* 基本フィルター */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* ステータスフィルター */}
						<FilterSection title="ステータス">
							<StatusControls
								value={filters.status}
								onChange={handleStatusChange}
								statuses={AVAILABLE_STATUSES}
								statusLabels={STATUS_LABELS}
							/>
						</FilterSection>

						{/* ゲームモードフィルター */}
						<FilterSection title="ゲームモード">
							<ModeControls value={filters.mode} onChange={handleModeChange} modes={GAME_MODES} />
						</FilterSection>
					</div>

					{/* 配列フィルター */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{/* エクストラフィルター */}
						<FilterSection title="追加機能">
							<ArrayFilterControls
								type="checkbox"
								items={AVAILABLE_EXTRAS.map((value) => ({
									value,
									label: value === "video" ? "動画あり" : "ストーリーボードあり",
								}))}
								selectedValues={filters.extra}
								onToggle={(value) => toggleExtra(value as any)}
							/>
						</FilterSection>

						{/* 一般フィルター */}
						<FilterSection title="一般フィルター">
							<ArrayFilterControls
								type="checkbox"
								items={AVAILABLE_GENERAL.map((value) => ({
									value,
									label: {
										recommended: "おすすめ難易度",
										converts: "変換譜面を含む",
										follows: "フォロー中のマッパー",
										spotlights: "スポットライト譜面",
										featured_artists: "フィーチャーアーティスト",
									}[value],
								}))}
								selectedValues={filters.general}
								onToggle={(value) => toggleGeneral(value as any)}
							/>
						</FilterSection>

						{/* NSFWフィルター */}
						<FilterSection title="コンテンツ設定">
							<NsfwToggle value={filters.nsfw} onChange={setNsfw} />
						</FilterSection>
					</div>

					{/* ジャンルと言語フィルター */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* ジャンルフィルター */}
						<FilterSection title="ジャンル">
							<SelectFilter
								value={filters.genre}
								onChange={setGenre}
								options={GENRES}
								placeholder="ジャンルを選択"
								multiple={true}
							/>
						</FilterSection>

						{/* 言語フィルター */}
						<FilterSection title="言語">
							<SelectFilter
								value={filters.language}
								onChange={setLanguage}
								options={LANGUAGES}
								placeholder="言語を選択"
								multiple={true}
							/>
						</FilterSection>
					</div>

					{/* サポーター専用フィルター */}
					{isSupporter && (
						<FilterSection
							title="サポーター専用フィルター"
							warning={!isSupporter && requiresSupporter}
						>
							<SupporterFilters
								playedFilter={filters.played || "any"}
								rankFilters={filters.rank || []}
								onPlayedChange={(played) => setPlayed(played as any)}
								onRankToggle={(rank) => toggleRank(rank as any)}
								rankOptions={AVAILABLE_RANKS}
							/>
						</FilterSection>
					)}

					{/* 高度な検索 */}
					<FilterSection title="高度な検索" className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-text-secondary">クエリ構文を使用して詳細検索</span>
							<button
								onClick={() => setAdvancedSearchVisible(!advancedSearchVisible)}
								className="text-sm text-accent hover:text-accent-foreground transition-colors"
							>
								{advancedSearchVisible ? "非表示" : "表示"}
							</button>
						</div>

						{advancedSearchVisible && (
							<AdvancedSearchInput
								onSubmit={handleAdvancedSearchSubmit}
								placeholder="例: stars>5 ar>=9 bpm<200 creator=hello"
							/>
						)}
					</FilterSection>
				</div>
			)}
		</div>
	);
}
