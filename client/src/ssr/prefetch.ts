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
};

function seed(qc: QueryClient, key: unknown, data: unknown) {
  (qc.setQueryData as (k: unknown, d: unknown) => void)(key, data);
}

const SITE = "ヤトエル｜特定技能・育成就労の登録支援機関データベース";
const DESC =
  "ヤトエルは全国11,000件超の登録支援機関を掲載する特定技能・育成就労の支援機関データベース。対応言語・地域・処分歴で検索でき、料金・受付状況は実確認済みの機関から順次公開（確認日表示）。外国人雇用の準備度チェックと最大5社への一括相談も無料。";

/** 静的公開ルートのhead定義（シード不要ページ） */
const STATIC_HEADS: Record<string, { title: string; description: string }> = {
  "/diagnose": {
    title: "外国人雇用の準備度診断（無料） - ヤトエル",
    description:
      "業種と地域を選ぶだけで、特定技能・育成就労での外国人雇用の準備度を無料診断。条件に合う登録支援機関も同時にご案内します。",
  },
  "/consult": {
    title: "登録支援機関への一括相談（無料・最大5社） - ヤトエル",
    description:
      "条件に合う登録支援機関へ最大5社まで無料で一括相談。特定技能・育成就労の受け入れ準備をまとめて相談できます。",
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
    title: "登録支援機関の選び方｜失敗しない5つのチェックポイント - ヤトエル",
    description:
      "登録支援機関選びで失敗しないための5つのチェックポイントを解説。対応言語・地域・処分歴・料金の確認方法まで実務目線でまとめました。",
  },
  "/columns/kanri-dantai-ikou-guide": {
    title: "管理団体から育成就労への移行ガイド - ヤトエル",
    description:
      "技能実習の監理団体から育成就労制度への移行を実務目線で解説。スケジュール・要件・登録支援機関との関係を整理します。",
  },
  "/columns/shokai-vs-shien": {
    title: "人材紹介と登録支援機関の違い - ヤトエル",
    description:
      "外国人雇用における人材紹介会社と登録支援機関の役割の違いを解説。費用構造と契約時の注意点も整理します。",
  },
  "/guide/ikusei-shuro": {
    title: "育成就労制度ガイド - ヤトエル",
    description:
      "2027年開始予定の育成就労制度を解説。技能実習との違い、受け入れ要件、企業が今から準備すべきことをまとめました。",
  },
  "/guide/kanri-shien-kikan": {
    title: "監理支援機関ガイド - ヤトエル",
    description:
      "育成就労制度における監理支援機関の役割と要件を解説。現行の監理団体・登録支援機関との違いを整理します。",
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
          alternateName: "外国人雇用ナビ",
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
      ? `掲載情報は${new Date(org.verifiedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}に運営が本人確認済み。`
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
      jsonLd: [jsonLd],
    };
  }

  // 検索ページ：ベースパスのみインデックス可。クエリ付きは実フィルタでシードしnoindex
  if (clean === "/search") {
    const sp = new URLSearchParams(url.split("?").slice(1).join("?"));
    const keyword = sp.get("keyword") ?? undefined;
    const prefecture = sp.get("prefecture") ?? undefined;
    const language = sp.get("language") ?? undefined;
    const field = sp.get("field") ?? undefined;
    const input = {
      keyword: keyword || undefined,
      prefecture: prefecture || undefined,
      language: language || undefined,
      field: field || undefined,
      page: 1,
      limit: 20,
      sort: "affinity" as const,
    };
    const result = await p.orgsSearch(input);
    seed(qc, getQueryKey(trpc.orgs.search, input, "query"), result);
    const hasFilter = Boolean(keyword || prefecture || language || field);
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
      description: `${prefecture}に対応する登録支援機関の一覧。対応言語・処分歴・受付状況で比較でき、最大5社に無料で一括相談できます。`,
      canonicalPath: `/region/${encodeURIComponent(prefecture)}`,
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
      description: `特定技能「${field}」分野に対応する登録支援機関の一覧。最大5社に無料で一括相談できます。`,
      canonicalPath: `/field/${encodeURIComponent(field)}`,
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
    };
  }

  // ゲートルート：200 + noindex（プリフェッチなし）
  if (clean === "/admin" || clean.startsWith("/admin/")) {
    return { title: SITE, description: DESC, noindex: true };
  }

  // 静的公開ルート（head-only）
  const staticHead = STATIC_HEADS[clean];
  if (staticHead) {
    return { ...staticHead, canonicalPath: clean };
  }

  // 未知ルート：真の404
  return { title: SITE, description: DESC, notFound: true };
}
