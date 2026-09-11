import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    assetsDir: "build",
    emptyOutDir: false,
    rollupOptions: {
      output: {
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
