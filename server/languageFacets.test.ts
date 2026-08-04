import { describe, expect, it, vi, beforeEach } from "vitest";
import { MAJOR_LANGUAGES } from "../shared/tokutei";

// 対応言語の絞り込み選択肢は、決め打ちのリストではなく実データから作る。
//
// 以前は shared/tokutei.ts の MAJOR_LANGUAGES（13言語）を並べていた。
// 実データには72言語あり、シンハラ語702機関・ベンガル語416機関・
// ヒンディー語406機関などが**DBには入っているのに選択肢に出ず、
// 探しようがない**状態だった。正規化のホワイトリストと同じ
// 「決め打ちが実態から取り残される」問題なので、ここで固定する。

const state = {
  facetRows: [] as Array<{ lang: string; c: number }>,
  executeCalls: 0,
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    execute: vi.fn(async () => {
      state.executeCalls++;
      return [state.facetRows];
    }),
    select: vi.fn(() => {
      const node: Record<string, unknown> = {
        then: (fn: (v: unknown) => unknown) => Promise.resolve([]).then(fn),
      };
      for (const k of ["from", "where", "orderBy", "limit", "offset", "groupBy"]) node[k] = () => node;
      return node;
    }),
  })),
}));

import { appRouter } from "./routers";
import { resetLanguageFacetsCache } from "./routers/orgs";

function caller() {
  return appRouter.createCaller({ user: null, req: {} as never, res: {} as never } as never);
}

beforeEach(() => {
  state.facetRows = [];
  state.executeCalls = 0;
  resetLanguageFacetsCache();
  vi.clearAllMocks();
});

describe("orgs.languageFacets", () => {
  it("機関数の多い順に、言語と件数を返す", async () => {
    state.facetRows = [
      { lang: "ベトナム語", c: 7267 },
      { lang: "英語", c: 6005 },
      { lang: "シンハラ語", c: 702 },
    ];
    const res = await caller().orgs.languageFacets();
    expect(res.languages).toEqual([
      { language: "ベトナム語", count: 7267 },
      { language: "英語", count: 6005 },
      { language: "シンハラ語", count: 702 },
    ]);
  });

  it("従来の選択肢に無い言語も返す（ここが本来の目的）", async () => {
    state.facetRows = [
      { lang: "シンハラ語", c: 702 },
      { lang: "ベンガル語", c: 416 },
      { lang: "ヒンディー語", c: 406 },
      { lang: "ウルドゥー語", c: 81 },
    ];
    const langs = (await caller().orgs.languageFacets()).languages.map((l) => l.language);
    for (const l of langs) {
      expect(MAJOR_LANGUAGES as readonly string[]).not.toContain(l);
    }
    expect(langs).toContain("シンハラ語");
    expect(langs).toContain("ヒンディー語");
  });

  it("1機関しかない言語も落とさない（探している企業には十分な情報）", async () => {
    state.facetRows = [{ lang: "チューク語", c: 1 }];
    expect((await caller().orgs.languageFacets()).languages).toEqual([
      { language: "チューク語", count: 1 },
    ]);
  });

  it("空文字・件数0の行は除く", async () => {
    state.facetRows = [
      { lang: "英語", c: 6005 },
      { lang: "", c: 3 },
      { lang: "架空語", c: 0 },
    ];
    expect((await caller().orgs.languageFacets()).languages).toEqual([
      { language: "英語", count: 6005 },
    ]);
  });

  it("2回目はキャッシュから返す（11,448件の集計を毎回走らせない）", async () => {
    state.facetRows = [{ lang: "英語", c: 6005 }];
    await caller().orgs.languageFacets();
    expect(state.executeCalls).toBe(1);
    const second = await caller().orgs.languageFacets();
    expect(state.executeCalls).toBe(1); // 集計は増えない
    expect(second.languages).toEqual([{ language: "英語", count: 6005 }]);
  });

  it("キャッシュを空にすれば新しいデータを取り直す（棚卸し直後に古い一覧を出さない）", async () => {
    state.facetRows = [{ lang: "英語", c: 6005 }];
    await caller().orgs.languageFacets();
    state.facetRows = [{ lang: "英語", c: 6006 }, { lang: "ヒンディー語", c: 406 }];
    resetLanguageFacetsCache();
    const res = await caller().orgs.languageFacets();
    expect(res.languages.map((l) => l.language)).toContain("ヒンディー語");
  });
});
