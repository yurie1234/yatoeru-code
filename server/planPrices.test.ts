import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// 掲載プランの金額は2箇所にある。
//  ・画面（client/src/pages/Pricing.tsx）… 機関に見せる価格
//  ・集計（server/routers/admin.ts の PLAN_PRICES）… 管理画面のMRR
// 片方だけ直すと「サイトの価格と売上集計が違う」状態になり、しかも
// 気付くのは数字を見返したときになる。ここで食い違いを落とす。
//
// 立ち上げ期は standard 20,000円。問い合わせが増えて実績を示せる段階で
// 30,000円へ引き上げる（契約中の機関は据え置き）。値上げのときは
// このテストの期待値も一緒に動かすことになる。

function read(rel: string): string {
  return readFileSync(path.resolve(__dirname, "..", rel), "utf8");
}

/** "月額 20,000円" / "月額20,000円" のような表記から数値を取り出す */
function yensIn(text: string): number[] {
  return [...text.matchAll(/月額\s*([\d,]+)円/g)].map((m) => Number(m[1].replace(/,/g, "")));
}

describe("掲載プランの金額", () => {
  const pricingPage = read("client/src/pages/Pricing.tsx");
  const adminRouter = read("server/routers/admin.ts");

  const planPrices = Object.fromEntries(
    [...adminRouter.matchAll(/(standard|premium):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );

  it("集計側の金額は standard 20,000円 / premium 80,000円", () => {
    expect(planPrices.standard).toBe(20000);
    expect(planPrices.premium).toBe(80000);
  });

  it("画面に出している金額と集計の金額が一致している", () => {
    const shown = new Set(yensIn(pricingPage));
    expect(shown.has(planPrices.standard), `画面に ${planPrices.standard} 円の表記が無い`).toBe(true);
    expect(shown.has(planPrices.premium), `画面に ${planPrices.premium} 円の表記が無い`).toBe(true);
    // 画面に集計側が知らない金額が残っていないか（値上げの直し漏れ）
    for (const yen of shown) {
      expect(
        Object.values(planPrices).includes(yen),
        `画面の 月額${yen.toLocaleString()}円 が集計側に無い（直し漏れ）`
      ).toBe(true);
    }
  });
});
