import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { applyHttpHeaders, htmlCacheControl } from "./_core/httpHeaders";

// applyHttpHeaders は app.use にミドルウェアを1つ登録するだけなので、
// 偽のExpressに登録してそのまま呼び、付いたヘッダを覗く。
function headersFor(reqPath: string, cookie?: string): Record<string, string> {
  const out: Record<string, string> = {};
  const req = { path: reqPath, headers: cookie ? { cookie } : {} };
  const res = {
    set(key: string, value: string) {
      out[key.toLowerCase()] = value;
    },
  };
  let called = false;
  const app = {
    use(mw: (req: unknown, res: unknown, next: () => void) => void) {
      mw(req, res, () => {
        called = true;
      });
    },
  };
  applyHttpHeaders(app as never);
  expect(called, "next() が呼ばれていない（後続のルートに進めない）").toBe(true);
  return out;
}

describe("セキュリティヘッダ", () => {
  it("HTMLのルートに最低限のヘッダが付く", () => {
    const h = headersFor("/org/30018");
    expect(h["strict-transport-security"]).toMatch(/^max-age=31536000/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["permissions-policy"]).toContain("geolocation=()");
  });

  it("APIの応答にもセキュリティヘッダが付く", () => {
    const h = headersFor("/api/trpc/orgs.search");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toBeDefined();
  });

  // まずReport-Onlyで本番の違反を集め、空を確認してから強制に切り替える方針。
  // 強制へ切り替えたらこのテストの期待値も入れ替える（切り替え忘れの検出も兼ねる）。
  it("CSPはReport-Onlyで出しており、報告先が付いている", () => {
    const h = headersFor("/");
    expect(h["content-security-policy"]).toBeUndefined();
    const csp = h["content-security-policy-report-only"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("report-uri /api/csp-report");
  });

  it("CSPの危険な緩めをしていない", () => {
    const csp = headersFor("/")["content-security-policy-report-only"];
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("http://");
    // ワイルドカードは計測ビーコンのサブドメインだけに限る
    for (const source of csp.match(/https:\/\/\*\.[^\s;]+/g) ?? []) {
      expect(source).toMatch(/google-analytics\.com|analytics\.google\.com|googletagmanager\.com/);
    }
  });

  // CSPは「実際に読み込んでいるホストだけ」を許可している。index.html に
  // 外部リソースを足したときに更新を忘れると、本番で静かに読み込めなくなる。
  it("index.html が読み込む外部ホストをCSPが許可している", () => {
    const csp = headersFor("/")["content-security-policy-report-only"];
    const html = readFileSync(path.resolve(__dirname, "../client/index.html"), "utf8");
    const hosts = new Set<string>();
    for (const m of html.matchAll(/<(?:link|script)\b[^>]*(?:src|href)="https:\/\/([^/"]+)/g)) {
      hosts.add(m[1]);
    }
    // rss.xml の自ドメインは対象外
    hosts.delete("yatoeru.jp");
    expect(hosts.size).toBeGreaterThan(0);
    for (const host of hosts) {
      const wildcard = host.replace(/^[^.]+\./, "*.");
      expect(csp.includes(host) || csp.includes(wildcard), `CSPが ${host} を許可していない`).toBe(true);
    }
  });

  it("ハッシュ付きアセットは1年 immutable、その他の静的ファイルは1時間", () => {
    expect(headersFor("/assets/index-abc123.js")["cache-control"]).toBe(
      "public, max-age=31536000, immutable"
    );
    expect(headersFor("/favicon.svg")["cache-control"]).toBe("public, max-age=3600");
    // HTMLとAPIはここでは決めない（SSR側と各ハンドラが決める）
    expect(headersFor("/search")["cache-control"]).toBeUndefined();
    expect(headersFor("/api/trpc/orgs.search")["cache-control"]).toBeUndefined();
  });
});

describe("HTMLのキャッシュ指示", () => {
  // SSRの受け皿は app.use("*") でマウントされるため req.path は常に "/" になる。
  // 実際のパスは originalUrl に入る。本番でこの取り違えにより /admin にも
  // 公開用のキャッシュ指示が付いていたので、テストも originalUrl 側で書く。
  const req = (p: string, cookie?: string) =>
    ({ path: "/", originalUrl: p, headers: cookie ? { cookie } : {} }) as never;

  it("公開ページは共有キャッシュにだけ短時間置ける", () => {
    const cc = htmlCacheControl(req("/org/30018"));
    expect(cc).toContain("max-age=0"); // ブラウザには毎回確認させる
    expect(cc).toContain("s-maxage=300");
    expect(cc).toContain("stale-while-revalidate");
  });

  it("管理画面は共有キャッシュに置かせない", () => {
    expect(htmlCacheControl(req("/admin"))).toBe("no-store");
    expect(htmlCacheControl(req("/admin/orgs"))).toBe("no-store");
    // クエリが付いていても判定できる
    expect(htmlCacheControl(req("/admin?tab=orgs"))).toBe("no-store");
  });

  it("ログイン中の応答は共有キャッシュに置かせない", () => {
    expect(htmlCacheControl(req("/", "app_session_id=abc"))).toBe("no-store");
    // 別のCookieだけなら公開扱いのまま
    expect(htmlCacheControl(req("/", "other=1"))).toContain("s-maxage");
  });
});
