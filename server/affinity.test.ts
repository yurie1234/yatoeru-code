import { describe, expect, it } from "vitest";
import {
  AFFINITY_METHODOLOGY,
  calcAffinity,
  calcFreshnessPoints,
  calcMaxScore,
  estimateOrgFields,
  hasAffinityCondition,
  normalizedScore,
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

  it("機関名からの推定一致は25点加点され、推定である旨がreasonに付く（確認済み40点より低い）", () => {
    const r = calcAffinity(
      { targetField: "鉄道", targetPrefecture: null, targetLanguage: null },
      { ...baseOrg, name: "上信電鉄株式会社", prefecture: "群馬県" }
    );
    const fieldReason = r.reasons.find((x) => x.label.includes("鉄道"));
    expect(fieldReason?.points).toBe(25);
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
    expect(AFFINITY_METHODOLOGY).toContain("有料掲載の有無");
    expect(AFFINITY_METHODOLOGY).toContain("紹介料の有無はスコアに影響しません");
    expect(AFFINITY_METHODOLOGY).toContain("無料");
  });

  it("受入状況を評価軸に含めたことと、その理由・配点を開示している", () => {
    expect(AFFINITY_METHODOLOGY).toContain("受入状況10点");
    expect(AFFINITY_METHODOLOGY).toContain("積極受入10点・受付中7点");
    expect(AFFINITY_METHODOLOGY).toContain("未確認および一時停止0点");
  });
});

describe("スコアを出す根拠（指定条件）と満点", () => {
  const org = {
    name: "テスト協同組合",
    prefecture: "東京都",
    fields: ["介護"],
    languages: ["英語"],
    hasPenalty: false,
    registeredDate: "2019-04-01",
    preferredFields: ["介護"],
    preferredRegions: ["東京都"],
  };

  it("分野・地域・言語のいずれも指定が無ければ、スコアの根拠が無いと判定する", () => {
    expect(hasAffinityCondition({})).toBe(false);
    expect(hasAffinityCondition({ targetField: null, targetPrefecture: null, targetLanguage: null })).toBe(
      false
    );
  });

  it("1つでも指定があれば根拠ありと判定する", () => {
    expect(hasAffinityCondition({ targetPrefecture: "熊本県" })).toBe(true);
    expect(hasAffinityCondition({ targetField: "介護" })).toBe(true);
    expect(hasAffinityCondition({ targetLanguage: "英語" })).toBe(true);
  });

  it("満点は指定された条件の配点＋信頼性10点だけで構成される", () => {
    expect(calcMaxScore({})).toBe(20);
    expect(calcMaxScore({ targetPrefecture: "東京都" })).toBe(50);
    expect(calcMaxScore({ targetField: "介護" })).toBe(60);
    expect(calcMaxScore({ targetLanguage: "英語" })).toBe(40);
    expect(calcMaxScore({ targetField: "介護", targetPrefecture: "東京都" })).toBe(90);
    expect(
      calcMaxScore({ targetField: "介護", targetPrefecture: "東京都", targetLanguage: "英語" })
    ).toBe(110);
  });

  it("19分野に無い分野名は配点に数えない（満点を押し上げない）", () => {
    expect(calcMaxScore({ targetField: "なにか" })).toBe(20);
  });

  it("分野の指定が無いとき、全機関に一律加点しない（根拠のない点数を出さない）", () => {
    const r = calcAffinity({ targetPrefecture: "東京都" }, org);
    // 地域30 + 処分歴なし5 = 35。以前はここに分野配点の半分20が乗って55になっていた
    expect(r.score).toBe(35);
    expect(r.maxScore).toBe(50);
    expect(r.reasons.some((x) => x.label.includes("分野"))).toBe(false);
  });

  it("条件が1つも無いときは信頼性だけが残り、満点も10になる", () => {
    const r = calcAffinity({}, org);
    expect(r.score).toBe(5);
    expect(r.maxScore).toBe(20);
    expect(r.reasons.map((x) => x.label)).toEqual(["処分歴なし"]);
  });

  it("スコアは満点を超えない", () => {
    const r = calcAffinity(
      { targetField: "介護", targetPrefecture: "東京都", targetLanguage: "英語" },
      { ...org, verifiedAt: new Date() }
    );
    expect(r.score).toBeLessThanOrEqual(r.maxScore);
    expect(r.score).toBe(100);
  });

  it("一律加点をやめても順位は変わらない（全機関に同じ点だったため）", () => {
    const inKumamoto = { ...org, prefecture: "熊本県", preferredRegions: ["熊本県"] };
    const inTokyo = { ...org, prefecture: "東京都", preferredRegions: ["東京都"] };
    const a = calcAffinity({ targetPrefecture: "熊本県" }, inKumamoto);
    const b = calcAffinity({ targetPrefecture: "熊本県" }, inTokyo);
    expect(a.score).toBeGreaterThan(b.score);
  });

  it("算定方法の説明に、指定条件だけを評価すること・100点換算・非表示条件が書かれている", () => {
    expect(AFFINITY_METHODOLOGY).toContain("指定された条件だけを評価");
    expect(AFFINITY_METHODOLOGY).toContain("100点満点に換算");
    expect(AFFINITY_METHODOLOGY).toContain("その条件での満点を併記");
    expect(AFFINITY_METHODOLOGY).toContain("スコアを表示しません");
  });
});

describe("受入状況（新規相談の受付ステータス）の配点", () => {
  const org = {
    name: "テスト協同組合",
    prefecture: "東京都",
    fields: ["介護"],
    languages: ["英語"],
    hasPenalty: false,
    registeredDate: "2019-04-01",
    preferredFields: ["介護"],
    preferredRegions: ["東京都"],
  };
  const input = { targetField: "介護", targetPrefecture: "東京都" };

  it("積極受入は10点、受付中は7点、未確認・一時停止は0点", () => {
    expect(calcAffinity(input, { ...org, consultStatus: "open_active" }).score).toBe(85);
    expect(calcAffinity(input, { ...org, consultStatus: "open" }).score).toBe(82);
    expect(calcAffinity(input, { ...org, consultStatus: "unknown" }).score).toBe(75);
    expect(calcAffinity(input, { ...org, consultStatus: "paused" }).score).toBe(75);
    expect(calcAffinity(input, { ...org, consultStatus: null }).score).toBe(75);
  });

  it("一時停止は減点しない（未確認と同点）", () => {
    const paused = calcAffinity(input, { ...org, consultStatus: "paused" });
    const unknown = calcAffinity(input, { ...org, consultStatus: "unknown" });
    expect(paused.score).toBe(unknown.score);
  });

  it("受付中の加点は理由として表示される", () => {
    const r = calcAffinity(input, { ...org, consultStatus: "open_active" });
    expect(r.reasons.some((x) => x.label === "新規相談 受付中（積極受入）")).toBe(true);
    const r2 = calcAffinity(input, { ...org, consultStatus: "open" });
    expect(r2.reasons.some((x) => x.label === "新規相談 受付中")).toBe(true);
  });

  it("未確認では受入状況の理由を出さない（推定で埋めない）", () => {
    const r = calcAffinity(input, { ...org, consultStatus: "unknown" });
    expect(r.reasons.some((x) => x.label.includes("新規相談"))).toBe(false);
  });

  it("受入状況は条件指定に関わらず満点に含まれる", () => {
    expect(calcAffinity({}, { ...org, consultStatus: "open_active" }).maxScore).toBe(20);
    expect(calcAffinity({}, { ...org, consultStatus: "unknown" }).maxScore).toBe(20);
  });

  it("受入状況だけで分野一致（40点）を逆転できない", () => {
    // 分野が合っていない積極受入 vs 分野が合っている未確認
    const activeNoField = calcAffinity(input, {
      ...org,
      name: "テスト鉄工所",
      fields: ["工業製品製造業"],
      preferredFields: ["工業製品製造業"],
      consultStatus: "open_active",
    });
    const unknownWithField = calcAffinity(input, { ...org, consultStatus: "unknown" });
    expect(unknownWithField.score).toBeGreaterThan(activeNoField.score);
  });
});

describe("分野一致の配点は確認済み > 推定 > 分野非限定 > 他分野の順になる", () => {
  const base = {
    prefecture: null,
    languages: null,
    hasPenalty: null,
    registeredDate: "2019-04-01",
  };
  const input = { targetField: "介護" };

  function fieldPoints(org: Parameters<typeof calcAffinity>[1]) {
    const r = calcAffinity(input, org);
    return r.reasons.find((x) => x.label.includes("分野") || x.label.includes("介護"))?.points ?? 0;
  }

  it("確認済み40 > 推定25 > 分野非限定20 > 他分野10", () => {
    const confirmed = fieldPoints({ ...base, name: "株式会社テスト", fields: ["介護"] });
    // 「ケア」が介護のキーワードに一致するため推定マッチになる
    const estimated = fieldPoints({ ...base, name: "株式会社ケアサポート", fields: null });
    const neutral = fieldPoints({ ...base, name: "株式会社テスト", fields: null });
    const otherField = fieldPoints({ ...base, name: "株式会社上信電鉄", fields: null });

    expect(confirmed).toBe(40);
    expect(estimated).toBe(25);
    expect(neutral).toBe(20);
    expect(otherField).toBe(10);
    expect(confirmed).toBeGreaterThan(estimated);
    expect(estimated).toBeGreaterThan(neutral);
    expect(neutral).toBeGreaterThan(otherField);
  });

  it("推定一致は、本人確認済みの機関を追い越せない", () => {
    // 推定一致＋積極受入 でも、確認済み分野の機関（受入未確認）を超えない
    const estimatedActive = calcAffinity(input, {
      ...base,
      name: "株式会社ケアサポート",
      fields: null,
      consultStatus: "open_active",
    });
    const confirmedUnknown = calcAffinity(input, {
      ...base,
      name: "株式会社テスト",
      fields: ["介護"],
      consultStatus: "unknown",
    });
    expect(confirmedUnknown.score).toBeGreaterThan(estimatedActive.score);
  });

  it("推定である旨のフラグが立つ（UIで「推定」と表示するため）", () => {
    const r = calcAffinity(input, { ...base, name: "株式会社ケアサポート", fields: null });
    expect(r.reasons.find((x) => x.label.includes("介護"))?.estimated).toBe(true);
  });

  it("算定説明文に推定の配点を明記している", () => {
    expect(AFFINITY_METHODOLOGY).toContain("推定による一致は25点");
    expect(AFFINITY_METHODOLOGY).toContain("分野非限定として20点");
  });
});

describe("normalizedScore（100点満点への換算）", () => {
  it("満点を取ると100点になる", () => {
    expect(normalizedScore(50, 50)).toBe(100);
    expect(normalizedScore(110, 110)).toBe(100);
  });

  it("0点は0点", () => {
    expect(normalizedScore(0, 50)).toBe(0);
  });

  it("条件が違っても同じ達成率なら同じ表示になる（満点の変動を利用者に見せない）", () => {
    // 地域だけ指定（満点50）で35点 = 70%
    expect(normalizedScore(35, 50)).toBe(70);
    // 全条件指定（満点110）で77点 = 70%
    expect(normalizedScore(77, 110)).toBe(70);
  });

  it("0〜100の範囲に収める", () => {
    expect(normalizedScore(200, 50)).toBe(100);
    expect(normalizedScore(-10, 50)).toBe(0);
  });

  it("満点が0以下でも落ちない", () => {
    expect(normalizedScore(10, 0)).toBe(0);
    expect(normalizedScore(10, -1)).toBe(0);
  });

  it("換算しても順位は変わらない（同一条件内では単調変換）", () => {
    const max = 90;
    const raws = [90, 87, 75, 65, 35, 0];
    const norm = raws.map((r) => normalizedScore(r, max));
    for (let i = 1; i < norm.length; i++) {
      expect(norm[i]).toBeLessThanOrEqual(norm[i - 1]);
    }
  });

  it("算定説明文が100点換算であることを明記している", () => {
    expect(AFFINITY_METHODOLOGY).toContain("100点満点に換算");
    expect(AFFINITY_METHODOLOGY).toContain("換算前の得点");
  });
});
