import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { LEGACY_FIELD_MAP, TOKUTEI_FIELDS, UPCOMING_FIELDS } from "@shared/tokutei";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";

const FIELD_DESCRIPTIONS: Record<string, string> = {
  介護: "高齢化に伴い最も受入れが進む分野。身体介護や生活支援業務に従事でき、介護福祉士取得で長期就労への道も開けます。",
  ビルクリーニング: "建物内部の清掃業務が対象。宿泊・オフィスビルの清掃需要増で受入れが拡大しています。",
  リネンサプライ: "ホテル・病院向けリネン（シーツ・タオル等）の洗濯・仕上げ業務が対象。2027年受入開始予定の新分野です。",
  工業製品製造業: "鋳造・金属プレス・溶接・機械加工・電子機器組立てなど製造業の中核工程が対象。旧「素形材・産業機械・電気電子情報関連製造業」から名称変更・対象拡大された分野です。",
  建設: "型枠施工・鉄筋施工・とび・土工など建設業務全般。2号移行で長期就労が可能な代表分野です。",
  "造船・舶用工業": "溶接・塗装・鉄工など造船関連業務。九州・瀬戸内など造船地域で受入れが盛んです。",
  自動車整備: "自動車の点検・分解整備業務。整備士不足を背景に全国の整備工場で需要が高まっています。",
  航空: "空港グランドハンドリングと航空機整備が対象。訪日需要回復で人材ニーズが急増しています。",
  宿泊: "フロント・企画広報・接客・レストランサービスなどホテル・旅館業務全般が対象です。",
  自動車運送業: "トラック・タクシー・バスの運転業務が対象。2024年追加の新しい分野で、ドライバー不足対策として注目されています。",
  鉄道: "軌道整備・電気設備整備・車両整備・車両製造・運輸係など鉄道関連業務が対象。2024年追加の分野です。",
  物流倉庫: "倉庫内の仕分け・ピッキング・梱包などの業務が対象。2027年受入開始予定の新分野です。",
  農業: "耕種農業・畜産農業が対象。派遣形態での受入れが認められている数少ない分野です。",
  漁業: "漁業・養殖業が対象。農業と同様に派遣形態での受入れが可能です。",
  飲食料品製造業: "食品・飲料の製造・加工全般。受入れ人数が最も多い分野のひとつです。",
  外食業: "外食業全般（調理・接客・店舗管理）。都市部の飲食店を中心に受入れが進んでいます。",
  林業: "育林・素材生産などの林業業務が対象。2024年追加の分野で、山村部の担い手不足対策として期待されています。",
  木材産業: "製材・合板製造などの木材加工業務が対象。2024年追加の分野です。",
  資源循環: "廃棄物処理・リサイクル業務が対象。2027年受入開始予定の新分野です。",
};

export default function Field() {
  const params = useParams<{ field: string }>();
  const [, setLocation] = useLocation();
  const rawField = decodeURIComponent(params.field ?? "");
  // 旧分野名URL（例：素形材・産業機械・電気電子情報関連製造業）は現行分野名に後方互換
  const field = LEGACY_FIELD_MAP[rawField] ?? rawField;
  const isValid = (TOKUTEI_FIELDS as readonly string[]).includes(field);
  const isUpcoming = (UPCOMING_FIELDS as readonly string[]).includes(field);

  const { data: orgData, isLoading } = trpc.orgs.search.useQuery(
    { field, page: 1, limit: 10 },
    { enabled: isValid }
  );
  // 分野情報は入管庁登録簿に含まれない（有料掲載・取材データ由来）ため、
  // 分野登録機関が少ない場合は全国の機関をフォールバック表示する
  const needFallback = !isLoading && (orgData?.items.length ?? 0) === 0;
  const { data: fallbackData, isLoading: fallbackLoading } = trpc.orgs.search.useQuery(
    { page: 1, limit: 10 },
    { enabled: isValid && needFallback }
  );

  useEffect(() => {
    if (!isValid) return;
    document.title = `${field}分野対応の登録支援機関一覧｜特定技能 - ヤトエル`;
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      `特定技能「${field}」分野に対応する登録支援機関の一覧。${FIELD_DESCRIPTIONS[field] ?? ""}最大5社に無料で一括相談できます。`
    );
    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `特定技能「${field}」分野ではどんな業務ができますか？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: FIELD_DESCRIPTIONS[field] ?? `${field}分野の特定技能業務に従事できます。`,
          },
        },
        {
          "@type": "Question",
          name: `${field}分野に対応する登録支援機関はどう探せばよいですか？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `ヤトエルでは出入国在留管理庁の登録簿に基づき、${field}分野に関連する登録支援機関を対応言語・地域・行政処分歴で検索できます。料金・受付状況は実確認済みの機関から順次公開しています。相談は無料です。`,
          },
        },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "field-jsonld";
    script.textContent = JSON.stringify(faq);
    document.head.appendChild(script);
    return () => {
      document.getElementById("field-jsonld")?.remove();
      document.title = "ヤトエル｜特定技能・育成就労の登録支援機関データベース";
      meta?.setAttribute("content", prev);
    };
  }, [field, isValid]);

  if (!isValid) {
    return (
      <SiteLayout>
        <div className="container py-20 text-center text-muted-foreground">
          <p className="mb-6">指定された分野が見つかりません。</p>
          <Button variant="outline" onClick={() => setLocation("/search")}>
            検索ページへ
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
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
            <span>{field}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-amber-accent" />
            特定技能「{field}」対応の支援機関
            {isUpcoming && (
              <Badge variant="outline" className="border-amber-accent text-amber-accent text-xs align-middle">
                2027年受入開始予定
              </Badge>
            )}
          </h1>
          <p className="text-brand-foreground/70 max-w-2xl leading-relaxed">
            {FIELD_DESCRIPTIONS[field]}
          </p>
          {orgData && orgData.total > 0 && (
            <div className="mt-6">
              <div className="text-3xl font-black text-amber-accent">
                {orgData.total.toLocaleString()}
              </div>
              <div className="text-xs text-brand-foreground/60">{field}分野に対応可能性のある登録支援機関数（分野情報未登録の機関を含む）</div>
            </div>
          )}
        </div>
      </div>

      <div className="container py-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand" />
              {needFallback ? "全国の登録支援機関（上位10件）" : "掲載機関（上位10件を表示）"}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(needFallback ? "/search" : `/search?field=${encodeURIComponent(field)}`)}
            >
              <Search className="h-4 w-4 mr-1" />
              すべて見る
            </Button>
          </div>

          {needFallback && (
            <Card className="border-amber-accent/40 bg-amber-accent/5">
              <CardContent className="p-4 text-sm text-muted-foreground leading-relaxed">
                対応分野の情報は出入国在留管理庁の登録簿には含まれておらず、各機関の掲載情報に基づき順次整備しています。
                多くの登録支援機関は複数分野に対応可能なため、まずは地域・対応言語で絞り込んで相談することをおすすめします。
              </CardContent>
            </Card>
          )}

          {isLoading || (needFallback && fallbackLoading) ? (
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
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setLocation(`/search?field=${encodeURIComponent(field)}`)}
              >
                {field}分野の候補{orgData.total.toLocaleString()}件を検索・比較する
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : fallbackData && fallbackData.items.length > 0 ? (
            <>
              {fallbackData.items.map((org) => (
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
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setLocation("/search")}
              >
                全国の全{fallbackData.total.toLocaleString()}件を検索・比較する
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                掲載機関が見つかりませんでした。
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-brand text-brand-foreground">
            <CardContent className="p-5">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-accent" />
                自社が{field}分野に該当するか不明な場合
              </h3>
              <p className="text-sm text-brand-foreground/70 mb-4 leading-relaxed">
                自社サイトのURLを入れるだけで、AIが該当分野の目安と概算コストを無料で整理します。※在留資格の可否判断ではありません
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
              <CardTitle className="text-base">他の分野から探す</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                {TOKUTEI_FIELDS.filter((f) => f !== field).map((f) => (
                  <Link key={f} href={`/field/${encodeURIComponent(f)}`}>
                    <span className="text-sm text-brand hover:underline cursor-pointer">
                      {f}
                    </span>
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
