// FilterPanelで使用するUIコンポーネント群
import React from "react";

// ヘッダーコンポーネント
interface FilterPanelHeaderProps {
	isExpanded: boolean;
	onToggleExpand: () => void;
	isActive: boolean;
	activeCount: number;
	onReset: () => void;
}

export function FilterPanelHeader({
	isExpanded,
	onToggleExpand,
	isActive,
	activeCount,
	onReset,
}: FilterPanelHeaderProps) {
	return (
		<div className="flex items-center justify-between p-4">
			<button
				onClick={onToggleExpand}
				className="flex items-center space-x-2 text-text-secondary hover:text-text transition-colors"
			>
				<svg
					className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span className="font-medium">検索フィルター</span>
				{isActive && (
					<span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
						{activeCount}
					</span>
				)}
			</button>

			{isActive && (
				<button
					onClick={onReset}
					className="px-3 py-1 text-sm text-text-muted hover:text-text transition-colors"
				>
					リセット
				</button>
			)}
		</div>
	);
}

// フィルターセクション
interface FilterSectionProps {
	title: string;
	children: React.ReactNode;
	className?: string;
	warning?: boolean;
}

export function FilterSection({ title, children, className = "", warning }: FilterSectionProps) {
	return (
		<div className={`space-y-3 ${className}`}>
			<h3 className={`text-sm font-medium ${warning ? "text-warning" : "text-text-secondary"}`}>
				{title}
				{warning && (
					<span className="ml-2 text-xs bg-warning/20 text-warning-foreground px-2 py-0.5 rounded">
						サポーター専用
					</span>
				)}
			</h3>
			{children}
		</div>
	);
}

// ソートコントロール
interface SortControlsProps {
	value: string;
	onChange: (field: string, order: "asc" | "desc") => void;
	sortFields: string[];
	sortLabels: Record<string, string>;
}

export function SortControls({ value, onChange, sortFields, sortLabels }: SortControlsProps) {
	const [currentField, currentOrder] = value.split("_");

	return (
		<div className="flex space-x-2">
			<select
				value={currentField}
				onChange={(e) => onChange(e.target.value, currentOrder as "asc" | "desc")}
				className="flex-1 px-3 py-2 bg-surface-variant border border-border rounded-md text-surface-foreground focus:outline-none focus:ring-2 focus:ring-primary"
			>
				{sortFields.map((field) => (
					<option key={field} value={field}>
						{sortLabels[field]}
					</option>
				))}
			</select>

			<select
				value={currentOrder}
				onChange={(e) => onChange(currentField, e.target.value as "asc" | "desc")}
				className="px-3 py-2 bg-surface-variant border border-border rounded-md text-surface-foreground focus:outline-none focus:ring-2 focus:ring-primary"
			>
				<option value="desc">降順</option>
				<option value="asc">昇順</option>
			</select>
		</div>
	);
}

// ステータスコントロール
interface StatusControlsProps {
	value: string;
	onChange: (status: string) => void;
	statuses: string[];
	statusLabels: Record<string, string>;
}

export function StatusControls({ value, onChange, statuses, statusLabels }: StatusControlsProps) {
	return (
		<div className="grid grid-cols-2 gap-2">
			{statuses.map((status) => (
				<button
					key={status}
					onClick={() => onChange(status)}
					className={`px-3 py-2 text-sm rounded-md transition-colors ${
						value === status
							? "bg-primary text-primary-foreground"
							: "bg-surface-variant text-text-secondary hover:bg-surface"
					}`}
				>
					{statusLabels[status]}
				</button>
			))}
		</div>
	);
}

// モードコントロール
interface ModeControlsProps {
	value: string;
	onChange: (mode: string) => void;
	modes: Record<string, string>;
}

export function ModeControls({ value, onChange, modes }: ModeControlsProps) {
	return (
		<div className="grid grid-cols-2 gap-2">
			{Object.entries(modes).map(([modeValue, label]) => (
				<button
					key={modeValue}
					onClick={() => onChange(modeValue)}
					className={`px-3 py-2 text-sm rounded-md transition-colors ${
						value === modeValue
							? "bg-primary text-primary-foreground"
							: "bg-surface-variant text-text-secondary hover:bg-surface"
					}`}
				>
					{label}
				</button>
			))}
		</div>
	);
}

// 配列フィルターコントロール
interface ArrayFilterControlItem {
	value: string;
	label: string;
}

interface ArrayFilterControlsProps {
	type: "checkbox" | "radio";
	items: ArrayFilterControlItem[];
	selectedValues: string[];
	onToggle: (value: string) => void;
}

export function ArrayFilterControls({
	type,
	items,
	selectedValues,
	onToggle,
}: ArrayFilterControlsProps) {
	return (
		<div className="space-y-2">
			{items.map((item) => (
				<label
					key={item.value}
					className="flex items-center space-x-2 cursor-pointer hover:text-text transition-colors"
				>
					<input
						type={type}
						checked={selectedValues.includes(item.value)}
						onChange={() => onToggle(item.value)}
						className="rounded border-border bg-surface-variant text-primary focus:ring-primary focus:ring-offset-surface"
					/>
					<span className="text-sm text-text-secondary">{item.label}</span>
				</label>
			))}
		</div>
	);
}

// NSFWトグル
interface NsfwToggleProps {
	value: boolean;
	onChange: (value: boolean) => void;
}

export function NsfwToggle({ value, onChange }: NsfwToggleProps) {
	return (
		<label className="flex items-center justify-between cursor-pointer">
			<span className="text-sm text-text-secondary">センシティブなコンテンツを表示</span>
			<button
				type="button"
				onClick={() => onChange(!value)}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
					value ? "bg-primary" : "bg-surface-variant"
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-surface-foreground transition-transform ${
						value ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</button>
		</label>
	);
}

// サポーターフィルター
interface SupporterFiltersProps {
	playedFilter: string;
	rankFilters: string[];
	onPlayedChange: (played: string) => void;
	onRankToggle: (rank: string) => void;
	rankOptions: string[];
}

export function SupporterFilters({
	playedFilter,
	rankFilters,
	onPlayedChange,
	onRankToggle,
	rankOptions,
}: SupporterFiltersProps) {
	return (
		<div className="space-y-4">
			{/* プレイ済みフィルター */}
			<div>
				<label className="block text-sm text-text-muted mb-2">プレイ状況</label>
				<select
					value={playedFilter}
					onChange={(e) => onPlayedChange(e.target.value)}
					className="w-full px-3 py-2 bg-surface-variant border border-border rounded-md text-surface-foreground focus:outline-none focus:ring-2 focus:ring-primary"
				>
					<option value="any">すべて</option>
					<option value="played">プレイ済み</option>
					<option value="unplayed">未プレイ</option>
				</select>
			</div>

			{/* ランクフィルター */}
			<div>
				<label className="block text-sm text-text-muted mb-2">獲得ランク</label>
				<div className="grid grid-cols-4 gap-2">
					{rankOptions.map((rank) => (
						<button
							key={rank}
							onClick={() => onRankToggle(rank)}
							className={`px-2 py-1 text-xs rounded transition-colors ${
								rankFilters.includes(rank)
									? "bg-primary text-primary-foreground"
									: "bg-surface-variant text-text-secondary hover:bg-surface"
							}`}
						>
							{rank}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

// ジャンル・言語セレクト
interface SelectFilterProps {
	value: string[];
	onChange: (values: string[]) => void;
	options: Record<string, string>;
	placeholder: string;
	multiple?: boolean;
}

export function SelectFilter({
	value,
	onChange,
	options,
	placeholder,
	multiple = true,
}: SelectFilterProps) {
	return (
		<select
			value={value}
			onChange={(e) => {
				const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
				onChange(selectedOptions);
			}}
			multiple={multiple}
			className={`w-full px-3 py-2 bg-surface-variant border border-border rounded-md text-surface-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
				multiple ? "min-h-[100px]" : ""
			}`}
			size={multiple ? undefined : 1}
		>
			<option value="" disabled>
				{placeholder}
			</option>
			{Object.entries(options).map(([key, label]) => (
				<option key={key} value={key}>
					{label}
				</option>
			))}
		</select>
	);
}

// 高度な検索入力
interface AdvancedSearchInputProps {
	onSubmit: (query: string) => void;
	placeholder?: string;
}

export function AdvancedSearchInput({ onSubmit, placeholder }: AdvancedSearchInputProps) {
	const [query, setQuery] = React.useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(query.trim());
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-2">
			<input
				type="text"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder={placeholder}
				className="w-full px-3 py-2 bg-surface-variant border border-border rounded-md text-surface-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
			/>
			<div className="flex items-center justify-between">
				<div className="text-xs text-text-disabled space-x-4">
					<span>stars:5</span>
					<span>ar&gt;9</span>
					<span>bpm&lt;200</span>
					<span>creator=name</span>
				</div>
				<button
					type="submit"
					className="px-4 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
				>
					適用
				</button>
			</div>
		</form>
	);
}
