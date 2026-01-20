// ESLint configuration for React Native/Expo project
export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": "off", // TypeScript handles this
      "prefer-const": "warn",
      "no-var": "error",
    },
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "*.config.mjs",
      "coverage/**",
    ],
  },
];
