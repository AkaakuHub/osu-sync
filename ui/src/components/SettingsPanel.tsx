import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient, type Settings } from "../hooks/useApiClient";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Badge from "./ui/Badge";

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
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">Settings</h2>

			<div className="space-y-4">
				{/* osu! API */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium">osu! API</h3>

					<div className="space-y-2">
						<label className="block text-sm font-medium">Client ID</label>
						<Input
							type="number"
							defaultValue={data.osu_client_id ?? ""}
							onChange={(e) => update("osu_client_id", Number(e.target.value))}
							placeholder="Enter Client ID"
						/>
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium">Client Secret</label>
						<Input
							type="password"
							placeholder={data.osu_client_secret_set ? "********" : "Enter Client Secret"}
							onChange={(e) => update("osu_client_secret", e.target.value)}
						/>
					</div>

					<div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
						<p>
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

				{/* Local */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium">Local</h3>

					<div className="space-y-2">
						<label className="block text-sm font-medium">Songs Directory</label>
						<Input
							defaultValue={data.songs_dir}
							onChange={(e) => update("songs_dir", e.target.value)}
							placeholder="Path to osu! Songs folder"
						/>
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium">Download URL Template</label>
						<Input
							className="font-mono text-xs"
							defaultValue={data.download_url_template}
							onChange={(e) => update("download_url_template", e.target.value)}
							placeholder="https://.../d/{set_id}"
						/>
					</div>
				</div>

				{/* Performance */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium">Performance</h3>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="block text-sm font-medium">Max Concurrency</label>
							<Input
								type="number"
								min="1"
								max="10"
								defaultValue={data.max_concurrency}
								onChange={(e) => update("max_concurrency", Number(e.target.value))}
							/>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium">Requests/min</label>
							<Input
								type="number"
								min="10"
								max="1000"
								step="10"
								defaultValue={data.requests_per_minute}
								onChange={(e) => update("requests_per_minute", Number(e.target.value))}
							/>
						</div>
					</div>
				</div>

				{/* Save */}
				<div className="space-y-3">
					<Button
						className="w-full"
						onClick={() => mutation.mutate(form)}
						disabled={mutation.isPending}
						isLoading={mutation.isPending}
					>
						Save Settings
					</Button>

					{mutation.isError && (
						<Badge variant="error" className="text-sm p-2">
							Failed to save
						</Badge>
					)}

					{mutation.isSuccess && (
						<Badge variant="success" className="text-sm p-2">
							Settings saved
						</Badge>
					)}
				</div>
			</div>
		</div>
	);
}
