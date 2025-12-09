import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiClient, type Settings } from "../hooks/useApiClient";
import Button from "./ui/Button";
import Input from "./ui/Input";
import toast from "react-hot-toast";

const fetchSettings = () => apiClient.get<Settings>("/settings");
const saveSettings = (payload: Partial<Settings & { osu_client_secret: string }>) =>
	apiClient.post<Settings>("/settings", payload);
type UpdateStatus = {
	update_available: boolean;
	latest_version: string;
	current_version: string;
	installer_url?: string;
	release_name?: string;
};

const fetchUpdateStatus = () => apiClient.get<UpdateStatus>("/update/status");

export default function SettingsPanel() {
	const client = useQueryClient();
	const { data } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
	const { data: updateInfo, refetch: refetchUpdate } = useQuery<UpdateStatus>({
		queryKey: ["update-status"],
		queryFn: fetchUpdateStatus,
		refetchOnWindowFocus: false,
	});
	const [form, setForm] = useState<Partial<Settings & { osu_client_secret: string }>>({});
	const [updating, setUpdating] = useState(false);

	const mutation = useMutation({
		mutationFn: saveSettings,
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ["settings"] });
			client.invalidateQueries({ queryKey: ["index"] });
		},
	});

	const startUpdate = async () => {
		if (updating) return;
		setUpdating(true);
		try {
			const res = await apiClient.post<{ status: string }>("/update/start", {});
			if (res.status === "started") {
				toast.success("Downloading updater…", { id: "update-started" });
			} else {
				toast("Already up to date.");
			}
		} catch (e: any) {
			toast.error(e?.response?.data?.detail || e.message || "Update failed");
		} finally {
			refetchUpdate();
			setUpdating(false);
		}
	};

	const currentVersion = updateInfo?.current_version ?? "-";
	const renderUpdateRow = () => {
		if (!updateInfo) {
			return (
				<div className="flex items-center justify-between gap-3">
					<div className="flex flex-col">
						<span className="text-sm font-medium text-text">Updates</span>
						<span className="text-xs text-text-secondary">Checking…</span>
					</div>
					<Button variant="ghost" className="text-sm px-3 py-1.5" disabled>
						…
					</Button>
				</div>
			);
		}

		if (updateInfo.update_available) {
			return (
				<div className="flex items-center justify-between gap-3">
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-semibold text-text">Update available</span>
						<span className="text-xs text-text-secondary">
							Latest v{updateInfo.latest_version} · Current v{currentVersion}
						</span>
					</div>
					<Button
						onClick={startUpdate}
						variant="primary"
						className="text-sm px-3 py-1.5"
						disabled={updating}
						isLoading={updating}
					>
						{updating ? "Downloading…" : "Download & Install"}
					</Button>
				</div>
			);
		}

		return (
			<div className="flex items-center justify-between gap-3">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-semibold text-text">Up to date</span>
					<span className="text-xs text-text-secondary">Current v{currentVersion}</span>
				</div>
				<Button
					onClick={() =>
						refetchUpdate().then((res) => {
							const info = res.data as UpdateStatus | undefined;
							if (info && !info.update_available) {
								toast("Already up to date.");
							}
						})
					}
					variant="secondary"
					className="text-sm px-3 py-1.5"
					disabled={updating}
					isLoading={updating}
				>
					Check again
				</Button>
			</div>
		);
	};

	const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

	const hasUnsavedChanges = useMemo(() => {
		if (!data) return false;

		return (Object.keys(form) as Array<keyof typeof form>).some((key) => {
			const value = form[key];
			// Secret は入力があるだけで変更とみなす
			if (key === "osu_client_secret") return Boolean(value);

			const original = data[key as keyof Settings];
			return value !== undefined && value !== original;
		});
	}, [form, data]);

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

					<div className="space-y-1">
						<label className="text-text-secondary text-xs font-medium">Player Volume</label>
						<Input
							type="range"
							min="0"
							max="100"
							defaultValue={Math.round(data.player_volume * 100)}
							onChange={(e) => update("player_volume", Number(e.target.value) / 100)}
							className="text-xs w-full"
						/>
						<div className="text-center text-xs text-text-muted">
							{Math.round(data.player_volume * 100)}%
						</div>
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
				</div>
			</div>

			{/* Save Area */}
			<div className="mt-auto flex flex-col items-center gap-2 pt-4">
				<Button
					className={`w-40 text-sm py-2 ${hasUnsavedChanges && !mutation.isPending ? "soft-glow" : ""}`}
					onClick={() => mutation.mutate(form)}
					disabled={mutation.isPending}
					isLoading={mutation.isPending}
				>
					Save
				</Button>
				<div className="w-full max-w-md pt-4">
					<div className="rounded-lg border border-border bg-surface/80 px-4 py-3 shadow-sm flex flex-col gap-1">
						{renderUpdateRow()}
					</div>
				</div>
				<div className="h-5 flex items-center text-xs text-center">
					{hasUnsavedChanges && !mutation.isPending && (
						<span className="text-warning">Unsaved changes</span>
					)}
					{mutation.isError && <span className="text-error">Save failed</span>}
					{mutation.isSuccess && !hasUnsavedChanges && <span className="text-success">Saved</span>}
				</div>
			</div>

			{/* Help Link */}
			<div className="mt-4 pt-3 border-t border-border/30">
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
