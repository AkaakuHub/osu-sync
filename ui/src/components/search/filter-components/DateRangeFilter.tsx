import { useEffect, useState } from "react";

type Props = {
	after: string;
	before: string;
	field: "ranked" | "updated";
	onApply: (after: string, before: string) => void;
};

export default function DateRangeFilter({ after, before, field, onApply }: Props) {
	const [draftAfter, setDraftAfter] = useState(after);
	const [draftBefore, setDraftBefore] = useState(before);
	useEffect(() => {
		setDraftAfter(after);
		setDraftBefore(before);
	}, [after, before]);
	const label = field === "ranked" ? "Ranked date" : "Updated date";

	return (
		<form
			className="flex flex-wrap items-center gap-3"
			onSubmit={(event) => {
				event.preventDefault();
				onApply(draftAfter, draftBefore);
			}}
		>
			<span className="w-20 text-sm font-medium text-text">{label}:</span>
			<label className="flex items-center gap-2 text-sm text-text-secondary">
				After
				<input
					aria-label={`${label} after`}
					type="date"
					value={draftAfter}
					max={draftBefore || undefined}
					onChange={(event) => setDraftAfter(event.target.value)}
					className="rounded-md border border-border bg-surface-variant px-2 py-1 text-text [color-scheme:dark]"
				/>
			</label>
			<label className="flex items-center gap-2 text-sm text-text-secondary">
				Before
				<input
					aria-label={`${label} before`}
					type="date"
					value={draftBefore}
					min={draftAfter || undefined}
					onChange={(event) => setDraftBefore(event.target.value)}
					className="rounded-md border border-border bg-surface-variant px-2 py-1 text-text [color-scheme:dark]"
				/>
			</label>
			<button
				type="submit"
				disabled={draftAfter === after && draftBefore === before}
				className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-40"
			>
				Apply
			</button>
			<button
				type="button"
				aria-label="Reset date filter"
				disabled={!after && !before && !draftAfter && !draftBefore}
				onClick={() => {
					setDraftAfter("");
					setDraftBefore("");
					onApply("", "");
				}}
				className="rounded-md border border-border px-3 py-1 text-sm text-text-secondary hover:bg-surface-variant disabled:opacity-40"
			>
				Reset
			</button>
		</form>
	);
}
