import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PREFECTURES } from "@shared/tokutei";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Languages,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";

export default function Region() {
  const params = useParams<{ prefecture: string }>();
  const [, setLocation] = useLocation();
  const prefecture = decodeURIComponent(params.prefecture ?? "");
  const isValid = (PREFECTURES as readonly string[]).includes(prefecture);

  const { data: stats } = trpc.stats.byPrefecture.useQuery(
    { prefecture },
    { enabled: isValid }
  );
  const { data: orgData, isLoading } = trpc.orgs.search.useQuery(
    { prefecture, page: 1, limit: 10 },
    { enabled: isValid }
  );

  useEffect(() => {
    if (!isValid) return;
    document.title = `${prefecture}の登録支援機関一覧｜特定技能・育成就労 - ヤトエル`;
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      `${prefecture}で特定技能外国人の受入れを支援する登録支援機関の一覧。対応言語・分野・行政処分歴で比較し、最大5社に無料で一括相談できます。`
    );
    // FAQ JSON-LD
    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `${prefecture}には登録支援機関がいくつありますか？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `ヤトエルのデータベース（出入国在留管理庁の登録支援機関登録簿に基づく）によると、${prefecture}に所在する登録支援機関は${stats?.total ?? "多数"}件です。`,
          },
        },
        {
          "@type": "Question",
          name: "登録支援機関への相談は無料ですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ヤトエル経由での相談は無料です。最大5社にまとめて相談し、見積もりや提案を比較できます。",
          },
        },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "region-jsonld";
    script.textContent = JSON.stringify(faq);
    document.head.appendChild(script);
    return () => {
      document.getElementById("region-jsonld")?.remove();
      document.title = "ヤトエル｜特定技能・育成就労の登録支援機関データベース";
      meta?.setAttribute("content", prev);
    };
  }, [prefecture, isValid, stats?.total]);

  if (!isValid) {
    return (
      <SiteLayout>
        <div className="container py-20 text-center text-muted-foreground">
          <p className="mb-6">指定された都道府県が見つかりません。</p>
          <Button variant="outline" onClick={() => setLocation("/search")}>
            検索ページへ
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      {/* ヒーロー */}
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <Link href="/search">
              <span className="hover:text-brand-foreground cursor-pointer">支援機関検索</span>
            </Link>
            <span>/</span>
            <span>{prefecture}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-amber-accent" />
            {prefecture}の登録支援機関
          </h1>
          <p className="text-brand-foreground/70 max-w-2xl leading-relaxed">
            出入国在留管理庁の登録簿に基づく、{prefecture}
            に所在する登録支援機関の一覧です。対応言語・分野・行政処分歴で比較し、無料で一括相談できます。
          </p>
          <div className="flex flex-wrap gap-6 mt-6">
            <div>
              <div className="text-3xl font-black text-amber-accent">
                {stats ? stats.total.toLocaleString() : "―"}
              </div>
              <div className="text-xs text-brand-foreground/60">登録支援機関数</div>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-accent">
                {stats ? stats.topLanguages.length : "―"}+
              </div>
              <div className="text-xs text-brand-foreground/60">対応言語数（上位）</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10 grid lg:grid-cols-3 gap-8">
        {/* 機関リスト */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand" />
              掲載機関（上位10件を表示）
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/search?prefecture=${encodeURIComponent(prefecture)}`)}
            >
              <Search className="h-4 w-4 mr-1" />
              すべて見る
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : orgData && orgData.items.length > 0 ? (
            <>
              {orgData.items.map((org) => (
                <Link key={org.id} href={`/org/${org.id}`}>
                  <Card className="hover:border-brand/40 transition-colors cursor-pointer mb-3">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {org.plan === "paid" && (
                          <Badge className="bg-amber-accent text-brand hover:bg-amber-accent">PR</Badge>
                        )}
                        {org.hasPenalty ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />処分歴あり
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />処分歴なし
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold mb-1">{org.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{org.address}</p>
                      {org.languages && org.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {org.languages.slice(0, 6).map((l) => (
                            <Badge key={l} variant="outline" className="text-xs font-normal">
                              {l}
                            </Badge>
                          ))}
                          {org.languages.length > 6 && (
                            <span className="text-xs text-muted-foreground">
                              +{org.languages.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setLocation(`/search?prefecture=${encodeURIComponent(prefecture)}`)}
              >
                {prefecture}の全{orgData.total.toLocaleString()}件を検索・比較する
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {prefecture}の掲載機関が見つかりませんでした。
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {stats && stats.topLanguages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="h-5 w-5 text-brand" />
                  {prefecture}で対応の多い言語
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.topLanguages.map((l) => (
                  <div key={l.language} className="flex items-center justify-between text-sm">
                    <span>{l.language}</span>
                    <span className="text-muted-foreground text-xs">{l.count}機関</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="bg-brand text-brand-foreground">
            <CardContent className="p-5">
              <h3 className="font-bold mb-2">どこに相談すべきか迷ったら</h3>
              <p className="text-sm text-brand-foreground/70 mb-4 leading-relaxed">
                自社サイトのURLを入れるだけで、AIが該当分野の目安を整理し、条件に合う支援機関を提示します。※在留資格の可否判断ではありません
              </p>
              <Button
                className="w-full bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                onClick={() => setLocation("/diagnose")}
              >
                準備度チェックを試す
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">他の都道府県から探す</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {PREFECTURES.filter((p) => p !== prefecture).slice(0, 20).map((p) => (
                  <Link key={p} href={`/region/${encodeURIComponent(p)}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent font-normal">
                      {p}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
