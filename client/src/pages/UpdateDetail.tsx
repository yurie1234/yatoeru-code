import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import type { RegistryChange } from "@shared/types";
import { CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";

/**
 * 登録簿更新の詳細ページ（週次差分記事）。
 * 構造: 結論先頭（サマリー文）→ 基準日・出典 → 新規登録の表 → 抹消の表。
 */
export default function UpdateDetail() {
  const params = useParams<{ baseDate: string }>();
  const [, setLocation] = useLocation();
  const baseDate = params.baseDate ?? "";
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(baseDate);

  const { data, isLoading, error } = trpc.updates.detail.useQuery(
    { baseDate },
    { enabled: isValidDate, retry: false }
  );

  useEffect(() => {
    if (!data) return;
    const { added, removed, snapshot } = data;
    document.title = `【${snapshot.baseDate}】登録支援機関 新規${added.length}件・抹消${removed.length}件（計${snapshot.totalCount.toLocaleString()}件）- ヤトエル`;
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      `出入国在留管理庁の登録支援機関登録簿（${snapshot.baseDate}時点）の更新記録。新規登録${added.length}件・抹消${removed.length}件、総数${snapshot.totalCount.toLocaleString()}件。機関名・所在地・登録番号つきの一覧。`
    );
    return () => {
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, [data]);

  if (!isValidDate || error) {
    return (
      <SiteLayout>
        <div className="container py-20 text-center text-muted-foreground">
          <p className="mb-6">指定された更新記録が見つかりません。</p>
          <Button variant="outline" onClick={() => setLocation("/updates")}>
            更新情報一覧へ
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const ChangeTable = ({ rows }: { rows: RegistryChange[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>登録番号</TableHead>
          <TableHead>機関名</TableHead>
          <TableHead>所在地</TableHead>
          <TableHead>登録年月日</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-mono text-xs whitespace-nowrap">{c.regNo}</TableCell>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell>
              {c.prefecture ? (
                <Link href={`/region/${encodeURIComponent(c.prefecture)}`}>
                  <span className="underline decoration-dotted cursor-pointer hover:text-brand">
                    {c.prefecture}
                  </span>
                </Link>
              ) : (
                "―"
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {c.regDate ?? "―"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <Link href="/updates">
              <span className="hover:text-brand-foreground cursor-pointer">登録簿更新情報</span>
            </Link>
            <span>/</span>
            <span>{baseDate}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            登録支援機関登録簿の更新（{baseDate}時点）
          </h1>
          {data && (
            <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
              {/* 結論先頭 */}
              {data.snapshot.baseDate}時点の登録支援機関は
              <strong className="text-amber-accent">
                {data.snapshot.totalCount.toLocaleString()}件
              </strong>
              。
              {data.previous ? (
                <>
                  前回（{data.previous.baseDate}時点・{data.previous.totalCount.toLocaleString()}
                  件）と比較して、新規登録
                  <strong className="text-amber-accent">{data.added.length}件</strong>、抹消
                  <strong className="text-amber-accent">{data.removed.length}件</strong>でした。
                </>
              ) : (
                <>この基準日はヤトエルの記録開始点（以後の差分の比較元）です。</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <CalendarDays className="h-3 w-3" />
                基準日 {data.snapshot.baseDate}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                新規 {data.added.length}件
              </Badge>
              <Badge variant="outline" className="gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                抹消 {data.removed.length}件
              </Badge>
            </div>

            {data.added.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    新規に登録された機関（{data.added.length}件）
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <ChangeTable rows={data.added} />
                </CardContent>
              </Card>
            )}

            {data.removed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    登録簿から抹消された機関（{data.removed.length}件）
                  </CardTitle>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ※公式の登録簿には抹消機関が掲載されないため、この一覧はヤトエルが前回取得分との比較で独自に算出した記録です。抹消理由（自主的な登録取消・更新期限切れ・処分等）は登録簿からは判別できません。
                  </p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <ChangeTable rows={data.removed} />
                </CardContent>
              </Card>
            )}

            {data.added.length === 0 && data.removed.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  この基準日には差分の記録がありません（記録開始点、または変動なし）。
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
              <p>
                出典：
                <a
                  href="https://www.moj.go.jp/isa/applications/ssw/nyuukokukanri07_00205.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  出入国在留管理庁「登録支援機関登録簿」
                </a>
                （{data.snapshot.baseDate}時点）。登録番号を照合キーとした前回取得分との差分であり、名称・所在地の変更は含まれません。
              </p>
            </div>
          </>
        ) : null}
      </div>
    </SiteLayout>
  );
}
