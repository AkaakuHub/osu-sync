import { useState } from "react";
import { Search, Download, Settings } from "lucide-react";
import Tabs from "./components/ui/Tabs";
import { CustomToast } from "./components/ui/Toast";
import SearchPage from "./components/pages/SearchPage";
import QueuePage from "./components/pages/QueuePage";
import SettingsPage from "./components/pages/SettingsPage";
import { ScanProgress } from "./components/ScanProgress";
import { QueueNotificationManager } from "./components/QueueNotificationManager";
import GlobalPreviewPlayer from "./components/GlobalPreviewPlayer";

function App() {
	const [ownedOnly, setOwnedOnly] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const tabs = [
		{
			id: "search",
			label: "Search",
			icon: <Search className="w-4 h-4" />,
			content: (
				<SearchPage
					ownedOnly={ownedOnly}
					setOwnedOnly={setOwnedOnly}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
				/>
			),
		},
		{
			id: "queue",
			label: "Queue",
			icon: <Download className="w-4 h-4" />,
			content: <QueuePage />,
		},
		{
			id: "settings",
			label: "Settings",
			icon: <Settings className="w-4 h-4" />,
			content: <SettingsPage />,
		},
	];

	return (
		<div className="min-h-screen w-full overflow-hidden bg-surface">
			{/* Background Managers */}
			<ScanProgress />
			<QueueNotificationManager />

			<div className="h-screen flex flex-col p-4">
				{/* App Header */}
				<header className="mb-3 flex-shrink-0">
					<h1 className="text-xl font-bold text-text">osu! sync</h1>
				</header>

				{/* Tab Navigation */}
				<div className="flex-1 min-h-0">
					<Tabs tabs={tabs} defaultTab="search" />
				</div>
			</div>

			{/* Global Components */}
			<GlobalPreviewPlayer />
			<CustomToast />
		</div>
	);
}

export default App;
