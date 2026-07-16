import { describe, expect, it } from "vitest";
import {
  AFFINITY_METHODOLOGY,
  calcAffinity,
  estimateOrgFields,
} from "../shared/affinity";
import { TOKUTEI_FIELDS, UPCOMING_FIELDS } from "../shared/tokutei";

describe("特定技能19分野マスタ", () => {
  it("TOKUTEI_FIELDSは19分野である", () => {
    expect(TOKUTEI_FIELDS).toHaveLength(19);
  });

  it("2024年追加分野（自動車運送業・鉄道・林業・木材産業）を含む", () => {
    for (const f of ["自動車運送業", "鉄道", "林業", "木材産業"]) {
      expect(TOKUTEI_FIELDS).toContain(f);
    }
  });

  it("旧12分野の統合分野名（素形材…）は含まず、工業製品製造業に置き換わっている", () => {
    expect(TOKUTEI_FIELDS as readonly string[]).not.toContain(
      "素形材・産業機械・電気電子情報関連製造業"
    );
    expect(TOKUTEI_FIELDS).toContain("工業製品製造業");
  });

  it("2027年受入開始予定分野はリネンサプライ・物流倉庫・資源循環の3分野", () => {
    expect(UPCOMING_FIELDS).toHaveLength(3);
    expect(UPCOMING_FIELDS).toContain("リネンサプライ");
  });
});

describe("estimateOrgFields（機関名からの分野推定）", () => {
  it("鉄道系の名称から「鉄道」を推定する", () => {
    expect(estimateOrgFields("上信電鉄株式会社")).toContain("鉄道");
  });

  it("介護系の名称から「介護」を推定する", () => {
    expect(estimateOrgFields("株式会社やさしいケアサポート")).toContain("介護");
  });

  it("外食系の名称から「外食業」を推定する", () => {
    expect(estimateOrgFields("グローバルフードサービス協同組合")).toContain("外食業");
  });

  it("分野シグナルのない名称は空配列（分野中立）", () => {
    expect(estimateOrgFields("株式会社グローバルブリッジ")).toHaveLength(0);
  });
});

describe("calcAffinity（親和性スコア）", () => {
  const baseOrg = {
    name: "株式会社グローバルブリッジ",
    prefecture: "東京都",
    fields: null,
    languages: ["ベトナム語", "英語"],
    hasPenalty: false,
    registeredDate: "2019-04-01",
  };

  it("分野・地域・言語・信頼性がすべて一致すると高スコアになる", () => {
    const r = calcAffinity(
      { targetField: "外食業", targetPrefecture: "東京都", targetLanguage: "ベトナム語" },
      { ...baseOrg, fields: ["外食業"] }
    );
    // 40 + 30 + 20 + 7 + 3 = 100
    expect(r.score).toBe(100);
    expect(r.reasons.some((x) => x.label.includes("外食業"))).toBe(true);
  });

  it("機関名からの推定一致は40点加点され、推定である旨がreasonに付く", () => {
    const r = calcAffinity(
      { targetField: "鉄道", targetPrefecture: null, targetLanguage: null },
      { ...baseOrg, name: "上信電鉄株式会社", prefecture: "群馬県" }
    );
    const fieldReason = r.reasons.find((x) => x.label.includes("鉄道"));
    expect(fieldReason?.points).toBe(40);
    expect(fieldReason?.estimated).toBe(true);
    expect(fieldReason?.label).toContain("機関名から推定");
  });

  it("分野シグナルなしの機関は中立20点（推定不能でも候補から排除しない）", () => {
    const r = calcAffinity(
      { targetField: "外食業", targetPrefecture: null, targetLanguage: null },
      baseOrg
    );
    const fieldReason = r.reasons.find((x) => x.label.includes("分野非限定"));
    expect(fieldReason?.points).toBe(20);
  });

  it("隣接県は15点、同一県は30点", () => {
    const same = calcAffinity(
      { targetPrefecture: "京都府" },
      { ...baseOrg, prefecture: "京都府" }
    );
    const adjacent = calcAffinity(
      { targetPrefecture: "京都府" },
      { ...baseOrg, prefecture: "大阪府" }
    );
    expect(same.reasons.some((x) => x.points === 30)).toBe(true);
    expect(adjacent.reasons.some((x) => x.points === 15)).toBe(true);
  });

  it("処分歴のある機関は信頼性7点が付かない", () => {
    const r = calcAffinity({}, { ...baseOrg, hasPenalty: true });
    expect(r.reasons.some((x) => x.label === "処分歴なし")).toBe(false);
  });

  it("スコアは100を超えない", () => {
    const r = calcAffinity(
      { targetField: "介護", targetPrefecture: "東京都", targetLanguage: "英語" },
      { ...baseOrg, name: "介護ケアメディカル株式会社", fields: ["介護"] }
    );
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("AFFINITY_METHODOLOGY（算定説明文）", () => {
  it("配点と推定である旨・免責を含む", () => {
    expect(AFFINITY_METHODOLOGY).toContain("40");
    expect(AFFINITY_METHODOLOGY).toContain("30");
    expect(AFFINITY_METHODOLOGY).toContain("20");
    expect(AFFINITY_METHODOLOGY).toContain("推定");
    expect(AFFINITY_METHODOLOGY).toContain("保証するものではなく");
  });
});
