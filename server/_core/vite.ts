import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import superjson from "superjson";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { htmlCacheControl } from "./httpHeaders";
import { buildSsrPrefetch } from "./ssrCaller";
import type { HeadMeta } from "../../client/src/ssr/prefetch";

// import.meta.dirnameはNode 20.11+限定のため、全Nodeバージョンで動く
// fileURLToPath経由で自前算出する（Railway等がNode 18を使う環境向け）。
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
// 既定のOG画像（1200×630）。ページ側が head.ogImage を指定しなければこれを使う。
// 指定が無かったため全ページで og:image が欠落し、SNS共有・検索のリッチ表示で
// 画像が出ていなかった。画像は my-scripts の tools/generate-og.mjs で生成し、
// client/public/og.png に置いている
const DEFAULT_OG_IMAGE = "/og.png";

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
  const ogImage = head.ogImage ?? DEFAULT_OG_IMAGE;
  const img = ogImage.startsWith("//")
    ? "https:" + ogImage
    : ogImage.startsWith("/")
      ? CANONICAL_ORIGIN
        ? CANONICAL_ORIGIN + ogImage
        : undefined
      : ogImage;
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
    tags.push(`<meta property="og:image:alt" content="${title}" />`);
    // 寸法が分かるのは自前で用意した既定画像のときだけ。
    // 先に寸法を伝えると、SNS側が画像を取得する前に枠を確保できる
    if (img.endsWith(DEFAULT_OG_IMAGE)) {
      tags.push(`<meta property="og:image:width" content="1200" />`);
      tags.push(`<meta property="og:image:height" content="630" />`);
    }
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
      // 先頭はorg-jsonld（OrgDetailの既存remove処理と互換）、以降はssr-jsonld-N。
      // クライアント側で同種JSON-LDをuseEffect注入するページは、
      // 注入前に .ssr-jsonld 要素をremoveして重複を防ぐ。
      const idAttr = i === 0 ? ` id="org-jsonld"` : ` id="ssr-jsonld-${i}"`;
      tags.push(
        `<script type="application/ld+json" class="ssr-jsonld"${idAttr}>${json}</script>`
      );
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
  title: "登録支援機関を条件で比較｜ヤトエル",
  description:
    "特定技能・育成就労に対応する支援機関を、地域・業種・対応言語・新規相談受付状況などから比較。外国人雇用の準備度チェックと支援機関マッチ診断を無料で利用できます。",
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
        __dirname,
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
      // 2026-08-05: 本番がManusデプロイゲートウェイ（404を横取りして生テンプレートを
      // 200で返すSPAフォールバック仕様）からRailwayに移行済みのため、そのゲートウェイ回避策
      // だったsoft-404（200+noindex）は不要になった。存在しないURLは実404を返す
      // （/org/存在しないID・任意の不存在パスが200を返していたのはこの名残）。
      res
        .status(head.notFound ? 404 : 200)
        .set("Cache-Control", htmlCacheControl(req))
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
      ? path.resolve(__dirname, "../..", "dist", "public")
      : path.resolve(__dirname, "public");
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
          __dirname,
          "../..",
          "dist",
          "server-ssr",
          "entry-server.js"
        )
      : path.resolve(__dirname, "server-ssr", "entry-server.js");

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
      // 2026-08-05: Railway移行に伴いsoft-404の理由（Manusゲートウェイの404横取り）が
      // 無くなったため、実404を返す（詳細はsetupViteの同種コメント参照）。
      res
        .status(head.notFound ? 404 : 200)
        .set("Cache-Control", htmlCacheControl(req))
        .type("html")
        .end(composeHtml(template, html, head, dehydratedState));
    } catch (e) {
      // 監視対象ログ：SSR失敗はユーザーには見えない（SPAとして動く）がクローラーには劣化ページが返る
      console.error("[SSR] render failed, serving shell:", e);
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const fallbackHead = buildHeadTags(FALLBACK_HEAD, SITE_NAME);
      res
        .status(200)
        .set("Cache-Control", htmlCacheControl(req))
        .type("html")
        .end(
          template
            .replace("<!--app-head-->", () => fallbackHead)
            .replace("<!--app-html-->", () => "")
        );
    }
  });
}
