import { describe, expect, it, vi, beforeEach } from "vitest";
import { sql } from "drizzle-orm";

// 送客優先度の列が未適用の環境でも管理画面がエラーにならないことを検証する。
//
// 当初は「Unknown column」というエラーメッセージで列の有無を判定していたが、
// drizzleが例外を `Failed query: SELECT ...` で包むため元のメッセージが message に
// 現れず、判定をすり抜けて管理画面にエラートーストが出た。
// 文言に依存せず information_schema で判定することを固定する。

vi.mock("./db", () => ({ getDb: vi.fn() }));

import {
  listReferralTargets,
  readReferralInfo,
  resetReferralColumnCache,
  writeReferralInfo,
} from "./referralIntent";

type Query = { sqlText: string };

function makeDb(columnCount: number, opts: { failOnReferralQuery?: boolean } = {}) {
  const queries: Query[] = [];
  const db = {
    execute: vi.fn(async (q: unknown) => {
      // drizzleのSQLオブジェクトから文字列を取り出す（テスト用の粗い判定）
      const text = JSON.stringify(q);
      queries.push({ sqlText: text });
      if (text.includes("information_schema")) {
        return [[{ c: columnCount }]];
      }
      if (opts.failOnReferralQuery) {
        // drizzleは元のMySQLエラーをこの形で包む（message に Unknown column が出ない）
        throw new Error(
          "Failed query: SELECT referralIntent, referralNote, referralUpdatedAt FROM support_orgs WHERE id = ? LIMIT 1 params: 37244"
        );
      }
      return [[{ id: 1, referralIntent: "interested", referralNote: "メモ", referralUpdatedAt: null }]];
    }),
  };
  return { db: db as never, queries };
}

beforeEach(() => {
  resetReferralColumnCache();
  vi.clearAllMocks();
});

describe("列が未適用の環境", () => {
  it("readReferralInfo は applied=false を返し、例外を投げない", async () => {
    const { db } = makeDb(0, { failOnReferralQuery: true });
    const info = await readReferralInfo(db, 37244);
    expect(info).toEqual({ applied: false, intent: "unknown", note: null, updatedAt: null });
  });

  it("未適用なら本体のSELECTを実行しない（例外の発生源に触れない）", async () => {
    const { db, queries } = makeDb(0, { failOnReferralQuery: true });
    await readReferralInfo(db, 37244);
    expect(queries).toHaveLength(1);
    expect(queries[0].sqlText).toContain("information_schema");
  });

  it("writeReferralInfo は false を返す（無言で成功扱いにしない）", async () => {
    const { db } = makeDb(0, { failOnReferralQuery: true });
    expect(await writeReferralInfo(db, 37244, { intent: "interested" })).toBe(false);
  });

  it("listReferralTargets は applied=false と空配列を返す", async () => {
    const { db } = makeDb(0, { failOnReferralQuery: true });
    expect(await listReferralTargets(db)).toEqual({ applied: false, rows: [] });
  });

  it("列が一部しか無い場合も未適用として扱う", async () => {
    const { db } = makeDb(2, { failOnReferralQuery: true });
    const info = await readReferralInfo(db, 37244);
    expect(info.applied).toBe(false);
  });
});

describe("列が適用済みの環境", () => {
  it("readReferralInfo が値を返す", async () => {
    const { db } = makeDb(3);
    const info = await readReferralInfo(db, 1);
    expect(info.applied).toBe(true);
    expect(info.intent).toBe("interested");
    expect(info.note).toBe("メモ");
  });

  it("writeReferralInfo は true を返す", async () => {
    const { db } = makeDb(3);
    expect(await writeReferralInfo(db, 1, { intent: "agreed", note: null })).toBe(true);
  });

  it("列の有無の判定結果はキャッシュされ、2回目は information_schema を引かない", async () => {
    const { db, queries } = makeDb(3);
    await readReferralInfo(db, 1);
    await readReferralInfo(db, 1);
    const probes = queries.filter((q) => q.sqlText.includes("information_schema"));
    expect(probes).toHaveLength(1);
  });

  it("未適用のうちは毎回判定し直す（マイグレーション適用に追従する）", async () => {
    const { db, queries } = makeDb(0);
    await readReferralInfo(db, 1);
    await readReferralInfo(db, 1);
    const probes = queries.filter((q) => q.sqlText.includes("information_schema"));
    expect(probes).toHaveLength(2);
  });

  it("更新項目が空なら何も実行しない", async () => {
    const { db, queries } = makeDb(3);
    expect(await writeReferralInfo(db, 1, {})).toBe(true);
    expect(queries).toHaveLength(0);
  });
});

describe("sqlタグの健全性", () => {
  it("テストが本物のdrizzle sqlタグを通していること", () => {
    // makeDb の JSON 判定が壊れていないかの保険
    expect(JSON.stringify(sql`SELECT 1 FROM information_schema.columns`)).toContain(
      "information_schema"
    );
  });
});
