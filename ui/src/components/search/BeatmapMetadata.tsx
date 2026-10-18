import { CalendarDays, Heart, Play, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { SearchResponse } from "../../hooks/useApiClient";
import { difficultyColor, formatDate, formatNumber } from "./helpers";

type Item = SearchResponse["results"][number];

const dateFields: Record<Item["status"], "ranked_date" | "last_updated"> = {
	approved: "ranked_date",
	graveyard: "last_updated",
	loved: "ranked_date",
	pending: "last_updated",
	qualified: "ranked_date",
	ranked: "ranked_date",
	wip: "last_updated",
};

function getContrastColor(hexColor: string): string {
	// hexColorからRGB値を抽出
	const r = parseInt(hexColor.slice(1, 3), 16);
	const g = parseInt(hexColor.slice(3, 5), 16);
	const b = parseInt(hexColor.slice(5, 7), 16);

	// 輝度を計算（YIQ formula）
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;
	return yiq >= 148 ? "#000000" : "#FFFFFF";
}

const statusColors = {
	graveyard: "#999999",
	wip: "#FF6666",
	pending: "#FFD700",
	ranked: "#00CC66",
	approved: "#0099FF",
	qualified: "#9966FF",
	loved: "#FF00AA",
};

const modeOrder = ["osu", "taiko", "fruits", "mania"] as const;
const modeLabel: Record<string, string> = {
	osu: "osu!",
	taiko: "taiko",
	fruits: "catch",
	mania: "mania",
};

const modeIcon: Record<string, JSX.Element> = {
	osu: (
		<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M32 0C49.6731 0 64 14.3269 64 32C64 49.6731 49.6731 64 32 64C14.3269 64 0 49.6731 0 32C0 14.3269 14.3269 0 32 0ZM32 6C17.6406 6 6 17.6406 6 32C6 46.3594 17.6406 58 32 58C46.3594 58 58 46.3594 58 32C58 17.6406 46.3594 6 32 6Z"
				fill="white"
			/>
			<circle cx="32" cy="32" r="17" fill="white" />
		</svg>
	),
	taiko: (
		<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M32 0C49.6731 0 64 14.3269 64 32C64 49.6731 49.6731 64 32 64C14.3269 64 0 49.6731 0 32C0 14.3269 14.3269 0 32 0ZM32 6C17.6406 6 6 17.6406 6 32C6 46.3594 17.6406 58 32 58C46.3594 58 58 46.3594 58 32C58 17.6406 46.3594 6 32 6Z"
				fill="white"
			/>
			<path
				d="M32 12C43.0457 12 52 20.9543 52 32C52 43.0457 43.0457 52 32 52C20.9543 52 12 43.0457 12 32C12 20.9543 20.9543 12 32 12ZM32 19C24.8203 19 19 24.8203 19 32C19 39.1797 24.8203 45 32 45C39.1797 45 45 39.1797 45 32C45 24.8203 39.1797 19 32 19Z"
				fill="white"
			/>
			<rect x="29" y="18" width="6" height="30" fill="white" />
		</svg>
	),
	fruits: (
		<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="28" cy="44" r="6" fill="white" />
			<circle cx="28" cy="20" r="6" fill="white" />
			<circle cx="42" cy="32" r="6" fill="white" />
			<path
				d="M32 0C49.6731 0 64 14.3269 64 32C64 49.6731 49.6731 64 32 64C14.3269 64 0 49.6731 0 32C0 14.3269 14.3269 0 32 0ZM32 6C17.6406 6 6 17.6406 6 32C6 46.3594 17.6406 58 32 58C46.3594 58 58 46.3594 58 32C58 17.6406 46.3594 6 32 6Z"
				fill="white"
			/>
		</svg>
	),
	mania: (
		<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="28" y="9" width="8" height="45" rx="4" fill="white" />
			<rect x="41" y="19" width="8" height="26" rx="4" fill="white" />
			<rect x="15" y="19" width="8" height="26" rx="4" fill="white" />
			<path
				d="M32 0C49.6731 0 64 14.3269 64 32C64 49.6731 49.6731 64 32 64C14.3269 64 0 49.6731 0 32C0 14.3269 14.3269 0 32 0ZM32 6C17.6406 6 6 17.6406 6 32C6 46.3594 17.6406 58 32 58C46.3594 58 58 46.3594 58 32C58 17.6406 46.3594 6 32 6Z"
				fill="white"
			/>
		</svg>
	),
};

export function useBeatmapMetadata(item: Item) {
	const [isHovered, setIsHovered] = useState(false);
	const [isHoveringOverPanel, setIsHoveringOverPanel] = useState(false);

	const statusKey = item.status?.toLowerCase() as keyof typeof statusColors;
	const difficulties = useMemo(
		() => (item.difficulties ?? []).slice().sort((a, b) => a.rating - b.rating),
		[item.difficulties],
	);

	const grouped = useMemo(() => {
		const map = new Map<string, typeof difficulties>();
		difficulties.forEach((d) => {
			const key = d.mode || "osu";
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(d);
		});
		return modeOrder
			.filter((m) => map.has(m))
			.map((m) => ({ mode: m, list: map.get(m)!.sort((a, b) => a.rating - b.rating) }));
	}, [difficulties]);

	// ホバー状態の管理 - 難易度ラベルまたはパネルにカーソルがある場合に表示
	const shouldShowHover = isHovered || isHoveringOverPanel;

	const handleDifficultyMouseEnter = () => {
		setIsHovered(true);
	};

	const handleDifficultyMouseLeave = () => {
		// 難易度ラベルから離れた場合も、ホバーパネルにすぐ移動できるように少し待つ
		setTimeout(() => {
			if (!isHoveringOverPanel) {
				setIsHovered(false);
			}
		}, 50);
	};

	const handleHoverPanelMouseEnter = () => {
		setIsHoveringOverPanel(true);
		// パネルに来たら必ず表示状態にする
		setIsHovered(true);
	};

	const handleHoverPanelMouseLeave = () => {
		setIsHoveringOverPanel(false);
		// パネルから完全に離れたら消す
		setIsHovered(false);
	};

	const summary = (
		<>
			<div className={"flex flex-wrap items-center gap-3 text-[11px] text-text"}>
				<div className={"flex items-center gap-1.5"}>
					<Heart className="w-4 h-4 text-osu-pink" />
					<span>{formatNumber(item.favourite_count)}</span>
				</div>
				<div className={"flex items-center gap-1.5"}>
					<Play className="w-4 h-4 text-success" />
					<span>{formatNumber(item.play_count)}</span>
				</div>
				<div className={"flex items-center gap-1.5"}>
					<CalendarDays className="w-4 h-4 text-primary" />
					<span>{formatDate(item[dateFields[item.status]])}</span>
				</div>
			</div>
			<div className={"flex items-center gap-1.5"}>
				<span
					className={
						"px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-sm text-surface-foreground"
					}
					style={{ backgroundColor: statusColors[statusKey] }}
				>
					{item.status?.toUpperCase()}
				</span>
				{grouped.length > 0 && (
					<div
						className="flex flex-nowrap items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide"
						style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
						onMouseEnter={handleDifficultyMouseEnter}
						onMouseLeave={handleDifficultyMouseLeave}
					>
						{grouped.map(({ mode, list }) => (
							<div key={mode} className="flex items-center gap-1 flex-shrink-0">
								<span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-text-secondary">
									<span className="w-4 h-4 text-text scale-25 -translate-1.5">
										{modeIcon[mode]}
									</span>
									<span className="sr-only">{modeLabel[mode] ?? mode}</span>
								</span>
								<div className="flex gap-1">
									{list.map((d, idx) => (
										<div
											key={`${mode}-${idx}`}
											className="h-[15px] w-[11px] rounded-full flex-shrink-0 relative"
											title={`${modeLabel[mode] ?? mode}: ${d.label} - ★${d.rating.toFixed(2)}`}
										>
											<div
												className="absolute inset-0 rounded-full"
												style={{
													background: "none",
													borderColor: difficultyColor(d.rating),
													borderWidth: "2px",
												}}
											/>
											<div
												className="absolute inset-[4px] rounded-full"
												style={{
													backgroundColor: difficultyColor(d.rating),
												}}
											/>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
	const panel = (
		<>
			{/* カード外側の下に配置されるコンパクトな難易度リスト */}
			{grouped.length > 0 && (
				<div
					className={`absolute left-0 right-0 z-20 mt-[-14px] ${!shouldShowHover ? "pointer-events-none" : ""}`}
					style={{
						maxHeight: shouldShowHover ? "150px" : "0", // 5行分の高さに固定
						opacity: shouldShowHover ? 1 : 0,
						transition: "all 0.3s ease-out",
					}}
					onMouseEnter={handleHoverPanelMouseEnter}
					onMouseLeave={handleHoverPanelMouseLeave}
				>
					<div className="bg-surface/65 rounded-lg border border-border shadow-2xl p-2">
						<div className="space-y-2 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-surface/50">
							{grouped.map(({ mode, list }) => (
								<div key={mode} className="space-y-2">
									<div className="text-[11px] font-semibold uppercase text-text-secondary flex items-center gap-2">
										<span className="inline-flex items-center gap-1 mb-[1px]">
											<span className="w-4 h-4 text-text scale-25 -translate-1.5">
												{modeIcon[mode]}
											</span>
											<span className="sr-only">{modeLabel[mode] ?? mode}</span>
										</span>
										<span className="text-[10px] text-text-muted flex items-center">
											<X className="w-3 h-3 inline-block mr-1 mb-[1px]" />
											<span>{list.length}</span>
										</span>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
										{list.map((d, idx) => {
											const bgColor = difficultyColor(d.rating);
											const textColor = getContrastColor(bgColor);
											return (
												<div
													key={`${mode}-${idx}`}
													className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold min-w-0 hover:bg-surface-variant/50 transition-colors"
													style={{
														backgroundColor: bgColor,
														color: textColor,
													}}
													title={`${modeLabel[mode] ?? mode}: ${d.label} - ★${d.rating.toFixed(2)}`}
												>
													<div
														className="w-4 h-4 bg-surface-variant/50 rounded-full flex items-center justify-center flex-shrink-0"
														style={{ backgroundColor: `${textColor}30` }}
													>
														<span className="text-[9px] font-bold" style={{ color: textColor }}>
															{idx + 1}
														</span>
													</div>
													<span className="flex items-center gap-1 min-w-0">
														<span className="text-[10px] opacity-90">★</span>
														<span className="font-bold">{d.rating.toFixed(2)}</span>
														<span className="opacity-80 truncate max-w-[240px]">{d.label}</span>
													</span>
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</>
	);
	return { summary, panel };
}
