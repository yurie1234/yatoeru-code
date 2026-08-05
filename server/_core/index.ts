import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAdminAuthRoutes } from "./adminAuth";
import { registerStorageProxy } from "./storageProxy";
import { applyHttpHeaders, registerCspReportRoute } from "./httpHeaders";
import { appRouter } from "../routers";
import { registrySyncHandler } from "../registrySync";
import { sheetSyncHandler } from "../sheetSync";
import { articleListHandler, articlePublishHandler, articleUpdateHandler } from "../articlePublish";
import { rssHandler } from "../rss";
import { sitemapHandler, sitemapChildHandler } from "../sitemap";
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
  // 2026-08-03 www.yatoeru.jpのDNS統合：www→非wwwに301リダイレクト
  // （canonicalタグ・sitemap.xml等が非wwwを正本にしているため揃える。
  //   点検ビト・民泊ビトのWorkerと同じ正規化ルール）。
  app.use((req, res, next) => {
    // 本番はプロキシ経由のため x-forwarded-host を優先して元のホスト名を判定する
    const fwdHost = req.headers["x-forwarded-host"];
    const rawHost =
      (Array.isArray(fwdHost) ? fwdHost[0] : fwdHost) ?? req.headers.host ?? "";
    const host = rawHost.split(",")[0].trim().toLowerCase();
    if (host.endsWith(".manus.space")) {
      return res.redirect(301, `https://yatoeru.jp${req.originalUrl}`);
    }
    if (host === "www.yatoeru.jp") {
      return res.redirect(301, `https://yatoeru.jp${req.originalUrl}`);
    }
    next();
  });
  // セキュリティヘッダとキャッシュ制御（ホスト正規化の直後、各ルートより前）
  applyHttpHeaders(app);
  registerCspReportRoute(app);
  registerStorageProxy(app);
  registerAdminAuthRoutes(app);
  // 週次の登録簿同期（AGENT cronからのPOST受け口。/api/scheduled/* は自動登録されないため明示マウント）
  app.post("/api/scheduled/registry-sync", registrySyncHandler);
  // マスターDB（Googleスプレッドシート）→サイトDBの月次一方向同期（検証3ルール付き）
  app.post("/api/scheduled/sheet-sync", sheetSyncHandler);
  // 週2回のコラム自動投稿（AGENT cronからの受け口。GET=既存一覧（重複回避）、POST=新規投稿）
  app.get("/api/scheduled/article-publish", articleListHandler);
  app.post("/api/scheduled/article-publish", articlePublishHandler);
  // 既存記事の更新（PUT。baseDate更新・加筆用。POSTと同じ認証）
  app.put("/api/scheduled/article-publish", articleUpdateHandler);
  // RSS 2.0フィード（AI・メディアの巡回導線。登録簿差分記事＋コラムを配信）
  app.get("/rss.xml", rssHandler);
  // sitemap index（/sitemap.xml）＋分割子sitemap（1.5MB単一ファイルのSCタイムアウト対策）
  app.get("/sitemap.xml", sitemapHandler);
  app.get("/sitemaps/:name", sitemapChildHandler);
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
