import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

/**
 * sheetSyncHandler の検証3ルール（件数10%減・キー重複・必須カラム欠損）と
 * 認可（cron/adminのみ）のテスト。DBはモック。
 */

const mockAuthenticate = vi.fn();
vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: (...args: unknown[]) => mockAuthenticate(...args) },
}));

// drizzle DBモック: select/insert/update/deleteのチェーンを最低限再現
const state: { supportOrgRows: Array<{ id: number; regNo: string }>; kanriRows: Array<{ id: number; managementId: string }> } = {
  supportOrgRows: [],
  kanriRows: [],
};

const insertedLogs: unknown[] = [];

vi.mock("./db", async () => {
  const { getTableName } = await import("drizzle-orm");
  return {
  getDb: async () => ({
    select: (_fields?: unknown) => ({
      from: (table: never) => {
        const tableName = String(getTableName(table));
        const rows =
          tableName === "kanri_orgs" ? state.kanriRows : state.supportOrgRows;
        const chain = Object.assign(Promise.resolve(rows), {
          where: () => Object.assign(Promise.resolve(rows), { limit: () => Promise.resolve(rows) }),
          limit: () => Promise.resolve(rows),
        });
        return chain;
      },
    }),
    insert: (table: never) => ({
      values: async (vals: unknown) => {
        const tableName = String(getTableName(table));
        if (tableName === "sheet_sync_logs") insertedLogs.push(vals);
        return [{ insertId: 1 }];
      },
    }),
    update: () => ({
      set: () => ({ where: async () => [{ affectedRows: 1 }] }),
    }),
    delete: () => ({ where: async () => [{ affectedRows: 1 }] }),
  }),
  };
});

import { sheetSyncHandler } from "./sheetSync";

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: { error?: string; ok?: boolean } };
}

function reqWith(body: unknown): Request {
  return { body, originalUrl: "/api/scheduled/sheet-sync", headers: {} } as unknown as Request;
}

describe("sheetSyncHandler", () => {
  beforeEach(() => {
    state.supportOrgRows = [];
    state.kanriRows = [];
    insertedLogs.length = 0;
    mockAuthenticate.mockReset();
    mockAuthenticate.mockResolvedValue({ isCron: true, taskUid: "task_x" });
  });

  it("非cron・非adminは403", async () => {
    mockAuthenticate.mockResolvedValue({ isCron: false, role: "user" });
    const res = mockRes();
    await sheetSyncHandler(reqWith({}), res);
    expect(res.statusCode).toBe(403);
  });

  it("キー重複を検出して400中断", async () => {
    const res = mockRes();
    await sheetSyncHandler(
      reqWith({
        type: "kanri",
        baseDate: "2026-07-30",
        rows: [
          { managementId: "I-0001", name: "A組合", prefecture: "北海道", permitType: "general" },
          { managementId: "I-0001", name: "B組合", prefecture: "東京都", permitType: "general" },
        ],
      }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("duplicate-keys");
  });

  it("必須カラム欠損（都道府県不正）を検出して400中断", async () => {
    const res = mockRes();
    await sheetSyncHandler(
      reqWith({
        type: "kanri",
        baseDate: "2026-07-30",
        rows: [{ managementId: "I-0001", name: "A組合", prefecture: "存在しない県", permitType: "general" }],
      }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("missing-required-columns");
  });

  it("総件数10%以上減を検出して400中断", async () => {
    state.kanriRows = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      managementId: `I-${String(i + 1).padStart(4, "0")}`,
    }));
    const res = mockRes();
    await sheetSyncHandler(
      reqWith({
        type: "kanri",
        baseDate: "2026-07-30",
        rows: Array.from({ length: 80 }, (_, i) => ({
          managementId: `I-${String(i + 1).padStart(4, "0")}`,
          name: `組合${i + 1}`,
          prefecture: "北海道",
          permitType: "general",
        })),
      }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("count-drop-over-10-percent");
  });

  it("正常なkanri同期は200でadded件数を返す", async () => {
    const res = mockRes();
    await sheetSyncHandler(
      reqWith({
        type: "kanri",
        baseDate: "2026-07-30",
        rows: [
          { managementId: "I-0001", name: "A組合", prefecture: "北海道", permitType: "general" },
          { managementId: "T-0001", name: "B組合", prefecture: "東京都", permitType: "specific" },
        ],
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("management同期はplan/consultStatusをsupport_orgsに反映して200", async () => {
    const res = mockRes();
    await sheetSyncHandler(
      reqWith({
        type: "management",
        baseDate: "2026-07-30",
        rows: [{ orgId: "19登-000001", plan: "paid", consultStatus: "open" }],
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
