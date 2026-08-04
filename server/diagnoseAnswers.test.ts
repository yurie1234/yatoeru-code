import { describe, expect, it, vi, beforeEach } from "vitest";

// ウィザード回答の反映（applyDiagnosisAnswers）が
//  - AIを呼び直さない
//  - diagnoses に新しい行を作らない（同じ行を更新する）
//  - 回答をAI推測より優先する
// ことを固定する。
//
// 以前は回答後に diagnoseUrl を呼び直していたため、1回の診断で
// LLM 2回・企業サイト取得2回・diagnoses 行2件が発生し、利用者は同じローディングを
// 2度待たされ、月間診断件数とCVRも2倍に膨らんでいた。

const state = {
  storedResult: {} as Record<string, unknown> | null,
  updatedWith: null as Record<string, unknown> | null,
  updateCalled: 0,
  insertCalled: 0,
  llmCalled: 0,
  fetchCalled: 0,
};

function thenable(rows: unknown[]) {
  const node: Record<string, unknown> = {
    then: (fn: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(fn, rej),
  };
  for (const k of ["from", "where", "orderBy", "limit", "offset", "groupBy"]) node[k] = () => node;
  return node;
}

const dbMock = {
  select: vi.fn((cols?: Record<string, unknown>) => {
    if (cols && "count" in cols) return thenable([{ count: 0 }]) as never;
    if (cols && "result" in cols) {
      return thenable(
        state.storedResult ? [{ id: 42, result: state.storedResult }] : []
      ) as never;
    }
    // 支援機関の候補取得
    return thenable([]) as never;
  }),
  insert: vi.fn(() => {
    state.insertCalled++;
    return { values: vi.fn(async () => [{ insertId: 99 }]) };
  }),
  update: vi.fn(() => ({
    set: vi.fn((patch: Record<string, unknown>) => {
      state.updatedWith = patch;
      state.updateCalled++;
      return { where: vi.fn(async () => undefined) };
    }),
  })),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => dbMock) }));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => {
    state.llmCalled++;
    return { choices: [{ message: { content: "{}" } }] };
  }),
}));

import { appRouter } from "./routers";

function createCaller() {
  return appRouter.createCaller({ user: null, req: {} as never, res: {} as never } as never);
}

const STORED = {
  companyName: "テスト株式会社",
  industry: "飲食店",
  field: "外食業",
  prefecture: "京都府",
  headcount: "1〜2名",
  cost: "初年度 約60〜100万円/名",
  score: 72,
  scoreBreakdown: { field: 30, labor: 25, info: 17 },
  reason: "a)分野該当性30点、b)人手不足度25点、c)情報の確からしさ17点、合計72点。…",
  answers: null,
};

beforeEach(() => {
  state.storedResult = { ...STORED };
  state.updatedWith = null;
  state.updateCalled = 0;
  state.insertCalled = 0;
  state.llmCalled = 0;
  state.fetchCalled = 0;
  vi.clearAllMocks();
});

describe("orgs.applyDiagnosisAnswers", () => {
  it("AIを呼び直さない", async () => {
    await createCaller().orgs.applyDiagnosisAnswers({
      diagnosisId: 42,
      answers: { field: "介護", prefecture: "熊本県", headcount: "3〜5名" },
    });
    expect(state.llmCalled).toBe(0);
  });

  it("diagnoses に新しい行を作らず、同じ行を更新する", async () => {
    await createCaller().orgs.applyDiagnosisAnswers({
      diagnosisId: 42,
      answers: { headcount: "3〜5名" },
    });
    expect(state.insertCalled).toBe(0);
    expect(state.updateCalled).toBe(1);
  });

  it("回答した分野・都道府県・人数がAI推測を上書きする", async () => {
    const r = await createCaller().orgs.applyDiagnosisAnswers({
      diagnosisId: 42,
      answers: { field: "介護", prefecture: "熊本県", headcount: "6〜10名" },
    });
    expect(r.result.field).toBe("介護");
    expect(r.result.prefecture).toBe("熊本県");
    expect(r.result.headcount).toBe("6〜10名");
    // 保存内容も同じ値で更新される
    const saved = state.updatedWith?.result as Record<string, unknown>;
    expect(saved.field).toBe("介護");
    expect(saved.prefecture).toBe("熊本県");
  });

  it("AI解析のスコアと理由は書き換えない（回答で点数が動かない）", async () => {
    const r = await createCaller().orgs.applyDiagnosisAnswers({
      diagnosisId: 42,
      answers: { field: "介護" },
    });
    expect(r.result.score).toBe(STORED.score);
    expect(r.result.reason).toBe(STORED.reason);
    expect(r.result.scoreBreakdown).toEqual(STORED.scoreBreakdown);
  });

  it("19分野・47都道府県に無い値は採用しない（AI推測を維持する）", async () => {
    const r = await createCaller().orgs.applyDiagnosisAnswers({
      diagnosisId: 42,
      answers: { field: "なにか分野", prefecture: "東京" },
    });
    expect(r.result.field).toBe("外食業");
    expect(r.result.prefecture).toBe("京都府");
  });

  it("分野「該当なし」（null）ではAI推測を消さない", async () => {
    const r = await createCaller().orgs.applyDiagnosisAnswers({
      diagnosisId: 42,
      answers: { field: null },
    });
    expect(r.result.field).toBe("外食業");
  });

  it("回答内容を結果に同梱する（助成金マッチング・相談プリフィル用）", async () => {
    const answers = { field: "介護", timing: "3ヶ月以内", jisshuExperience: true };
    const r = await createCaller().orgs.applyDiagnosisAnswers({ diagnosisId: 42, answers });
    expect(r.result.answers).toEqual(answers);
  });

  it("存在しない診断IDはNOT_FOUNDで、更新もしない", async () => {
    state.storedResult = null;
    await expect(
      createCaller().orgs.applyDiagnosisAnswers({ diagnosisId: 999, answers: { field: "介護" } })
    ).rejects.toThrow();
    expect(state.updateCalled).toBe(0);
  });

  it("診断IDは正の整数のみ受け付ける", async () => {
    await expect(
      createCaller().orgs.applyDiagnosisAnswers({ diagnosisId: 0, answers: {} })
    ).rejects.toThrow();
    await expect(
      createCaller().orgs.applyDiagnosisAnswers({ diagnosisId: -1, answers: {} })
    ).rejects.toThrow();
  });

  it("推奨機関を回答後の条件で返す", async () => {
    const r = await createCaller().orgs.applyDiagnosisAnswers({
      diagnosisId: 42,
      answers: { field: "介護", prefecture: "熊本県" },
    });
    expect(Array.isArray(r.recommendedOrgs)).toBe(true);
  });
});
