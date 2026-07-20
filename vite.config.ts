import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	server: {
		host: true,
		port: 3000,
		open: "/launcher.html",
	},
	build: {
		outDir: "dist",
		sourcemap: true,
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, "index.html"),
				launcher: path.resolve(__dirname, "launcher.html"),
			},
		},
	},
});
