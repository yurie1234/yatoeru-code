import { describe, expect, it, vi, beforeEach } from "vitest";

// getDbをモックし、admin.updateOrgListing / admin.orgByRegNo の
// 権限チェック・バリデーション・「未指定キーは触らない」挙動を検証する。
const state = {
  selectRows: [{ id: 30018 }] as Array<Record<string, unknown>>,
  updatePatch: null as Record<string, unknown> | null,
  updateWhereCalled: false,
};

const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => state.selectRows),
      })),
    })),
  })),
  // orgByRegNo は送客優先度（非公開・生SQL）も読む。列の有無は
  // information_schema で判定するため、未適用環境として 0件 を返す。
  execute: vi.fn(async () => [[{ c: 0 }]]),
  update: vi.fn(() => ({
    set: vi.fn((patch: Record<string, unknown>) => {
      state.updatePatch = patch;
      return {
        where: vi.fn(async () => {
          state.updateWhereCalled = true;
        }),
      };
    }),
  })),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => dbMock),
}));

import { appRouter } from "./routers";
import { PENDING_LISTING_UPDATES } from "./pendingListingUpdates";

function createCaller(role: "admin" | "user" | null) {
  return appRouter.createCaller({
    user: role ? { role } : null,
    req: {} as never,
    res: {} as never,
  } as never);
}

beforeEach(() => {
  state.selectRows = [{ id: 30018 }];
  state.updatePatch = null;
  state.updateWhereCalled = false;
  vi.clearAllMocks();
});

describe("admin.updateOrgListing", () => {
  it("未ログイン・非adminは拒否する", async () => {
    await expect(
      createCaller(null).admin.updateOrgListing({ regNo: "19登-000020", consultStatus: "open" })
    ).rejects.toThrow();
    await expect(
      createCaller("user").admin.updateOrgListing({ regNo: "19登-000020", consultStatus: "open" })
    ).rejects.toThrow();
    expect(state.updateWhereCalled).toBe(false);
  });

  it("指定したキーだけを更新し、未指定キーは patch に含めない", async () => {
    const res = await createCaller("admin").admin.updateOrgListing({
      regNo: "19登-000020",
      preferredRegions: ["全国"],
      verifiedNote: "対応分野: 全分野。",
    });
    expect(res.ok).toBe(true);
    expect(state.updateWhereCalled).toBe(true);
    expect(Object.keys(state.updatePatch ?? {}).sort()).toEqual([
      "preferredRegions",
      "verifiedNote",
    ]);
  });

  it("verifiedAt は YYYY-MM-DD 文字列を Date に変換して保存する", async () => {
    await createCaller("admin").admin.updateOrgListing({
      regNo: "19登-000020",
      verifiedAt: "2026-08-04",
    });
    expect(state.updatePatch?.verifiedAt).toBeInstanceOf(Date);
  });

  it("null を明示した項目は消去できる", async () => {
    await createCaller("admin").admin.updateOrgListing({
      regNo: "19登-000020",
      verifiedAt: null,
      websiteUrl: null,
    });
    expect(state.updatePatch).toMatchObject({ verifiedAt: null, websiteUrl: null });
  });

  it("更新項目が無い場合はエラーにする", async () => {
    await expect(
      createCaller("admin").admin.updateOrgListing({ regNo: "19登-000020" })
    ).rejects.toThrow();
    expect(state.updateWhereCalled).toBe(false);
  });

  it("19分野に無い分野名は受け付けない", async () => {
    await expect(
      createCaller("admin").admin.updateOrgListing({
        regNo: "19登-000020",
        // 旧分野名。LEGACY_FIELD_MAPで現行名に変換してから渡す必要がある
        fields: ["素形材・産業機械・電気電子情報関連製造業" as never],
      })
    ).rejects.toThrow();
    expect(state.updateWhereCalled).toBe(false);
  });

  it("未知の地域名は受け付けない", async () => {
    await expect(
      createCaller("admin").admin.updateOrgListing({
        regNo: "19登-000020",
        preferredRegions: ["東京一円"],
      })
    ).rejects.toThrow(/未知の地域名/);
    expect(state.updateWhereCalled).toBe(false);
  });

  it("都道府県名・地方名・全国は受け付ける", async () => {
    await createCaller("admin").admin.updateOrgListing({
      regNo: "19登-000020",
      preferredRegions: ["全国", "熊本県", "中四国"],
    });
    expect(state.updateWhereCalled).toBe(true);
  });

  it("支援料の下限が上限を超える場合はエラーにする", async () => {
    await expect(
      createCaller("admin").admin.updateOrgListing({
        regNo: "19登-000020",
        monthlyFeeMin: 30000,
        monthlyFeeMax: 9800,
      })
    ).rejects.toThrow(/支援料/);
    expect(state.updateWhereCalled).toBe(false);
  });

  it("不正なURLは受け付けない", async () => {
    await expect(
      createCaller("admin").admin.updateOrgListing({
        regNo: "19登-000020",
        websiteUrl: "ij-tokuteiginou.com",
      })
    ).rejects.toThrow();
  });

  it("登録番号が見つからない場合は更新しない", async () => {
    state.selectRows = [];
    await expect(
      createCaller("admin").admin.updateOrgListing({ regNo: "99登-999999", consultStatus: "open" })
    ).rejects.toThrow();
    expect(state.updateWhereCalled).toBe(false);
  });

  it("同一登録番号が複数件ある場合は更新せず中止する", async () => {
    state.selectRows = [{ id: 1 }, { id: 2 }];
    await expect(
      createCaller("admin").admin.updateOrgListing({ regNo: "19登-000020", consultStatus: "open" })
    ).rejects.toThrow();
    expect(state.updateWhereCalled).toBe(false);
  });
});

describe("PENDING_LISTING_UPDATES", () => {
  it("反映待ちの下書きはすべて updateOrgListing の検証を通る", async () => {
    for (const entry of PENDING_LISTING_UPDATES) {
      state.selectRows = [{ id: 1 }];
      state.updateWhereCalled = false;
      await expect(
        createCaller("admin").admin.updateOrgListing({
          regNo: entry.regNo,
          ...entry.payload,
        })
      ).resolves.toMatchObject({ ok: true });
      expect(state.updateWhereCalled).toBe(true);
    }
  });

  it("同じ登録番号の下書きが重複していない", () => {
    const regNos = PENDING_LISTING_UPDATES.map((e) => e.regNo);
    expect(new Set(regNos).size).toBe(regNos.length);
  });

  it("確認情報には出典が明記されている", () => {
    for (const entry of PENDING_LISTING_UPDATES) {
      if (entry.payload.verifiedNote == null) continue;
      expect(entry.payload.verifiedNote).toMatch(/事業者本人|公式サイト|登録簿/);
    }
  });
});

describe("admin.orgByRegNo", () => {
  it("非adminは拒否する", async () => {
    await expect(createCaller("user").admin.orgByRegNo({ regNo: "19登-000020" })).rejects.toThrow();
  });

  it("adminは1件取得できる", async () => {
    state.selectRows = [{ id: 30018, regNo: "19登-000020", name: "株式会社インバウンドジャパン" }];
    const row = await createCaller("admin").admin.orgByRegNo({ regNo: "19登-000020" });
    expect(row.id).toBe(30018);
  });

  // 送客優先度は drizzle/schema.ts に載っており（drizzle/0010_solid_war_machine.sql）、
  // 列の有無を実行時に確かめる分岐は無くなった。値が無ければ unknown を返す
  it("送客優先度が未設定なら unknown で返る（管理画面をエラーにしない）", async () => {
    state.selectRows = [{ id: 30018, regNo: "19登-000020", name: "株式会社インバウンドジャパン" }];
    const row = await createCaller("admin").admin.orgByRegNo({ regNo: "19登-000020" });
    expect(row.referral.intent).toBe("unknown");
    expect(row.referral.note).toBeNull();
  });

  it("見つからない場合はNOT_FOUND", async () => {
    state.selectRows = [];
    await expect(createCaller("admin").admin.orgByRegNo({ regNo: "99登-999999" })).rejects.toThrow();
  });
});
