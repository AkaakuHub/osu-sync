import type { SortField } from "./types";

export function getDateSearchField(sortField: SortField): "ranked" | "updated" {
	return sortField === "updated" ? "updated" : "ranked";
}
