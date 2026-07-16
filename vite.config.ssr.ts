import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// SSR専用ビルド設定。テンプレート付属のdev用プラグイン
// （jsxLoc / manus-runtime / debug-collector）は除外し、
// アプリソースを変換するプラグイン（react, tailwindcss）のみ引き継ぐ。
export default defineConfig({
  root: import.meta.dirname,
  mode: "production",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  // streamdownは.cssチェーンimportのためNodeのESMローダーで読めない
  // → Viteでバンドルして解決（メインvite.config.tsにも同エントリが必要）
  ssr: { noExternal: ["streamdown"] },
  build: {
    ssr: path.resolve(import.meta.dirname, "client/src/entry-server.tsx"),
    outDir: path.resolve(import.meta.dirname, "dist/server-ssr"),
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "entry-server.js" } },
  },
});
