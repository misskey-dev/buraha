import * as path from "node:path";
import * as url from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(
        path.dirname(url.fileURLToPath(import.meta.url)),
        "src/index.ts"
      ),
      formats: ["cjs"],
      fileName: "index",
    },
    minify: "terser",
    terserOptions: {
      compress: {
        passes: Infinity,
        unsafe: true,
        unsafe_math: true,
      },
    },
  },
});
