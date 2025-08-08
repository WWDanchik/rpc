import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es", "cjs"],
            fileName: (format) => format === "es" ? "index.es.js" : "index.js",
        },

        outDir: "dist",
        emptyOutDir: false,
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
