import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PREFECTURES } from "@shared/tokutei";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  Search as SearchIcon,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";

const ALL = "__all__";

/** 移行ステータスの表示定義（優先度順） */
export const MIGRATION_STATUS_LABELS: Record<
  string,
  { label: string; className: string }
> = {
  permitted: { label: "許可取得", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  applying: { label: "申請中", className: "bg-blue-100 text-blue-800 border-blue-300" },
  preparing: { label: "申請準備中", className: "bg-amber-100 text-amber-800 border-amber-300" },
  unconfirmed: { label: "未確認", className: "bg-muted text-muted-foreground border-border" },
  not_migrating: { label: "移行しない", className: "bg-red-100 text-red-800 border-red-300" },
};

const PERMIT_TYPE_LABELS: Record<string, string> = {
  general: "一般監理事業",
  specific: "特定監理事業",
};

/**
 * 監理支援機関 一覧・移行状況トラッカー（/ikusei-shuro/kanri-shien-kikan/list/）。
 * 「許可済み一覧はまだ公的に存在しない」ことを冒頭で明示した上で、
 * OTIT許可一覧の現行監理団体3,733件＋独自調査の移行状況を公開する。
 * フィルタ状態はURLに反映するが、クエリ付きURLはSSR側でnoindex。
 */
export default function IkuseiTrackerList() {
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const [keyword, setKeyword] = useState(params.get("keyword") ?? "");
  const [prefecture, setPrefecture] = useState(params.get("prefecture") ?? ALL);
  const [permitType, setPermitType] = useState(params.get("permitType") ?? ALL);
  const [migrationStatus, setMigrationStatus] = useState(params.get("status") ?? ALL);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setKeyword(params.get("keyword") ?? "");
    setPrefecture(params.get("prefecture") ?? ALL);
    setPermitType(params.get("permitType") ?? ALL);
    setMigrationStatus(params.get("status") ?? ALL);
    setPage(1);
  }, [params]);

  const queryInput = useMemo(
    () => ({
      keyword: keyword || undefined,
      prefecture: prefecture !== ALL ? prefecture : undefined,
      permitType:
        permitType !== ALL ? (permitType as "general" | "specific") : undefined,
      migrationStatus:
        migrationStatus !== ALL
          ? (migrationStatus as
              | "unconfirmed"
              | "preparing"
              | "applying"
              | "permitted"
              | "not_migrating")
          : undefined,
      verifiedOnly: verifiedOnly || undefined,
      page,
      limit: 20,
    }),
    [keyword, prefecture, permitType, migrationStatus, verifiedOnly, page]
  );

  const { data, isLoading } = trpc.kanri.search.useQuery(queryInput);
  const { data: summary } = trpc.kanri.summary.useQuery();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  useEffect(() => {
    document.title =
      "監理支援機関の一覧はまだ存在しない？監理団体の移行状況トラッカー【全国3,733団体・毎月更新】 - ヤトエル";
  }, []);

  return (
    <SiteLayout>
      {/* ヒーロー */}
      <div className="bg-brand text-brand-foreground py-10">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3 flex-wrap">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <Link href="/ikusei-shuro">
              <span className="hover:text-brand-foreground cursor-pointer">育成就労制度</span>
            </Link>
            <span>/</span>
            <span>監理団体の移行状況トラッカー</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            監理支援機関 一覧・移行状況トラッカー
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl text-sm leading-relaxed">
            現行の監理団体{summary ? summary.total.toLocaleString() : "3,733"}
            団体（OTIT許可一覧に基づく）について、育成就労制度の「監理支援機関」への移行状況を当サイトが独自に調査・公開しています。
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Badge className="bg-amber-accent text-brand hover:bg-amber-accent gap-1">
              <CalendarDays className="h-3 w-3" />
              最終データ同期日：{summary?.lastSyncDate ?? "2026-07-30"}
            </Badge>
            <Badge
              variant="outline"
              className="text-brand-foreground/70 border-brand-foreground/30"
            >
              出典：外国人技能実習機構（OTIT）許可一覧＋当サイト独自調査
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* 重要な前提の明示（E-E-A-Tの核） */}
        <Card className="mb-6 border-amber-accent/60 bg-amber-50/50">
          <CardContent className="p-4 md:p-5 flex gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm leading-relaxed space-y-2">
              <p className="font-semibold text-foreground">
                重要：監理支援機関の「許可済み一覧」は、まだ公的に存在しません。
              </p>
              <p className="text-muted-foreground">
                監理支援機関の許可証の交付は制度施行（2027年4月1日）以降のため、公的な許可済み一覧は現時点で公表されていません。当ページでは、(1)
                現行の監理団体 全{summary ? summary.total.toLocaleString() : "3,733"}
                団体（OTIT公表の許可一覧）と、(2)
                各団体が監理支援機関の許可を「申請済みか・取得予定か」の当サイト独自調査による移行状況を公開しています。移行状況はアンケート・電話ヒアリングに基づくもので、月1回更新します。
              </p>
              <p className="text-muted-foreground">
                貴団体の移行状況を掲載・更新したい監理団体さまは
                <Link href="/ikusei-shuro/for-kanri-dantai">
                  <span className="text-brand hover:underline cursor-pointer font-medium">
                    こちらの情報提供フォーム
                  </span>
                </Link>
                からご連絡ください（掲載は無料です）。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 集計サマリー */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {(
              [
                ["permitted", summary.byStatus["permitted"] ?? 0],
                ["applying", summary.byStatus["applying"] ?? 0],
                ["preparing", summary.byStatus["preparing"] ?? 0],
                ["unconfirmed", summary.byStatus["unconfirmed"] ?? 0],
                ["not_migrating", summary.byStatus["not_migrating"] ?? 0],
              ] as const
            ).map(([status, count]) => (
              <Card key={status}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{count.toLocaleString()}</div>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs ${MIGRATION_STATUS_LABELS[status].className}`}
                  >
                    {MIGRATION_STATUS_LABELS[status].label}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* フィルター */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative col-span-2 md:col-span-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="団体名・住所・管理IDで検索"
                  className="pl-9"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={prefecture}
                onValueChange={(v) => {
                  setPrefecture(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-1 text-brand" />
                  <SelectValue placeholder="都道府県" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>すべての都道府県</SelectItem>
                  {PREFECTURES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={permitType}
                onValueChange={(v) => {
                  setPermitType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-1 text-brand" />
                  <SelectValue placeholder="許可区分" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>すべての許可区分</SelectItem>
                  <SelectItem value="general">一般監理事業</SelectItem>
                  <SelectItem value="specific">特定監理事業</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={migrationStatus}
                onValueChange={(v) => {
                  setMigrationStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <ShieldCheck className="h-4 w-4 mr-1 text-brand" />
                  <SelectValue placeholder="移行ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>すべての移行状況</SelectItem>
                  <SelectItem value="permitted">許可取得</SelectItem>
                  <SelectItem value="applying">申請中</SelectItem>
                  <SelectItem value="preparing">申請準備中</SelectItem>
                  <SelectItem value="unconfirmed">未確認</SelectItem>
                  <SelectItem value="not_migrating">移行しない</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer w-fit">
              <Checkbox
                checked={verifiedOnly}
                onCheckedChange={(v) => {
                  setVerifiedOnly(v === true);
                  setPage(1);
                }}
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                実績確認済み（当サイトが一次確認した団体のみ）
              </span>
            </label>
          </CardContent>
        </Card>

        {/* 件数表示 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <>
                該当 <span className="font-bold text-foreground">{data?.total.toLocaleString()}</span> 団体
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            並び順：移行状況の確認済み団体を優先表示
          </p>
        </div>

        {/* 一覧 */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : data && data.orgs.length > 0 ? (
          <div className="space-y-3">
            {data.orgs.map((org) => {
              const st = MIGRATION_STATUS_LABELS[org.migrationStatus] ?? MIGRATION_STATUS_LABELS.unconfirmed;
              return (
                <Card key={org.managementId} className="transition-colors hover:border-brand/40">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <Badge variant="outline" className={`text-xs ${st.className}`}>
                            {st.label}
                          </Badge>
                          {org.isVerified && (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 gap-1 text-xs">
                              <ShieldCheck className="h-3 w-3" />
                              実績確認済み{org.verifiedAt ? `（${org.verifiedAt}）` : ""}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">
                            {org.managementId}
                          </span>
                        </div>
                        <h2 className="font-bold text-base leading-snug">{org.name}</h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {org.prefecture ?? "—"}
                            {org.address ? `・${org.address}` : ""}
                          </span>
                          <span>{PERMIT_TYPE_LABELS[org.permitType] ?? org.permitType}</span>
                          {org.permitDate && <span>許可日：{org.permitDate}</span>}
                        </div>
                        {org.statusConfirmedAt && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            移行状況の確認日：{org.statusConfirmedAt}
                            {org.statusNote ? `（${org.statusNote}）` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground text-sm">
              条件に一致する監理団体が見つかりませんでした。条件を変更してお試しください。
            </CardContent>
          </Card>
        )}

        {/* ページネーション */}
        {data && data.total > data.limit && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              前へ
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages} ページ
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              次へ
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* データの取得方法・免責 */}
        <Card className="mt-10 bg-muted/30">
          <CardContent className="p-5 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p className="font-semibold text-sm text-foreground">このトラッカーのデータについて</p>
            <p>
              基礎データは外国人技能実習機構（OTIT）が公表する「監理団体の許可一覧」に基づきます（一般監理事業
              {summary ? (summary.byPermitType["general"] ?? 0).toLocaleString() : "2,241"}団体・特定監理事業
              {summary ? (summary.byPermitType["specific"] ?? 0).toLocaleString() : "1,492"}
              団体）。管理ID（I-/T-）はOTIT一覧に許可番号の記載がないため当サイトが独自に採番したものです。
            </p>
            <p>
              「移行ステータス」は各団体へのアンケート・電話ヒアリング・公表資料に基づく当サイト独自調査の結果であり、公的な認定情報ではありません。確認日と確認方法を可能な範囲で表示しています。最新かつ正確な情報は必ず各団体・外国人技能実習機構へご確認ください。
            </p>
            <p>
              出典：
              <a
                href="https://www.otit.go.jp/implementer/basic/search_supervisor/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                外国人技能実習機構「監理団体の検索」
              </a>
            </p>
          </CardContent>
        </Card>

        {/* 内部リンク */}
        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          {[
            {
              href: "/guide/kanri-shien-kikan",
              title: "監理支援機関とは",
              desc: "許可要件・監理団体との違い・外部監査人の義務化を解説",
            },
            {
              href: "/ikusei-shuro/schedule",
              title: "施行スケジュール完全ガイド",
              desc: "2026年9月の計画認定申請開始までにやること",
            },
            {
              href: "/ikusei-shuro/checklist",
              title: "受入企業向けチェックリスト",
              desc: "委託先の再選定を含む10項目のチェックリスト",
            },
          ].map((g) => (
            <Link key={g.href} href={g.href}>
              <Card className="h-full cursor-pointer transition-colors hover:border-brand/50">
                <CardContent className="p-4">
                  <div className="font-semibold text-sm mb-1 text-brand">{g.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
