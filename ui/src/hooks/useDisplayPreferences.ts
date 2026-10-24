import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiClient, type Settings } from "./useApiClient";

export type CardLayout = Settings["card_layout"];

type DisplayPreferences = Pick<Settings, "card_layout" | "show_unicode">;

export function useDisplayPreferences() {
	const client = useQueryClient();
	const { data } = useQuery({
		queryKey: ["settings"],
		queryFn: () => apiClient.get<Settings>("/settings"),
	});
	const mutation = useMutation({
		mutationKey: ["display-preferences"],
		scope: { id: "display-preferences" },
		mutationFn: (preferences: Partial<DisplayPreferences>) =>
			apiClient.post("/settings", preferences),
		onSuccess: (_, preferences) => {
			client.setQueryData<Settings>(["settings"], (current) =>
				current ? { ...current, ...preferences } : current,
			);
		},
		onError: () => toast.error("Failed to save display settings."),
		onSettled: () => {
			if (client.isMutating({ mutationKey: ["display-preferences"] }) === 1) {
				return client.invalidateQueries({ queryKey: ["settings"] });
			}
		},
	});
	const pending = mutation.isPending ? mutation.variables : undefined;

	return {
		cardLayout: pending?.card_layout ?? data?.card_layout ?? "classic",
		showUnicode: pending?.show_unicode ?? data?.show_unicode ?? false,
		setCardLayout: (card_layout: CardLayout) => mutation.mutate({ card_layout }),
		setShowUnicode: (show_unicode: boolean) => mutation.mutate({ show_unicode }),
	};
}
