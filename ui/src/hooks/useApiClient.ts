import { BeatmapStatus } from "@/components/search/types";

// API client singleton
class ApiClient {
	private baseUrl: string = "";

	setBaseUrl(url: string) {
		this.baseUrl = url;
	}

	async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		const response = await fetch(url, {
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
			...options,
		});

		if (!response.ok) {
			throw new Error(`API Error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	}

	async get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint);
	}

	async post<T>(endpoint: string, data?: any): Promise<T> {
		return this.request<T>(endpoint, {
			method: "POST",
			body: data ? JSON.stringify(data) : undefined,
		});
	}

	getBaseUrl() {
		return this.baseUrl;
	}
}

// Global API client instance
export const apiClient = new ApiClient();

// Resolve base URL
// - dev: ?api_port=NNNN を受け取り 127.0.0.1:port を決め打ち
// - prod: 同一オリジン
const searchParams =
	typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const apiPort = searchParams?.get("api_port");

const baseUrl =
	apiPort && Number(apiPort)
		? `http://127.0.0.1:${apiPort}/api`
		: typeof window !== "undefined" && window.location
			? `${window.location.origin}/api`
			: "/api";

apiClient.setBaseUrl(baseUrl);

interface SearchResult {
	set_id: number;
	artist: string;
	artist_unicode: string | null;
	title: string;
	title_unicode: string | null;
	creator: string;
	favourite_count: number;
	play_count: number;
	status: BeatmapStatus;
	owned: boolean;
	cover_url?: string | null;
	preview_url?: string | null;
	ranked_date?: string | null;
	bpm?: number | null;
	total_length?: number | null;
	difficulty_count?: number | null;
	difficulties?: { label: string; rating: number; mode: string }[] | null;
}

export interface SearchResponse {
	total: number;
	page: number;
	limit: number;
	results: SearchResult[];
}

export interface QueueEntry {
	set_id: number;
	status: string;
	message: string | null;
	path?: string | null;
	archive_path?: string | null;
	display_name?: string | null;
	artist?: string | null;
	title?: string | null;
	artist_unicode?: string | null;
	title_unicode?: string | null;
	progress?: number | null;
	bytes_downloaded: number;
	total_bytes?: number | null;
	speed_bps?: number | null;
	updated_at?: number | null;
}

export interface QueueStatus {
	queued: QueueEntry[];
	running: QueueEntry[];
	done: QueueEntry[];
}

export interface IndexSummary {
	owned_sets: number;
	with_metadata: number;
	songs_dir_exists: number;
	songs_dir: string;
}

export interface Settings {
	osu_client_id: number | null;
	osu_client_secret_set: boolean;
	songs_dir: string;
	download_url_template: string;
	download_query_options: string;
	max_concurrency: number;
	requests_per_minute: number;
	player_volume: number;
}

export interface ScanStatus {
	id: number;
	status: "idle" | "scanning" | "completed" | "error";
	total_files: number;
	processed_files: number;
	current_file: string | null;
	started_at: number | null;
	completed_at: number | null;
	error_message: string | null;
	updated_at: number | null;
}
