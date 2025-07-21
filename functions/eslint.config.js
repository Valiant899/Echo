import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "commonjs", // Changed from "module" to "commonjs"
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "@typescript-eslint/no-require-imports": "off", // Disable this rule
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["error", "single"]
    },
  }
];