import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const client = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 0, // データはすぐに古くなる
			gcTime: 1000 * 60 * 5, // 5分間キャッシュ (cacheTime -> gcTime)
			refetchOnWindowFocus: false,
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={client}>
		<App />
	</QueryClientProvider>,
);
