import { describe, expect, it, vi, beforeEach } from "vitest";

// orgs.search が「親和性スコアを出す根拠のない検索」でスコアを返さないことを検証する。
// 以前はキーワードだけの検索や条件なしの一覧でも、全機関に同じ点数
// （分野配点の半分20＋処分歴なし5＝25点）が付いて並んでいた。

const ORG_ROWS = [
  {
    id: 1,
    regNo: "19登-000001",
    name: "介護サポート協同組合",
    prefecture: "東京都",
    address: "東京都…",
    phone: "0300000000",
    regDate: "2019-04-25",
    fields: ["介護"],
    languages: ["英語"],
    hasPenalty: false,
    verifiedAt: null,
    preferredFields: null,
    preferredRegions: null,
    reviewCount: 0,
    isDeleted: false,
  },
  {
    id: 2,
    regNo: "19登-000002",
    name: "熊本ケア協同組合",
    prefecture: "熊本県",
    address: "熊本県…",
    phone: "0960000000",
    regDate: "2019-05-16",
    fields: ["介護"],
    languages: ["ベトナム語"],
    hasPenalty: false,
    verifiedAt: null,
    preferredFields: null,
    preferredRegions: null,
    reviewCount: 0,
    isDeleted: false,
  },
];

/**
 * drizzleのクエリビルダの薄いモック。
 * どの段階でawaitされても rows を返せるよう、各段が自分自身を返しつつthenableにしておく
 * （件数取得は where で、一覧取得は limit / offset でawaitされる）。
 */
function makeSelectChain(rows: unknown[]) {
  const node: Record<string, unknown> = {
    then: (fn: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(fn, rej),
  };
  for (const key of ["from", "where", "orderBy", "limit", "offset", "groupBy"]) {
    node[key] = () => node;
  }
  return node;
}

const dbMock = {
  select: vi.fn((cols?: Record<string, unknown>) => {
    // count(*) の呼び出しだけ件数を返す
    if (cols && "count" in cols) {
      return makeSelectChain([{ count: ORG_ROWS.length }]) as never;
    }
    return makeSelectChain(ORG_ROWS) as never;
  }),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => dbMock) }));

import { appRouter } from "./routers";

function createCaller() {
  return appRouter.createCaller({ user: null, req: {} as never, res: {} as never } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("orgs.search の親和性スコア", () => {
  it("条件なしの一覧ではスコアを返さない", async () => {
    const r = await createCaller().orgs.search({ page: 1, limit: 20, sort: "affinity" });
    expect(r.items.length).toBeGreaterThan(0);
    for (const item of r.items) {
      expect(item.affinity).toBeUndefined();
    }
  });

  it("キーワードだけの検索でもスコアを返さない（キーワードはスコアの入力ではない）", async () => {
    const r = await createCaller().orgs.search({
      keyword: "介護",
      page: 1,
      limit: 20,
      sort: "affinity",
    });
    for (const item of r.items) {
      expect(item.affinity).toBeUndefined();
    }
  });

  it("地域を指定するとスコアを返し、満点は地域30＋受入状況10＋信頼性10＝50になる", async () => {
    const r = await createCaller().orgs.search({
      prefecture: "熊本県",
      page: 1,
      limit: 20,
      sort: "affinity",
    });
    expect(r.items[0].affinity).toBeDefined();
    expect(r.items[0].affinity?.maxScore).toBe(50);
  });

  it("分野を指定するとスコアを返し、満点は分野40＋受入状況10＋信頼性10＝60になる", async () => {
    const r = await createCaller().orgs.search({
      field: "介護",
      page: 1,
      limit: 20,
      sort: "affinity",
    });
    expect(r.items[0].affinity?.maxScore).toBe(60);
  });

  it("言語を指定するとスコアを返し、満点は言語20＋受入状況10＋信頼性10＝40になる", async () => {
    const r = await createCaller().orgs.search({
      language: "ベトナム語",
      page: 1,
      limit: 20,
      sort: "affinity",
    });
    expect(r.items[0].affinity?.maxScore).toBe(40);
  });

  it("sort=default を明示した場合はスコアを返さない", async () => {
    const r = await createCaller().orgs.search({
      prefecture: "熊本県",
      page: 1,
      limit: 20,
      sort: "default",
    });
    for (const item of r.items) {
      expect(item.affinity).toBeUndefined();
    }
  });
});
