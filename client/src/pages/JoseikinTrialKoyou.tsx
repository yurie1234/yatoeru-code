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
 * 助成金子記事：トライアル雇用助成金（一般トライアルコース）
 */

const CONTENT_BASE_DATE = "2026年7月18日";
const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "gaiyou", label: "制度の概要と金額" },
  { id: "cases", label: "対象になるケース・ならないケース" },
  { id: "yoken", label: "主な支給要件" },
  { id: "nagare", label: "申請の流れ" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const CASE_ROWS = [
  {
    kind: "対象になりうるケース",
    tone: "ok" as const,
    items: [
      "国内在住の外国人（永住者・日本人の配偶者等・定住者など就労制限のない在留資格）をハローワーク等の紹介で試行雇用する",
      "留学生としての離職などで職業経験が乏しく、ハローワークで個別支援を受けている求職者を雇い入れる",
      "ウクライナ避難民など、特例的に対象範囲が拡充されている求職者を受け入れる",
    ],
  },
  {
    kind: "対象にならないケース",
    tone: "ng" as const,
    items: [
      "海外から特定技能・育成就労で新たに呼び寄せる採用（ハローワーク等の紹介を経ないため）",
      "自社サイトや人材紹介会社経由など、ハローワーク・許可を受けた職業紹介事業者等以外の経路での採用",
      "週30時間以上の無期雇用への移行を前提としない、短時間・短期のみの雇用",
    ],
  },
] as const;

const FAQS = [
  {
    q: "特定技能外国人の採用にトライアル雇用助成金は使えますか？",
    a: "海外から呼び寄せる特定技能の採用では、ハローワーク等の紹介という前提を満たさないため通常は使えません。一方、国内在住で就労制限のない在留資格（永住者・定住者・日本人の配偶者等）を持つ外国人求職者を、ハローワーク経由で試行雇用する場合は検討の余地があります。",
  },
  {
    q: "支給額はいくらですか？",
    a: "対象労働者1人あたり月額最大4万円（母子家庭の母等・父子家庭の父の場合は月額5万円）が最長3か月支給されます。トライアル期間中の就労日数の割合によって減額される場合があります。",
  },
  {
    q: "トライアル期間後に本採用しないことはできますか？",
    a: "トライアル雇用は常用雇用への移行を目的とした制度ですが、適性が合わなかった場合に本採用へ移行しない選択も制度上は可能です。ただし合理的な理由なく本採用を繰り返し見送るような運用は想定されていません。",
  },
  {
    q: "対象となる求職者の要件は何ですか？",
    a: "紹介日時点で安定した職業に就いておらず、（1）2年以内に2回以上の離転職を繰り返している、（2）離職期間が1年を超えている、（3）妊娠・出産・育児を理由に離職し安定した職業に就いていない期間が1年を超えている、（4）55歳未満でハローワーク等の個別支援を受けている、（5）就職支援に特別な配慮を要する（生活保護受給者・母子家庭の母等・ウクライナ避難民など）——のいずれかに該当することが必要です。",
  },
] as const;

export default function JoseikinTrialKoyou() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "トライアル雇用助成金と外国人採用：対象になるケース・ならないケース - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "トライアル雇用助成金（一般トライアルコース）は月額最大4万円×最長3か月。ハローワーク等の紹介が前提のため海外からの特定技能採用には使えませんが、国内在住外国人の試行雇用では検討できます。対象になるケース・ならないケースを一次情報に基づき整理します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: "トライアル雇用助成金と外国人採用：対象になるケース・ならないケース",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/joseikin/trial-koyou",
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
    script.id = "joseikin-trial-koyou-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("joseikin-trial-koyou-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="トライアル雇用助成金と外国人採用：対象になるケース・ならないケース"
            articlePath="/joseikin/trial-koyou"
            shortTitle="トライアル雇用助成金"
            hubPath="/joseikin"
            hubLabel="助成金ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-amber-accent shrink-0" />
            トライアル雇用助成金と外国人採用：対象になるケース・ならないケース
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              トライアル雇用助成金（一般トライアルコース）は、職業経験の不足などから就職が難しい求職者をハローワーク等の紹介で試行雇用（原則3か月）した事業主に、1人あたり月額最大4万円を支給する制度です。
            </strong>
            ハローワーク等の紹介が前提のため、外国人採用で使える場面は限られます。誤解が多いポイントを整理しました。
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
                    ["所管", "厚生労働省（申請窓口はハローワーク・労働局）"],
                    [
                      "対象事業主",
                      "ハローワーク・許可を受けた職業紹介事業者等の紹介により対象者を試行雇用する事業主",
                    ],
                    ["試行期間", "原則3か月のトライアル雇用（週30時間以上・常用雇用への移行が前提）"],
                    [
                      "支給額",
                      "1人あたり月額最大4万円（母子家庭の母等・父子家庭の父は5万円）×最長3か月。就労日数割合により減額あり",
                    ],
                    ["対象労働者", "紹介日時点で安定した職業に就いていない等の要件を満たす求職者（国籍不問）"],
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

        <section id="cases" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">対象になるケース・ならないケース</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {CASE_ROWS.map((c) => (
              <Card
                key={c.kind}
                className={c.tone === "ok" ? "border-emerald-300/60" : "border-red-300/60"}
              >
                <CardHeader className="pb-2">
                  <CardTitle
                    className={`text-base ${c.tone === "ok" ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {c.kind}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-4">
                    {c.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            海外からの特定技能・育成就労の受け入れを検討している場合は、本制度ではなく
            <Link href="/joseikin/jinzai-kakuho">
              <span className="text-brand hover:underline cursor-pointer">
                人材確保等支援助成金（外国人労働者就労環境整備助成コース）
              </span>
            </Link>
            などの検討が現実的です。
          </p>
        </section>

        <section id="yoken" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            主な支給要件
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              対象労働者は、<strong className="text-foreground">紹介日時点で安定した職業に就いていない</strong>
              ことに加え、（1）2年以内に2回以上の離転職、（2）離職期間1年超、（3）妊娠・出産・育児による離職後1年超、（4）55歳未満でハローワーク等の個別支援対象、（5）生活保護受給者・母子家庭の母等・日雇労働者・ウクライナ避難民など特別な配慮を要する——のいずれかに該当する必要があります。
            </p>
            <p>
              事業主側は、<strong className="text-foreground">ハローワーク等にトライアル雇用求人を提出し、その紹介で雇い入れる</strong>
              こと、トライアル雇用開始日から2週間以内に実施計画書を提出することが必要です。事前の求人区分の設定が必須のため、通常求人での採用後に遡って適用することはできません。
            </p>
          </div>
        </section>

        <section id="nagare" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">申請の流れ</h2>
          <div className="space-y-3">
            {[
              {
                step: "1. トライアル雇用求人の提出",
                detail: "ハローワーク等に「トライアル雇用併用求人」を提出します。",
              },
              {
                step: "2. 紹介・雇い入れ",
                detail: "ハローワーク等の紹介を受けた対象者と、原則3か月のトライアル雇用契約を締結します。",
              },
              {
                step: "3. 実施計画書の提出",
                detail: "トライアル開始日から2週間以内に、トライアル雇用実施計画書をハローワークへ提出します。",
              },
              {
                step: "4. 結果報告・支給申請",
                detail: "トライアル期間終了後2か月以内に、結果報告書兼支給申請書を提出します。",
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
                  <CardTitle className="text-base">{f.q}</CardTitle>
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
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/trial_koyou.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 トライアル雇用助成金（一般トライアルコース）
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
