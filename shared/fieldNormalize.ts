import { LEGACY_FIELD_MAP, TOKUTEI_FIELDS, type TokuteiField } from "./tokutei";

/**
 * 分野名の正規化。
 *
 * support_orgs.fields には正式名称（TOKUTEI_FIELDS）だけを入れる。
 * 過去に分野特化ページのスラッグ（kaigo / building-cleaning など）がそのまま
 * 保存されていた機関があり、掲載ページの分野タグとtitle・meta descriptionに
 * 「対応分野：kaigo・building-cleaning ほか」とローマ字が出ていた。
 * 取り込み経路で必ずここを通して、スラッグ・旧分野名を正式名称へ寄せる。
 */

/** 分野特化ページのスラッグ → 正式名称。shared/bunya.ts の定義と対応（重い定義を読まないため個別に持つ） */
export const FIELD_SLUG_TO_NAME: Record<string, TokuteiField> = {
  kaigo: "介護",
  "building-cleaning": "ビルクリーニング",
  "linen-supply": "リネンサプライ",
  "kogyo-seihin": "工業製品製造業",
  kensetsu: "建設",
  zosen: "造船・舶用工業",
  "jidosha-seibi": "自動車整備",
  koku: "航空",
  shukuhaku: "宿泊",
  "jidosha-unso": "自動車運送業",
  tetsudo: "鉄道",
  "butsuryu-soko": "物流倉庫",
  nogyo: "農業",
  gyogyo: "漁業",
  inshokuryohin: "飲食料品製造業",
  gaishoku: "外食業",
  ringyo: "林業",
  mokuzai: "木材産業",
  "shigen-junkan": "資源循環",
};

const FIELD_NAME_SET = new Set<string>(TOKUTEI_FIELDS);

/** 1件を正式名称に寄せる。判別できなければ null */
export function normalizeFieldName(value: string): TokuteiField | null {
  const v = value.trim();
  if (!v) return null;
  if (FIELD_NAME_SET.has(v)) return v as TokuteiField;
  if (LEGACY_FIELD_MAP[v]) return LEGACY_FIELD_MAP[v];
  return FIELD_SLUG_TO_NAME[v] ?? null;
}

/** 配列を正式名称に寄せ、重複と判別不能な値を落とす */
export function normalizeFieldNames(values: readonly string[] | null | undefined): TokuteiField[] {
  const out: TokuteiField[] = [];
  for (const v of values ?? []) {
    const n = normalizeFieldName(v);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}
