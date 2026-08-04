import { describe, expect, it, vi, beforeEach } from "vitest";
import { calcAffinity } from "../shared/affinity";
import { REFERRAL_INTENTS, REFERRAL_INTENT_LABELS } from "../shared/referralIntent";

// 送客優先度（紹介料の意向）が公開レスポンスとスコアに一切影響しないことを固定する。
// 紹介料で検索順位が動くならそれは広告であり、ラベルなしで検索結果に混ぜると
// 景品表示法（ステマ規制）に触れる。ここが崩れたらテストで落とす。

const BASE_ROW = {
  id: 1,
  regNo: "19登-000001",
  name: "テスト協同組合",
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
  consultStatus: "unknown",
  reviewCount: 0,
  isDeleted: false,
  // 非公開情報。公開レスポンスに出てはいけない
  internalMemo: "送客窓口: 担当者A / 価格反応: 前向き",
  referralIntent: "agreed",
  referralNote: "紹介料20%で合意。請求は月末締め",
  referralUpdatedAt: "2026-08-04 00:00:00",
};

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
    if (cols && "count" in cols) return makeSelectChain([{ count: 1 }]) as never;
    return makeSelectChain([BASE_ROW]) as never;
  }),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => dbMock) }));

import { appRouter } from "./routers";

function createCaller() {
  return appRouter.createCaller({ user: null, req: {} as never, res: {} as never } as never);
}

beforeEach(() => vi.clearAllMocks());

const SECRET_KEYS = ["internalMemo", "referralIntent", "referralNote", "referralUpdatedAt"];

describe("送客優先度は公開レスポンスに出さない", () => {
  it("orgs.search（スコアなし経路）に非公開項目が含まれない", async () => {
    const r = await createCaller().orgs.search({ page: 1, limit: 20, sort: "affinity" });
    for (const item of r.items) {
      for (const key of SECRET_KEYS) {
        expect(Object.keys(item)).not.toContain(key);
      }
    }
  });

  it("orgs.search（スコアあり経路）に非公開項目が含まれない", async () => {
    const r = await createCaller().orgs.search({
      prefecture: "東京都",
      page: 1,
      limit: 20,
      sort: "affinity",
    });
    expect(r.items[0].affinity).toBeDefined();
    for (const key of SECRET_KEYS) {
      expect(Object.keys(r.items[0])).not.toContain(key);
    }
  });

  it("レスポンス全体をJSON化しても非公開の文字列が現れない", async () => {
    const r = await createCaller().orgs.search({
      prefecture: "東京都",
      page: 1,
      limit: 20,
      sort: "affinity",
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain("紹介料20%で合意");
    expect(json).not.toContain("送客窓口");
    expect(json).not.toContain("価格反応");
  });
});

describe("送客優先度は親和性スコアに影響しない", () => {
  const org = {
    name: "テスト協同組合",
    prefecture: "東京都",
    fields: ["介護"],
    languages: ["英語"],
    hasPenalty: false,
    registeredDate: "2019-04-01",
    consultStatus: "open",
  };
  const input = { targetField: "介護", targetPrefecture: "東京都" };

  it("どの意向区分でもスコアと理由が変わらない", () => {
    const baseline = calcAffinity(input, org);
    for (const intent of REFERRAL_INTENTS) {
      // 意向を混ぜてもスコア計算の入力にはならない（型上も受け取らない）
      const withIntent = calcAffinity(input, { ...org, ...({ referralIntent: intent } as never) });
      expect(withIntent.score).toBe(baseline.score);
      expect(withIntent.maxScore).toBe(baseline.maxScore);
      expect(withIntent.reasons).toEqual(baseline.reasons);
    }
  });

  it("スコアの理由に紹介料・送客に関する文言が出ない", () => {
    const r = calcAffinity(input, org);
    for (const reason of r.reasons) {
      expect(reason.label).not.toMatch(/紹介料|送客|優先|広告|PR/);
    }
  });
});

describe("送客優先度の区分定義", () => {
  it("すべての区分に日本語ラベルがある", () => {
    for (const intent of REFERRAL_INTENTS) {
      expect(REFERRAL_INTENT_LABELS[intent]).toBeTruthy();
    }
  });

  it("金額が未確定の段階（意向あり・交渉中）を区分として持つ", () => {
    expect(REFERRAL_INTENTS).toContain("interested");
    expect(REFERRAL_INTENTS).toContain("negotiating");
  });
});
