import type React from "react";
import { useState } from "react";

type TabItem = {
	id: string;
	label: string;
	content: React.ReactNode;
	icon?: React.ReactNode;
};

type Props = {
	tabs: TabItem[];
	defaultTab?: string;
	className?: string;
};

const Tabs: React.FC<Props> = ({ tabs, defaultTab, className = "" }) => {
	const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

	return (
		<div className={`w-full ${className}`}>
			{/* Tab Headers */}
			<div className="border-b border-slate-200 dark:border-slate-700">
				<nav className="-mb-px flex space-x-8">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
								activeTab === tab.id
									? "border-blue-500 text-blue-600 dark:text-blue-400"
									: "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
							}`}
						>
							{tab.icon}
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			<div className="mt-2">{tabs.find((tab) => tab.id === activeTab)?.content}</div>
		</div>
	);
};

export default Tabs;
