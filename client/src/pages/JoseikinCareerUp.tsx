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
 * 助成金子記事：キャリアアップ助成金（正社員化コース）
 */

const CONTENT_BASE_DATE = "2026年7月18日";
export const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "gaiyou", label: "制度の概要と金額" },
  { id: "gaikokujin", label: "外国人労働者は対象になるのか" },
  { id: "zairyuu", label: "在留資格別の適用の考え方" },
  { id: "nagare", label: "申請の流れ" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const ZAIRYU_ROWS = [
  {
    status: "特定技能1号",
    view: "雇用契約は多くがフルタイム直接雇用。有期雇用から無期・正社員への転換を行う場合に検討の余地がありますが、在留期間の上限（通算5年）と就労範囲の制約を踏まえた設計が必要です。",
  },
  {
    status: "特定技能2号",
    view: "在留期間の更新に上限がなく、長期雇用を前提とした正社員化と相性が良い在留資格です。有期契約からの転換であれば要件に該当しうる典型例です。",
  },
  {
    status: "技術・人文知識・国際業務など就労系資格",
    view: "有期契約社員として雇用している場合の正社員転換は、日本人と同様に対象になりえます。",
  },
  {
    status: "育成就労（技能実習からの移行後）",
    view: "育成就労は原則3年で特定技能1号への移行を目指す制度のため、育成就労期間中の正社員化は想定しにくく、特定技能移行後の転換で検討するのが現実的です。",
  },
  {
    status: "留学（資格外活動）・家族滞在",
    view: "就労時間に制限があるためフルタイムの正社員転換はできません。在留資格変更（就労資格への切り替え）が先に必要です。",
  },
] as const;

export const FAQS = [
  {
    q: "外国人労働者でもキャリアアップ助成金の対象になりますか？",
    a: "国籍による除外はなく、要件を満たせば外国人労働者も対象になりえます。ただし、フルタイムでの就労が認められる在留資格であること、転換後の雇用が在留資格の範囲内であることが前提です。在留期間と雇用計画の整合性は事前に確認してください。",
  },
  {
    q: "支給額はいくらですか？",
    a: "正社員化コースでは、有期雇用労働者を正社員化した場合、中小企業で1人あたり80万円（重点支援対象者、2期に分けて支給）が目安です。重点支援対象者以外や大企業では金額が異なります。年度により金額・区分が改定されるため最新の資料をご確認ください。",
  },
  {
    q: "申請前に何が必要ですか？",
    a: "転換を実施する前に「キャリアアップ計画」を作成し、労働局へ提出して認定を受ける必要があります。また、正社員転換制度を就業規則等に規定しておくこと、転換後6か月の賃金を転換前より3%以上増額することが求められます。",
  },
  {
    q: "特定技能1号は通算5年までですが、正社員化できますか？",
    a: "労働契約上の正社員化（無期雇用化）と在留資格の期間は別の概念です。無期雇用契約を結ぶこと自体は可能ですが、在留期間が更新できなければ就労は継続できません。長期雇用を見据えるなら、特定技能2号への移行や他の就労資格への変更を含めたキャリアパス設計が重要です。",
  },
] as const;

export default function JoseikinCareerUp() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "キャリアアップ助成金は外国人労働者にも使える？正社員化コースの適用条件 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "キャリアアップ助成金（正社員化コース）は外国人労働者にも適用されうる制度。中小企業で1人あたり最大80万円。特定技能・育成就労など在留資格別の適用の考え方、キャリアアップ計画の事前提出、賃金3%増額要件を一次情報に基づき解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: "キャリアアップ助成金は外国人労働者にも使える？正社員化コースの適用条件",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/joseikin/career-up",
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
    script.id = "joseikin-career-up-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("joseikin-career-up-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="キャリアアップ助成金は外国人労働者にも使える？正社員化コースの適用条件"
            articlePath="/joseikin/career-up"
            shortTitle="キャリアアップ助成金"
            hubPath="/joseikin"
            hubLabel="助成金ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-amber-accent shrink-0" />
            キャリアアップ助成金は外国人労働者にも使える？正社員化コースの適用条件
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              キャリアアップ助成金（正社員化コース）は、有期雇用労働者を正社員化した中小企業に1人あたり最大80万円を支給する制度で、要件を満たせば外国人労働者も対象になりえます。
            </strong>
            ただし在留資格の範囲内での雇用が前提となるため、資格ごとの適用の考え方を整理しました。
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
                    ["所管", "厚生労働省（申請窓口は都道府県労働局・ハローワーク）"],
                    [
                      "対象事業主",
                      "キャリアアップ計画の認定を受け、有期雇用労働者等を正社員化した事業主",
                    ],
                    [
                      "支給額の目安",
                      "中小企業：1人あたり最大80万円（重点支援対象者・2期に分けて支給）。区分により40万円等",
                    ],
                    [
                      "主な要件",
                      "計画の事前提出／正社員転換制度の就業規則等への規定／転換後6か月の賃金3%以上増額",
                    ],
                    ["対象労働者", "6か月以上雇用している有期雇用労働者等（国籍は問わない）"],
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
          <h2 className="text-xl font-bold mb-4">外国人労働者は対象になるのか</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              キャリアアップ助成金に<strong className="text-foreground">国籍による除外規定はありません</strong>
              。雇用保険被保険者であり、対象労働者の要件（6か月以上の有期雇用など）を満たせば、外国人労働者の正社員転換も支給対象になりえます。
            </p>
            <p>
              一方で、外国人雇用に固有の論点として
              <strong className="text-foreground">在留資格との整合性</strong>
              があります。転換後の業務内容・雇用形態が在留資格の許容範囲を超える場合、そもそも就労が認められません。また在留期間に上限がある資格では、長期の正社員雇用計画と期間のミスマッチが生じないよう注意が必要です。
            </p>
          </div>
        </section>

        <section id="zairyuu" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            在留資格別の適用の考え方
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">在留資格</th>
                    <th className="py-2.5 px-4 font-semibold">適用の考え方</th>
                  </tr>
                </thead>
                <tbody>
                  {ZAIRYU_ROWS.map((r) => (
                    <tr key={r.status} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">{r.status}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.view}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            個別のケースが対象になるかは、管轄労働局への事前相談と、在留資格については出入国在留管理庁・行政書士等への確認をおすすめします。特定技能の受け入れ全体の流れは
            <Link href="/guide/ikusei-shuro">
              <span className="text-brand hover:underline cursor-pointer">育成就労・特定技能ガイド</span>
            </Link>
            もご参照ください。
          </p>
        </section>

        <section id="nagare" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">申請の流れ</h2>
          <div className="space-y-3">
            {[
              {
                step: "1. キャリアアップ計画の作成・提出",
                detail: "転換の対象・時期・取り組みを計画にまとめ、転換実施前に労働局へ提出して認定を受けます。",
              },
              {
                step: "2. 正社員転換制度の規定",
                detail: "就業規則等に転換制度を規定します（未規定の場合は改定が必要です）。",
              },
              {
                step: "3. 転換の実施と6か月の賃金支払い",
                detail: "試験等の手続きを経て正社員へ転換し、転換前より3%以上増額した賃金を6か月分支払います。",
              },
              {
                step: "4. 支給申請",
                detail: "転換後6か月分の賃金支払日の翌日から2か月以内に支給申請を行います。",
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
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/kyariaappu.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 キャリアアップ助成金
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
