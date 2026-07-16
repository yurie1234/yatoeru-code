import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarDays, FileSpreadsheet, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";

/**
 * 登録簿更新情報の一覧ページ。
 * 週次で「新規◯件・抹消◯件（基準日つき）」を全自動生成する差分記事のインデックス。
 * 引用しやすい構造化ページ原則: 結論先頭・基準日・表・出典。
 */
export default function Updates() {
  const { data, isLoading } = trpc.updates.list.useQuery();

  useEffect(() => {
    document.title = "登録支援機関登録簿の更新情報（新規登録・抹消の週次記録）- ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "出入国在留管理庁の登録支援機関登録簿の更新を継続記録。新規登録・抹消された機関を基準日つきで公開しています。登録簿には抹消機関が掲載されないため、抹消記録はヤトエル独自のデータです。"
    );
    return () => {
      document.title = "ヤトエル｜特定技能・育成就労の登録支援機関データベース";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <span>登録簿更新情報</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-amber-accent" />
            登録支援機関登録簿の更新情報
          </h1>
          <p className="text-brand-foreground/70 max-w-2xl leading-relaxed">
            出入国在留管理庁が公表する登録支援機関登録簿の更新を継続的に記録しています。
            公式の登録簿には登録後に抹消された機関は掲載されないため、
            抹消の記録はヤトエルが更新ごとの比較で独自に算出しているデータです。
          </p>
        </div>
      </div>

      <div className="container py-10 max-w-3xl">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-3">
            {data.map((s, idx) => (
              <Link key={s.id} href={`/updates/${s.baseDate}`}>
                <Card className="hover:border-brand/40 transition-colors cursor-pointer mb-3">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="secondary" className="gap-1">
                        <CalendarDays className="h-3 w-3" />
                        基準日 {s.baseDate}
                      </Badge>
                      {idx === 0 && (
                        <Badge className="bg-amber-accent text-brand hover:bg-amber-accent">
                          最新
                        </Badge>
                      )}
                    </div>
                    <h2 className="font-bold mb-1">
                      {s.baseDate} 時点の登録支援機関：{s.totalCount.toLocaleString()}件
                      {(s.added > 0 || s.removed > 0) && (
                        <>
                          （新規{s.added}件・抹消{s.removed}件）
                        </>
                      )}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        新規登録 {s.added}件
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        抹消 {s.removed}件
                      </span>
                      <span className="flex items-center gap-1 ml-auto text-brand">
                        詳細を見る <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                    {s.added === 0 && s.removed === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ※この基準日はヤトエルの記録開始点（差分の比較元）です。
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              更新記録はまだありません。
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-xs text-muted-foreground leading-relaxed border-t pt-4">
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
            （随時更新）。新規・抹消の判定は、ヤトエルが各基準日の登録簿を前回取得分と比較して算出したものです。
            登録番号を照合キーとしており、名称変更・所在地変更は差分に含まれません。
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
