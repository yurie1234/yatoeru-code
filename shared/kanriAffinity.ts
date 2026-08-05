import { ADJACENT_PREFECTURES, AFFINITY_WEIGHTS } from "./tokutei";

/**
 * 監理団体（技能実習→育成就労の移行主体）の親和性スコア。
 *
 * 登録支援機関の親和性スコア（shared/affinity.ts）とは配点が別物になる。
 * 理由は単純で、**監理団体のデータには「対応分野」「対応言語」が存在しない**。
 * OTITの監理団体許可一覧には都道府県・許可区分・受入国・技能実習の職種コードしか無く、
 * 職種コードを特定技能19分野へ変換する一次情報の対応表を確認できていないため、
 * ここで独自に対応表を作ることはしない（事実と推測を区別する社則に反する）。
 *
 * 唯一、分野に相当する検証済みの信号が「介護職種の有無」（`kaigoSupport`。
 * OTITデータに直接ある布尔値）なので、目的分野が「介護」のときだけこれを使う。
 * それ以外の18分野は、監理団体側では加点対象にしない（無い情報を装わない）。
 */

/** 監理団体スコアの配点。登録支援機関側と一部の考え方を揃えている（地域は同じ重み） */
export const KANRI_AFFINITY_WEIGHTS = {
  prefSame: AFFINITY_WEIGHTS.prefSame, // 30: 同一都道府県
  prefAdjacent: AFFINITY_WEIGHTS.prefAdjacent, // 15: 隣接都道府県
  countryMatch: 20, // 受入れ実績のある国が希望国と一致
  careMatch: 20, // 目的分野が「介護」で、介護職種に対応している（OTITデータの実フラグ）
  // 「回答済み」への加点。回答の内容（申請済み／移行しない予定 等）では差をつけない。
  // 差をつけると「良い回答」を誘導することになり、中立性ポリシーに反する。
  // 評価するのは「未確認のまま放置していないか」だけ。無料で誰でも埋められる。
  responded: 10,
  noPenalty: 10, // 処分公表なし
} as const;

export interface KanriAffinityInput {
  targetPrefecture?: string | null;
  /** 希望する受入国（日本語表記。例: "ベトナム"） */
  targetCountry?: string | null;
  /** 介護分野を目的にしているか（TOKUTEI_FIELDS の "介護" が指定されたとき true） */
  wantsCare?: boolean;
}

export interface KanriAffinityOrgData {
  prefecture: string | null;
  /** 受入れ国（カンマ・読点区切りの原文。例: "ベトナム、ミャンマー"） */
  receiveCountries: string | null;
  kaigoSupport: boolean | null;
  migrationStatus: string;
  hasPenalty: boolean | null;
}

export interface KanriAffinityReason {
  label: string;
  points: number;
}

export interface KanriAffinityResult {
  score: number;
  /** 評価できる満点。指定していない条件の配点は満点から落ちる（登録支援機関側と同じ考え方） */
  maxScore: number;
  reasons: KanriAffinityReason[];
}

/** 評価の根拠（都道府県・受入国・介護分野希望）が1つでも指定されているか */
export function hasKanriAffinityCondition(input: KanriAffinityInput): boolean {
  return Boolean(input.targetPrefecture || input.targetCountry || input.wantsCare);
}

export function calcKanriMaxScore(input: KanriAffinityInput): number {
  return (
    (input.targetPrefecture ? KANRI_AFFINITY_WEIGHTS.prefSame : 0) +
    (input.targetCountry ? KANRI_AFFINITY_WEIGHTS.countryMatch : 0) +
    (input.wantsCare ? KANRI_AFFINITY_WEIGHTS.careMatch : 0) +
    KANRI_AFFINITY_WEIGHTS.responded +
    KANRI_AFFINITY_WEIGHTS.noPenalty
  );
}

/** `receiveCountries` の原文（カンマ・読点区切り）を国名の配列にする。集計にも使う */
export function splitCountries(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[、,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function calcKanriAffinity(
  input: KanriAffinityInput,
  org: KanriAffinityOrgData
): KanriAffinityResult {
  const reasons: KanriAffinityReason[] = [];
  let score = 0;

  // --- 地域一致 ---
  if (input.targetPrefecture) {
    if (org.prefecture === input.targetPrefecture) {
      score += KANRI_AFFINITY_WEIGHTS.prefSame;
      reasons.push({ label: `${input.targetPrefecture}内`, points: KANRI_AFFINITY_WEIGHTS.prefSame });
    } else if (
      org.prefecture &&
      (ADJACENT_PREFECTURES[input.targetPrefecture] ?? []).includes(org.prefecture)
    ) {
      score += KANRI_AFFINITY_WEIGHTS.prefAdjacent;
      reasons.push({ label: `隣接県（${org.prefecture}）`, points: KANRI_AFFINITY_WEIGHTS.prefAdjacent });
    }
  }

  // --- 受入国一致 ---
  if (input.targetCountry) {
    const countries = splitCountries(org.receiveCountries);
    if (countries.includes(input.targetCountry)) {
      score += KANRI_AFFINITY_WEIGHTS.countryMatch;
      reasons.push({ label: `${input.targetCountry}の受入れ実績`, points: KANRI_AFFINITY_WEIGHTS.countryMatch });
    }
  }

  // --- 介護分野（OTITデータの実フラグのみを使う。推定はしない） ---
  if (input.wantsCare && org.kaigoSupport) {
    score += KANRI_AFFINITY_WEIGHTS.careMatch;
    reasons.push({ label: "介護職種に対応", points: KANRI_AFFINITY_WEIGHTS.careMatch });
  }

  // --- 回答済み（内容ではなく、確認済みであること自体を評価） ---
  if (org.migrationStatus !== "unconfirmed") {
    score += KANRI_AFFINITY_WEIGHTS.responded;
    reasons.push({ label: "移行状況を確認済み", points: KANRI_AFFINITY_WEIGHTS.responded });
  }

  // --- 信頼性 ---
  if (org.hasPenalty === false || org.hasPenalty === null) {
    score += KANRI_AFFINITY_WEIGHTS.noPenalty;
    reasons.push({ label: "処分公表なし", points: KANRI_AFFINITY_WEIGHTS.noPenalty });
  }

  const maxScore = calcKanriMaxScore(input);
  return { score: Math.min(maxScore, score), maxScore, reasons };
}

export function normalizedKanriScore(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
}

/**
 * 説明文（UI表示用・単一ソース）。登録支援機関側の AFFINITY_METHODOLOGY と対になる。
 * 「回答済み」への加点が内容ではなく確認の有無だけであることを必ず明記する
 * （景表法のステマ規制・中立性ポリシーの観点で、これが唯一の危険な加点だから）。
 */
export const KANRI_AFFINITY_METHODOLOGY =
  "監理団体の親和性スコアは登録支援機関と別の指標です。監理団体のデータには対応分野・対応言語が無いため、地域一致30点（同一都道府県・隣接県15）／受入国一致20点／介護職種への対応20点（OTITデータに記録された実績の有無のみで判定。分野の推定はしません）／移行状況の確認済み10点（申請済み・準備中・未定・移行しないのいずれであっても、確認済みであれば同じ10点を加点します。回答の内容によって差はつけません）／信頼性10点（処分公表なし）で算定します。介護以外の18分野は監理団体データからは判定できないため評価に含めません。有料掲載の有無・当サイトへの紹介料の有無はスコアに影響しません。同点の機関は管理IDの順に表示します。";
