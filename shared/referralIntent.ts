/**
 * 送客優先度（紹介料の意向）の区分。**完全非公開の運用情報**。
 *
 * 用途は「相談リードが来たときの手動振り分け」と「営業の優先順位づけ」だけで、
 * 親和性スコア・並び順・公開ページ・API・構造化データには一切出さない。
 * 紹介料で検索順位が動くならそれは広告であり、ラベルなしで検索結果に混ぜると
 * 景品表示法（ステマ規制）に触れる。表示に反映する場合は必ずPR表示を伴う
 * 別枠として実装する。
 */

export const REFERRAL_INTENTS = [
  "unknown",
  "interested",
  "negotiating",
  "agreed",
  "declined",
] as const;

export type ReferralIntent = (typeof REFERRAL_INTENTS)[number];

export const REFERRAL_INTENT_LABELS: Record<ReferralIntent, string> = {
  unknown: "未確認",
  interested: "意向あり（金額未定）",
  negotiating: "条件交渉中",
  agreed: "条件合意",
  declined: "意向なし",
};

/** 送客先候補として扱う区分（意向が確認できている先） */
export const REFERRAL_TARGET_INTENTS: readonly ReferralIntent[] = [
  "agreed",
  "negotiating",
  "interested",
] as const;
