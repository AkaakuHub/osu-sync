import type React from "react";
import Card, { CardContent } from "./ui/Card";

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
	return (
		<Card className="min-w-0 flex-1">
			<CardContent className="p-4">
				<div className="flex flex-col min-h-0">
					<div className="flex-shrink-0">
						<p className="text-sm font-medium text-text-secondary truncate">
							{label}
						</p>
					</div>
					<div className="flex-1">
						<p className="text-2xl font-bold break-words leading-tight">{value}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default StatCard;
