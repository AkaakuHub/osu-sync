import { useState } from "react";
import { Search, Download, Settings } from "lucide-react";
import Tabs from "./components/ui/Tabs";
import SearchPage from "./components/pages/SearchPage";
import QueuePage from "./components/pages/QueuePage";
import SettingsPage from "./components/pages/SettingsPage";
import { ScanProgress } from "./components/ScanProgress";

function App() {
	const [ownedOnly, setOwnedOnly] = useState(false);

	const tabs = [
		{
			id: "search",
			label: "Search",
			icon: <Search className="w-4 h-4" />,
			content: <SearchPage ownedOnly={ownedOnly} setOwnedOnly={setOwnedOnly} />,
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
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
			{/* Scan Progress Overlay */}
			<ScanProgress />

			<div className="p-6">
				{/* App Header */}
				<header className="mb-2">
					<h1 className="text-xl font-bold text-slate-900 dark:text-white">osu! sync</h1>
				</header>

				{/* Tab Navigation */}
				<Tabs tabs={tabs} defaultTab="search" />
			</div>
		</div>
	);
}

export default App;
