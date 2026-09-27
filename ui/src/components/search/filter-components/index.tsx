import type { GameMode, SortField, SortOrder, StatusFilter } from "../types";

const GAME_MODE_VALUES: GameMode[] = ["null", "0", "1", "2", "3"];

// ソートコントロール
interface SortControlsProps {
	field: SortField;
	order: SortOrder;
	onChange: (field: SortField, order: SortOrder) => void;
	sortFields: SortField[];
	sortLabels: Record<SortField, string>;
}

export function SortControls({
	field,
	order,
	onChange,
	sortFields,
	sortLabels,
}: SortControlsProps) {
	return (
		<div className="flex gap-2">
			<select
				value={field}
				onChange={(e) => {
					const selected = sortFields.find((item) => item === e.target.value);
					if (selected) onChange(selected, order);
				}}
				className="px-2 py-1 text-xs bg-surface border border-border rounded text-text focus:outline-none focus:border-accent"
			>
				{sortFields.map((field) => (
					<option key={field} value={field}>
						{sortLabels[field] || field}
					</option>
				))}
			</select>

			<select
				value={order}
				onChange={(e) => onChange(field, e.target.value === "asc" ? "asc" : "desc")}
				className="px-2 py-1 text-xs bg-surface border border-border rounded text-text focus:outline-none focus:border-accent"
			>
				<option value="desc">↓</option>
				<option value="asc">↑</option>
			</select>
		</div>
	);
}

// ステータスコントロール
interface StatusControlsProps {
	value: StatusFilter;
	onChange: (status: StatusFilter) => void;
	statuses: StatusFilter[];
	statusLabels: Record<StatusFilter, string>;
}

export function StatusControls({ value, onChange, statuses, statusLabels }: StatusControlsProps) {
	return (
		<div className="flex flex-wrap gap-1">
			{statuses.map((status) => (
				<button
					key={status}
					onClick={() => onChange(status)}
					className={`px-2 py-1 text-xs rounded transition-colors ${
						value === status
							? "bg-accent text-accent-foreground font-medium"
							: "bg-surface-variant text-text-secondary hover:bg-surface hover:text-text"
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
	value: GameMode;
	onChange: (mode: GameMode) => void;
	modes: Record<GameMode, string>;
}

export function ModeControls({ value, onChange, modes }: ModeControlsProps) {
	return (
		<div className="flex flex-wrap gap-1">
			{GAME_MODE_VALUES.map((modeValue) => (
				<button
					key={modeValue}
					onClick={() => onChange(modeValue)}
					className={`px-2 py-1 text-xs rounded transition-colors ${
						value === modeValue
							? "bg-accent text-accent-foreground font-medium"
							: "bg-surface-variant text-text-secondary hover:bg-surface hover:text-text"
					}`}
				>
					{modes[modeValue]}
				</button>
			))}
		</div>
	);
}

// 配列フィルターコントロール
interface ArrayFilterControlItem<T extends string> {
	value: T;
	label: string;
}

interface ArrayFilterControlsProps<T extends string> {
	items: ArrayFilterControlItem<T>[];
	selectedValues: T[];
	onToggle: (value: T) => void;
}

export function ArrayFilterControls<T extends string>({
	items,
	selectedValues,
	onToggle,
}: ArrayFilterControlsProps<T>) {
	return (
		<div className="flex flex-wrap gap-1">
			{items.map((item) => (
				<button
					key={item.value}
					onClick={() => onToggle(item.value)}
					className={`px-2 py-1 text-xs rounded transition-colors ${
						selectedValues.includes(item.value)
							? "bg-accent text-accent-foreground font-medium"
							: "bg-surface-variant text-text-secondary hover:bg-surface hover:text-text"
					}`}
				>
					{item.label}
				</button>
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
		<button
			onClick={() => onChange(!value)}
			className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
				value ? "bg-accent" : "bg-surface-variant"
			}`}
		>
			<span
				className={`inline-block h-3 w-3 transform rounded-full bg-surface-foreground transition-transform ${
					value ? "translate-x-5" : "translate-x-1"
				}`}
			/>
		</button>
	);
}

// セレクトフィルター
interface SelectFilterProps<T extends string> {
	value: T;
	onChange: (value: T) => void;
	options: { value: T; label: string }[];
}

export function SelectFilter<T extends string>({ value, onChange, options }: SelectFilterProps<T>) {
	return (
		<select
			value={value}
			onChange={(e) => {
				const selected = options.find((option) => option.value === e.target.value);
				if (selected) onChange(selected.value);
			}}
			className="px-2 py-1 text-xs bg-surface border border-border rounded text-text focus:outline-none focus:border-accent"
		>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}
