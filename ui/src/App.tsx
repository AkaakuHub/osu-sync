import { useState } from "react";
import { Search, Download, Settings } from "lucide-react";
import { Toaster } from "react-hot-toast";
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
		<div className="min-h-screen w-full overflow-hidden bg-surface">
			{/* Scan Progress Overlay */}
			<ScanProgress />

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

			{/* Toast Container */}
			<Toaster
				position="top-center"
				toastOptions={{
					duration: 4000,
					style: {
						background: "var(--color-surface)",
						color: "var(--color-text)",
						border: "1px solid var(--color-border)",
						fontSize: "14px",
						borderRadius: "8px",
						boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
					},
					success: {
						iconTheme: {
							primary: "var(--color-success)",
							secondary: "var(--color-surface)",
						},
					},
					error: {
						iconTheme: {
							primary: "var(--color-error)",
							secondary: "var(--color-surface)",
						},
					},
					loading: {
						iconTheme: {
							primary: "var(--color-primary)",
							secondary: "var(--color-surface)",
						},
					},
				}}
			/>
		</div>
	);
}

export default App;
