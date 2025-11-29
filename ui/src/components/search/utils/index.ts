// 検索フィルター関連のユーティリティ関数
import {
	SearchFilters,
	SearchParams,
	AdvancedSearchQuery,
	SortField,
	DEFAULT_FILTERS,
} from "../types";

// フィルター状態をAPIパラメータに変換
export function filtersToParams(filters: Partial<SearchFilters>): SearchParams {
	const params: SearchParams = {};

	// ソート
	if (filters.sortField && filters.sortOrder) {
		params.sort = `${filters.sortField}_${filters.sortOrder}`;
	}

	// 基本フィルター
	if (filters.status && filters.status !== "any") {
		params.s = filters.status;
	}

	if (filters.mode && filters.mode !== "null") {
		params.m = filters.mode;
	}

	// 配列フィルター
	if (filters.extra && filters.extra.length > 0) {
		params.e = filters.extra.join(".");
	}

	if (filters.general && filters.general.length > 0) {
		params.c = filters.general.join(".");
	}

	if (filters.genre && filters.genre.length > 0) {
		params.g = filters.genre.join(",");
	}

	if (filters.language && filters.language.length > 0) {
		params.l = filters.language.join(",");
	}

	// NSFWフィルター
	if (filters.nsfw !== undefined) {
		params.nsfw = filters.nsfw;
	}

	// サポーター専用フィルター
	if (filters.played && filters.played !== "any") {
		params.played = filters.played;
	}

	if (filters.rank && filters.rank.length > 0) {
		params.rank = filters.rank.join(",");
	}

	return params;
}

// 高度な検索クエリを文字列に変換
export function advancedQueryToString(query: AdvancedSearchQuery): string {
	const parts: string[] = [];

	// 数値フィルター
	const numberFields = [
		{ key: "stars", field: query.stars },
		{ key: "ar", field: query.ar },
		{ key: "dr", field: query.dr },
		{ key: "cs", field: query.cs },
		{ key: "od", field: query.od },
		{ key: "bpm", field: query.bpm },
		{ key: "length", field: query.length },
		{ key: "circles", field: query.circles },
		{ key: "sliders", field: query.sliders },
		{ key: "keys", field: query.keys },
		{ key: "divisor", field: query.divisor },
		{ key: "favourites", field: query.favourites },
	] as const;

	numberFields.forEach(({ key, field }) => {
		if (field) {
			parts.push(`${key}${field.operator}${field.value}`);
		}
	});

	// 特殊フィールド
	if (query.featured_artist) {
		parts.push(`featured_artist=${query.featured_artist}`);
	}

	// テキストフィールド
	const textFields = [
		{ key: "status", field: query.status },
		{ key: "creator", field: query.creator },
		{ key: "difficulty", field: query.difficulty },
		{ key: "artist", field: query.artist },
		{ key: "source", field: query.source },
		{ key: "tag", field: query.tag },
		{ key: "title", field: query.title },
	] as const;

	textFields.forEach(({ key, field }) => {
		if (field && field !== "") {
			parts.push(`${key}=${field}`);
		}
	});

	// 日付フィールド
	const dateFields = [
		{ key: "created", field: query.created },
		{ key: "ranked", field: query.ranked },
		{ key: "updated", field: query.updated },
	] as const;

	dateFields.forEach(({ key, field }) => {
		if (field) {
			parts.push(`${key}${field.operator}${field.value}`);
		}
	});

	return parts.join(" ");
}

// デフォルトのソートフィールドを取得
export function getDefaultSortField(filters: Partial<SearchFilters>): SortField {
	// 検索クエリがある場合は関連性優先
	if (filters.advancedQuery && Object.keys(filters.advancedQuery).length > 0) {
		return "relevance";
	}

	// ステータスに応じたデフォルトソート
	switch (filters.status) {
		case "qualified":
			return "ranked";
		case "pending":
		case "wip":
		case "graveyard":
		case "mine":
			return "updated";
		default:
			return "ranked";
	}
}

// フィルターが有効かチェック
export function hasActiveFilters(filters: Partial<SearchFilters>): boolean {
	const defaultFilters = DEFAULT_FILTERS;

	// 現在のフィルターを文字列化して比較
	const currentJson = JSON.stringify(filters);
	const defaultJson = JSON.stringify(defaultFilters);

	return currentJson !== defaultJson;
}

// フィルターをリセット
export function resetFilters(): SearchFilters {
	return { ...DEFAULT_FILTERS };
}

// 特定のフィルタータイプをリセット
export function resetFilterType<T extends keyof SearchFilters>(
	filters: SearchFilters,
	filterType: T,
): SearchFilters {
	const defaultFilter = DEFAULT_FILTERS[filterType];

	return {
		...filters,
		[filterType]: defaultFilter,
	};
}

// 配列フィルターのアイテムを切り替え
export function toggleArrayFilter<T>(current: T[], item: T): T[] {
	const index = current.indexOf(item);

	if (index === -1) {
		// 追加
		return [...current, item];
	} else {
		// 削除
		return current.filter((_, i) => i !== index);
	}
}

// 高度な検索クエリをパース
export function parseAdvancedQuery(queryString: string): AdvancedSearchQuery {
	const query: AdvancedSearchQuery = {};

	// 正規表現で各要素を抽出
	const regex = /\b(?<key>\w+)(?<op>(:|=|(>|<)(:|=)?))(?<value>("{1,2})(?:\\\"|.)*?\7|\S*)/gi;

	const matches = [...queryString.matchAll(regex)];

	matches.forEach((match) => {
		const { key, op, value } = match.groups || {};

		if (!key || !op || !value) return;

		const operator = op.replace(":", "=") as any;

		switch (key.toLowerCase()) {
			case "star":
			case "stars":
				query.stars = { operator, value: parseFloat(value) };
				break;
			case "ar":
				query.ar = { operator, value: parseFloat(value) };
				break;
			case "dr":
			case "hp":
				query.dr = { operator, value: parseFloat(value) };
				break;
			case "cs":
				query.cs = { operator, value: parseFloat(value) };
				break;
			case "od":
				query.od = { operator, value: parseFloat(value) };
				break;
			case "bpm":
				query.bpm = { operator, value: parseFloat(value) };
				break;
			case "length":
				query.length = { operator, value: parseFloat(value) };
				break;
			case "circles":
				query.circles = { operator, value: parseInt(value) };
				break;
			case "sliders":
				query.sliders = { operator, value: parseInt(value) };
				break;
			case "key":
			case "keys":
				query.keys = { operator, value: parseInt(value) };
				break;
			case "divisor":
				query.divisor = { operator, value: parseInt(value) };
				break;
			case "favourites":
				query.favourites = { operator, value: parseInt(value) };
				break;
			case "featured_artist":
				query.featured_artist = parseInt(value);
				break;
			case "status":
				query.status = value as any;
				break;
			case "creator":
				query.creator = value;
				break;
			case "difficulty":
				query.difficulty = value;
				break;
			case "artist":
				query.artist = value;
				break;
			case "source":
				query.source = value;
				break;
			case "tag":
				query.tag = value;
				break;
			case "title":
				query.title = value;
				break;
			case "created":
			case "ranked":
			case "updated":
				// 日付フィールド
				const dateField = key as "created" | "ranked" | "updated";
				query[dateField] = { operator, value };
				break;
		}
	});

	return query;
}

// サポーター機能が必要かチェック
export function needsSupporter(filters: Partial<SearchFilters>): boolean {
	return (
		!!(filters.played && filters.played !== "any") || !!(filters.rank && filters.rank.length > 0)
	);
}
