import { json as expressJson } from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { COOKIE_NAME } from "@shared/const";

/**
 * セキュリティヘッダとキャッシュ制御。
 *
 * yatoeru.jp は Railway（現状 us-east）に置き、前段に Cloudflare がある。
 * HTMLに `no-cache` を付けていたためCDNも中間キャッシュも一切効かず、
 * ページ遷移のたびに米国東部まで往復していた。ハッシュ付きの
 * `/assets/*` まで `max-age=0` で毎回再検証していたのが特に無駄だった。
 *
 * ここでやること:
 *  1. すべての応答に最低限のセキュリティヘッダを付ける
 *  2. HTMLには CSP を **Report-Only** で付ける（下のコメントの理由）
 *  3. 内容ハッシュ付きアセットは1年 immutable、それ以外の静的ファイルは1時間
 *  4. 公開ページのHTMLは共有キャッシュにだけ短時間置けるようにする
 *     （管理画面とログイン中の応答は no-store）
 */

// CSPで許可している外部ホスト（実際に読み込んでいるものだけ）
//  - fonts.googleapis.com / fonts.gstatic.com … client/index.html の Google Fonts
//  - www.googletagmanager.com … GA4（G-64NQW74LWS）。計測ビーコンは *.google-analytics.com
//  - images.unsplash.com … Home.tsx のヒーロー背景（装飾。opacity 10%で重ねている）
//  - static.cloudflareinsights.com … Cloudflare Web Analytics（応答後に自動挿入される）
const CSP = [
  "default-src 'self'",
  // SSRの状態埋め込み（<script>window.__…）とGA4の設定スニペットがインラインのため
  // 'unsafe-inline' が必要。nonceにするにはHTML組み立て側の改修が要る
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://www.googletagmanager.com https://www.google-analytics.com",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://cloudflareinsights.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * CSPを最初から強制しない理由。
 *
 * ヤトエルはReactの単一ページアプリで、機関検索・診断・管理画面・地図・
 * 画像生成と読み込む資源の幅が広い。CSPは「書いた時点では分からず、
 * 特定の画面を開いた利用者だけが静かに壊れる」設定なので、
 * まず Report-Only で本番の違反を集め、`/api/csp-report` のログが
 * 空のままだと確認できてから強制に切り替える。
 * 切り替えは下の ENFORCE_CSP を true にするだけ（ops/13に手順あり）。
 *
 * 静的サイト側（点検ビト等）は資源が固定でブラウザ実測も済んでいるため
 * 最初から強制している。
 */
const ENFORCE_CSP = false;

/** ハッシュ付きのビルド成果物。ファイル名が変わるので中身は永続キャッシュして良い */
function isImmutableAsset(path: string): boolean {
  return path.startsWith("/assets/");
}

/** HTMLを返すルート（拡張子が無いパス）。rss.xml・sitemap.xml等は各ハンドラが自分で決める */
function isHtmlRoute(path: string): boolean {
  const last = path.slice(path.lastIndexOf("/") + 1);
  return !last.includes(".");
}

export function applyHttpHeaders(app: Express): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // 1年。ヤトエルはHTTPSのみで運用しており、サブドメイン（ikusei・cockpit）も同様
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.set("X-Content-Type-Options", "nosniff");
    // 外部サイトへ遷移するときにパスを渡さない（管理画面のURLを外に出さない）
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.set("X-Frame-Options", "DENY");
    res.set(
      "Permissions-Policy",
      "geolocation=(), camera=(), microphone=(), payment=()"
    );

    if (isHtmlRoute(req.path)) {
      res.set(
        ENFORCE_CSP
          ? "Content-Security-Policy"
          : "Content-Security-Policy-Report-Only",
        `${CSP}; report-uri /api/csp-report`
      );
    }

    if (isImmutableAsset(req.path)) {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (!isHtmlRoute(req.path) && !req.path.startsWith("/api/")) {
      // favicon・アイコン・webmanifest・robots.txt など、名前が変わらない静的ファイル。
      // rss.xml や sitemap.xml は各ハンドラが自分の Cache-Control で上書きする
      res.set("Cache-Control", "public, max-age=3600");
    }

    next();
  });
}

/**
 * CSPの違反報告の受け口。Report-Onlyの間だけ意味があり、
 * 強制に切り替えたあとも「どの資源で詰まったか」を知る手掛かりになる。
 *
 * 報告はブラウザから誰でも投げられるので、ログを溢れさせないよう件数を上限で止める。
 * （プロセス再起動で0に戻る。デプロイのたびに新しい違反だけが見える）
 */
let cspReportCount = 0;
const CSP_REPORT_LIMIT = 50;

export function registerCspReportRoute(app: Express): void {
  app.post(
    "/api/csp-report",
    // ブラウザは application/csp-report で送ってくる（application/json ではない）
    expressJson({ limit: "16kb", type: ["application/csp-report", "application/reports+json", "application/json"] }),
    (req: Request, res: Response) => {
      if (cspReportCount < CSP_REPORT_LIMIT) {
        cspReportCount++;
        const body = (req.body?.["csp-report"] ?? req.body ?? {}) as Record<string, unknown>;
        // 報告の中身は外部入力なので、必要な3項目だけを取り出して長さも切る
        const pick = (...keys: string[]) => {
          for (const k of keys) {
            const v = body[k];
            if (typeof v === "string") return v.slice(0, 300);
          }
          return "";
        };
        console.warn(
          "[CSP] violation",
          JSON.stringify({
            directive: pick("violated-directive", "effectiveDirective"),
            blocked: pick("blocked-uri", "blockedURL"),
            page: pick("document-uri", "documentURL"),
          })
        );
        if (cspReportCount === CSP_REPORT_LIMIT) {
          console.warn(`[CSP] 報告が${CSP_REPORT_LIMIT}件に達したので以後は記録しない`);
        }
      }
      res.status(204).end();
    }
  );
}

/**
 * SSRのHTMLに付けるキャッシュ指示を決める。
 *
 * `max-age=0` でブラウザには毎回確認させ、`s-maxage` で共有キャッシュ（CDN）にだけ
 * 短時間持たせる。登録簿の内容は日単位でしか変わらないため5分で十分に安全。
 * `stale-while-revalidate` は再検証中に古い版を返させ、米国東部への往復を
 * 利用者の待ち時間から外す。
 *
 * ※ CloudflareはHTMLを既定ではキャッシュしないため、この指示が効くのは
 *   キャッシュルールを入れてから。入れる前でも害はない。
 */
export function htmlCacheControl(req: Request): string {
  // SSRの受け皿は app.use("*") でマウントしているため、その中の req.path は
  // 常に "/" になる（Expressがマウント位置ぶんを削る）。実際のパスは originalUrl から取る。
  // ここを req.path で書いていたとき /admin にも公開用のキャッシュ指示が付いていた。
  const path = (req.originalUrl ?? req.path ?? "/").split("?")[0];
  // 管理画面とログイン中の応答は共有キャッシュに置かせない
  if (path === "/admin" || path.startsWith("/admin/")) return "no-store";
  if (req.headers.cookie?.includes(`${COOKIE_NAME}=`)) return "no-store";
  return "public, max-age=0, s-maxage=300, stale-while-revalidate=600";
}
