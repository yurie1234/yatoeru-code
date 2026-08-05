import { describe, expect, it } from "vitest";
import { PAGE_JSONLD, pageJsonLd } from "../client/src/ssr/pageJsonLd";

// 構造化データは各ページの useEffect でも作られているが、それはブラウザでしか動かない。
// **AI検索のクローラー（OAI-SearchBot・Claude-SearchBot・PerplexityBot）は
// JavaScriptを実行しない**ため、SSRのHTMLに入っていないと存在しないのと同じになる。
// 実測では41ルートのうち23ルートが生HTMLに構造化データ0件だった。
// SSR側に入れたことをここで固定する。

const REQUIRED_PATHS = [
  // 助成金（商業的な検索需要が高い主力コンテンツ）
  "/joseikin",
  "/joseikin/jinzai-kakuho",
  "/joseikin/gyomu-kaizen",
  "/joseikin/career-up",
  "/joseikin/trial-koyou",
  "/joseikin/jinzai-kaihatsu",
  // 制度ガイド
  "/guide/ikusei-shuro-cost",
  "/guide/ikusei-shuro-schedule",
  "/guide/ginou-jisshu-chigai",
  "/guide/tokutei-ginou-ikou",
  "/columns/saiyou-cost-hikaku",
  // 導線
  "/diagnose",
  "/consult",
  // 信頼性（AI検索が引用元を判断する材料）
  "/about",
  "/operator",
  "/neutrality-policy",
];

function typesOf(path: string): string[] {
  const ld = pageJsonLd(path) ?? [];
  return ld.map((o) => String(o["@type"]));
}

describe("SSRの構造化データ", () => {
  it("対象ページすべてに構造化データがある", () => {
    for (const p of REQUIRED_PATHS) {
      expect(pageJsonLd(p), `${p} に構造化データが無い`).toBeDefined();
      expect(typesOf(p).length, `${p} が空`).toBeGreaterThan(0);
    }
  });

  it("すべてのページにパンくずがある（AIが階層を辿れる）", () => {
    for (const p of Object.keys(PAGE_JSONLD)) {
      expect(typesOf(p), `${p} にBreadcrumbListが無い`).toContain("BreadcrumbList");
    }
  });

  it("助成金・制度ガイドは Article と FAQPage を持つ", () => {
    const guides = REQUIRED_PATHS.filter(
      (p) => p.startsWith("/joseikin") || p.startsWith("/guide/") || p.startsWith("/columns/")
    );
    for (const p of guides) {
      expect(typesOf(p), `${p} にArticleが無い`).toContain("Article");
      expect(typesOf(p), `${p} にFAQPageが無い`).toContain("FAQPage");
    }
  });

  it("助成金ハブは制度の一覧（ItemList）を持つ", () => {
    expect(typesOf("/joseikin")).toContain("ItemList");
    const list = pageJsonLd("/joseikin")!.find((o) => o["@type"] === "ItemList") as {
      itemListElement: Array<{ url: string; position: number }>;
    };
    expect(list.itemListElement.length).toBeGreaterThanOrEqual(5);
    // 各項目が実在するサブページを指している
    for (const item of list.itemListElement) {
      expect(item.url).toMatch(/^https:\/\/yatoeru\.jp\/joseikin\//);
    }
  });

  it("診断は無料のツールとして示される", () => {
    const app = pageJsonLd("/diagnose")!.find((o) => o["@type"] === "WebApplication") as {
      offers: { price: number };
      isAccessibleForFree: boolean;
    };
    expect(app.offers.price).toBe(0);
    expect(app.isAccessibleForFree).toBe(true);
  });

  // FAQの本文はページ側から import している。ここで書き写すと、ページを直したときに
  // 構造化データだけ古くなり、Googleのガイドライン（FAQPageの内容が画面に見えていること）に反する
  it("FAQはページ側のデータをそのまま使っている（内容が空でない）", () => {
    for (const p of REQUIRED_PATHS) {
      const faq = pageJsonLd(p)!.find((o) => o["@type"] === "FAQPage") as
        | { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }
        | undefined;
      if (!faq) continue;
      expect(faq.mainEntity.length, `${p} のFAQが空`).toBeGreaterThan(0);
      for (const q of faq.mainEntity) {
        expect(q.name.length, `${p} に空の質問がある`).toBeGreaterThan(4);
        expect(q.acceptedAnswer.text.length, `${p} に空の回答がある`).toBeGreaterThan(20);
      }
    }
  });

  it("すべてのURLが正本のホスト名・末尾スラッシュなしで書かれている", () => {
    const json = JSON.stringify(Object.keys(PAGE_JSONLD).map((p) => pageJsonLd(p)));
    for (const url of json.match(/https:\/\/[^"]+/g) ?? []) {
      expect(url, `${url} が想定外のURL`).toMatch(/^https:\/\/(yatoeru\.jp|ubusunaworks\.jp|schema\.org)/);
      // 個別ページのURLは末尾スラッシュなしで揃える（canonicalと同じ形）。
      // サイトのルートだけは "https://yatoeru.jp/" が正しい形
      if (url.startsWith("https://yatoeru.jp/") && url !== "https://yatoeru.jp/") {
        expect(url.endsWith("/"), `${url} が末尾スラッシュ付き`).toBe(false);
      }
    }
  });

  it("知らないパスには何も返さない", () => {
    expect(pageJsonLd("/no-such-page")).toBeUndefined();
  });
});
