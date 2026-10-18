import { Languages } from "lucide-react";

type Props = {
	showUnicode: boolean;
	onChange: (value: boolean) => void;
};

export default function UnicodeToggle({ showUnicode, onChange }: Props) {
	return (
		<button
			type="button"
			onClick={() => onChange(!showUnicode)}
			aria-pressed={showUnicode}
			className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-variant/80 px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-variant/60"
			title={showUnicode ? "Display in Normal" : "Display in Unicode"}
		>
			<Languages className="h-3.5 w-3.5" />
			{showUnicode ? "Unicode" : "Normal"}
		</button>
	);
}
