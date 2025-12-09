import { Settings } from "lucide-react";
import SettingsPanel from "../SettingsPanel";

const SettingsPage: React.FC = () => {
	return (
		<div className="h-full flex flex-col bg-surface">
			{/* Compact Header */}
			<div className="bg-surface-variant/90 backdrop-blur-md border border-border rounded-lg shadow-lg px-4 py-3 m-4">
				<div className="flex items-center gap-3 text-sm">
					<Settings className="w-4 h-4 text-text" />
					<span className="font-medium text-text">Settings</span>
				</div>
			</div>

			{/* Settings Panel */}
			<div className="flex-1 min-h-0 px-2 pb-5 overflow-hidden">
				<div className="h-full rounded-xl border border-border bg-surface p-2 shadow-sm">
					<SettingsPanel />
				</div>
			</div>
		</div>
	);
};

export default SettingsPage;
