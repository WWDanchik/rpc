import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es", "cjs"],
            fileName: (format) => `index.${format === "es" ? "es" : "js"}`,
        },

        outDir: "dist",
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
        rollupOptions: {
            external: ["zod"],
            output: {
                globals: {
                    zod: "zod",
                },
            },
        },
    },
    server: {
        port: 3000,
    },
});
