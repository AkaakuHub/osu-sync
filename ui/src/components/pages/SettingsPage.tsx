import { Settings } from "lucide-react";
import SettingsPanel from "../SettingsPanel";

const SettingsPage: React.FC = () => {
	return (
		<div className="space-y-2">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Settings className="w-4 h-4" />
				<span className="text-lg font-semibold text-text">Settings</span>
			</div>

			{/* Settings Panel */}
			<div className="rounded-lg border border-border bg-surface p-2 shadow-sm">
				<SettingsPanel />
			</div>
		</div>
	);
};

export default SettingsPage;
