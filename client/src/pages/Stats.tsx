import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BarChart3, Database, MapPin } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function Stats() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.stats.overview.useQuery();

  useEffect(() => {
    document.title = "登録支援機関の統計データ｜都道府県別件数 - ヤトエル";
    if (!data) return;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "登録支援機関データベース（ヤトエル）",
      description: `出入国在留管理庁の登録支援機関登録簿に基づく全国${data.total.toLocaleString()}件の登録支援機関データ。都道府県・対応言語・特定技能分野・行政処分歴で検索可能。`,
      creator: { "@type": "Organization", name: "ヤトエル" },
      license: "https://creativecommons.org/licenses/by/4.0/",
      isBasedOn: "https://www.moj.go.jp/isa/policies/ssw/nyuukokukanri07_00205.html",
      variableMeasured: ["都道府県別登録支援機関数", "対応言語", "特定技能分野"],
    };
    // SSR焼き込み分のJSON-LDを除去してから注入（重複防止）
    document.querySelectorAll("script.ssr-jsonld").forEach((el) => el.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "stats-jsonld";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.getElementById("stats-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
    };
  }, [data]);

  const maxCount = data?.byPrefecture[0]?.count ?? 1;

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1 text-sm font-medium mb-4">
            <Database className="h-4 w-4 text-amber-accent" />
            出入国在留管理庁 登録簿ベース
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-amber-accent" />
            登録支援機関の統計データ
          </h1>
          <p className="text-brand-foreground/70 max-w-2xl leading-relaxed">
            全国{data ? data.total.toLocaleString() : "―"}
            件の登録支援機関を都道府県別に集計。引用時は「ヤトエル調べ（出入国在留管理庁登録簿に基づく）」と明記のうえご自由にお使いください。
          </p>
        </div>
      </div>

      <div className="container py-10 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand" />
              都道府県別 登録支援機関数
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : data ? (
              <div className="space-y-2">
                {data.byPrefecture.map((p, idx) => (
                  <Link key={p.prefecture} href={`/region/${encodeURIComponent(p.prefecture)}`}>
                    <div className="flex items-center gap-3 group cursor-pointer py-0.5">
                      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm w-20 shrink-0 group-hover:text-brand group-hover:underline">
                        {p.prefecture}
                      </span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-brand/80 group-hover:bg-brand transition-colors rounded"
                          style={{ width: `${Math.max((p.count / maxCount) * 100, 1.5)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right shrink-0">
                        {p.count.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mt-8 bg-muted/30 border-dashed">
          <CardContent className="p-5 text-sm text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-2">データについて</p>
            <p>
              本統計は出入国在留管理庁が公表する「登録支援機関登録簿」をもとに、ヤトエルが集計したものです。登録簿の更新タイミングにより、実際の登録状況と差異が生じる場合があります。報道・調査・研究目的での引用は出典明記のうえ自由に行えます。
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button size="lg" onClick={() => setLocation("/search")} className="bg-brand hover:bg-brand/90">
            支援機関を検索・比較する
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
