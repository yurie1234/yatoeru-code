import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AREA_PAGES, getAreaBySlug } from "@shared/area";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardList,
  Factory,
  HandHeart,
  MapPin,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";

const DATA_DATE = "2026年7月30日";

export default function Area() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const area = getAreaBySlug(params.slug ?? "");
  const pref = area?.pref ?? "";

  const { data: stats } = trpc.stats.byPrefecture.useQuery(
    { prefecture: pref },
    { enabled: !!area }
  );
  const { data: orgData, isLoading } = trpc.orgs.search.useQuery(
    { prefecture: pref, page: 1, limit: 8 },
    { enabled: !!area }
  );
  const { data: kanriPrefRows } = trpc.kanri.byPrefecture.useQuery(undefined, {
    enabled: !!area,
  });

  useEffect(() => {
    if (!area) return;
    document.title = `${area.pref}の登録支援機関・監理団体ガイド【特定技能在留者数 全国${area.rank}位】 - ヤトエル`;
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      `${area.pref}の特定技能・育成就労の受入ガイド。登録支援機関${area.supportOrgCount.toLocaleString()}社・監理団体${area.kanriOrgCount.toLocaleString()}団体を掲載。主要受入分野、県の外国人材支援制度、監理支援機関への移行状況をまとめています。`
    );
    document.querySelectorAll("script.ssr-jsonld").forEach((el) => el.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "area-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "ホーム", item: "https://yatoeru.jp/" },
            { "@type": "ListItem", position: 2, name: "地域ガイド", item: "https://yatoeru.jp/search" },
            { "@type": "ListItem", position: 3, name: area.pref, item: `https://yatoeru.jp/area/${area.slug}` },
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `${area.pref}には登録支援機関がいくつありますか？`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `出入国在留管理庁の登録支援機関登録簿によると、${area.pref}に所在する登録支援機関は${area.supportOrgCount.toLocaleString()}社です（${DATA_DATE}時点のヤトエル集計）。`,
              },
            },
            {
              "@type": "Question",
              name: `${area.pref}の監理団体は育成就労後も利用できますか？`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `監理団体は育成就労制度（2027年4月1日施行）へ自動移行されず、全団体が監理支援機関の許可を新規取得する必要があります。${area.pref}の監理団体${area.kanriOrgCount.toLocaleString()}団体の移行状況は、ヤトエルの移行状況トラッカーで確認できます。`,
              },
            },
          ],
        },
      ],
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById("area-jsonld")?.remove();
      meta?.setAttribute("content", prev);
    };
  }, [area]);

  if (!area) {
    return (
      <SiteLayout>
        <div className="container py-20 text-center text-muted-foreground">
          <p className="mb-6">指定された地域ページが見つかりません。</p>
          <Button variant="outline" onClick={() => setLocation("/search")}>
            検索ページへ
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const orgItems = orgData?.items ?? [];
  const supportTotal = stats?.total ?? area.supportOrgCount;
  const kanriTotal =
    kanriPrefRows?.find((r) => r.prefecture === pref)?.count ?? area.kanriOrgCount;

  return (
    <SiteLayout>
      {/* ヒーロー */}
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3">
            <Link href="/"><span className="hover:text-brand-foreground cursor-pointer">ホーム</span></Link>
            <span>/</span>
            <span>地域ガイド</span>
            <span>/</span>
            <span>{area.pref}</span>
          </div>
          <Badge className="bg-amber-accent text-brand mb-3 hover:bg-amber-accent">
            特定技能在留者数 全国{area.rank}位
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-amber-accent" />
            {area.pref}の登録支援機関・監理団体ガイド
          </h1>
          <p className="text-brand-foreground/70 max-w-3xl leading-relaxed">
            {area.pref}の特定技能在留外国人は{area.tokuteiCount}人（全国{area.rank}位）。
            登録支援機関{supportTotal.toLocaleString()}社・監理団体{kanriTotal.toLocaleString()}団体のデータと、
            県の産業構造・支援制度・育成就労への移行動向をまとめた受入ガイドです。
          </p>
          <div className="flex flex-wrap gap-6 mt-6">
            <div>
              <div className="text-3xl font-black text-amber-accent">{area.tokuteiCount}人</div>
              <div className="text-xs text-brand-foreground/60">特定技能在留外国人数（2024年12月末・入管庁）</div>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-accent">{supportTotal.toLocaleString()}</div>
              <div className="text-xs text-brand-foreground/60">登録支援機関数（県内所在）</div>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-accent">{kanriTotal.toLocaleString()}</div>
              <div className="text-xs text-brand-foreground/60">監理団体数（OTIT許可一覧）</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10 space-y-10">
        {/* 固有コンテンツ：産業と受入分野 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Factory className="h-5 w-5 text-brand" />
            {area.pref}の主要受入分野と産業構造
          </h2>
          <p className="leading-relaxed text-foreground/90 max-w-4xl">{area.industry}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {area.topFields.map((f) => (
              <Link key={f} href={`/search?prefecture=${encodeURIComponent(area.pref)}&field=${encodeURIComponent(f)}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent py-1.5 px-3">
                  {f}の支援機関を探す
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Badge>
              </Link>
            ))}
          </div>
        </section>

        {/* 固有コンテンツ：支援制度 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-brand" />
            {area.pref}の外国人材支援制度・相談窓口
          </h2>
          <p className="leading-relaxed text-foreground/90 max-w-4xl">{area.support}</p>
        </section>

        {/* 固有コンテンツ：受入動向 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand" />
            地域の受入動向と育成就労移行の注意点
          </h2>
          <p className="leading-relaxed text-foreground/90 max-w-4xl">{area.trend}</p>
          <Card className="mt-4 border-brand/30 bg-brand/5 max-w-4xl">
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-brand" />
                  {area.pref}の監理団体 移行状況トラッカー
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  県内{kanriTotal.toLocaleString()}団体の監理支援機関への移行状況を独自調査で公開しています（毎月更新）。
                </p>
              </div>
              <Button onClick={() => setLocation(`/ikusei-shuro/kanri-shien-kikan/list?prefecture=${encodeURIComponent(area.pref)}`)}>
                県内の移行状況を見る
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* DBブロック：支援機関一覧 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand" />
              {area.pref}の登録支援機関（上位8件）
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/search?prefecture=${encodeURIComponent(area.pref)}`)}
            >
              <Search className="h-4 w-4 mr-1" />
              全{supportTotal.toLocaleString()}件を検索
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-lg px-3 py-2 mb-4">
            <ShieldCheck className="h-3.5 w-3.5 inline mr-1 text-brand" />
            並び順は登録年月日や条件との適合度のみに基づいており、掲載料による表示順の優遇は行っていません。
          </p>
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {orgItems.map((org) => (
                <Link key={org.id} href={`/org/${org.id}`}>
                  <Card className="hover:border-brand/40 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {org.hasPenalty ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />処分歴あり
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <ShieldCheck className="h-3 w-3" />処分歴なし
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-sm mb-1">{org.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{org.address}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 他県リンク */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">他の地域ガイド</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {AREA_PAGES.filter((a) => a.slug !== area.slug).map((a) => (
                  <Link key={a.slug} href={`/area/${a.slug}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent font-normal">
                      {a.pref}
                    </Badge>
                  </Link>
                ))}
                <Link href="/search">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent font-normal">
                    その他の都道府県（47都道府県対応の検索へ）
                  </Badge>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
          出典：出入国在留管理庁「登録支援機関登録簿」・「特定技能在留外国人数（2024年12月末）」、外国人技能実習機構「監理団体の許可一覧」。
          機関数は{DATA_DATE}時点のヤトエル集計。特定技能在留者数は概数表記です。最新の統計は各公的機関の公表資料をご確認ください。
        </p>
      </div>
    </SiteLayout>
  );
}
