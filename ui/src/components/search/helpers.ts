import type { QueueStatus } from "../../hooks/useApiClient";

export type QueueDerivedState = {
	queued: Set<QueueStatus["queued"][number]>;
	runningEntries: Map<number, QueueStatus["running"][number]>;
	completed: Set<number>;
	skipped: Set<number>;
	failed: Set<number>;
	doneEntries: Map<number, QueueStatus["done"][number]>;
};

export type ActionState = {
	label: string;
	disabled: boolean;
	variant: "primary" | "secondary" | "danger";
};

export const formatNumber = (value?: number | null) => {
	if (value === null || value === undefined) return "-";
	return value.toLocaleString("en-US");
};

export const formatDate = (value?: string | null) => {
	if (!value) return "-";
	try {
		return new Date(value).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch (e) {
		return value;
	}
};

export const buildBackground = (cover?: string | null) => {
	if (!cover) {
		return {
			background: "linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 50%, #1a1a1a 100%)",
		};
	}
	return {
		background: `linear-gradient(120deg, rgba(12,14,26,0.94) 0%, rgba(21,25,38,0.9) 60%, rgba(18,16,32,0.9) 100%), url(${cover})`,
		backgroundSize: "cover",
		backgroundPosition: "center",
		backgroundBlendMode: "overlay",
	};
};

// osu!公式難易度カラーロジック
export const difficultyColor = (rating: string | number) => {
	const stars = typeof rating === "number" ? rating : parseFloat(rating || "0");

	// 公式ロジックそのまま
	if (stars == null || isNaN(stars)) {
		return "#AAAAAA";
	}
	if (stars < 0.1) {
		return "#AAAAAA";
	}
	if (stars >= 9.0) {
		return "#000000";
	}

	const domain = [0.1, 1.25, 2.0, 2.5, 3.3, 4.2, 4.9, 5.8, 6.7, 7.7, 9.0];
	const colors = [
		"#4290FB",
		"#4FC0FF",
		"#4FFFD5",
		"#7CFF4F",
		"#F6F05C",
		"#FF8068",
		"#FF4E6F",
		"#C645B8",
		"#6563DE",
		"#18158E",
		"#000000",
	];

	const gamma = 2.2;

	const hexToRgb = (hex: string) => {
		const clean = hex.replace("#", "");
		const num = parseInt(clean, 16);
		return {
			r: (num >> 16) & 0xff,
			g: (num >> 8) & 0xff,
			b: num & 0xff,
		};
	};

	const rgbToHex = (r: number, g: number, b: number) => {
		const toHex = (v: number) => {
			const s = v.toString(16);
			return s.length === 1 ? "0" + s : s;
		};
		return "#" + toHex(r) + toHex(g) + toHex(b);
	};

	const gammaMixChannel = (c1: number, c2: number, t: number) => {
		// d3.interpolateRgb.gamma(γ) のイメージ
		const a = Math.pow(c1 / 255, gamma);
		const b = Math.pow(c2 / 255, gamma);
		const mixed = a + (b - a) * t;
		return Math.round(Math.pow(mixed, 1 / gamma) * 255);
	};

	const interpolateColor = (c1Hex: string, c2Hex: string, t: number) => {
		const c1 = hexToRgb(c1Hex);
		const c2 = hexToRgb(c2Hex);

		const r = gammaMixChannel(c1.r, c2.r, t);
		const g = gammaMixChannel(c1.g, c2.g, t);
		const b = gammaMixChannel(c1.b, c2.b, t);

		return rgbToHex(r, g, b);
	};

	// 対応する区間を探す
	let i = 0;
	while (i < domain.length - 1 && !(stars >= domain[i] && stars <= domain[i + 1])) {
		i++;
	}

	const x0 = domain[i];
	const x1 = domain[i + 1];
	const t = (stars - x0) / (x1 - x0);

	return interpolateColor(colors[i], colors[i + 1], t);
};
