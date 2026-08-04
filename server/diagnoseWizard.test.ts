import { describe, expect, it } from "vitest";
import {
  buildQuestionSteps,
  loadingPercent,
  loadingStepIndex,
  loadingStepSeconds,
  stripScoreIntro,
} from "../shared/diagnoseWizard";

describe("buildQuestionSteps（質問の並び）", () => {
  it("分野・都道府県の両方が読み取れたら、2問を1画面の確認にまとめる", () => {
    expect(buildQuestionSteps(true, true)).toEqual([
      "confirm",
      "headcount",
      "timing",
      "experience",
    ]);
  });

  it("両方まとめた場合の質問数は4問（従来は連絡先込みで6問）", () => {
    expect(buildQuestionSteps(true, true)).toHaveLength(4);
  });

  it("分野だけ読み取れなければ、分野のみ聞く", () => {
    expect(buildQuestionSteps(false, true)).toEqual([
      "field",
      "headcount",
      "timing",
      "experience",
    ]);
  });

  it("都道府県だけ読み取れなければ、都道府県のみ聞く", () => {
    expect(buildQuestionSteps(true, false)).toEqual([
      "prefecture",
      "headcount",
      "timing",
      "experience",
    ]);
  });

  it("どちらも読み取れなければ両方聞く（分野→都道府県の順）", () => {
    expect(buildQuestionSteps(false, false)).toEqual([
      "field",
      "prefecture",
      "headcount",
      "timing",
      "experience",
    ]);
  });

  it("どの分岐でも人数・時期・経験は必ず最後に聞く", () => {
    for (const [f, p] of [[true, true], [true, false], [false, true], [false, false]] as const) {
      expect(buildQuestionSteps(f, p).slice(-3)).toEqual(["headcount", "timing", "experience"]);
    }
  });

  it("連絡先はウィザードに含めない（結果表示後に任意で聞く）", () => {
    for (const [f, p] of [[true, true], [false, false]] as const) {
      expect(buildQuestionSteps(f, p)).not.toContain("contact");
    }
  });
});

describe("stripScoreIntro（チェックコメントの整形）", () => {
  it("採点内訳の導入部分を外す", () => {
    const raw =
      "a)分野該当性30点、b)人手不足度25点、c)情報の確からしさ17点、合計72点。飲食店運営は外食業分野の対象となり得ます。";
    expect(stripScoreIntro(raw)).toBe("飲食店運営は外食業分野の対象となり得ます。");
  });

  it("導入部分しか無い場合は元の文章を返す（情報を失わせない）", () => {
    const raw = "a)分野該当性30点、b)人手不足度25点、c)情報の確からしさ17点、合計72点。";
    expect(stripScoreIntro(raw)).toBe(raw);
  });

  it("導入部分が無い文章はそのまま返す（旧データ互換）", () => {
    const raw = "飲食店運営は外食業分野の対象となり得ます。";
    expect(stripScoreIntro(raw)).toBe(raw);
  });

  it("空・nullでも落ちない", () => {
    expect(stripScoreIntro(null)).toBe("");
    expect(stripScoreIntro(undefined)).toBe("");
    expect(stripScoreIntro("")).toBe("");
  });
});

describe("ローディング表示（実経過時間ベース）", () => {
  it("URL入力時はページ取得の時間を含む", () => {
    expect(loadingStepSeconds(true)[0]).toBeGreaterThan(0);
  });

  it("会社名のみの入力ではページ取得の時間を割り当てない", () => {
    expect(loadingStepSeconds(false)[0]).toBe(0);
  });

  it("経過時間に応じてステップが進む", () => {
    const secs = loadingStepSeconds(true); // [4,5,3,2,2]
    expect(loadingStepIndex(0, secs)).toBe(0);
    expect(loadingStepIndex(3_900, secs)).toBe(0);
    expect(loadingStepIndex(4_100, secs)).toBe(1);
    expect(loadingStepIndex(9_100, secs)).toBe(2);
  });

  it("想定時間を超えても最後のステップに留まる（範囲外にならない）", () => {
    const secs = loadingStepSeconds(true);
    expect(loadingStepIndex(60_000, secs)).toBe(secs.length - 1);
    expect(loadingStepIndex(600_000, secs)).toBe(secs.length - 1);
  });

  it("進捗は95%で止まる（完了していないのに100%にしない）", () => {
    const secs = loadingStepSeconds(true);
    expect(loadingPercent(0, secs)).toBe(0);
    expect(loadingPercent(8_000, secs)).toBeGreaterThan(0);
    expect(loadingPercent(16_000, secs)).toBe(95);
    expect(loadingPercent(600_000, secs)).toBe(95);
  });

  it("進捗は単調増加する（巻き戻らない）", () => {
    const secs = loadingStepSeconds(true);
    let prev = -1;
    for (let ms = 0; ms <= 30_000; ms += 500) {
      const v = loadingPercent(ms, secs);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
