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

// プレイ済みフィルター（サポーター用）
export type PlayedFilter = "any" | "played" | "unplayed";

// ランクフィルター（サポーター用）
export type RankFilter = "XH" | "X" | "SH" | "S" | "A" | "B" | "C" | "D";

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
	nsfw: boolean;

	// サポーター専用フィルター
	played?: PlayedFilter;
	rank?: RankFilter[];
}

// デフォルトフィルター状態
export const DEFAULT_FILTERS: SearchFilters = {
	sortField: "ranked",
	sortOrder: "desc",
	status: "any",
	mode: "null",
	extra: [],
	general: [],
	genre: [],
	language: [],
	nsfw: false,
};

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
