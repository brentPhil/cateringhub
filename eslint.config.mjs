import path from "path";
import { fileURLToPath } from "url";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tsconfigPath = path.join(__dirname, "tsconfig.json");

// Native flat config for Next.js 16 + ESLint 9 without FlatCompat cycles
export default [
  {
    ignores: ["node_modules/**", ".next/**"],
  },
  // TypeScript rules with type checking
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        project: [tsconfigPath],
        tsconfigRootDir: __dirname,
      },
    },
  })),
  // Next.js core web vitals
  {
    ...nextPlugin.configs["core-web-vitals"],
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      ...(nextPlugin.configs["core-web-vitals"]?.plugins ?? {}),
      next: nextPlugin,
    },
    rules: {
      ...(nextPlugin.configs["core-web-vitals"]?.rules ?? {}),
      "react/no-unescaped-entities": "off",
    },
  },
];
