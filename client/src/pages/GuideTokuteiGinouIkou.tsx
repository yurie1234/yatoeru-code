import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightLeft,
  CalendarDays,
  ExternalLink,
  ListChecks,
  Search,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";

/**
 * 育成就労ハブ子記事：技能実習・育成就労から特定技能1号への移行
 */

const CONTENT_BASE_DATE = "2026年7月18日";
export const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "zentai", label: "移行ルートの全体像" },
  { id: "youken", label: "特定技能1号への移行要件" },
  { id: "kigyou", label: "受け入れ企業側の準備" },
  { id: "hikaku", label: "移行前後で何が変わるか" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const HIKAKU_ROWS = [
  {
    item: "支援・監理の主体",
    before: "監理団体（育成就労では監理支援機関）が監理",
    after: "登録支援機関または自社支援（義務的支援10項目）",
  },
  {
    item: "転職（転籍）",
    before: "原則不可（育成就労では一定要件下で可能に）",
    after: "同一業務区分内で転職可能",
  },
  {
    item: "在留期間",
    before: "技能実習は最長5年／育成就労は原則3年",
    after: "特定技能1号は通算5年（2号は更新上限なし）",
  },
  {
    item: "家族帯同",
    before: "不可",
    after: "1号は不可（2号は配偶者・子の帯同可）",
  },
  {
    item: "企業側コスト構造",
    before: "監理費（月2.5〜5万円/人程度が目安）",
    after: "支援委託費（月2〜3万円/人程度が目安）",
  },
] as const;

export const FAQS = [
  {
    q: "技能実習2号を良好に修了すると、無試験で特定技能1号に移行できますか？",
    a: "技能実習2号を良好に修了し、実習職種と特定技能の業務区分に関連性がある場合は、技能試験と日本語試験が免除されるのが原則です。職種と分野の対応関係は分野ごとに定められているため、移行前に対応表の確認が必要です。",
  },
  {
    q: "育成就労から特定技能1号への移行はどうなりますか？",
    a: "育成就労制度は「原則3年で特定技能1号の水準まで人材を育成する」ことを目的に設計されています。移行には技能検定3級等または特定技能1号評価試験の合格と、日本語能力A2相当以上（分野により異なる）などの要件を満たす必要があります。",
  },
  {
    q: "移行手続きにはどのくらいの期間がかかりますか？",
    a: "在留資格変更許可申請の標準処理期間は2週間〜1か月程度とされていますが、書類準備（雇用契約・支援計画の策定など）を含めると2〜3か月前からの準備が現実的です。在留期限が近い場合は特に早めの着手をおすすめします。",
  },
  {
    q: "移行後も同じ監理団体に支援を頼めますか？",
    a: "監理団体（監理支援機関）が登録支援機関としても登録されていれば、特定技能移行後も同じ組織に支援を委託できるケースがあります。当サイトの検索では登録支援機関・監理支援機関の両方の登録情報を確認できます。",
  },
] as const;

export default function GuideTokuteiGinouIkou() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "技能実習・育成就労から特定技能1号への移行ガイド：要件・手続き・企業側の準備 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "技能実習2号良好修了者は試験免除で特定技能1号へ移行可能。育成就労は原則3年で特定技能水準への育成を前提に設計。移行要件（技能試験・日本語要件）、在留資格変更の流れ、支援体制の切り替え（監理団体→登録支援機関）など企業側の準備を一次情報に基づき解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "技能実習・育成就労から特定技能1号への移行ガイド：要件・手続き・企業側の準備",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/guide/tokutei-ginou-ikou",
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
    script.id = "guide-tokutei-ginou-ikou-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("guide-tokutei-ginou-ikou-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="技能実習・育成就労から特定技能1号への移行ガイド"
            articlePath="/guide/tokutei-ginou-ikou"
            shortTitle="特定技能への移行"
            hubPath="/guide/ikusei-shuro"
            hubLabel="育成就労・制度移行ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-amber-accent shrink-0" />
            技能実習・育成就労から特定技能1号への移行ガイド：要件・手続き・企業側の準備
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              技能実習2号を良好に修了した人材は、関連する分野であれば試験免除で特定技能1号へ移行できます。育成就労制度も「原則3年で特定技能1号水準への育成」を前提に設計されており、移行を見据えた準備が受け入れ企業の重要テーマになります。
            </strong>
            移行要件と企業側の準備、支援体制の切り替えを整理しました。
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
              出典：出入国在留管理庁
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        <ArticleToc sections={TOC_SECTIONS} />

        <section id="zentai" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">移行ルートの全体像</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              現行制度では、<strong className="text-foreground">技能実習2号を良好に修了</strong>
              した外国人材が、実習職種と関連する分野で特定技能1号へ移行するルートが最も一般的です。2027年4月に施行予定の育成就労制度では、このルートが制度の設計思想そのものに組み込まれ、
              <strong className="text-foreground">育成就労（原則3年）→特定技能1号（通算5年）→特定技能2号（更新上限なし）</strong>
              という一貫したキャリアパスが想定されています。
            </p>
            <p>
              受け入れ企業にとって移行は「人材の定着」を意味する一方、支援体制・コスト構造・手続きが切り替わるタイミングでもあります。制度全体の概要は
              <Link href="/guide/ikusei-shuro">
                <span className="text-brand hover:underline cursor-pointer">育成就労制度ガイド</span>
              </Link>
              を、技能実習との違いは
              <Link href="/guide/ginou-jisshu-chigai">
                <span className="text-brand hover:underline cursor-pointer">技能実習と育成就労の違い</span>
              </Link>
              をご覧ください。
            </p>
          </div>
        </section>

        <section id="youken" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            特定技能1号への移行要件
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">移行元</th>
                    <th className="py-2.5 px-4 font-semibold">技能要件</th>
                    <th className="py-2.5 px-4 font-semibold">日本語要件</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b align-top">
                    <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                      技能実習2号良好修了
                      <br />
                      （関連分野）
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">技能試験免除</td>
                    <td className="py-2.5 px-4 text-muted-foreground">日本語試験免除</td>
                  </tr>
                  <tr className="border-b align-top">
                    <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                      技能実習2号良好修了
                      <br />
                      （関連しない分野）
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      分野別の特定技能1号評価試験等に合格
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">日本語試験は免除</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                      育成就労修了（予定）
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      技能検定3級等または特定技能1号評価試験に合格
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      日本語能力A2相当以上（分野により上乗せあり）
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            職種・作業と特定技能の業務区分の対応関係は分野ごとに定められています。移行可否の個別判断は、出入国在留管理庁の公表資料や地方出入国在留管理局への確認をおすすめします。
          </p>
        </section>

        <section id="kigyou" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">受け入れ企業側の準備</h2>
          <div className="space-y-3">
            {[
              {
                step: "1. 移行時期の逆算（在留期限の2〜3か月前）",
                detail:
                  "在留資格変更許可申請の準備には、雇用契約の再締結・支援計画の策定などが必要です。在留期限から逆算して2〜3か月前には着手します。",
              },
              {
                step: "2. 雇用契約・処遇の見直し",
                detail:
                  "特定技能では日本人と同等以上の報酬が求められます。技能実習時の賃金水準からの引き上げを想定した処遇設計が必要です。",
              },
              {
                step: "3. 支援体制の決定（登録支援機関か自社支援か）",
                detail:
                  "1号特定技能外国人には義務的支援10項目の実施が必要です。自社で行うか、登録支援機関へ委託するかを決めます。現在の監理団体が登録支援機関を兼ねている場合は継続委託も選択肢です。",
              },
              {
                step: "4. 在留資格変更許可申請",
                detail:
                  "分野別の必要書類（協議会加入等を含む）を揃え、地方出入国在留管理局へ申請します。",
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

        <section id="hikaku" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">移行前後で何が変わるか</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold">技能実習・育成就労</th>
                    <th className="py-2.5 px-4 font-semibold">特定技能1号</th>
                  </tr>
                </thead>
                <tbody>
                  {HIKAKU_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">{r.item}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.before}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            費用の詳細は
            <Link href="/guide/ikusei-shuro-cost">
              <span className="text-brand hover:underline cursor-pointer">育成就労・特定技能の費用ガイド</span>
            </Link>
            で解説しています。金額はあくまで目安であり、機関・分野により異なります。
          </p>
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
                href="https://www.moj.go.jp/isa/ikuseishuro_index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                出入国在留管理庁 育成就労制度
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href="https://www.moj.go.jp/isa/policies/ssw/nyuukokukanri01_00127.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                出入国在留管理庁 特定技能制度
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </section>

        <Card className="border-amber-accent/50 bg-amber-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold mb-1">制度移行の影響を無料診断</div>
              <p className="text-sm text-muted-foreground">
                会社名またはURLを入力すると、貴社の分野・地域に対応できる支援機関と費用・助成金候補をまとめて診断します。
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
