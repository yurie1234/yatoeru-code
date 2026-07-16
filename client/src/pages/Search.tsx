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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { AFFINITY_METHODOLOGY } from "@shared/affinity";
import { MAJOR_LANGUAGES, PREFECTURES, TOKUTEI_FIELDS } from "@shared/tokutei";
import { AlertTriangle, ArrowDownWideNarrow, Building2, CheckSquare, ChevronLeft, ChevronRight, Info, Languages, MapPin, Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

const ALL = "__all__";

export default function Search() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const [keyword, setKeyword] = useState(params.get("keyword") ?? "");
  const [prefecture, setPrefecture] = useState(params.get("prefecture") ?? ALL);
  const [language, setLanguage] = useState(params.get("language") ?? ALL);
  const [field, setField] = useState(params.get("field") ?? ALL);
  const [page, setPage] = useState(1);
  // 並び順は親和性順のみ（標準順の切替は廃止。APIのsortパラメータ自体は互換のため残存）
  const sort = "affinity" as const;
  // 検索条件（キーワード・都道府県・言語・分野）が何も指定されていない場合は、
  // 親和性スコアを算定する根拠がないため表示しない（登録年月日順の一覧として扱う）
  const hasCondition =
    keyword.trim() !== "" || prefecture !== ALL || language !== ALL || field !== ALL;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // URLパラメータの変化を反映
  useEffect(() => {
    setKeyword(params.get("keyword") ?? "");
    setPrefecture(params.get("prefecture") ?? ALL);
    setLanguage(params.get("language") ?? ALL);
    setField(params.get("field") ?? ALL);
    setPage(1);
  }, [params]);

  const queryInput = useMemo(
    () => ({
      keyword: keyword || undefined,
      prefecture: prefecture !== ALL ? prefecture : undefined,
      language: language !== ALL ? language : undefined,
      field: field !== ALL ? field : undefined,
      page,
      limit: 20,
      // 条件未指定時は親和性計算を行わず従来順（登録年月日順）で取得
      sort: hasCondition ? sort : ("default" as const),
    }),
    [keyword, prefecture, language, field, page, sort, hasCondition]
  );

  const { data, isLoading } = trpc.orgs.search.useQuery(queryInput);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const goConsult = () => {
    if (selectedIds.length > 0) {
      setLocation(`/consult?orgIds=${selectedIds.join(",")}`);
    }
  };

  return (
    <SiteLayout>
      <div className="bg-muted/30 border-b py-8">
        <div className="container">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">登録支援機関を探す</h1>
          <p className="text-muted-foreground text-sm">
            出入国在留管理庁の登録簿に基づく全国{data?.total !== undefined ? data.total.toLocaleString() : "11,000"}件を掲載。対応言語・地域・行政処分歴で検索できます（料金・受付状況は実確認済みの機関から順次公開）。
          </p>
        </div>
      </div>

      <div className="container py-8">
        {/* フィルター */}
        <Card className="mb-8">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative col-span-2 md:col-span-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="機関名・住所で検索"
                  className="pl-9"
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={prefecture} onValueChange={(v) => { setPrefecture(v); setPage(1); }}>
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="都道府県" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>すべての都道府県</SelectItem>
                  {PREFECTURES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={(v) => { setLanguage(v); setPage(1); }}>
                <SelectTrigger>
                  <Languages className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="対応言語" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>すべての言語</SelectItem>
                  {MAJOR_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={field} onValueChange={(v) => { setField(v); setPage(1); }}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="特定技能分野" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>すべての分野</SelectItem>
                  {TOKUTEI_FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field !== ALL && (
              <p className="text-xs text-muted-foreground mt-3">
                ※ 入管庁の登録簿には対応分野の情報が含まれないため、分野情報が未登録の機関（対応可能性あり）も含めて表示しています。詳細は各機関へ直接ご確認ください。
              </p>
            )}
          </CardContent>
        </Card>

        {/* 一括相談バー */}
        {selectedIds.length > 0 && (
          <div className="sticky top-16 z-40 mb-6">
            <Card className="border-amber-accent border-2 bg-background shadow-lg">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckSquare className="h-5 w-5 text-amber-accent" />
                  {selectedIds.length}社を選択中（最大5社）
                </div>
                <Button onClick={goConsult} className="bg-amber-accent text-brand font-bold hover:bg-amber-accent/90">
                  選択した機関に一括相談する
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 結果一覧 */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <p className="text-sm text-muted-foreground">
                {data.total.toLocaleString()}件中 {(data.page - 1) * 20 + 1}〜{Math.min(data.page * 20, data.total)}件を表示
              </p>
              <div className="flex items-center gap-1.5">
                <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  並び順：{hasCondition ? "親和性順" : "標準（登録年月日順）"}
                </span>
              </div>
            </div>
            {sort === "affinity" && hasCondition && (
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed rounded-md bg-muted/40 border px-3 py-2">
                <Info className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
                {AFFINITY_METHODOLOGY}
              </p>
            )}
            <div className="space-y-4">
              {data.items.map((org) => (
                <Card key={org.id} className={`transition-shadow hover:shadow-md ${selectedIds.includes(org.id) ? "border-amber-accent border-2" : ""}`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <Checkbox
                          checked={selectedIds.includes(org.id)}
                          onCheckedChange={() => toggleSelect(org.id)}
                          disabled={!selectedIds.includes(org.id) && selectedIds.length >= 5}
                          aria-label="一括相談に追加"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {org.plan === "paid" && (
                            <Badge className="bg-amber-accent text-brand hover:bg-amber-accent">PR</Badge>
                          )}
                          {org.hasPenalty && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />処分歴あり
                            </Badge>
                          )}
                          {org.verifiedAt && (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 gap-1">
                              運営確認済み
                            </Badge>
                          )}
                          {(org.consultStatus === "open" || org.consultStatus === "open_active") && (
                            <Badge className="bg-brand text-brand-foreground hover:bg-brand gap-1">
                              新規相談受付中{org.consultStatus === "open_active" ? "（積極受入）" : ""}
                            </Badge>
                          )}
                          {sort === "affinity" && hasCondition && org.affinity && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={`gap-1 cursor-help font-bold ${
                                    org.affinity.score >= 70
                                      ? "border-amber-accent text-amber-700 bg-amber-accent/10"
                                      : org.affinity.score >= 40
                                        ? "border-brand/40 text-brand bg-brand/5"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  親和性 {org.affinity.score}
                                  <Info className="h-3 w-3 opacity-60" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs text-xs">
                                <p className="font-bold mb-1">スコア内訳（満点100）</p>
                                <ul className="space-y-0.5">
                                  {org.affinity.reasons.map((r) => (
                                    <li key={r.label}>・{r.label}（+{r.points}）</li>
                                  ))}
                                </ul>
                                <p className="mt-1.5 opacity-70">配点：分野40／地域30／言語20／信頼性10（処分歴なし5＋実確認鮮度最大5）</p>
                                <p className="mt-1 opacity-70">運営による実確認済みの情報には、情報の確からしさとして最大5点を加点しています（確認日から時間経過で減衰）。有料掲載の有無はスコアに影響しません。</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span className="text-xs text-muted-foreground">{org.regNo}</span>
                        </div>
                        <Link href={`/org/${org.id}`}>
                          <h2 className="text-lg font-bold hover:text-brand hover:underline transition-colors truncate">
                            {org.name}
                          </h2>
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{org.address ?? "住所情報なし"}</span>
                        </p>
                        {org.verifiedAt && (
                          <div className="mt-2 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-900 space-y-0.5">
                            {(org.preferredFields?.length || org.preferredRegions?.length) ? (
                              <p>
                                <span className="font-semibold">希望条件：</span>
                                {[org.preferredRegions?.join("・"), org.preferredFields?.join("・")].filter(Boolean).join("／")}
                              </p>
                            ) : null}
                            <p>
                              <span className="font-semibold">事業者確認日：</span>
                              {new Date(org.verifiedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                          </div>
                        )}
                        {sort === "affinity" && hasCondition && org.affinity && org.affinity.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {org.affinity.reasons.slice(0, 4).map((r) => (
                              <Badge key={r.label} variant="outline" className="text-xs font-normal text-muted-foreground border-dashed">
                                {r.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {org.languages && org.languages.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {org.languages.slice(0, 6).map((lang) => (
                              <Badge key={lang} variant="secondary" className="text-xs font-normal">
                                {lang}
                              </Badge>
                            ))}
                            {org.languages.length > 6 && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                +{org.languages.length - 6}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setLocation(`/org/${org.id}`)}>
                          詳細を見る
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ページネーション */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }); }}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />前へ
                </Button>
                <span className="text-sm text-muted-foreground">
                  {data.page} / {data.totalPages.toLocaleString()}ページ
                </span>
                <Button
                  variant="outline"
                  disabled={page >= data.totalPages}
                  onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }); }}
                >
                  次へ<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <SearchIcon className="h-10 w-10 mx-auto mb-4 opacity-40" />
              <p className="font-medium mb-1">条件に一致する支援機関が見つかりませんでした</p>
              <p className="text-sm">検索条件を変更してお試しください。</p>
            </CardContent>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}
