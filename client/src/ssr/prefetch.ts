import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import {
  LEGACY_FIELD_MAP,
  PREFECTURES,
  TOKUTEI_FIELDS,
  UPCOMING_FIELDS,
} from "@shared/tokutei";
import { FIELD_DESCRIPTIONS } from "@shared/fieldDescriptions";
import {
  articleLd,
  breadcrumbLd,
  COLUMN_ARTICLES,
  datasetLd,
  faqLd,
  fieldFaqs,
  GUIDE_FAQS,
  regionFaqs,
} from "./jsonld";

export type HeadMeta = {
  title: string;
  description: string;
  ogType?: "website" | "article";
  ogImage?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** パスのみ（例 "/org/39735"）。composeHtmlがCANONICAL_ORIGINを前置する */
  canonicalPath?: string;
  /** 200だが非インデックス（内部検索・ゲートページ） */
  noindex?: boolean;
  /** 実在しないスラッグ・未知ルート → 404 + noindex */
  notFound?: boolean;
  /** SSRの生HTMLに埋め込むJSON-LD構造化データ（AIクローラー向け） */
  jsonLd?: Array<Record<string, unknown>>;
};

type RO = inferRouterOutputs<AppRouter>;

// SSRプリフェッチから到達できるprocedureのアローリスト
export type SsrPrefetch = {
  statsOverview: () => Promise<RO["stats"]["overview"]>;
  statsByPrefecture: (prefecture: string) => Promise<RO["stats"]["byPrefecture"]>;
  statsByPrefectureFields: (
    prefecture: string
  ) => Promise<RO["stats"]["byPrefectureFields"]>;
  orgsGetById: (id: number) => Promise<RO["orgs"]["getById"] | null>;
  orgsSearch: (
    input: Parameters<typeof trpc.orgs.search.useQuery>[0]
  ) => Promise<RO["orgs"]["search"]>;
  updatesList: () => Promise<RO["updates"]["list"]>;
  updatesDetail: (baseDate: string) => Promise<RO["updates"]["detail"] | null>;
  articlesList: () => Promise<RO["articles"]["list"]>;
  articlesBySlug: (slug: string) => Promise<RO["articles"]["bySlug"] | null>;
};

function seed(qc: QueryClient, key: unknown, data: unknown) {
  (qc.setQueryData as (k: unknown, d: unknown) => void)(key, data);
}

const SITE = "登録支援機関を条件で比較｜ヤトエル";
const DESC =
  "特定技能の登録支援機関を、地域・業種・対応言語・新規相談受付状況などから比較。育成就労・監理支援機関の制度移行情報にも対応。外国人雇用の準備度チェックと支援機関マッチ診断を無料で利用できます。";

/** 静的公開ルートのhead定義（シード不要ページ） */
const STATIC_HEADS: Record<string, { title: string; description: string }> = {
  "/diagnose": {
    title: "外国人雇用の準備度診断（無料） - ヤトエル",
    description:
      "業種と地域を選ぶだけで、特定技能・育成就労での外国人雇用の準備度を無料診断。条件に合う登録支援機関も同時にご案内します。",
  },
  "/consult": {
    title: "登録支援機関への一括相談（無料） - ヤトエル",
    description:
      "条件に合う受付可能な登録支援機関へ無料で一括相談（候補数により最大5社）。特定技能の受け入れ準備をまとめて相談できます。",
  },
  "/proposal": {
    title: "AI提案書作成 - ヤトエル",
    description:
      "自社の状況を入力すると、特定技能・育成就労の受け入れ計画のたたき台をAIが作成します。",
  },
  "/columns": {
    title: "コラム一覧｜特定技能・育成就労の実務解説 - ヤトエル",
    description:
      "特定技能・育成就労制度の実務解説コラム。登録支援機関の選び方、管理団体からの移行、人材紹介と支援の違いなどを解説します。",
  },
  "/columns/shien-kikan-erabikata": {
    title:
      "登録支援機関の選び方｜料金相場・確認すべき7項目・登録番号の確認方法 - ヤトエル",
    description:
      "登録支援機関の委託費用相場（月額平均約28,000円：入管庁調査）、委託前に確認すべき7項目、登録番号の確認3ステップを実務目線で解説します。",
  },
  "/columns/kanri-dantai-ikou-guide": {
    title:
      "監理団体から監理支援機関への移行ガイド｜2026年9月の期限までにやること - ヤトエル",
    description:
      "技能実習の監理団体から育成就労制度の監理支援機関への移行を実務目線で解説。施行日前申請（2026年4月15日開始）・監理団体新規許可申請期限（2026年9月30日）・施行日（2027年4月1日）のスケジュールと準備ステップを整理します。",
  },
  "/columns/shokai-vs-shien": {
    title:
      "人材紹介会社と登録支援機関の違い｜委託前に登録番号を確認すべき理由 - ヤトエル",
    description:
      "外国人雇用における人材紹介会社（有料職業紹介）と登録支援機関は別制度・別登録です。両者の役割・費用構造の違いと、委託前に登録番号を確認すべき理由・確認手順を解説します。",
  },
  "/columns/saiyou-cost-hikaku": {
    title:
      "外国人採用のコストは高い？特定技能・育成就労と人材紹介・求人広告・派遣を徹底比較 - ヤトエル",
    description:
      "特定技能・育成就労の採用コスト（初期費用・支援委託費・監理費）を人材紹介・求人広告・派遣と1人あたり年間総額で比較。国内在住の特定技能人材なら初年度約34〜78万円と、人材紹介より低くなるケースが多い理由と助成金活用法を解説します。",
  },
  "/guide/ikusei-shuro": {
    title:
      "育成就労制度とは｜2027年4月1日施行・監理支援機関への移行を解説 - ヤトエル",
    description:
      "育成就労制度は2027年4月1日施行（政令確定済み）。技能実習制度との違い、監理団体から監理支援機関への移行、許可申請スケジュール（2026年4月15日施行日前申請開始）を入管庁一次情報に基づき解説します。",
  },
  "/guide/kanri-shien-kikan": {
    title:
      "監理支援機関とは｜許可申請の受付開始日・監理団体との違いを解説 - ヤトエル",
    description:
      "監理支援機関は育成就労制度（2027年4月1日施行）で監理団体に代わる許可制の機関。許可の施行日前申請は2026年4月15日から外国人技能実習機構で受付中。監理団体との要件の違い・申請スケジュールを解説します。",
  },
  "/guide/ikusei-shuro-cost": {
    title:
      "育成就労・特定技能の受け入れ費用ガイド｜初期費用・月額監理費の相場 - ヤトエル",
    description:
      "育成就労・特定技能の受け入れにかかる初期費用（目安50〜145万円/人）と月額費用（監理費・支援委託費）の相場を解説。助成金による負担軽減の選択肢も紹介します。",
  },
  "/guide/ikusei-shuro-schedule": {
    title:
      "育成就労制度はいつから？2027年4月施行までの準備スケジュール - ヤトエル",
    description:
      "育成就労制度は2027年4月1日施行予定。施行日時点の技能実習生は経過措置で在留継続可能です。監理団体の移行確認・処遇設計など受け入れ企業の準備チェックリストを解説します。",
  },
  "/guide/ginou-jisshu-chigai": {
    title:
      "技能実習と育成就労の違いを比較表で解説｜転籍・日本語要件・監理支援機関 - ヤトエル",
    description:
      "技能実習（国際貢献目的・転籍原則不可）と育成就労（人材確保目的・要件下で転籍可・特定技能へ接続）の違いを比較表で解説。受け入れ企業への影響が大きい変更点を整理します。",
  },
  "/guide/tokutei-ginou-ikou": {
    title:
      "技能実習・育成就労から特定技能1号への移行ガイド｜要件・手続き・注意点 - ヤトエル",
    description:
      "技能実習2号良好修了による試験免除ルートや在留資格変更の手続きの流れ、監理団体から登録支援機関への切り替え時の注意点を解説。移行を支援できる機関の探し方も紹介します。",
  },
  "/joseikin": {
    title:
      "外国人雇用で使える助成金ガイド【2026年版】主要 5 制度を解説 - ヤトエル",
    description:
      "外国人雇用で活用できる人材確保等支援助成金（上限57〜72万円）・業務改善助成金（上限600万円）・キャリアアップ助成金・トライアル雇用助成金・人材開発支援助成金の5制度を厚労省一次情報に基づき解説します。",
  },
  "/joseikin/jinzai-kakuho": {
    title:
      "人材確保等支援助成金（外国人労働者就労環境整備助成コース）とは｜上限57〜72万円 - ヤトエル",
    description:
      "外国人労働者専用の助成金。通訳費・翻訳機器導入・就業規則の多言語化など就労環境整備の経費の1/2（上限57万円、賃金要件等を満たせば2/3・上限72万円）を助成。要件と申請の流れを解説します。",
  },
  "/joseikin/gyomu-kaizen": {
    title:
      "業務改善助成金で外国人雇用の設備投資を支援｜上限30〜600万円 - ヤトエル",
    description:
      "事業場内最低賃金の引き上げと設備投資をセットで行うと設備費用の一部（上限30〜600万円）が助成される制度。外国人を雇用する中小企業も対象です。要件・助成額テーブルを解説します。",
  },
  "/joseikin/career-up": {
    title:
      "キャリアアップ助成金で外国人スタッフを正社員化｜1人最大80万円 - ヤトエル",
    description:
      "有期雇用の外国人スタッフを正社員化すると中小企業で1人最大80万円（重点支援対象者）を助成。在留資格ごとの活用可否と申請の流れ、よくある不支給事例を解説します。",
  },
  "/joseikin/trial-koyou": {
    title:
      "トライアル雇用助成金と外国人採用｜月額4万円×最大3か月 - ヤトエル",
    description:
      "職業経験不足などで就職が難しい求職者をハローワーク経由で試行雇用すると月額4万円（最大3か月）を助成。外国人採用での活用条件と対象外になるケースを解説します。",
  },
  "/joseikin/jinzai-kaihatsu": {
    title:
      "人材開発支援助成金で外国人スタッフの日本語教育・研修費を助成｜経費の45〜75% - ヤトエル",
    description:
      "外国人スタッフ向けの職務関連研修や日本語教育（職務に必要な範囲）の経費45〜75%＋訓練中の賃金助成を受けられる制度。対象訓練の要件と申請の流れを解説します。",
  },
  "/for-organizations": {
    title: "登録支援機関の皆さまへ｜自社情報の確認・修正（無料） - ヤトエル",
    description:
      "ヤトエルに掲載中の自社情報の確認・修正は無料です。受付状況や対応言語などの実態情報を確認日つきで表示し、掲載の確からしさを高められます。",
  },
  "/about": {
    title: "運営者情報 - ヤトエル",
    description: "ヤトエルの運営者情報・お問い合わせ先のご案内です。",
  },
  "/terms": {
    title: "利用規約 - ヤトエル",
    description: "ヤトエルの利用規約です。",
  },
  "/privacy": {
    title: "プライバシーポリシー - ヤトエル",
    description: "ヤトエルのプライバシーポリシーです。",
  },
  "/neutrality-policy": {
    title: "中立性ポリシー（並び順と掲載の基準） - ヤトエル",
    description:
      "ヤトエルの並び順ロジックと有料掲載（PR）の扱いを公開しています。掲載料による順位優遇は一切行わず、親和性スコア（分野40点・地域30点・言語20点・信頼性10点）の配点を明示しています。",
  },
};

export async function prefetchForPath(
  url: string,
  qc: QueryClient,
  p: SsrPrefetch
): Promise<HeadMeta> {
  // wouterは fail-safe decodeURI 済みのパスでマッチするため、ここでも同じ変換を行う
  // （/region/%E6%9D%B1%E4%BA%AC%E9%83%BD のような非ASCIIルートを404にしないため）
  let pathOnly = url.split("?")[0];
  try {
    pathOnly = decodeURI(pathOnly);
  } catch {
    /* 不正なエンコーディングは生のまま（wouterと同じ挙動） */
  }
  const clean = pathOnly.replace(/\/+$/, "") || "/";

  // トップページ：統計をシード
  if (clean === "/") {
    const stats = await p.statsOverview();
    seed(qc, getQueryKey(trpc.stats.overview, undefined, "query"), stats);
    return {
      title: SITE,
      description: DESC,
      ogType: "website",
      canonicalPath: "/",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ヤトエル",
          alternateName: ["外国人雇用ナビ", "ヤトエル 登録支援機関データベース"],
          url: "https://yatoeru.jp/",
          description: DESC,
          potentialAction: {
            "@type": "SearchAction",
            target: "https://yatoeru.jp/search?keyword={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        },
      ],
    };
  }

  // 機関詳細ページ（AEOの本丸：JSON-LD・確認日・本文を生HTMLへ）
  const orgMatch = clean.match(/^\/org\/(\d+)$/);
  if (orgMatch) {
    const id = parseInt(orgMatch[1], 10);
    const data = await p.orgsGetById(id); // NOT_FOUNDはnullで返る（ssrCaller側で変換）
    if (!data) return { title: SITE, description: DESC, notFound: true };
    seed(qc, getQueryKey(trpc.orgs.getById, id, "query"), data);
    const { org } = data;
    const verified = org.verifiedAt
      ? `掲載情報は${new Date(org.verifiedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}に運営が事業者へ直接確認済み。`
      : "";
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: org.name,
      alternateName:
        org.aliases && org.aliases.length > 0 ? org.aliases : undefined,
      address: org.address ?? undefined,
      identifier: org.regNo,
      url: `https://yatoeru.jp/org/${org.id}`,
      description: `${org.name}は出入国在留管理庁に登録された登録支援機関です（登録番号：${org.regNo}）。${verified}`,
      knowsLanguage:
        org.languages && org.languages.length > 0 ? org.languages : undefined,
    };
    return {
      title: `${org.name}｜登録支援機関の詳細 - ヤトエル`,
      description: `${org.name}（登録番号：${org.regNo}）の登録支援機関情報。${org.address ? `所在地：${org.address}。` : ""}${verified}対応言語・処分歴・相談受付状況を掲載しています。`,
      ogType: "article",
      canonicalPath: `/org/${org.id}`,
      modifiedTime: org.verifiedAt
        ? new Date(org.verifiedAt).toISOString()
        : undefined,
      jsonLd: [
        jsonLd,
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: "登録支援機関を検索", path: "/search" },
          { name: org.name, path: `/org/${org.id}` },
        ]),
      ],
    };
  }

  // 検索ページ：ベースパスのみインデックス可。クエリ付きは実フィルタでシードしnoindex
  if (clean === "/search") {
    const sp = new URLSearchParams(url.split("?").slice(1).join("?"));
    const keyword = sp.get("keyword") ?? undefined;
    const prefecture = sp.get("prefecture") ?? undefined;
    const language = sp.get("language") ?? undefined;
    const field = sp.get("field") ?? undefined;
    const hasFilter = Boolean(keyword || prefecture || language || field);
    // Search.tsxのqueryInputと完全一致させる（条件なしはsort:"default"）ことで、
    // ハイドレーション時にキャッシュがヒットし、SSRのHTMLに機関カードが含まれる
    const input = {
      keyword: keyword || undefined,
      prefecture: prefecture || undefined,
      language: language || undefined,
      field: field || undefined,
      page: 1,
      limit: 20,
      sort: (hasFilter ? "affinity" : "default") as "affinity" | "default",
    };
    const result = await p.orgsSearch(input);
    seed(qc, getQueryKey(trpc.orgs.search, input, "query"), result);
    return {
      title: "登録支援機関を検索 - ヤトエル",
      description:
        "全国の登録支援機関を対応言語・地域・業種・処分歴で検索。親和性スコア順に表示し、実確認済みの機関には確認日を表示します。",
      canonicalPath: "/search",
      noindex: hasFilter, // 内部検索結果はnoindex（ベース/searchのみインデックス）
    };
  }

  // 地域ページ
  const regionMatch = clean.match(/^\/region\/([^/]+)$/);
  if (regionMatch) {
    const prefecture = regionMatch[1];
    if (!(PREFECTURES as readonly string[]).includes(prefecture)) {
      return { title: SITE, description: DESC, notFound: true };
    }
    const [stats, orgData, fieldStats] = await Promise.all([
      p.statsByPrefecture(prefecture),
      p.orgsSearch({ prefecture, page: 1, limit: 10 }),
      p.statsByPrefectureFields(prefecture),
    ]);
    seed(qc, getQueryKey(trpc.stats.byPrefecture, { prefecture }, "query"), stats);
    seed(
      qc,
      getQueryKey(trpc.orgs.search, { prefecture, page: 1, limit: 10 }, "query"),
      orgData
    );
    seed(
      qc,
      getQueryKey(trpc.stats.byPrefectureFields, { prefecture }, "query"),
      fieldStats
    );
    return {
      title: `${prefecture}の登録支援機関一覧｜特定技能・育成就労 - ヤトエル`,
      description: `${prefecture}に対応する登録支援機関の一覧。対応言語・処分歴・受付状況で比較でき、受付可能な機関に無料で一括相談できます（候補数により最大5社）。`,
      canonicalPath: `/region/${encodeURIComponent(prefecture)}`,
      jsonLd: [
        faqLd(regionFaqs(prefecture, stats?.total)),
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: `${prefecture}の登録支援機関`, path: `/region/${prefecture}` },
        ]),
      ],
    };
  }

  // 分野ページ
  const fieldMatch = clean.match(/^\/field\/([^/]+)$/);
  if (fieldMatch) {
    const rawField = fieldMatch[1];
    const field =
      (LEGACY_FIELD_MAP as Record<string, string>)[rawField] ?? rawField;
    const isValid =
      (TOKUTEI_FIELDS as readonly string[]).includes(field) ||
      (UPCOMING_FIELDS as readonly string[]).includes(field);
    if (!isValid) return { title: SITE, description: DESC, notFound: true };
    const orgData = await p.orgsSearch({ field, page: 1, limit: 10 });
    seed(
      qc,
      getQueryKey(trpc.orgs.search, { field, page: 1, limit: 10 }, "query"),
      orgData
    );
    return {
      title: `${field}分野対応の登録支援機関一覧｜特定技能 - ヤトエル`,
      description: `特定技能「${field}」分野に対応する登録支援機関の一覧。${FIELD_DESCRIPTIONS[field] ?? ""}受付可能な機関に無料で一括相談できます（候補数により最大5社）。`,
      canonicalPath: `/field/${encodeURIComponent(field)}`,
      jsonLd: [
        faqLd(fieldFaqs(field, FIELD_DESCRIPTIONS[field])),
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: `${field}分野の登録支援機関`, path: `/field/${field}` },
        ]),
      ],
    };
  }

  // 更新情報一覧
  if (clean === "/updates") {
    const list = await p.updatesList();
    seed(qc, getQueryKey(trpc.updates.list, undefined, "query"), list);
    return {
      title: "登録支援機関 登録簿の更新情報 - ヤトエル",
      description:
        "出入国在留管理庁の登録支援機関登録簿の週次更新情報。新規登録・抹消された機関を一覧で確認できます。",
      canonicalPath: "/updates",
    };
  }

  // 動的コラム記事（DB保存。静的コラム4本はSTATIC_HEADS側で処理済み）
  const articleMatch = clean.match(/^\/columns\/([a-z0-9-]+)$/);
  if (articleMatch && !STATIC_HEADS[clean] && !COLUMN_ARTICLES[clean]) {
    const slug = articleMatch[1];
    const article = await p.articlesBySlug(slug);
    if (!article) return { title: SITE, description: DESC, notFound: true };
    seed(qc, getQueryKey(trpc.articles.bySlug, { slug }, "query"), article);
    return {
      title: `${article.title} - ヤトエル`,
      description: article.description,
      ogType: "article",
      canonicalPath: `/columns/${slug}`,
      publishedTime: `${article.baseDate}T00:00:00+09:00`,
      jsonLd: [
        articleLd({
          headline: article.title,
          path: `/columns/${slug}`,
          datePublished: article.baseDate,
          description: article.description,
        }),
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: "コラム", path: "/columns" },
          { name: article.title, path: `/columns/${slug}` },
        ]),
      ],
    };
  }

  // 更新情報詳細
  const updateMatch = clean.match(/^\/updates\/(\d{4}-\d{2}-\d{2})$/);
  if (updateMatch) {
    const baseDate = updateMatch[1];
    const data = await p.updatesDetail(baseDate);
    if (!data) return { title: SITE, description: DESC, notFound: true };
    seed(qc, getQueryKey(trpc.updates.detail, { baseDate }, "query"), data);
    return {
      title: `【${data.snapshot.baseDate}】登録支援機関 新規${data.added.length}件・抹消${data.removed.length}件（計${data.snapshot.totalCount.toLocaleString()}件）- ヤトエル`,
      description: `${data.snapshot.baseDate}基準の登録支援機関登録簿の更新情報。新規登録${data.added.length}件・抹消${data.removed.length}件の一覧です。`,
      ogType: "article",
      canonicalPath: `/updates/${baseDate}`,
      publishedTime: `${data.snapshot.baseDate}T00:00:00+09:00`,
      jsonLd: [
        articleLd({
          headline: `【${data.snapshot.baseDate}】登録支援機関 新規${data.added.length}件・抹消${data.removed.length}件（計${data.snapshot.totalCount.toLocaleString()}件）`,
          path: `/updates/${baseDate}`,
          datePublished: data.snapshot.baseDate,
          description: `${data.snapshot.baseDate}基準の登録支援機関登録簿の更新情報。`,
        }),
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: "登録簿の更新情報", path: "/updates" },
          { name: `${data.snapshot.baseDate}基準の更新`, path: `/updates/${baseDate}` },
        ]),
      ],
    };
  }

  // 統計ページ：overviewをシード
  if (clean === "/stats") {
    const stats = await p.statsOverview();
    seed(qc, getQueryKey(trpc.stats.overview, undefined, "query"), stats);
    return {
      title: "登録支援機関の統計データ - ヤトエル",
      description:
        "全国の登録支援機関の統計データ。都道府県別の登録数や処分歴の状況をグラフで確認できます。",
      canonicalPath: "/stats",
      jsonLd: [
        datasetLd(stats.total),
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: "統計データ", path: "/stats" },
        ]),
      ],
    };
  }

  // ゲートルート：200 + noindex（プリフェッチなし）
  if (clean === "/admin" || clean.startsWith("/admin/")) {
    return { title: SITE, description: DESC, noindex: true };
  }

  // 静的公開ルート（head-only）
  const staticHead = STATIC_HEADS[clean];
  if (staticHead) {
    // コラム一覧：DB記事もSSRでHTMLに含める
    if (clean === "/columns") {
      const list = await p.articlesList();
      seed(qc, getQueryKey(trpc.articles.list, undefined, "query"), list);
    }
    const jsonLd: Array<Record<string, unknown>> = [];
    // コラム記事：Article＋FAQPage＋パンくず
    const article = COLUMN_ARTICLES[clean];
    if (article) {
      jsonLd.push(
        articleLd({
          headline: article.headline,
          path: clean,
          datePublished: article.datePublished,
          description: article.description,
        }),
        faqLd(article.faqs),
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: "コラム", path: "/columns" },
          { name: article.headline, path: clean },
        ])
      );
    }
    // 制度ガイド：FAQPage＋パンくず
    const guideFaqs = GUIDE_FAQS[clean];
    if (guideFaqs) {
      jsonLd.push(
        faqLd(guideFaqs),
        breadcrumbLd([
          { name: "ホーム", path: "/" },
          { name: staticHead.title.replace(/ - ヤトエル$/, ""), path: clean },
        ])
      );
    }
    return {
      ...staticHead,
      canonicalPath: clean,
      ogType: article ? ("article" as const) : undefined,
      publishedTime: article ? `${article.datePublished}T00:00:00+09:00` : undefined,
      jsonLd: jsonLd.length > 0 ? jsonLd : undefined,
    };
  }

  // 未知ルート：真の404
  return { title: SITE, description: DESC, notFound: true };
}
