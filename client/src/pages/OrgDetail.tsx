import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Globe2,
  Languages,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";

export default function OrgDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const orgId = parseInt(params.id ?? "", 10);

  const { data, isLoading, error } = trpc.orgs.getById.useQuery(orgId, {
    enabled: !isNaN(orgId),
  });

  // JSON-LD（LocalBusiness / AggregateRatingはレビューが実在する場合のみ）
  useEffect(() => {
    if (!data) return;
    const { org, reviews } = data;
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: org.name,
      address: org.address ?? undefined,
      identifier: org.regNo,
      description: `${org.name}は出入国在留管理庁に登録された登録支援機関です（登録番号：${org.regNo}）。`,
    };
    if (reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: avg.toFixed(1),
        reviewCount: reviews.length,
      };
    }
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "org-jsonld";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    document.title = `${org.name}｜登録支援機関の詳細 - ヤトエル`;
    return () => {
      document.getElementById("org-jsonld")?.remove();
      document.title = "ヤトエル｜特定技能・育成就労の登録支援機関データベース";
    };
  }, [data]);

  if (isNaN(orgId)) {
    return (
      <SiteLayout>
        <div className="container py-20 text-center text-muted-foreground">無効なIDです。</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : error || !data ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-4 opacity-40" />
              <p className="font-medium">支援機関が見つかりませんでした</p>
              <Button variant="outline" className="mt-6" onClick={() => setLocation("/search")}>
                検索に戻る
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 基本情報 */}
            <Card className="border-2">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {data.org.plan === "paid" && (
                    <Badge className="bg-amber-accent text-brand hover:bg-amber-accent">PR掲載</Badge>
                  )}
                  {data.org.hasPenalty ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />行政処分歴あり
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-brand">
                      <ShieldCheck className="h-3 w-3" />処分歴なし
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">登録番号：{data.org.regNo}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-4">{data.org.name}</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">所在地</div>
                      <div className="font-medium">{data.org.address ?? "情報なし"}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">登録年月日</div>
                      <div className="font-medium">{data.org.regDate ?? "情報なし"}</div>
                    </div>
                  </div>
                </div>

                {data.org.languages && data.org.languages.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                      <Languages className="h-4 w-4 text-brand" />
                      対応可能言語
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.org.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="font-normal">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {data.org.fields && data.org.fields.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                      <CheckCircle2 className="h-4 w-4 text-brand" />
                      対応分野
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.org.fields.map((f) => (
                        <Link key={f} href={`/field/${encodeURIComponent(f)}`}>
                          <Badge variant="outline" className="font-normal hover:bg-accent cursor-pointer">
                            {f}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="flex-1 bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                    onClick={() => setLocation(`/consult?orgIds=${data.org.id}`)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    この機関に無料相談する
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation(`/search?prefecture=${encodeURIComponent(data.org.prefecture ?? "")}`)}
                  >
                    同じ地域の他の機関と比較する
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* データ出典 */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
                本ページの基本情報は、出入国在留管理庁が公表する「登録支援機関登録簿」に基づいています。最新の登録状況は
                <a
                  href="https://www.moj.go.jp/isa/policies/ssw/nyuukokukanri07_00205.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground mx-1"
                >
                  出入国在留管理庁の公式サイト
                </a>
                でご確認ください。
              </CardContent>
            </Card>

            {/* 口コミ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand" />
                  利用企業の口コミ（{data.reviews.length}件）
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.reviews.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium mb-1">まだ口コミはありません</p>
                    <p className="text-sm">
                      この支援機関を利用したことがある企業様からの口コミを受け付けています。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.reviews.map((review) => (
                      <div key={review.id} className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? "fill-amber-accent text-amber-accent" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {review.reviewerCompanyType ?? "利用企業"}・{new Date(review.createdAt).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{review.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
