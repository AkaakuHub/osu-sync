import { Settings } from "lucide-react";
import SettingsPanel from "../SettingsPanel";

const SettingsPage: React.FC = () => {
	return (
		<div className="space-y-2">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Settings className="w-4 h-4" />
				<span className="text-lg font-semibold text-slate-900 dark:text-white">Settings</span>
			</div>

			{/* Settings Panel */}
			<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
				<SettingsPanel />
			</div>
		</div>
	);
};

export default SettingsPage;
