import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "RPC",
            formats: ["es", "umd"],
            fileName: (format) => `index.${format}.js`,
        },

        outDir: "dist",
        emptyOutDir: true,
        sourcemap: true,
        minify: "terser",
    },
    server: {
        port: 3000,
    },
});
