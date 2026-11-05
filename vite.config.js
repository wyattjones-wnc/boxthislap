import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    assetsDir: "build",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // Preserve these existing shared chunk boundaries as new lazy routes
        // are added; otherwise bundler heuristics fold them into the entry.
        manualChunks(id) {
          if (id.includes("/node_modules/lucide-react/")) return "icons";
          if (id.endsWith("/modules/connectivity.js")) return "connectivity";
          if (
            /\/react-dom\/(?:cjs\/react-dom\.production\.js|index\.js)$/.test(
              id,
            )
          )
            return "react-dom";
        },
        assetFileNames: (assetInfo) => {
          const originalFileName = assetInfo.originalFileNames?.[0]?.replaceAll(
            "\\",
            "/",
          );

          return originalFileName?.startsWith("assets/")
            ? originalFileName
            : "build/[name]-[hash][extname]";
        },
      },
    },
    sourcemap: true,
  },
});
