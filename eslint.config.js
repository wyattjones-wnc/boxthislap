import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "assets/**",
      "data/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: [
      "eslint.config.js",
      "vite.config.js",
      "playwright.config.js",
      "scripts/prepare-site-build.mjs",
      "scripts/run-mobile-smoke.mjs",
      "tests/**/*.mjs",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
