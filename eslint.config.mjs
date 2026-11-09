import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // ignoreRestSiblings: `const { password_hash, ...safe } = user` is how fields are left out
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
