import { useEffect, useState } from "react";

export type CardLayout = "classic" | "artwork";

type DisplayPreferences = {
	cardLayout: CardLayout;
	showUnicode: boolean;
};

const storageKey = "osu-sync.display";
const defaults: DisplayPreferences = { cardLayout: "classic", showUnicode: false };

function readPreferences(): DisplayPreferences {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
		if (typeof stored !== "object" || stored === null) return defaults;
		const values = stored as Record<string, unknown>;
		return {
			cardLayout: values.cardLayout === "artwork" ? "artwork" : "classic",
			showUnicode: values.showUnicode === true,
		};
	} catch {
		return defaults;
	}
}

export function useDisplayPreferences() {
	const [preferences, setPreferences] = useState(readPreferences);

	useEffect(() => {
		localStorage.setItem(storageKey, JSON.stringify(preferences));
	}, [preferences]);

	return {
		...preferences,
		setCardLayout: (cardLayout: CardLayout) =>
			setPreferences((current) => ({ ...current, cardLayout })),
		setShowUnicode: (showUnicode: boolean) =>
			setPreferences((current) => ({ ...current, showUnicode })),
	};
}
