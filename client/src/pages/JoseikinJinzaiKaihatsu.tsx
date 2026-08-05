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
 * 助成金子記事：人材開発支援助成金（人材育成支援コース等）
 */

const CONTENT_BASE_DATE = "2026年7月18日";
export const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "gaiyou", label: "制度の概要と金額" },
  { id: "nihongo", label: "日本語教育・技能研修は対象になるか" },
  { id: "yoken", label: "主な支給要件" },
  { id: "nagare", label: "申請の流れ" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

export const FAQS = [
  {
    q: "外国人労働者向けの日本語研修は助成対象になりますか？",
    a: "業務遂行に必要な日本語能力の習得を目的とする訓練であれば、職務に関連する訓練として対象になりうるとされています。趣味・教養目的の語学学習は対象外のため、訓練カリキュラムと職務の関連性を訓練計画で示すことが重要です。",
  },
  {
    q: "助成率・助成額はどのくらいですか？",
    a: "人材育成支援コースでは、訓練経費の45%〜75%（対象者・訓練区分により変動）に加え、訓練期間中の賃金助成（1人1時間あたり760円等）が支給される目安です。中小企業か大企業か、正規か非正規かで率が変わります。年度により改定されるため最新の支給要領をご確認ください。",
  },
  {
    q: "OJTだけでも対象になりますか？",
    a: "OFF-JT（座学等）が中心の制度です。人材育成支援コースには、OFF-JT単独の訓練のほか、OJTとOFF-JTを組み合わせる認定実習併用職業訓練などの類型があります。OJT単独では対象にならないのが原則です。",
  },
  {
    q: "特定技能外国人にも使えますか？",
    a: "雇用保険被保険者であれば、特定技能外国人も対象になりえます。受け入れ後の技能研修・日本語研修を計画的に行う場合、訓練計画の事前届出を行った上で活用を検討できます。育成就労では制度上の講習・教育と重なる部分があるため、監理支援機関と役割分担を整理してください。",
  },
] as const;

export default function JoseikinJinzaiKaihatsu() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "人材開発支援助成金で外国人材の日本語教育・技能研修費をまかなう - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "人材開発支援助成金（人材育成支援コース）は訓練経費の45〜75%＋賃金助成（1人1時間760円等）を支給。外国人労働者の日本語教育・技能研修も職務関連性があれば対象になりえます。訓練計画の事前届出から支給申請までの流れを一次情報に基づき解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: "人材開発支援助成金で外国人材の日本語教育・技能研修費をまかなう",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/joseikin/jinzai-kaihatsu",
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
    script.id = "joseikin-jinzai-kaihatsu-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("joseikin-jinzai-kaihatsu-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="人材開発支援助成金で外国人材の日本語教育・技能研修費をまかなう"
            articlePath="/joseikin/jinzai-kaihatsu"
            shortTitle="人材開発支援助成金"
            hubPath="/joseikin"
            hubLabel="助成金ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-amber-accent shrink-0" />
            人材開発支援助成金で外国人材の日本語教育・技能研修費をまかなう
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              人材開発支援助成金は、労働者に計画的な職業訓練を行う事業主に、訓練経費の45〜75%と訓練期間中の賃金の一部（1人1時間あたり760円等）を助成する制度です。
            </strong>
            外国人労働者の日本語教育や技能研修も、職務との関連性があれば対象になりえます。受け入れ後の定着投資を計画する際に検討したい制度です。
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
                    ["所管", "厚生労働省（申請窓口は都道府県労働局）"],
                    [
                      "対象事業主",
                      "職業能力開発推進者を選任し、訓練計画を事前に届け出て計画的な訓練を行う事業主",
                    ],
                    [
                      "助成内容",
                      "訓練経費の45〜75%（対象者・区分により変動）＋訓練期間中の賃金助成（1人1時間あたり760円等）",
                    ],
                    [
                      "対象訓練",
                      "OFF-JTを中心とする10時間以上の訓練（職務に関連する知識・技能の習得が目的）",
                    ],
                    ["対象労働者", "雇用保険被保険者（国籍は問わない）"],
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

        <section id="nihongo" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">日本語教育・技能研修は対象になるか</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              ポイントは<strong className="text-foreground">「職務との関連性」</strong>
              です。単なる語学学習は対象外ですが、業務上の指示理解・安全衛生・接客など
              <strong className="text-foreground">業務遂行に必要な日本語能力の習得</strong>
              を目的としたカリキュラムであれば、職務関連訓練として認められる余地があります。外部の日本語学校への委託研修や、技能検定・業界資格の取得を目指す研修も同様に検討できます。
            </p>
            <p>
              特定技能では受け入れ後の支援（義務的支援）とは別に、企業独自の育成投資として日本語・技能研修を行うケースが増えています。訓練経費と賃金の両面で助成が受けられる可能性があるため、
              <Link href="/diagnose">
                <span className="text-brand hover:underline cursor-pointer">受け入れ費用の無料診断</span>
              </Link>
              とあわせて育成コストの全体像を設計することをおすすめします。
            </p>
          </div>
        </section>

        <section id="yoken" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            主な支給要件
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              第一に、<strong className="text-foreground">職業能力開発推進者を選任</strong>
              し、事業内職業能力開発計画を策定していること。第二に、
              <strong className="text-foreground">訓練開始日の原則1か月前までに訓練実施計画届を労働局へ提出</strong>
              すること。第三に、訓練が10時間以上のOFF-JTを含み、職務に関連する内容であることです。
            </p>
            <p>
              訓練中の賃金を適正に支払うこと、出席状況（原則8割以上の受講）を満たすことも必要です。eラーニングや通信制の訓練も一定の要件下で対象になります。
            </p>
          </div>
        </section>

        <section id="nagare" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">申請の流れ</h2>
          <div className="space-y-3">
            {[
              {
                step: "1. 推進者の選任・計画の策定",
                detail: "職業能力開発推進者を選任し、事業内職業能力開発計画を策定します。",
              },
              {
                step: "2. 訓練実施計画届の提出",
                detail: "訓練開始日の原則1か月前までに、カリキュラム等を添えて労働局へ提出します。",
              },
              {
                step: "3. 訓練の実施",
                detail: "計画に沿って訓練を実施し、出席簿・賃金台帳・経費の証憑を保管します。",
              },
              {
                step: "4. 支給申請",
                detail: "訓練終了日の翌日から2か月以内に支給申請を行います。",
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
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/d01-1.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 人材開発支援助成金
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
