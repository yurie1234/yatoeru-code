import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";

/**
 * コラム③「人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由」
 * 市場の混乱（紹介会社＝支援機関という誤解）をコンテンツ化。実在企業名は出さず一般論として書く。
 */

const CONTENT_BASE_DATE = "2026年7月16日";
const PUBLISHED_DATE = "2026-07-16";

const TOC_SECTIONS = [
  { id: "kondou", label: "なぜ混同が起きるのか" },
  { id: "hikaku", label: "比較表：人材紹介会社と登録支援機関" },
  { id: "risk", label: "登録を確認せずに委託した場合の3つのリスク" },
  { id: "tejun", label: "委託前の確認手順（5分でできる）" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const COMPARE_ROWS = [
  {
    item: "根拠制度",
    shokai: "職業安定法（厚生労働省）",
    shien: "出入国管理及び難民認定法（出入国在留管理庁）",
  },
  {
    item: "許可・登録",
    shokai: "有料職業紹介事業の許可（許可番号は「13-ユ-XXXXXX」等の形式）",
    shien: "登録支援機関の登録（登録番号は「19登-XXXXXX」等の形式）",
  },
  {
    item: "主な業務",
    shokai: "求人・求職のマッチング、人材の紹介（入社まで）",
    shien: "特定技能1号外国人への義務的支援10項目の実施（在留中ずっと）",
  },
  {
    item: "業務の期間",
    shokai: "原則、入社（雇用契約成立）まで",
    shien: "在留期間中の継続的な支援（3か月に1回以上の定期面談等）",
  },
  {
    item: "費用の性質",
    shokai: "紹介手数料（理論年収の一定割合等、届出制）",
    shien: "支援委託料（月額制が中心。受入れ企業負担が原則）",
  },
  {
    item: "確認先",
    shokai: "厚生労働省「人材サービス総合サイト」",
    shien: "出入国在留管理庁「登録支援機関登録簿」",
  },
] as const;

const RISK_ITEMS = [
  {
    title: "支援計画が実施されず、在留資格に影響するリスク",
    body: "特定技能1号の受入れには支援計画の確実な実施が在留諸申請の前提になります。登録のない事業者に「支援もまとめて任せたつもり」になっていると、義務的支援が実施されず、外国人本人の在留や次回の在留期間更新に影響が出るおそれがあります。",
  },
  {
    title: "支援体制基準を満たしたとみなされない",
    body: "支援の全部を委託して支援体制基準を満たしたとみなされるのは、委託先が登録支援機関である場合に限られます。登録のない人材紹介会社に支援業務を委託しても、この「みなし」の効果は得られません。",
  },
  {
    title: "費用トラブル",
    body: "紹介手数料と支援委託料は性質の異なる費用です。両者が区別されないまま「一式」で契約すると、何にいくら払っているのか検証できず、相場（支援委託料は月額平均約28,000円・約9割が3万円以下：出入国在留管理庁調査）との比較もできません。",
  },
] as const;

const FAQS = [
  {
    q: "人材紹介会社に特定技能人材の紹介と支援をまとめて頼めますか？",
    a: "その会社が有料職業紹介事業の許可と登録支援機関の登録の両方を持っていれば可能です。両者は別制度・別登録のため、「人材紹介の許可があるから支援もできる」とは限りません。委託前に登録支援機関の登録番号を確認し、出入国在留管理庁の登録簿と照合してください。",
  },
  {
    q: "登録支援機関かどうかはどうやって確認できますか？",
    a: "出入国在留管理庁のウェブサイトに掲載されている「登録支援機関登録簿」（随時更新）で、機関名・登録番号・登録年月日・対応言語を確認できます。ヤトエルでは同登録簿をもとに全国11,000件超の機関を検索でき、行政処分歴の確認状況もあわせて表示しています。",
  },
  {
    q: "登録支援機関でない会社に支援を委託するとどうなりますか？",
    a: "支援の全部委託によって支援体制基準を満たしたとみなされる効果が得られないため、受入れ企業自身が支援体制基準（支援責任者の選任、外国人が十分理解できる言語での対応体制等）を満たす必要があります。満たせない場合、特定技能外国人の受入れ自体ができません。",
  },
  {
    q: "紹介手数料と支援委託料は両方かかりますか？",
    a: "人材の採用に人材紹介を使い、入社後の支援を登録支援機関に委託する場合は、それぞれ別の費用として発生するのが通常です。紹介手数料は入社時の一時金、支援委託料は在留中の月額（平均約28,000円/月：出入国在留管理庁調査）という性質の違いを踏まえ、見積書で両者を分けて確認してください。",
  },
] as const;

export default function ColumnShokaiVsShien() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "人材紹介会社と登録支援機関の違い｜委託前に登録番号を確認すべき理由 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "人材紹介会社（厚労省許可）と登録支援機関（入管庁登録）は別制度・別登録です。紹介はできても支援はできない会社に委託すると支援体制基準を満たせないリスクがあります。登録番号の確認方法と両者の違いを比較表で解説。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/columns/shokai-vs-shien",
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
    // SSR焼き込み分のJSON-LDを除去してから注入（重複防止）
    document.querySelectorAll("script.ssr-jsonld").forEach((el) => el.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "column-shokai-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("column-shokai-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      {/* ヒーロー：結論先頭 */}
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由"
            articlePath="/columns/shokai-vs-shien"
            shortTitle="人材紹介会社と登録支援機関の違い"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <Scale className="h-8 w-8 text-amber-accent shrink-0" />
            人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            「人材を紹介してくれた会社に、入社後の支援もそのまま任せればよい」——自然な発想ですし、営業担当者もそう勧めてくるはずです。ところが
            <strong>
              人材紹介会社（厚生労働省の有料職業紹介許可）と登録支援機関（出入国在留管理庁の登録）は別制度・別登録です。「紹介はできるが支援はできない」会社に支援まで任せたつもりになると、支援体制基準を満たせず特定技能外国人を受け入れられないおそれがあります
            </strong>
            。では、目の前の会社がどちらなのかはどう見分けるのか。鍵は登録番号（「19登-XXXXXX」等）の一行にあります。
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
              出典：出入国在留管理庁・厚生労働省
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        {/* 目次 */}
        <ArticleToc sections={TOC_SECTIONS} />

        {/* なぜ混同が起きるか */}
        <section id="kondou" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">なぜ混同が起きるのか</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              「外国人材を紹介します。入社後のサポートもお任せください」——この営業文句のどこに疑う余地があるのでしょうか。紹介と入社後の支援は連続したサービスに見えるので、同じ資格でできる業務だと考えるのはむしろ自然です。
            </p>
            <p>
              ところが制度の側は連続していません。人材の紹介は<strong className="text-foreground">職業安定法に基づく有料職業紹介事業の許可（厚生労働省）</strong>、特定技能1号外国人への支援は<strong className="text-foreground">入管法に基づく登録支援機関の登録（出入国在留管理庁）</strong>と、所管も根拠法も異なる2つの制度に分かれています。両方を適法に行うには両方の許可・登録が必要で、片方しか持たない事業者は珍しくありません。営業文句に嘘がなくても、「お任せください」の中身が適法な支援として成立するかは、登録の有無で決まります。
            </p>
          </div>
        </section>

        {/* 比較表 */}
        <section id="hikaku" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand" />
            比較表：人材紹介会社と登録支援機関
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold">人材紹介会社（有料職業紹介）</th>
                    <th className="py-2.5 px-4 font-semibold">登録支援機関</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">{r.item}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.shokai}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.shien}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* リスク */}
        <section id="risk" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-brand" />
            登録を確認せずに委託した場合の3つのリスク
          </h2>
          <div className="space-y-3">
            {RISK_ITEMS.map((r) => (
              <Card key={r.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {r.body}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 確認手順 */}
        <section id="tejun" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            委託前の確認手順（5分でできる）
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              確認は難しそうに聞こえて、5分あれば終わります。
              <br />
              <br />
              <strong className="text-foreground">1. 登録番号を尋ねる：</strong>
              「登録支援機関の登録番号を教えてください」と一言尋ねます。適法に支援業務を行っている機関であれば即答できます。「申請中」「グループ会社が持っている」という回答は一見もっともらしいのですが、そこで安心するのは早い。実際に支援を行う主体がどこかを契約書で確認してください（支援業務の再委託は認められていません）。
            </p>
            <p>
              <strong className="text-foreground">2. 入管庁の登録簿と照合する：</strong>
              出入国在留管理庁の「登録支援機関登録簿」で登録番号・機関名を照合します。抹消された機関は登録簿に掲載されないため、掲載の有無自体が確認になります。
            </p>
            <p>
              <strong className="text-foreground">3. 処分歴を確認する：</strong>
              入管庁が公表する行政処分等の一覧も確認します。
              <Link href="/search">
                <span className="text-brand hover:underline cursor-pointer">ヤトエルの検索ページ</span>
              </Link>
              なら、登録簿掲載の全機関について所在地・対応言語・処分歴の確認状況を一度に確認できます。あわせて、料金と契約時の確認項目は
              <Link href="/columns/shien-kikan-erabikata">
                <span className="text-brand hover:underline cursor-pointer">登録支援機関の選び方（料金相場・確認7項目）</span>
              </Link>
              で解説しています。
            </p>
          </div>
        </section>

        {/* FAQ */}
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

        {/* 出典 */}
        <section id="shutten" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">出典（一次情報）</h2>
          <Card>
            <CardContent className="p-5 space-y-2 text-sm">
              <a
                href="https://www.moj.go.jp/isa/policies/ssw/supportssw.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「1号特定技能外国人支援・登録支援機関」
              </a>
              <a
                href="https://www.moj.go.jp/isa/applications/ssw/nyuukokukanri07_00205.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「登録支援機関登録簿」
              </a>
              <a
                href="https://www.moj.go.jp/isa/applications/ssw/surveys.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「特定技能制度における行政処分等」
              </a>
              <a
                href="https://www.jinzai-sougou.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                厚生労働省「人材サービス総合サイト」（職業紹介事業者の許可確認）
              </a>
              <p className="text-xs text-muted-foreground pt-2">
                本記事の内容は{CONTENT_BASE_DATE}時点の一次情報に基づきます。本記事は特定の事業者を評価するものではなく、在留資格の可否判断を行うものでもありません。個別の判断は行政書士等の専門家または出入国在留管理庁にご相談ください。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <Card className="bg-brand text-brand-foreground">
          <CardContent className="p-6 md:flex items-center justify-between gap-6">
            <div className="mb-4 md:mb-0">
              <h3 className="font-bold text-lg mb-1">委託候補の登録状況を今すぐ確認</h3>
              <p className="text-sm text-brand-foreground/70 leading-relaxed">
                入管庁登録簿ベースの全国11,000件超のデータベースで、機関名から登録の有無・所在地・対応言語・処分歴の確認状況をチェックできます。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                className="bg-amber-accent text-brand hover:bg-amber-accent/90"
                onClick={() => setLocation("/search")}
              >
                <Search className="h-4 w-4 mr-1" />
                機関名で登録を確認する
              </Button>
              <Button
                variant="outline"
                className="border-brand-foreground/30 text-brand-foreground hover:bg-brand-foreground/10"
                onClick={() => setLocation("/diagnose")}
              >
                受入れ準備度をチェックする
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
