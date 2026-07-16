import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * registrySync のペイロード検証・差分計算ロジックのテスト。
 * DB接続を伴う統合テストではなく、純粋ロジック部分を検証する。
 */

// registrySync.ts と同じスキーマ定義（検証ロジックの仕様固定）
const payloadSchema = z.object({
  baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUrl: z.string().url().max(512),
  allRegNos: z.array(z.string().min(1).max(32)).min(1000),
  newOrgs: z
    .array(z.object({ regNo: z.string(), name: z.string() }))
    .optional()
    .default([]),
});

function calcDiff(currentRegNos: string[], incomingRegNos: string[]) {
  const currentSet = new Set(currentRegNos);
  const incomingSet = new Set(incomingRegNos);
  return {
    added: incomingRegNos.filter((r) => !currentSet.has(r)),
    removed: currentRegNos.filter((r) => !incomingSet.has(r)),
  };
}

const manyRegNos = (n: number, prefix = "19登") =>
  Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(6, "0")}`);

describe("registry-sync payload validation", () => {
  it("accepts a valid payload", () => {
    const result = payloadSchema.safeParse({
      baseDate: "2026-07-23",
      sourceUrl: "https://www.moj.go.jp/isa/content/001466143.xlsx",
      allRegNos: manyRegNos(1200),
    });
    expect(result.success).toBe(true);
  });

  it("rejects malformed baseDate", () => {
    const result = payloadSchema.safeParse({
      baseDate: "2026/07/23",
      sourceUrl: "https://example.com/x.xlsx",
      allRegNos: manyRegNos(1200),
    });
    expect(result.success).toBe(false);
  });

  it("rejects suspiciously small registry lists (fetch failure guard)", () => {
    // 登録簿は1万件超。1000件未満は取得失敗とみなして拒否する
    const result = payloadSchema.safeParse({
      baseDate: "2026-07-23",
      sourceUrl: "https://example.com/x.xlsx",
      allRegNos: manyRegNos(50),
    });
    expect(result.success).toBe(false);
  });
});

describe("registry diff calculation", () => {
  it("detects added and removed regNos by set difference", () => {
    const current = ["A1", "A2", "A3"];
    const incoming = ["A2", "A3", "B1", "B2"];
    const { added, removed } = calcDiff(current, incoming);
    expect(added).toEqual(["B1", "B2"]);
    expect(removed).toEqual(["A1"]);
  });

  it("returns empty diffs when nothing changed", () => {
    const regNos = manyRegNos(10);
    const { added, removed } = calcDiff(regNos, [...regNos]);
    expect(added).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });

  it("mass-removal threshold (500) would be exceeded on fetch corruption", () => {
    // 安全弁の仕様固定: 前回1万件→今回1000件のような欠損取得では removed が500を超え、中断される
    const current = manyRegNos(10000);
    const incoming = current.slice(0, 1000);
    const { removed } = calcDiff(current, incoming);
    expect(removed.length).toBeGreaterThan(500);
  });
});
