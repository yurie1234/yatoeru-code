import { describe, expect, it } from "vitest";
import {
  AFFINITY_METHODOLOGY,
  calcAffinity,
  calcFreshnessPoints,
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

  it("受入れ2027年度開始見込みの新分野はリネンサプライ・物流倉庫・資源循環の3分野", () => {
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

  it("分野・地域・言語・信頼性（処分歴なし＋実確認鮮度満点）がすべて一致すると100点になる", () => {
    const r = calcAffinity(
      { targetField: "外食業", targetPrefecture: "東京都", targetLanguage: "ベトナム語" },
      { ...baseOrg, fields: ["外食業"], verifiedAt: new Date() }
    );
    // 40 + 30 + 20 + 5 + 5(鮮度満点) = 100
    expect(r.score).toBe(100);
    expect(r.reasons.some((x) => x.label.includes("外食業"))).toBe(true);
  });

  it("未確認の機関は鮮度加点なし（40+30+20+5=95）", () => {
    const r = calcAffinity(
      { targetField: "外食業", targetPrefecture: "東京都", targetLanguage: "ベトナム語" },
      { ...baseOrg, fields: ["外食業"] }
    );
    expect(r.score).toBe(95);
    expect(r.reasons.some((x) => x.label.includes("運営実確認"))).toBe(false);
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

  it("処分歴のある機関は「処分歴なし」の加点が付かない", () => {
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

  it("鮮度加点は信頼性枠の5点を超えず、適合点を確認の有無が逆転させない", () => {
    // 分野一致（未確認） vs 分野不一致（確認済み）→前者が常に上位
    const matchUnverified = calcAffinity(
      { targetField: "介護", targetPrefecture: null, targetLanguage: null },
      { ...baseOrg, fields: ["介護"] }
    );
    const noMatchVerified = calcAffinity(
      { targetField: "介護", targetPrefecture: null, targetLanguage: null },
      { ...baseOrg, verifiedAt: new Date() }
    );
    expect(matchUnverified.score).toBeGreaterThan(noMatchVerified.score);
  });
});

describe("calcFreshnessPoints（実確認鮮度：連続減衰）", () => {
  const now = new Date("2026-07-16T00:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 3600 * 1000);

  it("未確認は0点", () => {
    expect(calcFreshnessPoints(null, now)).toBe(0);
    expect(calcFreshnessPoints(undefined, now)).toBe(0);
  });

  it("90日以内は5点満点", () => {
    expect(calcFreshnessPoints(daysAgo(0), now)).toBe(5);
    expect(calcFreshnessPoints(daysAgo(45), now)).toBe(5);
    expect(calcFreshnessPoints(daysAgo(90), now)).toBe(5);
  });

  it("91〜180日は線形に減衰し180日で2.5点", () => {
    expect(calcFreshnessPoints(daysAgo(135), now)).toBeCloseTo(3.75, 2);
    expect(calcFreshnessPoints(daysAgo(180), now)).toBeCloseTo(2.5, 2);
  });

  it("181日以降さらに減衰し365日で0点、以降も0点", () => {
    const mid = calcFreshnessPoints(daysAgo(272), now);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(2.5);
    expect(calcFreshnessPoints(daysAgo(365), now)).toBeCloseTo(0, 1);
    expect(calcFreshnessPoints(daysAgo(400), now)).toBe(0);
  });

  it("鮮度加点は常に0〜5点の範囲内（信頼性枠を超えない）", () => {
    for (const d of [0, 30, 90, 91, 135, 180, 181, 272, 365, 1000]) {
      const p = calcFreshnessPoints(daysAgo(d), now);
      expect(p).toBeLessThanOrEqual(5);
      expect(p).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("希望する相談条件（preferredFields / preferredRegions）のマッチング", () => {
  const edmile = {
    name: "合同会社エドミール",
    prefecture: "東京都",
    fields: ["介護"],
    languages: ["英語"],
    hasPenalty: false,
    registeredDate: "2025-01-01",
    verifiedAt: new Date(),
    preferredFields: ["介護"],
    preferredRegions: ["東京都"],
  };

  it("介護×東京都の相談でエドミール型の機関は80点（分野40＋地域30＋処分歴なし5＋鮮度5）", () => {
    const r = calcAffinity({ targetField: "介護", targetPrefecture: "東京都" }, edmile);
    expect(r.score).toBe(80);
    expect(r.reasons.some((x) => x.label === "介護対応（確認済み）")).toBe(true);
  });

  it("preferredFieldsに「全業種」を含む機関はどの分野でも確認済みマッチ、「全国」はどの県でも地域30点", () => {
    const tree = {
      ...edmile,
      name: "行政書士法人Tree",
      fields: null,
      preferredFields: ["全業種"],
      preferredRegions: ["全国"],
    };
    const r = calcAffinity({ targetField: "建設", targetPrefecture: "大阪府" }, tree);
    expect(r.reasons.some((x) => x.label === "建設対応（確認済み）")).toBe(true);
    expect(r.reasons.some((x) => x.label === "大阪府対応（確認済み）" && x.points === 30)).toBe(true);
  });

  it("preferredRegionsの地方名（東北等）に企業の県が含まれれば地域30点", () => {
    const fms = { ...edmile, preferredRegions: ["東北", "関東", "中部"] };
    const r = calcAffinity({ targetPrefecture: "宮城県" }, fms);
    expect(r.reasons.some((x) => x.label === "宮城県対応（確認済み）" && x.points === 30)).toBe(true);
  });

  it("確認日の違いでスコアが連続的に分解される（同点並びの自然解消）", () => {
    const now = new Date("2026-07-16T00:00:00Z");
    const recent = calcAffinity({}, { ...edmile, verifiedAt: new Date("2026-07-01") }, now);
    const stale = calcAffinity({}, { ...edmile, verifiedAt: new Date("2026-01-10") }, now);
    expect(recent.score).toBeGreaterThan(stale.score);
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

  it("同点時の並び順ルール（登録年月日の古い順）を明示している", () => {
    expect(AFFINITY_METHODOLOGY).toContain("同点");
    expect(AFFINITY_METHODOLOGY).toContain("登録年月日の古い順");
  });

  it("鮮度加点の開示文（最大5点・減衰・有料非連動・無料確認）を含む", () => {
    expect(AFFINITY_METHODOLOGY).toContain("最大5点");
    expect(AFFINITY_METHODOLOGY).toContain("減衰");
    expect(AFFINITY_METHODOLOGY).toContain("有料掲載の有無はスコアに影響しません");
    expect(AFFINITY_METHODOLOGY).toContain("無料");
  });
});
