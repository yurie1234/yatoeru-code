import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  Coins,
  ExternalLink,
  HandCoins,
  ListChecks,
  Search,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";
import { JOSEIKIN_DISCLAIMER } from "@shared/joseikin";

/**
 * 助成金子記事：業務改善助成金
 */

const CONTENT_BASE_DATE = "2026年7月18日";
export const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "gaiyou", label: "制度の概要と金額" },
  { id: "gaikokujin", label: "外国人材の受け入れとどう関係するか" },
  { id: "yoken", label: "主な支給要件と特例事業者の拡充" },
  { id: "nagare", label: "申請の流れ" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

export const FAQS = [
  {
    q: "外国人労働者の賃金引上げでも対象になりますか？",
    a: "対象になりえます。業務改善助成金は労働者の国籍を問わず、事業場内で最も低い賃金（事業場内最低賃金）を引き上げる中小企業等が対象です。特定技能や育成就労で受け入れた外国人労働者が事業場内最低賃金の労働者に該当する場合、その賃金引上げと設備投資のセットで申請を検討できます。",
  },
  {
    q: "どのような設備投資が対象になりますか？",
    a: "生産性向上に資する機器・設備の導入（POSシステム、リフト、調理機器、翻訳機など）、コンサルティング費用、人材育成・教育訓練費用などが対象です。特例事業者に該当する場合は、乗用自動車やパソコン等も対象経費に含められる拡充があります。",
  },
  {
    q: "いつまでに事業を完了する必要がありますか？",
    a: "交付決定後、原則としてその年度の事業完了期限（例：1月31日、やむを得ない場合の延長で3月31日）までに賃金引上げと設備投資を完了する必要があります。年度後半の申請は期間が短くなるため、受け入れ計画と並行して早めの検討をおすすめします。",
  },
  {
    q: "賃金はいくら引き上げる必要がありますか？",
    a: "30円・45円・60円・90円の引上げコースがあり、コースと引上げ対象人数により助成上限額（30万〜600万円）が決まります。申請には、事業場内最低賃金と地域別最低賃金の差が50円以内であることが必要です。",
  },
] as const;

export default function JoseikinGyomuKaizen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "業務改善助成金を外国人材の受け入れと同時に活用する方法 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "業務改善助成金は事業場内最低賃金の引上げと設備投資を行う中小企業に上限30万〜600万円を助成する制度。外国人材の受け入れに伴う賃金設計・現場整備と同時に活用する方法、特例事業者の拡充内容、申請の流れを一次情報に基づき解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: "業務改善助成金を外国人材の受け入れと同時に活用する方法",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/joseikin/gyomu-kaizen",
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    };
    document.querySelectorAll("script.ssr-jsonld").forEach((el) => el.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "joseikin-gyomu-kaizen-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("joseikin-gyomu-kaizen-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="業務改善助成金を外国人材の受け入れと同時に活用する方法"
            articlePath="/joseikin/gyomu-kaizen"
            shortTitle="業務改善助成金"
            hubPath="/joseikin"
            hubLabel="助成金ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-amber-accent shrink-0" />
            業務改善助成金を外国人材の受け入れと同時に活用する方法
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              業務改善助成金は、事業場内最低賃金を引き上げ、生産性向上のための設備投資等を行う中小企業に、その費用の一部（上限30万〜600万円）を助成する制度です。
            </strong>
            外国人材の受け入れでは賃金水準の設計と現場の設備整備が同時に発生するため、タイミングを合わせて検討する価値があります。
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Badge className="bg-amber-accent text-brand hover:bg-amber-accent gap-1">
              <CalendarDays className="h-3 w-3" />
              内容確認基準日：{CONTENT_BASE_DATE}
            </Badge>
            <Badge variant="outline" className="text-brand-foreground/70 border-brand-foreground/30">
              執筆：ヤトエル運営チーム
            </Badge>
            <Badge variant="outline" className="text-brand-foreground/70 border-brand-foreground/30">
              出典：厚生労働省
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        <ArticleToc sections={TOC_SECTIONS} />

        <section id="gaiyou" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-brand" />
            制度の概要と金額
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["所管", "厚生労働省（申請窓口は都道府県労働局。コールセンター 0120-366-440）"],
                    [
                      "対象事業主",
                      "中小企業・小規模事業者で、事業場内最低賃金と地域別最低賃金の差が50円以内の事業場",
                    ],
                    [
                      "助成内容",
                      "賃金引上げ（30/45/60/90円コース）＋生産性向上の設備投資等の費用の一部を助成",
                    ],
                    ["助成上限", "引上げコースと対象人数に応じて上限30万〜600万円"],
                    [
                      "完了期限",
                      "交付決定後、年度の事業完了期限（例：1月31日、延長でも3月31日）までに完了",
                    ],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap bg-muted/30">{k}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{JOSEIKIN_DISCLAIMER}</p>
        </section>

        <section id="gaikokujin" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">外国人材の受け入れとどう関係するか</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              特定技能・育成就労では、外国人労働者の報酬を
              <strong className="text-foreground">日本人と同等以上</strong>
              に設定することが求められます。受け入れを機に現場全体の賃金テーブルを見直す企業は多く、その際に事業場内最低賃金の引上げが伴うのであれば、業務改善助成金の要件と重なる可能性があります。
            </p>
            <p>
              また、助成対象となる設備投資には、調理機器・搬送機器などの現場設備のほか、
              <strong className="text-foreground">翻訳機や教育訓練</strong>
              など外国人材の定着に直結する投資も含まれえます。賃金引上げ・設備投資・受け入れ準備を一体の計画として設計することで、自己負担を抑えながら受け入れ環境を整えられます。受け入れ全体の費用感は
              <Link href="/diagnose">
                <span className="text-brand hover:underline cursor-pointer">無料診断</span>
              </Link>
              で確認できます。
            </p>
          </div>
        </section>

        <section id="yoken" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            主な支給要件と特例事業者の拡充
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              基本要件は、（1）中小企業・小規模事業者であること、（2）事業場内最低賃金と地域別最低賃金の差が50円以内であること、（3）交付決定後に賃金引上げと設備投資等を実施し、年度の完了期限までに事業を終えることです。
              <strong className="text-foreground">交付決定前に発注・購入した設備は対象外</strong>
              になるのが原則です。
            </p>
            <p>
              一定の要件を満たす<strong className="text-foreground">特例事業者</strong>
              （賃金要件を満たす事業者や物価高騰等の影響を受けた事業者など）には、対象経費の拡大（乗用自動車・パソコン等の追加）などの拡充措置が設けられています。拡充内容は年度により変わるため、申請前に最新の交付要綱をご確認ください。
            </p>
          </div>
        </section>

        <section id="nagare" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">申請の流れ</h2>
          <div className="space-y-3">
            {[
              {
                step: "1. 交付申請書・事業実施計画書の提出",
                detail: "賃金引上げ計画と設備投資等の内容をまとめ、管轄の労働局へ提出します。",
              },
              {
                step: "2. 交付決定後、事業の実施",
                detail: "交付決定を受けてから、賃金引上げ（就業規則等の改定）と設備投資等を実施します。",
              },
              {
                step: "3. 事業実績報告",
                detail: "完了期限までに事業を終え、支払い証憑や賃金台帳とあわせて実績を報告します。",
              },
              {
                step: "4. 助成金の受領",
                detail: "額の確定通知を受けた後、支払請求を行い助成金を受領します。",
              },
            ].map((t) => (
              <Card key={t.step}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.step}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.detail}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">よくある質問</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Card key={f.q}>
                <CardHeader className="pb-2">
                  <h3 className="text-base leading-none font-semibold">{f.q}</h3>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="shutten" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">出典（一次情報）</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 業務改善助成金
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            他の制度は
            <Link href="/joseikin">
              <span className="text-brand hover:underline cursor-pointer">助成金ガイド（一覧比較）</span>
            </Link>
            をご覧ください。
          </p>
        </section>

        <Card className="border-amber-accent/50 bg-amber-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold mb-1">自社の受け入れ費用と助成金候補を60秒で整理</div>
              <p className="text-sm text-muted-foreground">
                会社名またはURLを入力すると、費用目安・助成金候補・対応できる支援機関をまとめて無料診断します。
              </p>
            </div>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
              onClick={() => setLocation("/diagnose")}
            >
              <Search className="h-4 w-4 mr-2" />
              無料診断をはじめる
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
