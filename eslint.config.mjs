import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // docs/ guarda scripts avulsos de referência, rodados à mão com `node`.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/**"]),
]);

export default eslintConfig;
