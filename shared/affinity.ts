import {
  ADJACENT_PREFECTURES,
  AFFINITY_WEIGHTS,
  TOKUTEI_FIELDS,
  regionListIncludesPrefecture,
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
  /** 登録年月日 (YYYY-MM-DD等)。同点時の最終タイブレーク（古い順）に使用 */
  registeredDate?: string | null;
  /** 運営による実確認日（掲載情報 運営確認済み）。鮮度加点に使用。未確認は null */
  verifiedAt?: Date | string | null;
  /** 希望する相談条件：受けたい業種（"全業種"を含む場合は全分野対象） */
  preferredFields?: string[] | null;
  /** 希望する相談条件：受けたい地域（都道府県名・地方名・"全国"） */
  preferredRegions?: string[] | null;
  /** 新規受入企業の相談ステータス（本人確認済みの申告）。未確認は "unknown" */
  consultStatus?: string | null;
}

/**
 * 実確認鮮度ポイント（0〜5点の連続値）。
 * 確認から90日以内=5点満点、91〜180日=線形に減衰して180日で2.5点、
 * 181〜365日=さらに線形に減衰して365日で0点。未確認=0点。
 * 加点は信頼性枠の5点を絶対に超えない（分野・地域・言語の適合点を確認の有無が逆転させない）。
 * 確認済みになる手段は無料で全機関に開かれており、有料プランとは一切連動しない。
 */
export function calcFreshnessPoints(verifiedAt: Date | string | null | undefined, now: Date = new Date()): number {
  if (!verifiedAt) return 0;
  const verified = verifiedAt instanceof Date ? verifiedAt : new Date(verifiedAt);
  if (Number.isNaN(verified.getTime())) return 0;
  const days = (now.getTime() - verified.getTime()) / (24 * 3600 * 1000);
  if (days < 0) return AFFINITY_WEIGHTS.freshness; // 時計ずれ安全弁
  if (days <= 90) return AFFINITY_WEIGHTS.freshness; // 5点満点
  if (days <= 180) {
    // 90日で5.0 → 180日で2.5（線形減衰）
    return 5 - ((days - 90) / 90) * 2.5;
  }
  if (days <= 365) {
    // 180日で2.5 → 365日で0（線形減衰）
    return 2.5 - ((days - 180) / 185) * 2.5;
  }
  return 0;
}

export interface AffinityReason {
  label: string;
  points: number;
  /** 推定ベースの加点かどうか（機関名からの推定は true） */
  estimated?: boolean;
}

export interface AffinityResult {
  score: number;
  /**
   * 指定された条件で評価できる満点。
   * 分野・地域・言語は指定されて初めて配点対象になるため、指定が無い項目の配点
   * （40/30/20）は満点から丸ごと落ちる。条件が1つも無ければ、条件に依らず評価できる
   * 受入状況10＋信頼性10の20点だけが残る＝スコアを出す根拠が無い状態。
   * 固定の分母で見せると評価していない配点まで含んだ点数に見えるため、
   * 表示側はこの満点と併記する。
   */
  maxScore: number;
  reasons: AffinityReason[];
  /** 機関名から推定した得意分野（表示用） */
  estimatedFields: TokuteiField[];
}

/**
 * 表示用に100点満点へ換算したスコア。
 *
 * 指定されていない条件の配点は満点から落ちるため、生の得点は条件によって
 * 上限が変わる（地域だけなら50点満点など）。利用者にとっては満点が動くほうが
 * 分かりにくいので、表示は「指定条件での適合度」を100点満点に換算した値を使う。
 * 同一条件内では単調変換なので並び順は変わらない。
 * 内訳（生の得点と満点）はツールチップで併記する。
 */
export function normalizedScore(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
}

/** 親和性スコアの根拠となる条件（分野・地域・言語）が1つでも指定されているか */
export function hasAffinityCondition(input: AffinityInput): boolean {
  return Boolean(input.targetField || input.targetPrefecture || input.targetLanguage);
}

/**
 * 指定条件で評価できる満点。
 * 受入状況（相談ステータス）と信頼性（処分歴なし・実確認鮮度）は条件に依らず
 * 全機関で評価できるため常に含める。
 */
export function calcMaxScore(input: AffinityInput): number {
  const hasField =
    !!input.targetField && (TOKUTEI_FIELDS as readonly string[]).includes(input.targetField);
  return (
    (hasField ? AFFINITY_WEIGHTS.field : 0) +
    (input.targetPrefecture ? AFFINITY_WEIGHTS.prefSame : 0) +
    (input.targetLanguage ? AFFINITY_WEIGHTS.language : 0) +
    AFFINITY_WEIGHTS.consultOpenActive +
    AFFINITY_WEIGHTS.noPenalty +
    AFFINITY_WEIGHTS.freshness
  );
}

/**
 * 親和性スコア算出（指定条件で評価できる満点は calcMaxScore を参照。全条件指定時は110）
 * - 分野一致: 40（確認済み分野・希望相談条件一致=40 / 機関名からの推定一致=25 / シグナルなし=中立20 / 他分野特化とみられる=10）
 * - 地域一致: 30（同一都道府県または希望相談地域一致=30 / 隣接都道府県=15）
 * - 言語一致: 20
 * - 受入状況: 10（新規相談 受付中（積極受入）=10 / 受付中=7 / 未確認・一時停止=0）
 * - 信頼性: 10（処分歴なし=5、実確認鮮度=最大5：運営による実確認日からの経過で減衰する連続値。
 *   90日以内=5点〜180日で2.5点〜365日で0点。未確認=0点）
 * 同点の場合の最終タイブレークは登録年月日の古い順とする。
 * 制約：鮮度加点は信頼性枠の5点を超えず、有料プラン・紹介料の有無はスコアに一切反映しない。
 * 受入状況・確認ステータスの登録は無料で全機関に開かれている。
 */
export function calcAffinity(input: AffinityInput, org: AffinityOrgData, now: Date = new Date()): AffinityResult {
  const reasons: AffinityReason[] = [];
  let score = 0;

  const estimatedFields = estimateOrgFields(org.name);

  // --- 分野一致（0-40） ---
  const target = input.targetField && (TOKUTEI_FIELDS as readonly string[]).includes(input.targetField)
    ? (input.targetField as TokuteiField)
    : null;
  if (target) {
    // 確認済み対応分野または希望する相談条件（受けたい業種）の一致を確認済みマッチとして扱う
    const preferredMatch =
      (org.preferredFields?.includes(target) ?? false) || (org.preferredFields?.includes("全業種") ?? false);
    const confirmedMatch = (org.fields?.includes(target) ?? false) || preferredMatch;
    if (confirmedMatch) {
      score += AFFINITY_WEIGHTS.field;
      reasons.push({ label: `${target}対応（確認済み）`, points: AFFINITY_WEIGHTS.field });
    } else if (estimatedFields.includes(target)) {
      // 推定は機関名のキーワード一致だけが根拠のため、確認済み（40点）より低く配点する
      score += AFFINITY_WEIGHTS.fieldEstimated;
      reasons.push({
        label: `${target}に強み（機関名から推定）`,
        points: AFFINITY_WEIGHTS.fieldEstimated,
        estimated: true,
      });
    } else if (estimatedFields.length === 0) {
      // シグナルなし=分野中立（幅広い分野に対応する可能性）
      score += AFFINITY_WEIGHTS.fieldNeutral;
      reasons.push({
        label: "分野非限定（対応可能性あり）",
        points: AFFINITY_WEIGHTS.fieldNeutral,
        estimated: true,
      });
    } else {
      // 他分野に特化しているとみられる
      score += AFFINITY_WEIGHTS.fieldOtherField;
      reasons.push({
        label: `他分野中心（${estimatedFields[0]}等）と推定`,
        points: AFFINITY_WEIGHTS.fieldOtherField,
        estimated: true,
      });
    }
  }
  // 分野が指定されていない場合は分野の配点そのものを評価対象から外す（満点からも落とす）。
  // 以前は全機関に一律20点を付けていたが、順位には影響しない一方で、条件を何も
  // 指定していない状態でも「親和性25点」のような点数が出てしまい、根拠のない
  // スコアを見せることになっていた。

  // --- 地域一致（0-30） ---
  if (input.targetPrefecture) {
    const preferredRegionMatch =
      org.preferredRegions && org.preferredRegions.length > 0
        ? regionListIncludesPrefecture(org.preferredRegions, input.targetPrefecture)
        : false;
    if (org.prefecture === input.targetPrefecture) {
      score += AFFINITY_WEIGHTS.prefSame;
      reasons.push({ label: `${input.targetPrefecture}内`, points: AFFINITY_WEIGHTS.prefSame });
    } else if (preferredRegionMatch) {
      // 希望する相談条件（受けたい地域）に企業所在県が含まれる場合は同一県と同等に扱う（本人確認済みの対応地域）
      score += AFFINITY_WEIGHTS.prefSame;
      reasons.push({ label: `${input.targetPrefecture}対応（確認済み）`, points: AFFINITY_WEIGHTS.prefSame });
    } else if (org.prefecture && (ADJACENT_PREFECTURES[input.targetPrefecture] ?? []).includes(org.prefecture)) {
      score += AFFINITY_WEIGHTS.prefAdjacent;
      reasons.push({ label: `隣接県（${org.prefecture}）`, points: AFFINITY_WEIGHTS.prefAdjacent });
    }
  }

  // --- 言語一致（0-20） ---
  if (input.targetLanguage && org.languages?.includes(input.targetLanguage)) {
    score += AFFINITY_WEIGHTS.language;
    reasons.push({ label: `${input.targetLanguage}対応`, points: AFFINITY_WEIGHTS.language });
  }

  // --- 受入状況（0-10：新規相談を受け付けていることが本人確認済みか） ---
  // 相談を受け付けていない機関を上位に出しても利用者の役に立たないため、
  // 条件適合と並ぶ評価軸として扱う。未確認・一時停止は0点（減点はしない）。
  if (org.consultStatus === "open_active") {
    score += AFFINITY_WEIGHTS.consultOpenActive;
    reasons.push({ label: "新規相談 受付中（積極受入）", points: AFFINITY_WEIGHTS.consultOpenActive });
  } else if (org.consultStatus === "open") {
    score += AFFINITY_WEIGHTS.consultOpen;
    reasons.push({ label: "新規相談 受付中", points: AFFINITY_WEIGHTS.consultOpen });
  }

  // --- 信頼性（0-10：処分歴なし5＋実確認鮮度最大5） ---
  if (org.hasPenalty === false || org.hasPenalty === null) {
    score += AFFINITY_WEIGHTS.noPenalty;
    reasons.push({ label: "処分歴なし", points: AFFINITY_WEIGHTS.noPenalty });
  }
  // 実確認鮮度（0〜5点の連続値）。運営による実確認（掲載情報 運営確認済み）の確認日からの経過で減衰。
  // 確認手段は無料で全機関に開放されており、有料プランとは一切連動しない。
  const freshness = calcFreshnessPoints(org.verifiedAt ?? null, now);
  if (freshness > 0) {
    const rounded = Math.round(freshness * 10) / 10;
    score += freshness;
    reasons.push({ label: "運営実確認済み（情報の確からしさ）", points: rounded });
  }

  // スコアは小数第1位まで保持（鮮度の連続値により同点並びが自然に分解される）
  const maxScore = calcMaxScore(input);
  return {
    score: Math.min(maxScore, Math.round(score * 10) / 10),
    maxScore,
    reasons,
    estimatedFields,
  };
}

/**
 * スコア算定方法の説明文（UI表示用・単一ソース）。
 * AEO観点：引用可能な明確なメソドロジーとして一貫した文言を全ページで使う。
 */
export const AFFINITY_METHODOLOGY =
  "親和性スコアはヤトエル独自の指標です。分野・地域・言語のうち、指定された条件だけを評価し、その結果を100点満点に換算して表示します（指定していない項目は配点に含めません。内訳では換算前の得点と、その条件での満点を併記します）。条件を1つも指定していない一覧では、算定の根拠が無いためスコアを表示しません。分野一致40点（登録情報で確認済みの対応分野・希望する相談条件が一致した場合に40点。機関名等からの推定による一致は25点、分野情報が未登録の機関は分野非限定として20点、機関名から他分野中心とみられる場合は10点。推定に基づく加点はその旨を表示します）／地域一致30点（同一都道府県・確認済み対応地域30・隣接都道府県15）／言語一致20点／受入状況10点（新規相談の受付状況が本人確認済みの場合。積極受入10点・受付中7点・未確認および一時停止0点。相談を受け付けていない機関を上位に出しても比較の役に立たないため評価軸に含めています）／信頼性10点（処分歴なし5点＋実確認鮮度最大5点）。受入状況と信頼性は条件指定に関わらず常に評価します。運営による実確認済みの情報には、情報の確からしさとして最大5点を加点しています（確認日から時間経過で減衰）。有料掲載の有無・当サイトへの紹介料の有無はスコアに影響しません。情報の確認・修正および受入状況の登録は、全ての機関が無料で行えます。同点の機関は登録年月日の古い順に表示します。支援の質を保証するものではなく、比較検討の参考値としてご利用ください。";
