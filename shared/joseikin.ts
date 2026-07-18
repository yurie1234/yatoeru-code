/**
 * 助成金・支援制度の候補データとマッチングロジック
 *
 * 重要な設計方針：
 * - 「もらえる」と断定しない。あくまで「該当する可能性のある制度」の提示に留める
 * - 金額・要件は変動するため、必ず公式リンクを併記し、最新情報の確認を促す
 * - 支給判断は労働局・ハローワーク等の審査によるため、本サイトは可能性の整理のみを行う
 *
 * 出典（2026年7月確認）：
 * - 厚生労働省 人材確保等支援助成金（外国人労働者就労環境整備助成コース）
 * - 厚生労働省 業務改善助成金 / キャリアアップ助成金 / トライアル雇用助成金 / 地域雇用開発助成金
 */

export interface JoseikinCandidate {
  id: string;
  /** 制度名 */
  name: string;
  /** 所管 */
  agency: string;
  /** 概要（非断定表現） */
  summary: string;
  /** 金額の目安（「上限」「最大」表記で断定を避ける） */
  amountHint: string;
  /** 主な要件のヒント */
  conditionHint: string;
  /** 公式URL */
  officialUrl: string;
  /** この診断条件での関連度（high/medium） */
  relevance: "high" | "medium";
  /** 関連度の理由（診断条件との対応を明示） */
  relevanceReason: string;
}

export interface JoseikinInput {
  /** 特定技能分野（null=該当なし・不明） */
  field: string | null;
  /** 企業所在都道府県（null=不明） */
  prefecture: string | null;
  /** 受入予定人数（例: "3〜5名"） */
  headcount: string | null;
  /** 技能実習・外国人雇用の経験があるか（null=未回答） */
  hasJisshuExperience: boolean | null;
}

/** 三大都市圏の中心都府県（地域雇用開発助成金の対象になりにくい地域の目安） */
const METRO_PREFS = ["東京都", "神奈川県", "埼玉県", "千葉県", "大阪府", "京都府", "兵庫県", "愛知県"];

/**
 * 診断条件に応じて、該当する可能性のある助成金・支援制度の候補を返す。
 * 返り値は関連度の高い順。
 */
export function matchJoseikin(input: JoseikinInput): JoseikinCandidate[] {
  const candidates: JoseikinCandidate[] = [];

  // 1. 人材確保等支援助成金（外国人労働者就労環境整備助成コース）
  // 外国人を雇用するほぼすべての企業に関連しうる中核制度
  candidates.push({
    id: "jinzai-kakuho-gaikokujin",
    name: "人材確保等支援助成金（外国人労働者就労環境整備助成コース）",
    agency: "厚生労働省",
    summary:
      "外国人労働者を雇用する事業主が、就業規則の多言語化や苦情・相談体制の整備など就労環境の整備を行った場合に、経費の一部が助成される可能性があります。",
    amountHint: "支給対象経費の1/2（上限57万円）、賃金要件等を満たす場合は2/3（上限72万円）",
    conditionHint:
      "外国人労働者を雇用していること、就労環境整備計画の認定を受けて実施すること、離職率要件を満たすこと等",
    officialUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/gaikokujin_shuro.html",
    relevance: "high",
    relevanceReason: "外国人材の受け入れを行う企業が対象の中核的な助成コースのため",
  });

  // 2. 業務改善助成金（最低賃金引上げ×設備投資）— 現場系分野で特に関連
  candidates.push({
    id: "gyomu-kaizen",
    name: "業務改善助成金",
    agency: "厚生労働省",
    summary:
      "事業場内の最低賃金を引き上げ、生産性向上のための設備投資等を行った中小企業に、その費用の一部が助成される可能性があります。外国人材の受け入れと同時に現場の設備・機器を整備する場合に活用が検討できます。",
    amountHint: "引上げ額・引上げ労働者数に応じて上限30万〜600万円",
    conditionHint: "事業場内最低賃金の引上げ、生産性向上に資する設備投資等の実施、中小企業・小規模事業者であること",
    officialUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html",
    relevance: input.field ? "high" : "medium",
    relevanceReason: input.field
      ? `${input.field}分野は現場の設備投資と賃金引上げを伴いやすく、対象になりうるため`
      : "設備投資と賃金引上げを行う中小企業が広く対象のため",
  });

  // 3. キャリアアップ助成金 — 有期→無期・正社員化を行う場合
  candidates.push({
    id: "career-up",
    name: "キャリアアップ助成金（正社員化コース等）",
    agency: "厚生労働省",
    summary:
      "有期雇用の労働者を正社員化するなど処遇改善を行った場合に助成される可能性があります。外国人労働者も在留資格上の就労制限の範囲内で対象になりえます（特定技能・育成就労の雇用形態により適用可否が異なります）。",
    amountHint: "正社員化1人あたり最大80万円（中小企業・重点支援対象者の場合）",
    conditionHint: "キャリアアップ計画の事前提出、6か月以上の有期雇用からの転換、賃金3%以上増額等",
    officialUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/kyariaappu.html",
    relevance: "medium",
    relevanceReason: "有期雇用から正社員への転換を予定する場合に検討できるため",
  });

  // 4. トライアル雇用助成金 — 経験の浅い受け入れ（初めての外国人雇用）で関連度up
  if (input.hasJisshuExperience === false || input.hasJisshuExperience === null) {
    candidates.push({
      id: "trial-koyou",
      name: "トライアル雇用助成金（一般トライアルコース）",
      agency: "厚生労働省",
      summary:
        "職業経験の不足などから就職が困難な求職者をハローワーク等の紹介で原則3か月間試行雇用した場合に助成される可能性があります。国内在住の外国人求職者を採用するケースで検討できます。",
      amountHint: "対象者1人あたり月額最大4万円（最長3か月）",
      conditionHint: "ハローワーク・職業紹介事業者等の紹介による雇入れ、トライアル雇用実施計画書の提出等",
      officialUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/trial_koyou.html",
      relevance: "medium",
      relevanceReason: "初めての外国人雇用で、国内在住者をハローワーク経由で採用する場合に検討できるため",
    });
  }

  // 5. 地域雇用開発助成金 — 地方（雇用機会が特に不足する地域）の場合
  if (input.prefecture && !METRO_PREFS.includes(input.prefecture)) {
    candidates.push({
      id: "chiiki-koyou",
      name: "地域雇用開発助成金（地域雇用開発コース）",
      agency: "厚生労働省",
      summary:
        "雇用機会が特に不足している地域で事業所の設置・整備を行い、地域の求職者を雇い入れた場合に助成される可能性があります。対象地域は同意雇用開発促進地域等に限られるため、所在地が対象かの確認が必要です。",
      amountHint: "設置費用と雇入れ人数に応じて48万〜800万円（1年ごと最大3回）",
      conditionHint: "対象地域（同意雇用開発促進地域・過疎等雇用改善地域等）での事業所設置・整備と地域求職者の雇入れ",
      officialUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/chiiki_koyou.html",
      relevance: "medium",
      relevanceReason: `${input.prefecture}には対象地域（同意雇用開発促進地域等）が含まれる可能性があるため`,
    });
  }

  // 6. 人材開発支援助成金 — 育成・訓練を行う場合（特定技能の技能向上・日本語教育）
  candidates.push({
    id: "jinzai-kaihatsu",
    name: "人材開発支援助成金（人材育成支援コース等）",
    agency: "厚生労働省",
    summary:
      "労働者に職務に関連する訓練や日本語教育を含む職業訓練を計画的に実施した場合に、訓練経費や訓練期間中の賃金の一部が助成される可能性があります。外国人材への日本語研修・技能研修で活用が検討できます。",
    amountHint: "訓練経費の45〜75%＋賃金助成（1人1時間あたり760円等）",
    conditionHint: "職業能力開発推進者の選任、事業内職業能力開発計画の策定、訓練計画の事前届出等",
    officialUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/d01-1.html",
    relevance: "medium",
    relevanceReason: "受け入れ後の日本語教育・技能研修を計画する場合に検討できるため",
  });

  // 7. 自治体独自の支援制度（都道府県が判明している場合）
  if (input.prefecture) {
    candidates.push({
      id: "jichitai-dokuji",
      name: `${input.prefecture}・市区町村の独自支援制度`,
      agency: `${input.prefecture}および市区町村`,
      summary:
        "都道府県や市区町村が、外国人材の受け入れ企業向けに家賃補助・研修費補助・受入環境整備補助などの独自制度を設けている場合があります。所在自治体の産業振興・労働政策の窓口での確認をおすすめします。",
      amountHint: "自治体により異なる（数万円〜数百万円規模まで幅がある）",
      conditionHint: "自治体内に事業所があること等（制度ごとに異なる）",
      officialUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/index.html",
      relevance: "medium",
      relevanceReason: "所在地の自治体独自制度は国の助成金と併用できる場合があるため",
    });
  }

  return candidates.sort((a, b) => (a.relevance === b.relevance ? 0 : a.relevance === "high" ? -1 : 1));
}

/** 免責文（結果ページ・記事ページで共通使用） */
export const JOSEIKIN_DISCLAIMER =
  "掲載している助成金・支援制度は、入力いただいた条件から該当する可能性のあるものを整理した参考情報です。支給の可否は各制度の要件充足と労働局・ハローワーク等の審査により決定されるため、受給を保証するものではありません。金額・要件は改定される場合があるため、必ず公式サイトで最新の支給要領をご確認ください。";
