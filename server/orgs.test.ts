import { describe, expect, it, vi, beforeEach } from "vitest";

// getDbをモック（DBアクセスを伴わずルーターのバリデーション・同意検証を検証する）
const insertMock = vi.fn();
const dbMock = {
  insert: vi.fn(() => ({
    values: vi.fn(async (v: unknown) => {
      insertMock(v);
      return [{ insertId: 123 }];
    }),
  })),
  select: vi.fn(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => dbMock),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "{}" } }],
  })),
}));

import { appRouter } from "./routers";

function createCaller() {
  return appRouter.createCaller({
    user: null,
    req: {} as never,
    res: {} as never,
  } as never);
}

const validConsultation = {
  orgIds: [1, 2, 3],
  companyName: "テスト株式会社",
  contactName: "山田 太郎",
  email: "taro@example.co.jp",
  consentThirdParty: true,
};

describe("orgs.submitConsultation（一括相談・第三者提供同意）", () => {
  beforeEach(() => {
    insertMock.mockClear();
  });

  it("同意ありの有効な入力で成功し、consentedAtが記録される", async () => {
    const caller = createCaller();
    const result = await caller.orgs.submitConsultation(validConsultation);
    expect(result.success).toBe(true);
    expect(insertMock).toHaveBeenCalledOnce();
    const inserted = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.consentedAt).toBeInstanceOf(Date);
    expect(inserted.status).toBe("new");
  });

  it("consentThirdParty=falseはBAD_REQUESTで拒否される", async () => {
    const caller = createCaller();
    await expect(
      caller.orgs.submitConsultation({ ...validConsultation, consentThirdParty: false })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("consentThirdParty未指定はzodバリデーションで拒否される", async () => {
    const caller = createCaller();
    const { consentThirdParty: _omit, ...withoutConsent } = validConsultation;
    await expect(
      // @ts-expect-error 故意にconsentThirdPartyを欠落させる
      caller.orgs.submitConsultation(withoutConsent)
    ).rejects.toThrow();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("orgIdsは1〜5社の範囲外（6社）を拒否する", async () => {
    const caller = createCaller();
    await expect(
      caller.orgs.submitConsultation({ ...validConsultation, orgIds: [1, 2, 3, 4, 5, 6] })
    ).rejects.toThrow();
  });

  it("orgIdsが空配列は拒否される", async () => {
    const caller = createCaller();
    await expect(
      caller.orgs.submitConsultation({ ...validConsultation, orgIds: [] })
    ).rejects.toThrow();
  });

  it("不正なメールアドレスは拒否される", async () => {
    const caller = createCaller();
    await expect(
      caller.orgs.submitConsultation({ ...validConsultation, email: "not-an-email" })
    ).rejects.toThrow();
  });
});

describe("orgs.submitPlanApplication（有料プラン申込・ポリシー同意）", () => {
  beforeEach(() => {
    insertMock.mockClear();
  });

  const validApplication = {
    orgName: "テストサポート株式会社",
    contactName: "佐藤 花子",
    email: "hanako@example.co.jp",
    plan: "standard" as const,
    consentPrivacy: true,
  };

  it("同意ありの有効な入力で成功し、consentedAtが記録される", async () => {
    const caller = createCaller();
    const result = await caller.orgs.submitPlanApplication(validApplication);
    expect(result.success).toBe(true);
    expect(insertMock).toHaveBeenCalledOnce();
    const inserted = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.consentedAt).toBeInstanceOf(Date);
  });

  it("consentPrivacy=falseはBAD_REQUESTで拒否される", async () => {
    const caller = createCaller();
    await expect(
      caller.orgs.submitPlanApplication({ ...validApplication, consentPrivacy: false })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("不正なプラン名は拒否される", async () => {
    const caller = createCaller();
    await expect(
      caller.orgs.submitPlanApplication({
        ...validApplication,
        // @ts-expect-error 故意に不正プランを指定
        plan: "enterprise",
      })
    ).rejects.toThrow();
  });
});

describe("orgs.diagnoseUrl（URL診断）入力検証", () => {
  it("URL形式でない入力は拒否される", async () => {
    const caller = createCaller();
    await expect(caller.orgs.diagnoseUrl({ url: "not a url" })).rejects.toThrow();
  });
});
