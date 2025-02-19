import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

// NOTE: stylistic is in agreement with prettier, it's just to notify you to
// format the file

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    plugins: {
      "@stylistic": stylistic,
    },
    files: ["**/*.{js,mjs,cjs,jsx,tsx,ts}"],
    ignores: ["public/static/npm/*"],
    rules: {
      semi: [2, "always"],
      "semi-spacing": [
        "error",
        {
          before: false,
          after: true,
        },
      ],
      "func-call-spacing": ["error", "never"],
      "no-multi-spaces": "error",
      "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      "space-in-parens": ["error", "never"],
      "@stylistic/space-before-function-paren": ["warn", {
        "anonymous": "always",
        "named": "ignore",
        "asyncArrow": "always"
      }],
      "@stylistic/no-tabs": "warn",
      "@stylistic/quotes": ["warn", "double"],
      "@stylistic/no-multi-spaces": "warn",
      "@stylistic/no-multiple-empty-lines": [
        "warn",
        {
          max: 2,
          maxEOF: 0,
        },
      ],
      "@stylistic/comma-spacing": [
        "warn",
        {
          before: false,
          after: true,
        },
      ],
      "@stylistic/arrow-spacing": [
        "warn",
        {
          before: true,
          after: true,
        },
      ],
      "@stylistic/brace-style": [
        "warn",
        "1tbs",
        {
          allowSingleLine: true,
        },
      ],
    },
  },
  {languageOptions: { globals: {...globals.browser, ...globals.jquery} }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
