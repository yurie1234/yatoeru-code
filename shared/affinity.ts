import {
  ADJACENT_PREFECTURES,
  AFFINITY_WEIGHTS,
  TOKUTEI_FIELDS,
  type TokuteiField,
} from "./tokutei";

/**
 * 機関名キーワード→推定得意分野のマッピング。
 * 入管庁登録簿には分野情報が存在しないため、機関名に含まれる業種語から
 * 得意分野を「推定」する。あくまで推定であることをUI上で明示する。
 */
export const FIELD_NAME_KEYWORDS: Record<TokuteiField, string[]> = {
  介護: ["介護", "ケア", "福祉", "メディカル", "看護", "医療"],
  ビルクリーニング: ["クリーニング", "ビルメン", "清掃", "美装", "管財"],
  リネンサプライ: ["リネン", "サプライ", "クリーンサービス"],
  工業製品製造業: ["工業", "製作所", "金属", "機械", "鉄工", "電子", "精密", "テクノ", "エンジニアリング", "産業"],
  建設: ["建設", "建築", "土木", "工務", "住建", "ハウス", "施工", "組立"],
  "造船・舶用工業": ["造船", "船舶", "マリン", "舶用"],
  自動車整備: ["自動車整備", "オート", "モーター", "車体", "整備"],
  航空: ["航空", "エア", "空港"],
  宿泊: ["ホテル", "旅館", "観光", "リゾート", "ツーリズム", "宿泊"],
  自動車運送業: ["運送", "運輸", "トラック", "物流サービス", "交通", "タクシー", "バス"],
  鉄道: ["鉄道", "電鉄", "軌道"],
  物流倉庫: ["倉庫", "ロジスティクス", "ロジテック", "物流"],
  農業: ["農業", "農協", "アグリ", "ファーム", "農園", "畜産", "酪農", "JA"],
  漁業: ["漁業", "水産", "漁協", "フィッシャリー", "海洋"],
  飲食料品製造業: ["食品", "フーズ", "製菓", "製パン", "水産加工", "食料品", "醸造", "乳業"],
  外食業: ["外食", "フード", "レストラン", "飲食", "ダイニング", "キッチン"],
  林業: ["林業", "森林", "山林", "フォレスト"],
  木材産業: ["木材", "製材", "ウッド", "銘木"],
  資源循環: ["リサイクル", "資源", "環境サービス", "再生", "循環"],
};

/** 分野推定の優先順（より特異的なキーワードを持つ分野を先に判定する） */
const FIELD_DETECTION_ORDER: TokuteiField[] = [
  "鉄道",
  "造船・舶用工業",
  "リネンサプライ",
  "自動車整備",
  "航空",
  "林業",
  "木材産業",
  "資源循環",
  "漁業",
  "農業",
  "介護",
  "ビルクリーニング",
  "物流倉庫",
  "自動車運送業",
  "宿泊",
  "外食業",
  "飲食料品製造業",
  "建設",
  "工業製品製造業",
];

/**
 * 機関名から推定得意分野を返す（最大3分野）。
 * シグナルがない場合は空配列（=分野中立）。
 */
export function estimateOrgFields(orgName: string): TokuteiField[] {
  const detected: TokuteiField[] = [];
  for (const field of FIELD_DETECTION_ORDER) {
    if (FIELD_NAME_KEYWORDS[field].some((kw) => orgName.includes(kw))) {
      detected.push(field);
      if (detected.length >= 3) break;
    }
  }
  return detected;
}

export interface AffinityInput {
  /** 診断・検索条件で指定された分野 */
  targetField?: string | null;
  /** 企業の所在都道府県 */
  targetPrefecture?: string | null;
  /** 希望する対応言語 */
  targetLanguage?: string | null;
}

export interface AffinityOrgData {
  name: string;
  prefecture: string | null;
  /** DB登録の対応分野（自己申告・確認済み）。登録簿由来では null */
  fields: string[] | null;
  languages: string[] | null;
  hasPenalty: boolean | null;
  /** 登録年月日 (YYYY-MM-DD等)。信頼性の登録年数加点に使用 */
  registeredDate?: string | null;
}

export interface AffinityReason {
  label: string;
  points: number;
  /** 推定ベースの加点かどうか（機関名からの推定は true） */
  estimated?: boolean;
}

export interface AffinityResult {
  score: number;
  reasons: AffinityReason[];
  /** 機関名から推定した得意分野（表示用） */
  estimatedFields: TokuteiField[];
}

/**
 * 親和性スコア算出（満点100）
 * - 分野一致: 40（確認済み分野一致=40 / 機関名からの推定一致=40 / シグナルなし=中立20 / 他分野特化とみられる=10）
 * - 地域一致: 30（同一都道府県=30 / 隣接都道府県=15）
 * - 言語一致: 20
 * - 信頼性・情報充実度: 10（処分歴なし=5、登録年数に応じ0-3：1年以上=1、3年以上=2、5年以上=3、
 *   対応言語の登録数に応じ0-2：1言語以上=1、3言語以上=2）
 * 同点の場合の並び順はレビュー数→対応言語数の順（情報充実度順）とする。
 */
export function calcAffinity(input: AffinityInput, org: AffinityOrgData): AffinityResult {
  const reasons: AffinityReason[] = [];
  let score = 0;

  const estimatedFields = estimateOrgFields(org.name);

  // --- 分野一致（0-40） ---
  const target = input.targetField && (TOKUTEI_FIELDS as readonly string[]).includes(input.targetField)
    ? (input.targetField as TokuteiField)
    : null;
  if (target) {
    const confirmedMatch = org.fields?.includes(target) ?? false;
    if (confirmedMatch) {
      score += AFFINITY_WEIGHTS.field;
      reasons.push({ label: `${target}対応（確認済み）`, points: AFFINITY_WEIGHTS.field });
    } else if (estimatedFields.includes(target)) {
      score += AFFINITY_WEIGHTS.field;
      reasons.push({ label: `${target}に強み（機関名から推定）`, points: AFFINITY_WEIGHTS.field, estimated: true });
    } else if (estimatedFields.length === 0) {
      // シグナルなし=分野中立（幅広い分野に対応する可能性）
      const neutral = 20;
      score += neutral;
      reasons.push({ label: "分野非限定（対応可能性あり）", points: neutral, estimated: true });
    } else {
      // 他分野に特化しているとみられる
      const other = 10;
      score += other;
      reasons.push({ label: `他分野中心（${estimatedFields[0]}等）と推定`, points: other, estimated: true });
    }
  } else {
    // 分野指定なし：分野配点は中立の半分を全機関に付与（順位に影響させない）
    score += AFFINITY_WEIGHTS.field / 2;
  }

  // --- 地域一致（0-30） ---
  if (input.targetPrefecture && org.prefecture) {
    if (org.prefecture === input.targetPrefecture) {
      score += AFFINITY_WEIGHTS.prefSame;
      reasons.push({ label: `${input.targetPrefecture}内`, points: AFFINITY_WEIGHTS.prefSame });
    } else if ((ADJACENT_PREFECTURES[input.targetPrefecture] ?? []).includes(org.prefecture)) {
      score += AFFINITY_WEIGHTS.prefAdjacent;
      reasons.push({ label: `隣接県（${org.prefecture}）`, points: AFFINITY_WEIGHTS.prefAdjacent });
    }
  }

  // --- 言語一致（0-20） ---
  if (input.targetLanguage && org.languages?.includes(input.targetLanguage)) {
    score += AFFINITY_WEIGHTS.language;
    reasons.push({ label: `${input.targetLanguage}対応`, points: AFFINITY_WEIGHTS.language });
  }

  // --- 信頼性・情報充実度（0-10） ---
  if (org.hasPenalty === false || org.hasPenalty === null) {
    score += 5;
    reasons.push({ label: "処分歴なし", points: 5 });
  }
  if (org.registeredDate) {
    const years = (Date.now() - new Date(org.registeredDate).getTime()) / (365.25 * 24 * 3600 * 1000);
    // 登録年数を段階制（0-3点）で加点し、同点帯の分解能を確保する
    const yearPoints = years >= 5 ? 3 : years >= 3 ? 2 : years >= 1 ? 1 : 0;
    if (yearPoints > 0) {
      score += yearPoints;
      reasons.push({ label: `登録${years >= 5 ? "5" : years >= 3 ? "3" : "1"}年以上`, points: yearPoints });
    }
  }
  // 対応言語の登録数（登録簿の実データ）を情報充実度として加点（0-2点）。
  // 同点帯の分解能をさらに確保する（多言語対応は支援体制の幅を示す客観指標）。
  const langCount = org.languages?.length ?? 0;
  const langPoints = langCount >= 3 ? 2 : langCount >= 1 ? 1 : 0;
  if (langPoints > 0) {
    score += langPoints;
    reasons.push({ label: `対応言語${langCount >= 3 ? "3言語以上" : "登録あり"}`, points: langPoints });
  }

  return { score: Math.min(100, Math.round(score)), reasons, estimatedFields };
}

/**
 * スコア算定方法の説明文（UI表示用・単一ソース）。
 * AEO観点：引用可能な明確なメソドロジーとして一貫した文言を全ページで使う。
 */
export const AFFINITY_METHODOLOGY =
  "親和性スコアはヤトエル独自の指標です（満点100）。配点：分野一致40点（登録情報で確認済みの対応分野のほか、機関名等からの推定を含みます。推定の場合はその旨を表示）／地域一致30点（同一都道府県30・隣接都道府県15）／言語一致20点／信頼性・情報充実度10点（処分歴なし5点＋登録年数に応じ0〜3点＋対応言語の登録数に応じ0〜2点）。同点の機関は情報充実度（口コミ数→対応言語数）の順に表示します。支援の質を保証するものではなく、比較検討の参考値としてご利用ください。";
