import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  ExternalLink,
  GitCompareArrows,
  Search,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";

/**
 * 育成就労ハブ子記事：技能実習と育成就労の違い
 */

const CONTENT_BASE_DATE = "2026年7月18日";
const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "haikei", label: "なぜ制度が変わるのか" },
  { id: "hikaku", label: "技能実習と育成就労の比較表" },
  { id: "point", label: "企業への影響が大きい3つの変更点" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const HIKAKU_ROWS = [
  {
    item: "制度の目的",
    jisshu: "技能移転による国際貢献",
    ikusei: "人材育成と人材確保（労働力として明確に位置付け）",
  },
  {
    item: "在留期間",
    jisshu: "最長5年（1号〜3号）",
    ikusei: "原則3年（特定技能1号水準への育成期間）",
  },
  {
    item: "転職（転籍）",
    jisshu: "原則不可（やむを得ない事情のみ）",
    ikusei: "同一機関で1〜2年就労等の要件を満たせば本人意向の転籍が可能",
  },
  {
    item: "監理組織",
    jisshu: "監理団体（許可制）",
    ikusei: "監理支援機関（許可制・外部監査人の設置義務化など要件厳格化）",
  },
  {
    item: "日本語要件（入国時）",
    jisshu: "なし（介護など一部職種を除く）",
    ikusei: "日本語能力A1相当（または相当講習の受講）",
  },
  {
    item: "キャリアパス",
    jisshu: "特定技能への移行は制度上可能だが設計は別建て",
    ikusei: "特定技能1号→2号への接続を制度設計に組み込み",
  },
  {
    item: "本人負担",
    jisshu: "送出し費用の本人負担が課題化",
    ikusei: "本人負担の軽減を明確に方向付け（企業負担化が進む見込み）",
  },
] as const;

const FAQS = [
  {
    q: "技能実習と育成就労の一番大きな違いは何ですか？",
    a: "制度の目的が「国際貢献（技能移転）」から「人材育成と人材確保」に変わる点です。これに伴い、転籍の制限緩和・特定技能へのキャリアパス接続・日本語要件の導入など、労働者として長く働いてもらう前提の設計に変わります。",
  },
  {
    q: "転籍が可能になると、人材が流出しやすくなりませんか？",
    a: "同一機関で1〜2年の就労などの要件を満たせば本人の意向による転籍が可能になるため、処遇や職場環境の劣る企業からは人材が移りやすくなります。昇給テーブルの明示やキャリアパスの提示など、選ばれる企業になるための処遇設計が今まで以上に重要になります。",
  },
  {
    q: "監理団体はどうなりますか？",
    a: "育成就労では「監理支援機関」として新たな許可制になり、外部監査人の設置義務化など要件が厳格化されます。現在の監理団体がそのまま移行できるとは限らないため、取引中の団体の対応方針の確認をおすすめします。",
  },
  {
    q: "受け入れ費用は変わりますか？",
    a: "監理費に相当する費用構造は続く見込みですが、送出し費用の本人負担軽減の方向性から、企業側の初期費用負担は増える可能性が指摘されています。費用の詳細は費用ガイドをご覧ください。",
  },
] as const;

export default function GuideGinouJisshuChigai() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "技能実習と育成就労の違いを比較表で解説：転籍・日本語要件・監理支援機関 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "技能実習（国際貢献目的・転籍原則不可・最長5年）と育成就労（人材確保目的・要件下で転籍可・原則3年で特定技能へ接続）の違いを比較表で解説。監理団体から監理支援機関への変更、日本語能力A1相当の入国時要件など、受け入れ企業への影響が大きい変更点を整理します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "技能実習と育成就労の違いを比較表で解説：転籍・日本語要件・監理支援機関",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/guide/ginou-jisshu-chigai",
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
    script.id = "guide-ginou-jisshu-chigai-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("guide-ginou-jisshu-chigai-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="技能実習と育成就労の違いを比較表で解説"
            articlePath="/guide/ginou-jisshu-chigai"
            shortTitle="技能実習との違い"
            hubPath="/guide/ikusei-shuro"
            hubLabel="育成就労・制度移行ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <GitCompareArrows className="h-8 w-8 text-amber-accent shrink-0" />
            技能実習と育成就労の違いを比較表で解説:転籍・日本語要件・監理支援機関
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              最大の違いは制度目的です。技能実習は「国際貢献（技能移転）」、育成就労は「人材育成と人材確保」を目的とし、転籍の制限緩和・特定技能へのキャリアパス接続・入国時の日本語要件（A1相当）などが導入されます。
            </strong>
            受け入れ企業への影響が大きい変更点を比較表で整理しました。
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

        <section id="haikei" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">なぜ制度が変わるのか</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              技能実習制度は「日本で学んだ技能を母国に持ち帰る国際貢献」を建前としてきましたが、実態は人手不足産業の労働力として機能しており、目的と実態の乖離が長年指摘されてきました。転籍が原則できない構造が、失踪や人権問題の温床になっているという批判も国内外からありました。
            </p>
            <p>
              こうした背景から、2024年6月に技能実習制度を発展的に解消し、
              <strong className="text-foreground">「人材育成と人材確保」を正面から目的に掲げる育成就労制度</strong>
              を創設する改正法が成立しました。施行は2027年4月1日が予定されています（
              <Link href="/guide/ikusei-shuro-schedule">
                <span className="text-brand hover:underline cursor-pointer">施行スケジュールの詳細</span>
              </Link>
              ）。
            </p>
          </div>
        </section>

        <section id="hikaku" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">技能実習と育成就労の比較表</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold">技能実習（現行）</th>
                    <th className="py-2.5 px-4 font-semibold">育成就労（2027年4月〜予定）</th>
                  </tr>
                </thead>
                <tbody>
                  {HIKAKU_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">{r.item}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.jisshu}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.ikusei}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            ※ 運用細則は政省令で確定するため、内容は今後変更される可能性があります。
          </p>
        </section>

        <section id="point" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">企業への影響が大きい3つの変更点</h2>
          <div className="space-y-3">
            {[
              {
                title: "① 転籍の制限緩和 — 「選ばれる企業」への転換が必要に",
                detail:
                  "同一機関で1〜2年の就労などの要件を満たせば、本人の意向による転籍が可能になります。処遇・職場環境・キャリアパスの提示で選ばれる企業になることが、採用コストの回収と定着の鍵になります。",
              },
              {
                title: "② 監理団体→監理支援機関 — 取引先の再選定が発生し得る",
                detail:
                  "監理支援機関には外部監査人の設置義務化など厳格な要件が課され、全ての監理団体が移行できるとは限りません。取引中の団体の対応方針を早めに確認し、必要なら切り替え先を検討します。当サイトでは監理支援機関（旧監理団体）の登録情報を検索できます。",
              },
              {
                title: "③ 特定技能への接続 — 3年後を見据えた計画が前提に",
                detail:
                  "育成就労は原則3年で特定技能1号水準への育成を前提とするため、試験対策・処遇引き上げ・支援体制の切り替えを含めた中期計画が必要です。移行の詳細は移行ガイドをご覧ください。",
              },
            ].map((t) => (
              <Card key={t.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.detail}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            関連記事：
            <Link href="/guide/tokutei-ginou-ikou">
              <span className="text-brand hover:underline cursor-pointer">特定技能への移行ガイド</span>
            </Link>
            ・
            <Link href="/guide/ikusei-shuro-cost">
              <span className="text-brand hover:underline cursor-pointer">受け入れ費用ガイド</span>
            </Link>
            ・
            <Link href="/columns/kanri-dantai-ikou-guide">
              <span className="text-brand hover:underline cursor-pointer">監理団体の移行実務ガイド</span>
            </Link>
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
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/jinzaikaihatsu/global_cooperation/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 技能実習制度・育成就労制度
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
