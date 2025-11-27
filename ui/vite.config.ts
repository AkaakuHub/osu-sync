import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
	plugins: [react(), tailwindcss()],
	// dev は "/"、本番ビルドのみ "/web/" に載せる
	base: mode === "production" ? "/web/" : "/",
	server: {
		host: "0.0.0.0",
		port: 5173,
	},
	build: {
		outDir: "dist",
	},
}));
