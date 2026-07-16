import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import superjson from "superjson";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { buildSsrPrefetch } from "./ssrCaller";
import type { HeadMeta } from "../../client/src/ssr/prefetch";

// SECURITY: head値はDB由来（機関名等）の可能性がある。生HTMLへの補間は
// Reactの自動エスケープを迂回するため、headTagsに入る全値をescapeHtmlする。
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// canonical/og:url用オリジン。req.hostから導出しない（クライアント偽装可能）。
const CANONICAL_ORIGIN = process.env.CANONICAL_ORIGIN ?? "https://yatoeru.jp";
const SITE_NAME = process.env.SITE_NAME ?? "ヤトエル";
const OG_LOCALE = "ja_JP";

// タイトル：空白圧縮＋切り詰めのみ（markdown除去はしない）
const clampText = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(" ", max);
  if (cut > max * 0.6) return t.slice(0, cut) + "…";
  // CJKなどスペースなし文字列はコードポイント単位でハードカット
  return Array.from(t).slice(0, max).join("") + "…";
};
// 説明文：markdownトークン除去＋切り詰め
const metaText = (s: string, max: number) =>
  clampText(s.replace(/[#*_`~]+/g, ""), max);

function buildHeadTags(head: HeadMeta, siteName: string): string {
  const title = escapeHtml(clampText(head.title, 70) || siteName);
  const desc = escapeHtml(metaText(head.description, 200));
  const url =
    head.canonicalPath && CANONICAL_ORIGIN
      ? escapeHtml(CANONICAL_ORIGIN + head.canonicalPath)
      : "";
  const img = head.ogImage?.startsWith("//")
    ? "https:" + head.ogImage
    : head.ogImage?.startsWith("/")
      ? CANONICAL_ORIGIN
        ? CANONICAL_ORIGIN + head.ogImage
        : undefined
      : head.ogImage;
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<meta property="og:type" content="${head.ogType ?? "website"}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:locale" content="${OG_LOCALE}" />`,
    `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
  ];
  if (siteName)
    tags.push(
      `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`
    );
  if (img) {
    tags.push(`<meta property="og:image" content="${escapeHtml(img)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(img)}" />`);
  }
  if (head.ogType === "article") {
    if (head.publishedTime)
      tags.push(
        `<meta property="article:published_time" content="${escapeHtml(head.publishedTime)}" />`
      );
    if (head.modifiedTime)
      tags.push(
        `<meta property="article:modified_time" content="${escapeHtml(head.modifiedTime)}" />`
      );
  }
  if (url) {
    tags.push(`<meta property="og:url" content="${url}" />`);
    tags.push(`<link rel="canonical" href="${url}" />`);
  }
  if (head.notFound || head.noindex) {
    tags.push(`<meta name="robots" content="noindex, follow" />`);
  }
  // JSON-LD構造化データ（AIクローラー・検索エンジン向け）。
  // JSON文字列内の"<"をu003cへエスケープし</script>による分断を防ぐ。
  // id="org-jsonld"等のクライアント側useEffect注入と重複しないよう、
  // クライアント側は同idの既存要素をremoveしてから再appendする実装になっている。
  if (head.jsonLd && head.jsonLd.length > 0) {
    for (let i = 0; i < head.jsonLd.length; i++) {
      const json = JSON.stringify(head.jsonLd[i]).replace(/</g, "\\u003c");
      const idAttr = i === 0 ? ` id="org-jsonld"` : "";
      tags.push(`<script type="application/ld+json"${idAttr}>${json}</script>`);
    }
  }
  return tags.join("\n");
}

function composeHtml(
  template: string,
  appHtml: string,
  head: HeadMeta,
  dehydratedState: unknown
) {
  const esc = (s: string) => s.replace(/</g, "\\u003c");
  const headTags = buildHeadTags(head, SITE_NAME);
  const stateScript = `<script>window.__RQ_STATE__ = ${esc(JSON.stringify(superjson.serialize(dehydratedState)))}</script>`;
  // 置換値は必ず関数形式（"$&"等のパターン解釈を防ぐ）。
  // 順序：stateScriptをappHtml注入より先に</body>へ入れる
  // （appHtml内に文字通りの"</body>"が含まれ得るため）。
  return template
    .replace("</body>", () => `${stateScript}</body>`)
    .replace("<!--app-head-->", () => headTags)
    .replace("<!--app-html-->", () => appHtml);
}

const FALLBACK_HEAD: HeadMeta = {
  title: "ヤトエル｜特定技能・育成就労の登録支援機関データベース",
  description:
    "ヤトエルは全国11,000件超の登録支援機関を掲載する特定技能・育成就労の支援機関データベース。対応言語・地域・処分歴で検索でき、最大5社への一括相談も無料。",
};

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/entry-client.tsx"`,
        `src="/src/entry-client.tsx?v=${nanoid()}"`
      );
      // transformIndexHtmlは必須（%VITE_*%置換＋Manusランタイム/デバッグコレクタ注入）
      template = await vite.transformIndexHtml(url, template);
      // dev専用のblocking CSS（SSR初回描画のスタイル崩れ防止）
      template = template.replace(
        "</head>",
        `<link rel="stylesheet" href="/src/index.css?direct" data-ssr-dev-css></head>`
      );
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const prefetch = await buildSsrPrefetch(req, res);
      const { html, dehydratedState, head } = await render(url, prefetch);
      // NOTE: 本番のManusデプロイゲートウェイはアプリの404応答を横取りして
      // プレースホルダ未置換のindex.htmlを200で直接返す（SPAフォールバック仕様）。
      // これを回避するため、not-foundは200+noindex（soft-404）で返す。
      // noindexメタはbuildHeadTagsがhead.notFoundから付与するのでSEO実害は小さい。
      res
        .status(200)
        .set("Cache-Control", "no-cache")
        .type("html")
        .end(composeHtml(template, html, head, dehydratedState));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error("[SSR] dev render failed:", e);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // /index.html直リクエストは生テンプレート露出を防ぐため301で/へ。
  // trailing slashも301正規化（/news/と/newsの重複コンテンツ回避）。
  app.use((req, res, next) => {
    if (req.path === "/index.html") return res.redirect(301, "/");
    if (req.path !== "/" && /\/+$/.test(req.path)) {
      const query = req.originalUrl.slice(req.path.length);
      // SECURITY: 先頭スラッシュもcollapse（"//evil.com/"→"/evil.com"、open redirect防止）
      const target = (req.path.replace(/\/+$/, "") || "/").replace(
        /^\/\/+/,
        "/"
      );
      return res.redirect(301, target + query);
    }
    next();
  });
  // redirect:false必須（serve-staticのディレクトリ301とtrailing-slash 301のループ防止）
  app.use(express.static(distPath, { index: false, redirect: false }));

  const templatePath = path.resolve(distPath, "index.html");
  const serverEntryPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(
          import.meta.dirname,
          "../..",
          "dist",
          "server-ssr",
          "entry-server.js"
        )
      : path.resolve(import.meta.dirname, "server-ssr", "entry-server.js");

  app.use("*", async (req, res) => {
    try {
      const template = await fs.promises.readFile(templatePath, "utf-8");
      // このimportは実行時変数パスの動的importのままにする（esbuildが未バンドルで残す）
      const { render } = await import(serverEntryPath);
      const prefetch = await buildSsrPrefetch(req, res);
      const { html, dehydratedState, head } = await render(
        req.originalUrl,
        prefetch
      );
      // 本番ゲートウェイの404横取り（生テンプレート200返却）回避のため、
      // not-foundも200+noindex（soft-404）で返す。noindexメタはhead.notFound経由で付与済み。
      res
        .status(200)
        .set("Cache-Control", "no-cache")
        .type("html")
        .end(composeHtml(template, html, head, dehydratedState));
    } catch (e) {
      // 監視対象ログ：SSR失敗はユーザーには見えない（SPAとして動く）がクローラーには劣化ページが返る
      console.error("[SSR] render failed, serving shell:", e);
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const fallbackHead = buildHeadTags(FALLBACK_HEAD, SITE_NAME);
      res
        .status(200)
        .set("Cache-Control", "no-cache")
        .type("html")
        .end(
          template
            .replace("<!--app-head-->", () => fallbackHead)
            .replace("<!--app-html-->", () => "")
        );
    }
  });
}
