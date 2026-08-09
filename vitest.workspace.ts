import { fileURLToPath, URL } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const sim = here("./packages/sim/src/index.ts");

/**
 * One project per theme.
 *
 * The engine's own tests are about numbers, so they run against the reference
 * theme and never need touching when a game renames something. Each app's tests
 * run against that game's real theme, which is also what catches a theme pack
 * that has fallen behind the engine — `named()` throws on the missing id.
 */
const project = (name: string, include: string, theme: string) => ({
  test: { name, include: [include] },
  resolve: { alias: { "@clickers/sim": sim, "@clickers/theme": here(theme) } },
});

export default [
  project("sim", "packages/sim/src/**/*.test.ts", "./packages/sim/src/reference-theme.ts"),
  project("battle", "apps/battle/src/**/*.test.ts", "./apps/battle/src/theme.ts"),
  project("mill", "apps/mill/src/**/*.test.ts", "./apps/mill/src/theme.ts"),
];
