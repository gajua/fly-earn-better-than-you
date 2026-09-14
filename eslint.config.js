import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "**/.venv/**",
      ".cursor/hooks/**",
      "packages/broker-adapters/template/**",
      "**/src-tauri/target/**",
      "**/target/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
      sourceType: "module",
    },
  },
  {
    // Playwright page.evaluate / extension SW callbacks run in browser scope.
    files: ["scripts/record-*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        chrome: "readonly",
      },
    },
  },
);
