// FilterPanelで使用するUIコンポーネント群 - osu!公式風のシンプルなデザイン

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
		<div className="flex gap-2">
			<select
				value={currentField}
				onChange={(e) => onChange(e.target.value, currentOrder as "asc" | "desc")}
				className="px-2 py-1 text-xs bg-surface border border-border rounded text-text focus:outline-none focus:border-accent"
			>
				{sortFields.map((field) => (
					<option key={field} value={field}>
						{sortLabels[field] || field}
					</option>
				))}
			</select>

			<select
				value={currentOrder}
				onChange={(e) => onChange(currentField, e.target.value as "asc" | "desc")}
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
	value: string;
	onChange: (status: string) => void;
	statuses: string[];
	statusLabels: Record<string, string>;
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
	value: string;
	onChange: (mode: string) => void;
	modes: Record<string, string>;
}

export function ModeControls({ value, onChange, modes }: ModeControlsProps) {
	return (
		<div className="flex flex-wrap gap-1">
			{Object.entries(modes).map(([modeValue, label]) => (
				<button
					key={modeValue}
					onClick={() => onChange(modeValue)}
					className={`px-2 py-1 text-xs rounded transition-colors ${
						value === modeValue
							? "bg-accent text-accent-foreground font-medium"
							: "bg-surface-variant text-text-secondary hover:bg-surface hover:text-text"
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

export function ArrayFilterControls({ items, selectedValues, onToggle }: ArrayFilterControlsProps) {
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
interface SelectFilterProps {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
}

export function SelectFilter({ value, onChange, options }: SelectFilterProps) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
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
