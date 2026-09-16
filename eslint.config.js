import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

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
      "scripts/verify-site-build.mjs",
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
  {
    files: ["modules/dialogs/**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  ...tseslint.config(
    {
      files: ["src/**/*.{ts,tsx}"],
      languageOptions: {
        globals: globals.browser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    tseslint.configs.recommended,
  ),
];
