import { describe, expect, it } from "vitest";
import {
  calcKanriAffinity,
  calcKanriMaxScore,
  hasKanriAffinityCondition,
  normalizedKanriScore,
  splitCountries,
} from "../shared/kanriAffinity";

// 監理団体には対応分野・対応言語が無い（OTIT許可一覧に存在しない）。
// そのため登録支援機関の親和性スコア（分野40・地域30・言語20）とは別の配点になる。
// ここでは「無い情報を装って加点しないこと」と「回答の内容では差をつけないこと」を固定する。

const base = {
  prefecture: "東京都",
  receiveCountries: "ベトナム、ミャンマー",
  kaigoSupport: false,
  migrationStatus: "unconfirmed",
  hasPenalty: false,
};

describe("splitCountries", () => {
  it("カンマ・読点・全角カンマを区切りとして分割する", () => {
    expect(splitCountries("ベトナム、ミャンマー")).toEqual(["ベトナム", "ミャンマー"]);
    expect(splitCountries("ベトナム,ミャンマー,フィリピン")).toEqual(["ベトナム", "ミャンマー", "フィリピン"]);
    expect(splitCountries("ベトナム，ミャンマー")).toEqual(["ベトナム", "ミャンマー"]);
  });

  it("nullや空文字は空配列", () => {
    expect(splitCountries(null)).toEqual([]);
    expect(splitCountries("")).toEqual([]);
  });
});

describe("hasKanriAffinityCondition / calcKanriMaxScore", () => {
  it("条件が1つも無ければ false（回答済み・信頼性の常時加点20点だけでは条件とみなさない）", () => {
    expect(hasKanriAffinityCondition({})).toBe(false);
    expect(calcKanriMaxScore({})).toBe(20); // responded(10) + noPenalty(10)
  });

  it("都道府県だけ指定すると満点が30増える", () => {
    expect(hasKanriAffinityCondition({ targetPrefecture: "東京都" })).toBe(true);
    expect(calcKanriMaxScore({ targetPrefecture: "東京都" })).toBe(50); // 30 + 10 + 10
  });

  it("受入国と介護希望を両方指定すると満点が最大になる", () => {
    const input = { targetPrefecture: "東京都", targetCountry: "ベトナム", wantsCare: true };
    expect(calcKanriMaxScore(input)).toBe(90); // 30 + 20 + 20 + 10 + 10
  });
});

describe("calcKanriAffinity", () => {
  it("地域一致（同一県30・隣接県15）", () => {
    const same = calcKanriAffinity({ targetPrefecture: "東京都" }, base);
    expect(same.score).toBeGreaterThanOrEqual(30);
    expect(same.reasons.some((r) => r.label.includes("東京都内"))).toBe(true);

    const adjacent = calcKanriAffinity(
      { targetPrefecture: "神奈川県" },
      { ...base, prefecture: "東京都" }
    );
    expect(adjacent.reasons.some((r) => r.points === 15)).toBe(true);

    const far = calcKanriAffinity({ targetPrefecture: "北海道" }, base);
    expect(far.reasons.some((r) => r.label.includes("内") || r.points === 15)).toBe(false);
  });

  it("受入国一致は原文の分割結果に含まれるときだけ加点する", () => {
    const hit = calcKanriAffinity({ targetCountry: "ベトナム" }, base);
    expect(hit.reasons.some((r) => r.label.includes("ベトナム"))).toBe(true);

    const miss = calcKanriAffinity({ targetCountry: "ネパール" }, base);
    expect(miss.reasons.some((r) => r.label.includes("ネパール"))).toBe(false);
  });

  it("介護希望は kaigoSupport フラグが true のときだけ加点する（推定はしない）", () => {
    const supported = calcKanriAffinity({ wantsCare: true }, { ...base, kaigoSupport: true });
    expect(supported.reasons.some((r) => r.label === "介護職種に対応")).toBe(true);

    const notSupported = calcKanriAffinity({ wantsCare: true }, { ...base, kaigoSupport: false });
    expect(notSupported.reasons.some((r) => r.label === "介護職種に対応")).toBe(false);
  });

  it("移行状況は「確認済みかどうか」だけで加点し、内容による差はつけない", () => {
    const statuses = ["preparing", "applying", "permitted", "not_migrating"];
    const points = statuses.map((migrationStatus) => {
      const r = calcKanriAffinity({}, { ...base, migrationStatus });
      return r.reasons.find((x) => x.label === "移行状況を確認済み")?.points;
    });
    // 全ステータスで同じ点数（内容による優劣をつけない）
    expect(new Set(points).size).toBe(1);
    expect(points[0]).toBe(10);

    const unconfirmed = calcKanriAffinity({}, { ...base, migrationStatus: "unconfirmed" });
    expect(unconfirmed.reasons.some((r) => r.label === "移行状況を確認済み")).toBe(false);
  });

  it("処分歴なし・処分歴不明はどちらも加点する（減点主義にしない）", () => {
    const noPenalty = calcKanriAffinity({}, { ...base, hasPenalty: false });
    const unknownPenalty = calcKanriAffinity({}, { ...base, hasPenalty: null });
    const hasPenalty = calcKanriAffinity({}, { ...base, hasPenalty: true });
    expect(noPenalty.score).toBe(unknownPenalty.score);
    expect(hasPenalty.score).toBeLessThan(noPenalty.score);
  });

  it("スコアは満点を超えない", () => {
    const input = { targetPrefecture: "東京都", targetCountry: "ベトナム", wantsCare: true };
    const r = calcKanriAffinity(input, { ...base, kaigoSupport: true, migrationStatus: "permitted" });
    expect(r.score).toBeLessThanOrEqual(r.maxScore);
    expect(r.score).toBe(r.maxScore); // 全条件が一致しているので満点
  });
});

describe("normalizedKanriScore", () => {
  it("満点0のときは0を返す（0除算を避ける）", () => {
    expect(normalizedKanriScore(0, 0)).toBe(0);
  });

  it("100点満点に換算する", () => {
    expect(normalizedKanriScore(15, 30)).toBe(50);
    expect(normalizedKanriScore(30, 30)).toBe(100);
  });
});
