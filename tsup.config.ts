import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/cli": "src/bin/cli.ts",
  },
  format: ["cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  shims: true,
  target: "node12",
});
