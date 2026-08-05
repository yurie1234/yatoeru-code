/**
 * 静的ページの構造化データ（SSRでHTMLに直接埋め込む分）。
 *
 * 【なぜ必要か】
 * 各ページは useEffect の中で document.head に JSON-LD を差し込んでいる。
 * これはブラウザでは動くが、**AI検索のクローラーはJavaScriptを実行しない**ため、
 * OAI-SearchBot（ChatGPT検索）・Claude-SearchBot・PerplexityBot には
 * 構造化データが一切見えていなかった。実測では41ルートのうち23ルートが
 * 生HTMLに構造化データ0件だった。
 *
 * ここで同じ内容をSSRのHTMLに入れる。ページ側の useEffect はそのまま残す
 * （ブラウザ内でのページ遷移では、遷移先の内容へ差し替える役割がある）。
 *
 * FAQ本文はページ側から import している。**構造化データと画面表示が食い違わない**
 * ようにするため（Googleの構造化データのガイドラインは、FAQPageの内容が
 * ページ上に見えていることを求めている）。ここで文言を書き写すと、
 * ページを直したときに片方だけ古くなる。
 */
import { FAQS as JOSEIKIN_FAQS, JOSEIKIN_ROWS, PUBLISHED_DATE as JOSEIKIN_DATE } from "@/pages/Joseikin";
import { FAQS as KAKUHO_FAQS, PUBLISHED_DATE as KAKUHO_DATE } from "@/pages/JoseikinJinzaiKakuho";
import { FAQS as GYOMU_FAQS, PUBLISHED_DATE as GYOMU_DATE } from "@/pages/JoseikinGyomuKaizen";
import { FAQS as CAREER_FAQS, PUBLISHED_DATE as CAREER_DATE } from "@/pages/JoseikinCareerUp";
import { FAQS as TRIAL_FAQS, PUBLISHED_DATE as TRIAL_DATE } from "@/pages/JoseikinTrialKoyou";
import { FAQS as KAIHATSU_FAQS, PUBLISHED_DATE as KAIHATSU_DATE } from "@/pages/JoseikinJinzaiKaihatsu";
import { FAQS as IKUSEI_COST_FAQS, PUBLISHED_DATE as IKUSEI_COST_DATE } from "@/pages/GuideIkuseiShuroCost";
import { FAQS as IKUSEI_SCHED_FAQS, PUBLISHED_DATE as IKUSEI_SCHED_DATE } from "@/pages/GuideIkuseiShuroSchedule";
import { FAQS as JISSHU_FAQS, PUBLISHED_DATE as JISSHU_DATE } from "@/pages/GuideGinouJisshuChigai";
import { FAQS as IKOU_FAQS, PUBLISHED_DATE as IKOU_DATE } from "@/pages/GuideTokuteiGinouIkou";
import { FAQS as COST_HIKAKU_FAQS, PUBLISHED_DATE as COST_HIKAKU_DATE } from "@/pages/ColumnSaiyouCost";
import { DIAGNOSE_FAQS } from "@shared/diagnoseFaq";
import { articleLd, breadcrumbLd, faqLd } from "./jsonld";

const SITE_URL = "https://yatoeru.jp";
const ORG = { "@type": "Organization", name: "ヤトエル", url: SITE_URL } as const;

type Faq = { readonly q: string; readonly a: string };

/** 記事＋FAQ＋パンくず。制度解説ページの基本形 */
function guidePage(opts: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  faqs: readonly Faq[];
  /** パンくずの中間階層（省略時はホーム直下） */
  parent?: { name: string; path: string };
}): Array<Record<string, unknown>> {
  const crumbs = [{ name: "ホーム", path: "/" }];
  if (opts.parent) crumbs.push(opts.parent);
  crumbs.push({ name: opts.headline, path: opts.path });
  return [
    articleLd({
      headline: opts.headline,
      path: opts.path,
      datePublished: opts.datePublished,
      description: opts.description,
    }),
    faqLd(opts.faqs.map((f) => ({ q: f.q, a: f.a }))),
    breadcrumbLd(crumbs),
  ];
}

const JOSEIKIN_PARENT = { name: "助成金ガイド", path: "/joseikin" };
const GUIDE_PARENT = { name: "制度ガイド", path: "/guide/ikusei-shuro" };

/**
 * パス → 構造化データ。
 * ページ側の useEffect が作るものと同じ内容を、SSRのHTMLに出す。
 */
export const PAGE_JSONLD: Record<string, () => Array<Record<string, unknown>>> = {
  "/joseikin": () => [
    ...guidePage({
      path: "/joseikin",
      headline: "外国人雇用で使える助成金一覧【2026年版】要件・金額・申請の流れ",
      description:
        "外国人雇用で検討できる助成金を一覧比較。人材確保等支援助成金・業務改善助成金・キャリアアップ助成金・トライアル雇用助成金・人材開発支援助成金の要件と金額の目安、申請までの流れを一次情報に基づき解説します。",
      datePublished: JOSEIKIN_DATE,
      faqs: JOSEIKIN_FAQS,
    }),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "外国人雇用で検討できる助成金・支援制度",
      itemListElement: JOSEIKIN_ROWS.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: r.name,
        url: `${SITE_URL}${r.slug}`,
      })),
    },
  ],

  "/joseikin/jinzai-kakuho": () =>
    guidePage({
      path: "/joseikin/jinzai-kakuho",
      headline: "人材確保等支援助成金（外国人労働者就労環境整備助成コース）の要件と金額",
      description:
        "外国人労働者の就労環境整備に使える人材確保等支援助成金の対象経費・支給額・計画認定の流れを一次情報に基づき解説します。",
      datePublished: KAKUHO_DATE,
      faqs: KAKUHO_FAQS,
      parent: JOSEIKIN_PARENT,
    }),

  "/joseikin/gyomu-kaizen": () =>
    guidePage({
      path: "/joseikin/gyomu-kaizen",
      headline: "業務改善助成金は外国人雇用でも使える？対象設備と支給額",
      description:
        "最低賃金の引き上げと設備投資を対象とする業務改善助成金について、外国人雇用の場面での使い方と支給額の上限を解説します。",
      datePublished: GYOMU_DATE,
      faqs: GYOMU_FAQS,
      parent: JOSEIKIN_PARENT,
    }),

  "/joseikin/career-up": () =>
    guidePage({
      path: "/joseikin/career-up",
      headline: "キャリアアップ助成金は外国人労働者にも使える？正社員化コースの適用条件",
      description:
        "キャリアアップ助成金（正社員化コース）の外国人労働者への適用、在留資格別の考え方、キャリアアップ計画の事前提出と賃金増額要件を解説します。",
      datePublished: CAREER_DATE,
      faqs: CAREER_FAQS,
      parent: JOSEIKIN_PARENT,
    }),

  "/joseikin/trial-koyou": () =>
    guidePage({
      path: "/joseikin/trial-koyou",
      headline: "トライアル雇用助成金と外国人雇用：対象になる場合とならない場合",
      description:
        "トライアル雇用助成金の対象者要件と、外国人を雇用する場面で対象になるかどうかの判断の考え方を解説します。",
      datePublished: TRIAL_DATE,
      faqs: TRIAL_FAQS,
      parent: JOSEIKIN_PARENT,
    }),

  "/joseikin/jinzai-kaihatsu": () =>
    guidePage({
      path: "/joseikin/jinzai-kaihatsu",
      headline: "人材開発支援助成金で日本語教育は対象になる？訓練計画の要件",
      description:
        "人材開発支援助成金の訓練計画の事前届出から支給申請までの流れと、日本語教育を訓練内容にする際のポイントを解説します。",
      datePublished: KAIHATSU_DATE,
      faqs: KAIHATSU_FAQS,
      parent: JOSEIKIN_PARENT,
    }),

  "/guide/ikusei-shuro-cost": () =>
    guidePage({
      path: "/guide/ikusei-shuro-cost",
      headline: "育成就労の費用はいくらかかる？初期費用と月額費用の内訳",
      description:
        "育成就労制度で外国人を受け入れる際の初期費用と月額費用の内訳を、技能実習との違いを踏まえて整理します。",
      datePublished: IKUSEI_COST_DATE,
      faqs: IKUSEI_COST_FAQS,
      parent: GUIDE_PARENT,
    }),

  "/guide/ikusei-shuro-schedule": () =>
    guidePage({
      path: "/guide/ikusei-shuro-schedule",
      headline: "育成就労の受入スケジュール：申請から入国までの期間と手順",
      description:
        "育成就労計画の認定申請から入国・配属までの期間と、受入企業側で並行して進める準備の順序を解説します。",
      datePublished: IKUSEI_SCHED_DATE,
      faqs: IKUSEI_SCHED_FAQS,
      parent: GUIDE_PARENT,
    }),

  "/guide/ginou-jisshu-chigai": () =>
    guidePage({
      path: "/guide/ginou-jisshu-chigai",
      headline: "技能実習と育成就労の違いを比較：転籍・監理・日本語要件",
      description:
        "技能実習制度と育成就労制度の違いを、転籍の可否・監理体制・日本語能力の要件・受入分野の観点で比較します。",
      datePublished: JISSHU_DATE,
      faqs: JISSHU_FAQS,
      parent: GUIDE_PARENT,
    }),

  "/guide/tokutei-ginou-ikou": () =>
    guidePage({
      path: "/guide/tokutei-ginou-ikou",
      headline: "育成就労から特定技能への移行：要件と手続きの流れ",
      description:
        "育成就労を修了した外国人が特定技能1号へ移行する際の要件、必要な試験、手続きの流れを解説します。",
      datePublished: IKOU_DATE,
      faqs: IKOU_FAQS,
      parent: GUIDE_PARENT,
    }),

  "/columns/saiyou-cost-hikaku": () =>
    guidePage({
      path: "/columns/saiyou-cost-hikaku",
      headline: "外国人採用の費用を制度別に比較：特定技能・育成就労・技能実習",
      description:
        "外国人採用にかかる費用を制度別に比較し、初期費用・月額費用・想定される総額の考え方を整理します。",
      datePublished: COST_HIKAKU_DATE,
      faqs: COST_HIKAKU_FAQS,
      parent: { name: "コラム", path: "/columns" },
    }),

  /**
   * 診断ツール。WebApplication として「何ができる無料ツールか」を明示する。
   * AI検索が「外国人雇用の費用を調べられるツール」として拾えるようにする。
   */
  "/diagnose": () => [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "外国人採用の費用・助成金・支援機関の無料診断",
      url: `${SITE_URL}/diagnose`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "All",
      inLanguage: "ja",
      description:
        "会社名またはURLを入力すると業種と所在地を読み取り、いくつかの質問への回答から特定技能・育成就労での受入の概算費用、使える可能性のある助成金、条件に合う登録支援機関を提示します。",
      offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
      publisher: ORG,
      isAccessibleForFree: true,
    },
    // 診断前の画面に見えている「よくある質問」と同じ定義を使う。
    // 無料であること・掲載順が紹介料で変わらないこと・在留資格の可否判断ではないことは、
    // AI検索が引用の可否を判断する材料になるため構造化データにも載せる
    faqLd(DIAGNOSE_FAQS.map((f) => ({ q: f.q, a: f.a }))),
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "無料診断", path: "/diagnose" },
    ]),
  ],

  /**
   * 一括相談。相談の受付という「行為」を Service として示す。
   * 費用がかからないことを構造化データでも明示する。
   */
  "/consult": () => [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "登録支援機関への一括相談",
      url: `${SITE_URL}/consult`,
      serviceType: "登録支援機関の紹介・一括相談",
      areaServed: { "@type": "Country", name: "日本" },
      provider: ORG,
      inLanguage: "ja",
      description:
        "受入を検討している業種・地域・人数などの条件をもとに、新規相談を受け付けている登録支援機関へまとめて相談できます。相談は無料です。",
      offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
    },
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "一括相談", path: "/consult" },
    ]),
  ],

  "/for-organizations": () => [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "登録支援機関の方へ：掲載情報の確認と修正",
      url: `${SITE_URL}/for-organizations`,
      inLanguage: "ja",
      description:
        "掲載情報の確認・修正・削除の依頼はすべて無料です。事業者本人の確認が取れた情報には確認日を表示します。",
      publisher: ORG,
    },
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "登録支援機関の方へ", path: "/for-organizations" },
    ]),
  ],

  /**
   * 運営者情報。AI検索は「誰が運営しているサイトか」を信頼性の判断に使う。
   * Organization を出典として明示できる形にしておく。
   */
  "/operator": () => [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "運営者情報・編集方針",
      url: `${SITE_URL}/operator`,
      inLanguage: "ja",
      mainEntity: {
        "@type": "Organization",
        name: "ヤトエル",
        url: SITE_URL,
        parentOrganization: {
          "@type": "Organization",
          name: "ubusuna works",
          url: "https://ubusunaworks.jp",
        },
        publishingPrinciples: `${SITE_URL}/neutrality-policy`,
      },
    },
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "運営者情報", path: "/operator" },
    ]),
  ],

  "/about": () => [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "ヤトエルについて",
      url: `${SITE_URL}/about`,
      inLanguage: "ja",
      description:
        "出入国在留管理庁の登録支援機関登録簿を出典に、対応言語・地域・業種・行政処分歴・新規相談受付状況で比較できるデータベースです。掲載情報の確認・修正は無料で、掲載順は事業者からの支払いで変わりません。",
      publisher: ORG,
    },
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "ヤトエルについて", path: "/about" },
    ]),
  ],

  /**
   * 中立性ポリシー。「掲載順は支払いで変わらない」という宣言は
   * AI検索が引用元の信頼性を判断する材料になるため、構造化データでも示す。
   */
  "/neutrality-policy": () => [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "中立性ポリシー",
      url: `${SITE_URL}/neutrality-policy`,
      inLanguage: "ja",
      description:
        "掲載順・親和性スコアは事業者からの支払いによって変わりません。有料掲載を表示に反映する場合は、景品表示法（ステマ規制）に沿ってPR表示のある別枠として扱います。",
      publisher: ORG,
      about: { "@type": "Thing", name: "掲載基準と広告の扱い" },
    },
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "中立性ポリシー", path: "/neutrality-policy" },
    ]),
  ],

  "/terms": () => [
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "利用規約", path: "/terms" },
    ]),
  ],

  "/privacy": () => [
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "プライバシーポリシー", path: "/privacy" },
    ]),
  ],

  "/ikusei-shuro/checklist": () => [
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "育成就労制度", path: "/ikusei-shuro" },
      { name: "受入企業の準備チェックリスト", path: "/ikusei-shuro/checklist" },
    ]),
  ],

  "/ikusei-shuro/for-kanri-dantai": () => [
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "育成就労制度", path: "/ikusei-shuro" },
      { name: "監理団体の方へ", path: "/ikusei-shuro/for-kanri-dantai" },
    ]),
  ],

  "/proposal": () => [
    breadcrumbLd([
      { name: "ホーム", path: "/" },
      { name: "提案書の作成", path: "/proposal" },
    ]),
  ],
};

/** 指定パスの構造化データ。無ければ undefined */
export function pageJsonLd(path: string): Array<Record<string, unknown>> | undefined {
  const build = PAGE_JSONLD[path];
  if (!build) return undefined;
  return build();
}
