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
		<div className={`w-full h-full flex flex-col ${className}`}>
			{/* Tab Headers */}
			<div className="flex-shrink-0 border-b border-border">
				<nav className="-mb-px flex space-x-8">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${
								activeTab === tab.id
									? "border-primary text-primary"
									: "border-transparent text-text-secondary hover:text-text hover:border-border"
							}`}
						>
							{tab.icon}
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content (kept mounted to preserve scroll/state) */}
			<div className="flex-1 min-h-0 mt-2 relative">
				{tabs.map((tab) => (
					<div
						key={tab.id}
						className={`${activeTab === tab.id ? "block" : "hidden"} h-full w-full`}
					>
						{tab.content}
					</div>
				))}
			</div>
		</div>
	);
};

export default Tabs;
