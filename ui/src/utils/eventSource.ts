import { apiClient } from "../hooks/useApiClient";

let sharedEventSource: EventSource | null = null;

export function getEventSource(): EventSource {
	if (!sharedEventSource) {
		const baseUrl = apiClient.getBaseUrl().replace(/\/$/, "");
		sharedEventSource = new EventSource(`${baseUrl}/events`);
	}
	return sharedEventSource;
}
