// 検索フィルター関連の型定義

// ビートマップステータス
export type BeatmapStatus =
	| "graveyard"
	| "wip"
	| "pending"
	| "ranked"
	| "approved"
	| "qualified"
	| "loved";

// ソートフィールド
export type SortField =
	| "artist"
	| "creator"
	| "difficulty"
	| "favourites"
	| "nominations"
	| "plays"
	| "ranked"
	| "rating"
	| "relevance"
	| "title"
	| "updated";

// ソート順序
export type SortOrder = "asc" | "desc";

// ステータスフィルター
export type StatusFilter =
	| "any"
	| "leaderboard"
	| "ranked"
	| "qualified"
	| "loved"
	| "favourites"
	| "pending"
	| "wip"
	| "graveyard"
	| "mine";

// ゲームモード
export type GameMode = "null" | "0" | "1" | "2" | "3";

// エクストラフィルター
export type ExtraFilter = "video" | "storyboard";

// 一般フィルター
export type GeneralFilter =
	| "recommended"
	| "converts"
	| "follows"
	| "spotlights"
	| "featured_artists";

// NSFWフィルター
type NsfwFilter = boolean;

// プレイ済みフィルター（サポーター用）
export type PlayedFilter = "any" | "played" | "unplayed";

// ランクフィルター（サポーター用）
export type RankFilter = "XH" | "X" | "SH" | "S" | "A" | "B" | "C" | "D";

// ジャンル
export interface Genre {
	id: string;
	name: string;
}

// 言語
export interface Language {
	id: string;
	name: string;
}

// 高度な検索クエリ
export interface AdvancedSearchQuery {
	stars?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	ar?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	dr?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	cs?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	od?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	bpm?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	length?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number; // 秒単位
	};
	circles?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	sliders?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	keys?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	divisor?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	favourites?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: number;
	};
	featured_artist?: number;
	status?: StatusFilter;
	creator?: string;
	difficulty?: string;
	artist?: string;
	source?: string;
	tag?: string;
	title?: string;
	created?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: string; // YYYY-MM-DD形式
	};
	ranked?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: string; // YYYY-MM-DD形式
	};
	updated?: {
		operator: ">" | ">=" | "<" | "<=" | "=";
		value: string; // YYYY-MM-DD形式
	};
}

// フィルター状態全体
export interface SearchFilters {
	// ソート
	sortField: SortField;
	sortOrder: SortOrder;

	// 基本フィルター
	status: StatusFilter;
	mode: GameMode;

	// 配列フィルター
	extra: ExtraFilter[];
	general: GeneralFilter[];
	genre: string[]; // genre IDs
	language: string[]; // language IDs

	// ブール値フィルター
	nsfw: NsfwFilter;

	// サポーター専用フィルター
	played?: PlayedFilter;
	rank?: RankFilter[];

	// 高度な検索
	advancedQuery?: AdvancedSearchQuery;
}

// デフォルトフィルター状態
export const DEFAULT_FILTERS: SearchFilters = {
	sortField: "relevance",
	sortOrder: "desc",
	status: "any",
	mode: "null",
	extra: [],
	general: [],
	genre: [],
	language: [],
	nsfw: false,
};

// 検索パラメータ（API用）
export interface SearchParams {
	q?: string;
	page?: number;
	limit?: number;
	s?: StatusFilter;
	m?: GameMode;
	e?: string; // extra filters (dot-separated)
	c?: string; // general filters (dot-separated)
	g?: string; // genre (comma-separated)
	l?: string; // language (comma-separated)
	nsfw?: boolean;
	sort?: string; // "field_order" format
	played?: PlayedFilter;
	rank?: string; // comma-separated
	// 高度な検索はクエリ文字列に直接含める
}

// ジャンルと言語の定義
export const GENRES = {
	any: "Any",
	unspecified: "Unspecified",
	"video-game": "Video Game",
	anime: "Anime",
	rock: "Rock",
	pop: "Pop",
	other: "Other",
	novelty: "Novelty",
	"hip-hop": "Hip Hop",
	electronic: "Electronic",
	metal: "Metal",
	classical: "Classical",
	folk: "Folk",
	jazz: "Jazz",
} as const;

export const LANGUAGES = {
	any: "Any",
	english: "English",
	chinese: "Chinese",
	french: "French",
	german: "German",
	italian: "Italian",
	japanese: "Japanese",
	korean: "Korean",
	spanish: "Spanish",
	swedish: "Swedish",
	russian: "Russian",
	polish: "Polish",
	instrumental: "Instrumental",
	other: "Other",
	unspecified: "Unspecified",
} as const;

// 利用可能なオプション定数
export const AVAILABLE_STATUSES: StatusFilter[] = [
	"any",
	"leaderboard",
	"ranked",
	"qualified",
	"loved",
	"favourites",
	"pending",
	"wip",
	"graveyard",
	"mine",
];

export const AVAILABLE_EXTRAS: ExtraFilter[] = ["video", "storyboard"];

export const AVAILABLE_GENERAL: GeneralFilter[] = [
	"recommended",
	"converts",
	"follows",
	"spotlights",
	"featured_artists",
];

export const AVAILABLE_RANKS: RankFilter[] = ["XH", "X", "SH", "S", "A", "B", "C", "D"];

export const AVAILABLE_SORT_FIELDS: SortField[] = [
	"artist",
	"creator",
	"difficulty",
	"favourites",
	"nominations",
	"plays",
	"ranked",
	"rating",
	"relevance",
	"title",
	"updated",
];

// ゲームモードのマッピング
export const GAME_MODES = {
	null: "All",
	"0": "osu!",
	"1": "osu!taiko",
	"2": "osu!catch",
	"3": "osu!mania",
} as const;

// ソートフィールドの表示名
export const SORT_FIELD_LABELS = {
	artist: "Artist",
	creator: "Creator",
	difficulty: "Difficulty",
	favourites: "Favourites",
	nominations: "Nominations",
	plays: "Plays",
	ranked: "Ranked",
	rating: "Rating",
	relevance: "Relevance",
	title: "Title",
	updated: "Updated",
} as const;

// ステータスの表示名
export const STATUS_LABELS = {
	any: "Any",
	leaderboard: "Has Leaderboard",
	ranked: "Ranked",
	qualified: "Qualified",
	loved: "Loved",
	favourites: "Favourites",
	pending: "Pending",
	wip: "WIP",
	graveyard: "Graveyard",
	mine: "My Maps",
} as const;
