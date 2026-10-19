import { useQuery } from "@tanstack/react-query";
import { Download, Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PreviewProvider from "./components/PreviewProvider";
import QueuePage from "./components/pages/QueuePage";
import SearchTabsPage from "./components/pages/SearchTabsPage";
import SettingsPage from "./components/pages/SettingsPage";
import { QueueNotificationManager } from "./components/QueueNotificationManager";
import { ScanProgress } from "./components/ScanProgress";
import Badge from "./components/ui/Badge";
import Tabs from "./components/ui/Tabs";
import { CustomToast } from "./components/ui/Toast";
import { apiClient, type QueueStatus, type UpdateStatus } from "./hooks/useApiClient";
import { useDisplayPreferences } from "./hooks/useDisplayPreferences";

function App() {
	const [notOwnedOnly, setNotOwnedOnly] = useState(false);
	const [activeTab, setActiveTab] = useState("search");
	const { showUnicode, setShowUnicode, cardLayout, setCardLayout } = useDisplayPreferences();
	const { data: queue } = useQuery<QueueStatus>({
		queryKey: ["queue"],
		queryFn: () => apiClient.get<QueueStatus>("/queue"),
		refetchOnWindowFocus: false,
	});
	const remainingCount = (queue?.queued?.length ?? 0) + (queue?.running?.length ?? 0);

	const { data: updateInfo } = useQuery<UpdateStatus>({
		queryKey: ["update-status"],
		queryFn: () => apiClient.get<UpdateStatus>("/update/status"),
		staleTime: 3_600_000,
		refetchOnWindowFocus: false,
		retry: 0,
	});

	useEffect(() => {
		if (!updateInfo) return;
		if (updateInfo.update_available) {
			toast(
				<div className="flex flex-col gap-1">
					<span className="font-semibold">Update available: v{updateInfo.latest_version}</span>
					<button
						type="button"
						className="w-fit text-xs text-primary underline"
						onClick={() => {
							setActiveTab("settings");
							toast.dismiss("update-available");
						}}
					>
						Open update settings
					</button>
				</div>,
				{
					id: "update-available",
					duration: 8000,
				},
			);
		} else if (updateInfo.rate_limited) {
			toast.error("Update check rate limited. Try again later or set GITHUB_TOKEN.");
		}
	}, [updateInfo]);

	const tabs = [
		{
			id: "search",
			label: "Search",
			icon: <Search className="w-4 h-4" />,
			content: (
				<SearchTabsPage
					isActive={activeTab === "search"}
					notOwnedOnly={notOwnedOnly}
					setNotOwnedOnly={setNotOwnedOnly}
					showUnicode={showUnicode}
					setShowUnicode={setShowUnicode}
					cardLayout={cardLayout}
					setCardLayout={setCardLayout}
				/>
			),
		},
		{
			id: "queue",
			label: (
				<span className="relative inline-flex items-center">
					<span>Queue</span>
					{remainingCount > 0 && (
						<span className="absolute -top-2 -right-4">
							<Badge
								variant="default"
								className="h-4 w-4 min-w-0 rounded-full bg-primary text-primary-foreground text-[10px] leading-none ring-2 ring-surface/70 p-0 inline-flex items-center justify-center"
							>
								{remainingCount}
							</Badge>
						</span>
					)}
				</span>
			),
			icon: <Download className="w-4 h-4" />,
			content: <QueuePage showUnicode={showUnicode} setShowUnicode={setShowUnicode} />,
		},
		{
			id: "settings",
			label: "Settings",
			icon: <Settings className="w-4 h-4" />,
			content: <SettingsPage />,
		},
	];

	return (
		<PreviewProvider>
			<div className="min-h-screen w-full overflow-hidden bg-surface">
				{/* Background Managers */}
				<ScanProgress />
				<QueueNotificationManager showUnicode={showUnicode} />

				<div className="h-screen flex flex-col p-2">
					{/* Tab Navigation */}
					<div className="flex-1 min-h-0">
						<Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
					</div>
				</div>

				{/* Global Components */}
				<CustomToast />
			</div>
		</PreviewProvider>
	);
}

export default App;
