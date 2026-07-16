import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { registrySyncHandler } from "../registrySync";
import { rssHandler } from "../rss";
import { sitemapHandler } from "../sitemap";
import { registerLlmsTxtRoute } from "../llms";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // 2026-07-16 本番yatoeru.jp公開：noindex解除済み（robots.txt開放と同日実施）。
  // 旧 *.manus.space ドメインへのアクセスは本番ドメインへ301リダイレクト（重複インデックス・評価分散防止）。
  // ※ sandboxプレビュー（*.manus.computer）とlocalhostは対象外。
  app.use((req, res, next) => {
    // 本番はプロキシ経由のため x-forwarded-host を優先して元のホスト名を判定する
    const fwdHost = req.headers["x-forwarded-host"];
    const rawHost =
      (Array.isArray(fwdHost) ? fwdHost[0] : fwdHost) ?? req.headers.host ?? "";
    const host = rawHost.split(",")[0].trim().toLowerCase();
    if (host.endsWith(".manus.space")) {
      return res.redirect(301, `https://yatoeru.jp${req.originalUrl}`);
    }
    next();
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // 週次の登録簿同期（AGENT cronからのPOST受け口。/api/scheduled/* は自動登録されないため明示マウント）
  app.post("/api/scheduled/registry-sync", registrySyncHandler);
  // RSS 2.0フィード（AI・メディアの巡回導線。登録簿差分記事＋コラムを配信）
  app.get("/rss.xml", rssHandler);
  app.get("/sitemap.xml", sitemapHandler);
  registerLlmsTxtRoute(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
