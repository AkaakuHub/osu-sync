import { useState } from "react";
import { Search, Download, Settings } from "lucide-react";
import Tabs from "./components/ui/Tabs";
import SearchPage from "./components/pages/SearchPage";
import QueuePage from "./components/pages/QueuePage";
import SettingsPage from "./components/pages/SettingsPage";
import { ScanProgress } from "./components/ScanProgress";

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
		<div className="h-[720px] w-full overflow-hidden bg-surface">
			{/* Scan Progress Overlay */}
			<ScanProgress />

			<div className="h-full flex flex-col p-6">
				{/* App Header */}
				<header className="mb-2 flex-shrink-0">
					<h1 className="text-xl font-bold text-text">osu! sync</h1>
				</header>

				{/* Tab Navigation */}
				<div className="flex-1 min-h-0">
					<Tabs tabs={tabs} defaultTab="search" />
				</div>
			</div>
		</div>
	);
}

export default App;
