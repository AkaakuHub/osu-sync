import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { apiClient, type SearchResponse } from "../hooks/useApiClient";
import type { FilterRequest, Rule } from "../types";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";

type Props = {
	ownedOnly: boolean;
	onRescan: () => void;
};

function SearchForm({ ownedOnly, onRescan }: Props) {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [submitted, setSubmitted] = useState(false);
	const client = useQueryClient();

	const [rules, setRules] = useState<Rule[]>([]);

	const { data, isFetching, error } = useQuery<SearchResponse>({
		queryKey: ["search", query, page, rules, submitted],
		queryFn: () => {
			if (rules.length > 0) {
				const filterBody: FilterRequest = {
					groups: [{ number: 1, connector: "and", not: false, parent: 0 }],
					rules: rules.map((r) => ({ ...r, group: 1 })),
				};
				return apiClient.post<SearchResponse>("/search/filter", filterBody);
			}
			return apiClient.get<SearchResponse>(
				`/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`,
			);
		},
		enabled: submitted && (query.length > 1 || rules.length > 0),
	});

	const filtered = data?.results.filter((r) => (ownedOnly ? r.owned : true)) ?? [];

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		setSubmitted(true);
		setPage(1);
		client.invalidateQueries({ queryKey: ["search"] });
	};

	const addRule = () => {
		setRules((prev) => [
			...prev,
			{ type: "number", field: "Cs", operator: ">", value: "5", group: 1 },
		]);
	};

	const updateRule = (idx: number, patch: Partial<Rule>) => {
		setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
	};

	const removeRule = (idx: number) => {
		setRules((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleDownloadMissing = async () => {
		if (!data) return;
		const ids = data.results.filter((r) => !r.owned).map((r) => r.set_id);
		if (ids.length === 0) return;
		await apiClient.post("/download", { set_ids: ids });
		client.invalidateQueries({ queryKey: ["queue"] });
	};

	return (
		<div className="space-y-6">
			<form className="flex gap-2" onSubmit={handleSubmit}>
				<Input
					className="flex-1"
					placeholder="Artist / Title / Creator..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				<Button type="submit" disabled={query.length < 2 && rules.length === 0}>
					Search
				</Button>
				<Button
					type="button"
					variant="secondary"
					onClick={() => apiClient.post("/local/rescan").then(onRescan)}
				>
					Rescan
				</Button>
			</form>

			{/* Filters */}
			<div className="border-2 border-dashed rounded-lg p-4 bg-muted/30">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-medium">Filters</h3>
					<Button type="button" variant="secondary" size="sm" onClick={addRule}>
						Add Rule
					</Button>
				</div>

				{rules.length === 0 ? (
					<p className="text-sm text-muted-foreground italic">Add filters to narrow down results</p>
				) : (
					<div className="space-y-2">
						{rules.map((r, i) => (
							<div key={i} className="flex items-center gap-2">
								<Select
									className="w-24"
									value={r.field}
									onChange={(e) => updateRule(i, { field: e.target.value })}
								>
									<option value="Cs">CS</option>
									<option value="Ar">AR</option>
									<option value="Od">OD</option>
									<option value="Hp">HP</option>
									<option value="Bpm">BPM</option>
									<option value="Stars">Stars</option>
								</Select>
								<Select
									className="w-16"
									value={r.operator}
									onChange={(e) => updateRule(i, { operator: e.target.value })}
								>
									<option value="=">=</option>
									<option value=">">&gt;</option>
									<option value="<">&lt;</option>
								</Select>
								<Input
									className="w-20"
									type="number"
									value={r.value}
									onChange={(e) => updateRule(i, { value: e.target.value })}
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-red-500"
									onClick={() => removeRule(i)}
								>
									Remove
								</Button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Status */}
			<div className="flex items-center justify-between text-sm">
				<div className="text-muted-foreground">
					{query.length < 2 && rules.length === 0 && (
						<span>Enter 2+ characters or add filters</span>
					)}
					{isFetching && <span>Searching...</span>}
					{error && <span className="text-red-500">Error: {(error as Error).message}</span>}
				</div>

				{data && (
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							←
						</Button>
						<span className="text-sm font-medium">{page}</span>
						<Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)}>
							→
						</Button>
					</div>
				)}
			</div>

			{/* Download */}
			<div className="flex items-center justify-between">
				<Button
					onClick={handleDownloadMissing}
					disabled={!data || data.results.every((r) => r.owned)}
				>
					Download Missing
				</Button>

				{data && (
					<div className="text-sm text-muted-foreground">
						<strong>{data.total}</strong> results / page {data.page}
					</div>
				)}
			</div>
		</div>
	);
}

export default SearchForm;
