const typescriptEslint = require("typescript-eslint");
const eslint = require("@eslint/js");
const prettier = require("eslint-config-prettier");

module.exports = typescriptEslint.config(
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
