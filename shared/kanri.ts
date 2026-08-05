/**
 * 監理団体（監理支援機関）まわりの共通の言い換え。
 *
 * 画面（トラッカー・詳細ページ）とSSRの構造化データの両方が使うため shared に置く。
 * 片方だけ直すと、画面には「申請中」と出ているのに構造化データは別の語になる、
 * という食い違いが起きる。
 */

/** DBの migrationStatus（7種）→ 画面に出す日本語 */
export const KANRI_STATUS_LABEL: Record<string, string> = {
  permitted: "許可取得",
  applying: "申請中",
  preparing: "申請準備中",
  planned: "申請予定",
  undecided: "未定",
  not_migrating: "移行しない",
  unconfirmed: "未確認",
};

/** DBの permitType → 画面に出す日本語 */
export const KANRI_PERMIT_LABEL: Record<string, string> = {
  general: "一般監理事業",
  specific: "特定監理事業",
};

/**
 * 管理ID（`I-0001` / `T-0001`）と詳細ページのURLの相互変換。
 *
 * 正本URLは小文字（`/kanri/i-0001`）。**登録番号を持たない監理団体でも
 * 営業文面からURLを組み立てられるようにするため**、内部の連番ではなく
 * 管理IDをURLに使っている（登録支援機関の `/org/22to-007304` と同じ考え方）。
 */
export function kanriPath(managementId: string): string {
  return `/kanri/${managementId.toLowerCase()}`;
}

/**
 * URLの断片から管理IDの正規形（`I-0001`）を取り出す。判定できなければ null。
 * 大文字小文字とハイフンの有無を吸収する（`i-0001` / `I0001` / `I-1` も可）。
 */
export function parseKanriId(raw: string): string | null {
  const m = raw.trim().match(/^([A-Za-z])-?(\d{1,6})$/);
  if (!m) return null;
  return `${m[1].toUpperCase()}-${m[2].padStart(4, "0")}`;
}
