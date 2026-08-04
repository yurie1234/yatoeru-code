/**
 * 診断ウィザードの画面構成に関する純粋ロジック。
 * 画面側から切り出してテストできるようにしている。
 */

/** 質問ウィザードの画面種別 */
export type QuestionStep =
  | "confirm"
  | "field"
  | "prefecture"
  | "headcount"
  | "timing"
  | "experience";

/**
 * 質問の並びを決める。
 *
 * AIが分野・都道府県の両方を読み取れた場合は、個別に2問聞く代わりに
 * 1画面の確認にまとめる（体感の質問数を減らす）。片方だけ読み取れた場合は、
 * 読み取れた側は確認を挟まずそのまま採用し、読み取れなかった側だけを聞く。
 */
export function buildQuestionSteps(readField: boolean, readPrefecture: boolean): QuestionStep[] {
  const steps: QuestionStep[] = [];
  if (readField && readPrefecture) {
    steps.push("confirm");
  } else {
    if (!readField) steps.push("field");
    if (!readPrefecture) steps.push("prefecture");
  }
  steps.push("headcount", "timing", "experience");
  return steps;
}

/**
 * チェックコメントから、採点内訳を並べた導入部分（「a)…合計N点。」）を外した本文を返す。
 * 内訳は画面側で項目として表示するため、文章中の重複を落とす。
 * 取り除いた結果が空になる場合は元の文章を返す（情報を失わせない）。
 */
export function stripScoreIntro(reason: string | null | undefined): string {
  const raw = (reason ?? "").trim();
  if (!raw) return "";
  const stripped = raw.replace(/^a\)[\s\S]*?合計\d+点。/, "").trim();
  return stripped || raw;
}

/**
 * ローディング表示のステップ想定秒数。
 * URL入力時はページ取得の時間が加わるため1段目に時間を割り当てる。
 * 会社名だけの入力ではページ取得を行わないので0にする。
 */
export function loadingStepSeconds(hasUrlInput: boolean): number[] {
  return hasUrlInput ? [4, 5, 3, 2, 2] : [0, 5, 3, 2, 2];
}

/** 経過時間から現在のステップ番号を求める（想定を超えたら最後のステップに留める） */
export function loadingStepIndex(elapsedMs: number, stepSeconds: number[]): number {
  let acc = 0;
  for (let i = 0; i < stepSeconds.length; i++) {
    acc += stepSeconds[i] * 1000;
    if (elapsedMs < acc) return i;
  }
  return stepSeconds.length - 1;
}

/** 進捗率（完了前は95%で止める。想定超過でも巻き戻さない） */
export function loadingPercent(elapsedMs: number, stepSeconds: number[]): number {
  const totalMs = stepSeconds.reduce((a, b) => a + b, 0) * 1000;
  if (totalMs <= 0) return 95;
  return Math.min(95, Math.round((elapsedMs / totalMs) * 100));
}
