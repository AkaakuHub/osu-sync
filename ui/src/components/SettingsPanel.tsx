import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient, type Settings } from "../hooks/useApiClient";
import Button from "./ui/Button";
import Input from "./ui/Input";

const fetchSettings = () => apiClient.get<Settings>("/settings");
const saveSettings = (payload: Partial<Settings & { osu_client_secret: string }>) =>
	apiClient.post<Settings>("/settings", payload);

export default function SettingsPanel() {
	const client = useQueryClient();
	const { data } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
	const [form, setForm] = useState<Partial<Settings & { osu_client_secret: string }>>({});

	const mutation = useMutation({
		mutationFn: saveSettings,
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ["settings"] });
			client.invalidateQueries({ queryKey: ["index"] });
		},
	});

	const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

	if (!data) return <div className="text-sm text-muted-foreground">Loading...</div>;

	return (
		<div className="h-full flex flex-col p-4">
			{/* Compact Form Layout */}
			<div className="grid grid-cols-2 gap-4 text-sm">
				{/* Column 1 */}
				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-text-secondary text-xs font-medium">Client ID</label>
						<Input
							type="number"
							defaultValue={data.osu_client_id ?? ""}
							onChange={(e) => update("osu_client_id", Number(e.target.value))}
							placeholder="ID"
							className="text-xs"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-text-secondary text-xs font-medium">Client Secret</label>
						<Input
							type="password"
							placeholder={data.osu_client_secret_set ? "••••••••" : "Secret"}
							onChange={(e) => update("osu_client_secret", e.target.value)}
							className="text-xs"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-text-secondary text-xs font-medium">Songs Dir</label>
						<Input
							defaultValue={data.songs_dir}
							onChange={(e) => update("songs_dir", e.target.value)}
							placeholder="/path/to/songs"
							className="text-xs"
						/>
					</div>
				</div>

				{/* Column 2 */}
				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-text-secondary text-xs font-medium">Download URL</label>
						<Input
							className="font-mono text-xs"
							defaultValue={data.download_url_template}
							onChange={(e) => update("download_url_template", e.target.value)}
							placeholder="https://.../d/{set_id}"
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<label className="text-text-secondary text-xs font-medium">Concurrency</label>
							<Input
								type="number"
								min="1"
								max="10"
								defaultValue={data.max_concurrency}
								onChange={(e) => update("max_concurrency", Number(e.target.value))}
								className="text-xs"
							/>
						</div>
						<div className="space-y-1">
							<label className="text-text-secondary text-xs font-medium">Req/min</label>
							<Input
								type="number"
								min="10"
								max="1000"
								step="10"
								defaultValue={data.requests_per_minute}
								onChange={(e) => update("requests_per_minute", Number(e.target.value))}
								className="text-xs"
							/>
						</div>
					</div>

					<div className="pt-2">
						<Button
							className="w-full text-xs py-2"
							onClick={() => mutation.mutate(form)}
							disabled={mutation.isPending}
							isLoading={mutation.isPending}
						>
							Save
						</Button>
					</div>
				</div>
			</div>

			{/* Status Messages */}
			<div className="mt-3 h-4 flex items-center justify-center">
				{mutation.isError && (
					<span className="text-xs text-error">Failed to save</span>
				)}
				{mutation.isSuccess && (
					<span className="text-xs text-success">Settings saved</span>
				)}
			</div>

			{/* Help Link */}
			<div className="mt-auto pt-3 border-t border-border/30">
				<p className="text-xs text-text-muted text-center">
					Get OAuth credentials from{" "}
					<a
						className="text-primary hover:underline"
						href="https://osu.ppy.sh/home/account/edit#new-oauth-application"
						target="_blank"
						rel="noopener noreferrer"
					>
						osu! Account Settings
					</a>
				</p>
			</div>
		</div>
	);
}
