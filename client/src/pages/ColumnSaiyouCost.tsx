import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  Coins,
  ExternalLink,
  Scale,
  Search,
  TrendingDown,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";
import {
  FloatingToc,
  ReadingProgressBar,
  RelatedArticles,
} from "@/components/ArticleExtras";

/**
 * 採用コスト比較記事：外国人採用（特定技能・育成就労）と国内採用手法のコスト比較
 * CTAは /diagnose?from=cost-article で流入元を識別
 */

const CONTENT_BASE_DATE = "2026年7月18日";
const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "matome", label: "結論：採用手法別コスト早見表" },
  { id: "tokutei", label: "特定技能採用のコスト内訳" },
  { id: "ikusei", label: "育成就労採用のコスト内訳" },
  { id: "kokunai", label: "国内採用（人材紹介・求人広告・派遣）のコスト" },
  { id: "shiten", label: "コスト以外で比較すべき3つの視点" },
  { id: "joseikin", label: "助成金でどこまで下がるか" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const COST_TABLE = [
  {
    method: "特定技能（国内在住者の採用）",
    initial: "約10〜30万円",
    running: "支援委託費 月2〜4万円/人（業界平均 約2.8万円）",
    yearly: "約34〜78万円",
    note: "在留資格変更のみで呼び寄せ費用が不要。転職市場からの採用",
  },
  {
    method: "特定技能（海外からの呼び寄せ）",
    initial: "約30〜60万円",
    running: "支援委託費 月2〜4万円/人",
    yearly: "約54〜108万円",
    note: "送出機関費用・渡航費・在留資格認定申請費用を含む",
  },
  {
    method: "育成就労（監理支援機関経由）",
    initial: "約50〜145万円",
    running: "監理費 月2.5〜5万円/人",
    yearly: "約80〜205万円",
    note: "講習費・送出費用等を含む。3年かけて特定技能へ移行する育成前提",
  },
  {
    method: "中途採用（人材紹介）",
    initial: "理論年収の30〜35%（約90〜120万円/人）",
    running: "なし（早期離職時は返金規定次第）",
    yearly: "約90〜120万円",
    note: "採用単価は高いが即戦力。人手不足職種は候補者確保自体が困難",
  },
  {
    method: "求人広告（中途・パート）",
    initial: "約20〜100万円/キャンペーン",
    running: "掲載更新費",
    yearly: "採用数次第（成果不確実）",
    note: "応募が集まらないと費用が沈む。人手不足職種では掲載費が高騰傾向",
  },
  {
    method: "派遣",
    initial: "ほぼなし",
    running: "時給換算で直接雇用の約1.3〜1.5倍",
    yearly: "フルタイム換算 約350〜500万円",
    note: "短期の穴埋めには合理的だが、長期・複数名では最も割高になりやすい",
  },
] as const;

const FAQS = [
  {
    q: "特定技能の採用は人材紹介より本当に安いのですか？",
    a: "1人あたりの初年度総コストで比較すると、国内在住の特定技能人材の採用は約34〜78万円、人材紹介経由の中途採用は約90〜120万円が目安で、特定技能のほうが低くなるケースが多いです。ただし特定技能は支援委託費が毎月継続するため、2年目以降も月2〜4万円/人のランニングコストがかかる点を含めて比較する必要があります。",
  },
  {
    q: "外国人採用のコストを下げる方法はありますか？",
    a: "主に3つあります。（1）海外からの呼び寄せではなく国内在住者（留学生・転職者）を採用して初期費用を抑える、（2）複数の登録支援機関から見積もりを取り支援委託費を比較する（月1.5万円台〜4万円超まで幅があります）、（3）人材確保等支援助成金（外国人労働者就労環境整備助成コース・最大72万円）など該当する助成金を活用する、です。",
  },
  {
    q: "育成就労は特定技能より高いのになぜ選ばれるのですか？",
    a: "育成就労は未経験人材を3年かけて育成し特定技能1号へ移行させる制度で、転職リスクが当面低く、長期定着を前提とした人材確保ができる点が評価されています。特定技能は即戦力ですが転職（転籍）が可能なため、地方や中小企業では育成就労で若手を確保する戦略が採られることがあります。",
  },
  {
    q: "支援委託費の相場はいくらですか？",
    a: "出入国在留管理庁の調査では、登録支援機関へ支払う支援委託費は1人あたり月額平均約2.8万円です。実際には月1.5万円台から4万円超まで幅があり、支援内容（義務的支援のみか、生活支援・翻訳対応まで含むか）によって異なります。金額だけでなく支援範囲を確認して比較することが重要です。",
  },
] as const;

export default function ColumnSaiyouCost() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "外国人採用のコストは高い？特定技能・育成就労と人材紹介・求人広告・派遣を徹底比較 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "特定技能・育成就労の採用コスト（初期費用・支援委託費・監理費）を、人材紹介・求人広告・派遣と1人あたり年間総額で比較。国内在住の特定技能人材なら初年度約34〜78万円と、人材紹介（約90〜120万円）より低くなるケースが多い理由と、助成金でさらに下げる方法を解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "外国人採用のコストは高い？特定技能・育成就労と人材紹介・求人広告・派遣を徹底比較",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/columns/saiyou-cost-hikaku",
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
    script.id = "column-saiyou-cost-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("column-saiyou-cost-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <ReadingProgressBar targetSelector="#article-main" />
      <FloatingToc items={TOC_SECTIONS} />
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="外国人採用のコストは高い？特定技能・育成就労と国内採用手法を徹底比較"
            articlePath="/columns/saiyou-cost-hikaku"
            shortTitle="採用コスト比較"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <Scale className="h-8 w-8 text-amber-accent shrink-0" />
            外国人採用のコストは高い？特定技能・育成就労と人材紹介・求人広告・派遣を徹底比較
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            「外国人採用は高い」——そう感じてこのページを開いた方は多いはずです。私たちも最初はそう思っていました。ところが、人材紹介の成功報酬（約90〜120万円）と国内在住の特定技能人材の初年度総額（約34〜78万円）を同じ表に並べてみると、
            <strong>高いのはむしろ国内の中途採用のほうでした</strong>
            。ではなぜ「高い」という印象だけが先に広まったのか。答えは費用の「見え方」にあります。
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
            <Badge variant="outline" className="text-brand-foreground/70 border-brand-foreground/30">
              約7分で読めます
            </Badge>
          </div>
        </div>
      </div>

      <div id="article-main" className="container py-10 max-w-4xl space-y-10">
        <ArticleToc sections={TOC_SECTIONS} />

        <section id="matome" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-brand" />
            結論：採用手法別コスト早見表
          </h2>
          <p className="text-base text-foreground/90 leading-[1.9] mb-4">
            先に表を置きます。金額は企業規模・地域・委託先によって動くので幅で示していますが、幅の上端同士・下端同士で見比べても、順位はほとんど入れ替わりません。
          </p>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="py-2.5 px-4 font-medium">採用手法</th>
                    <th className="py-2.5 px-4 font-medium">初期費用</th>
                    <th className="py-2.5 px-4 font-medium">ランニング費用</th>
                    <th className="py-2.5 px-4 font-medium whitespace-nowrap">初年度総額目安</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_TABLE.map((r) => (
                    <tr key={r.method} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium">{r.method}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.initial}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.running}</td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{r.yearly}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            ※ 給与・社会保険料など雇用そのものにかかる人件費は全手法共通のため除外し、採用・受け入れに固有の費用のみを比較しています。備考：
            {COST_TABLE.map((r) => `${r.method}＝${r.note}`).join("／")}
          </p>
        </section>

        <section id="tokutei" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">特定技能採用のコスト内訳</h2>
          <div className="space-y-4 text-base leading-[1.9] text-foreground/90">
            <p>
              表の中で特定技能だけ、なぜ「国内」と「海外」で金額が分かれているのか。理由はコストが<strong className="text-foreground">「初期費用」と「毎月の支援委託費」の2階建て</strong>になっていて、変動するのはほぼ初期費用側だけだからです。
              国内在住者なら在留資格申請の取次報酬（行政書士・登録支援機関、約10〜20万円）と健康診断・事前ガイダンス費用程度で済みますが、海外からの呼び寄せは送出機関への手数料と渡航費が乗って約30〜60万円まで上がります。
            </p>
            <p>
              では毎月の支援委託費はどうか。出入国在留管理庁の調査では<strong className="text-foreground">1人あたり平均約2.8万円/月</strong>。この数字だけ見ると安定していそうですが、実際の見積もりは月1.5万円台から4万円超までばらつきます。差の正体は義務的支援のみか生活支援まで含むかという範囲の違いなので、同じ範囲条件で複数機関から見積もりを取ることが、もっとも効くコスト削減策になります。
            </p>
            <p>
              詳しい内訳は
              <Link href="/guide/ikusei-shuro/cost">
                <span className="text-brand hover:underline cursor-pointer">費用ガイド（特定技能・育成就労の費用内訳）</span>
              </Link>
              をご覧ください。
            </p>
          </div>
        </section>

        <section id="ikusei" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">育成就労採用のコスト内訳</h2>
          <div className="space-y-4 text-base leading-[1.9] text-foreground/90">
            <p>
              早見表でひとつだけ突出して高いのが育成就労（技能実習から移行する新制度）です。監理支援機関への加入・監理費、送出機関費用、入国後講習費などで
              <strong className="text-foreground">初期費用約50〜145万円、監理費月2.5〜5万円/人</strong>。これだけ見ると選ぶ理由がなさそうに思えます。ただ、この金額は即戦力の採用費ではなく、未経験人材を3年かけて育成し特定技能1号へ接続するための育成費込みの値段です。比べる相手は人材紹介の成功報酬ではなく、「3年いてくれる人を育てるコスト」のほうです。
            </p>
            <p>
              制度の詳細は
              <Link href="/guide/ikusei-shuro">
                <span className="text-brand hover:underline cursor-pointer">育成就労制度ガイド</span>
              </Link>
              、技能実習からの移行手順は
              <Link href="/guide/ikusei-shuro/tokutei-ginou-ikou">
                <span className="text-brand hover:underline cursor-pointer">特定技能への移行ガイド</span>
              </Link>
              で解説しています。
            </p>
          </div>
        </section>

        <section id="kokunai" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-brand" />
            国内採用（人材紹介・求人広告・派遣）のコスト
          </h2>
          <div className="space-y-4 text-base leading-[1.9] text-foreground/90">
            <p>
              では見慣れた国内手法の側はどうか。人材紹介は<strong className="text-foreground">理論年収の30〜35%</strong>が成功報酬の相場で、年収330万円の人材なら約100万円。即戦力を1名だけ確保したい場合には合理的です。ただ、介護・外食・建設では報酬を払う以前の問題があります。そもそも候補者が集まらないのです。
            </p>
            <p>
              求人広告は1キャンペーン約20〜100万円で、応募が集まらなければ費用が沈む成果不確実型です。
              派遣は初期費用こそ不要ですが、時給換算で直接雇用の約1.3〜1.5倍となり、フルタイム1名を1年間充当すると約350〜500万円に達するため、長期・複数名の人員確保では最も割高になりやすい手法です。
            </p>
            <p>
              冒頭の「外国人採用は高い」に戻ると、あの印象の正体が見えてきます。特定技能は支援委託費が毎月目に見える形で発生する一方、人材紹介の100万円は一度払えば請求書から消え、求人広告の沈んだ費用は採用コストとして集計さえされないことが多い。見える費用と見えない費用の差が、「高そう」の正体でした。継続的に複数名の現場人材を確保する目的なら、総額では特定技能・育成就労に十分な競争力があります。
            </p>
          </div>
        </section>

        <section id="shiten" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">コスト以外で比較すべき3つの視点</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                t: "採用の確実性",
                d: "人手不足職種では国内採用は応募ゼロのリスクがある一方、特定技能は送出国側に候補者プールがあり、計画的な人数確保がしやすい。",
              },
              {
                t: "定着率",
                d: "特定技能は転職（転籍）が可能なため待遇・支援品質が定着を左右する。育成就労は3年間の育成前提で当面の転籍が制限され、定着性が高い。",
              },
              {
                t: "社内工数",
                d: "特定技能は義務的支援を登録支援機関へ委託でき、社内工数を抑えられる。自社支援（内製）に切り替えると委託費は減るが工数と専門知識が必要。",
              },
            ].map((c) => (
              <Card key={c.t}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.t}</CardTitle>
                </CardHeader>
                <CardContent className="text-base text-foreground/90 leading-[1.9]">{c.d}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="joseikin" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">助成金でどこまで下がるか</h2>
          <div className="space-y-4 text-base leading-[1.9] text-foreground/90">
            <p>
              ここまでの金額はすべて「定価」です。ではそこからいくら引けるのか。外国人労働者の就労環境整備に取り組む企業は、
              <strong className="text-foreground">人材確保等支援助成金（外国人労働者就労環境整備助成コース）で経費の1/2〜2/3・最大72万円</strong>
              の支給対象になり得ます。初年度総額の目安34〜78万円に対して、最大でほぼ半分が戻る計算です。このほか賃上げを伴う設備投資には業務改善助成金（最大600万円）、非正規から正規への転換にはキャリアアップ助成金（1人最大80万円）など、外国人にも適用される制度があります。
            </p>
            <p>
              各制度の要件・対象になるケースは
              <Link href="/joseikin">
                <span className="text-brand hover:underline cursor-pointer">外国人雇用で使える助成金ガイド</span>
              </Link>
              で一覧比較できます。
            </p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">よくある質問</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Card key={f.q}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{f.q}</CardTitle>
                </CardHeader>
                <CardContent className="text-base text-foreground/90 leading-[1.9]">{f.a}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="shutten" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">出典（一次情報）</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="https://www.moj.go.jp/isa/policies/ssw/nyuukokukanri01_00127.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                出入国在留管理庁 特定技能制度（登録支援機関・支援委託費に関する調査を含む）
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/gaikokujin_shuro.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 人材確保等支援助成金（外国人労働者就労環境整備助成コース）
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/jinzaikaihatsu/ikuseishuurou.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 育成就労制度
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </section>

        <RelatedArticles
          currentSlug="saiyou-cost-hikaku"
          tags={["採用コスト", "特定技能", "比較"]}
        />

        <Card className="border-amber-accent/50 bg-amber-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold mb-1">自社の場合の費用と助成金候補を30秒で無料診断</div>
              <p className="text-sm text-muted-foreground">
                会社名またはURLを入力すると、受け入れ費用の目安・使える助成金候補・対応できる支援機関をまとめて診断します。
              </p>
            </div>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
              onClick={() => setLocation("/diagnose?from=cost-article")}
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
