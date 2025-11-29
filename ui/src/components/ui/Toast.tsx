import { X } from "lucide-react";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import { useState } from "react";

/**
 * カスタムトーストコンポーネント
 * 閉じるボタン、プログレスバー、ホバー一時停止機能付き
 */
export function CustomToast() {
	const [hoveredToastId, setHoveredToastId] = useState<string | null>(null);

	return (
		<Toaster position="top-center">
			{(t) => (
				<div
					onMouseEnter={() => setHoveredToastId(t.id)}
					onMouseLeave={() => setHoveredToastId(null)}
					style={{
						position: "relative",
						overflow: "hidden",
					}}
				>
					<ToastBar
						toast={t}
						style={{
							...t.style,
							background: "var(--color-surface)",
							color: "var(--color-text)",
							border: "1px solid var(--color-border)",
							fontSize: "14px",
							borderRadius: "8px",
							boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
							padding: "8px 10px 10px 10px", // プログレスバーのために下のpaddingを増やす
							display: "flex",
							alignItems: "center",
							gap: "8px",
							minWidth: "300px",
							position: "relative",
						}}
					>
						{({ icon, message }) => (
							<>
								{icon}
								<div style={{ flex: 1, whiteSpace: "pre-line" }}>{message}</div>
								{/* 閉じるボタン - ローディング時は表示しない */}
								{t.type !== "loading" && (
									<button
										onClick={() => toast.dismiss(t.id)}
										style={{
											background: "none",
											border: "none",
											color: "var(--color-text)",
											cursor: "pointer",
											padding: "2px",
											borderRadius: "4px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											opacity: 0.7,
											transition: "opacity 0.2s",
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.opacity = "1";
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.opacity = "0.7";
										}}
										aria-label="閉じる"
									>
										<X size={16} />
									</button>
								)}
								{/* プログレスバー - ToastBar内に配置 */}
								{t.type !== "loading" && (
									<div
										style={{
											position: "absolute",
											bottom: 0,
											left: 0,
											height: "2px",
											background:
												t.type === "error"
													? "var(--color-error)"
													: t.type === "success"
														? "var(--color-success)"
														: "var(--color-primary)",
											width: "100%",
											animationName: t.visible ? "shrink" : "none",
											animationDuration: `${t.duration || 4000}ms`,
											animationTimingFunction: "linear",
											animationFillMode: "forwards",
											animationPlayState: hoveredToastId === t.id ? "paused" : "running",
											borderBottomLeftRadius: "8px",
											borderBottomRightRadius: "8px",
											zIndex: 1,
										}}
									/>
								)}
							</>
						)}
					</ToastBar>
				</div>
			)}
		</Toaster>
	);
}
