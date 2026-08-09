import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repo = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Straight at the source, so there is no build step between editing the
      // shared engine and seeing it in this game.
      "@clickers/sim": repo("../../packages/sim/src/index.ts"),
      "@clickers/online": repo("../../packages/online/src/index.ts"),
      // The one line that makes this build the battle game: the engine reads
      // every player-facing name back out through here.
      "@clickers/theme": repo("./src/theme.ts"),
    },
  },
  optimizeDeps: { exclude: ["@clickers/sim", "@clickers/online"] },
  server: { port: 5173 },
});
