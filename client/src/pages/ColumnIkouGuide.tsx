import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Milestone,
  Search,
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
 * コラム②「監理団体から監理支援機関への移行ガイド：2026年9月の期限までにやること」
 * 新語SEOの先取り（「監理支援機関 移行」「監理団体 移行」群）。
 * 制度記述はすべて入管庁・OTITの一次情報と突合済み。
 */

const CONTENT_BASE_DATE = "2026年7月16日";
const PUBLISHED_DATE = "2026-07-16";

const TOC_SECTIONS = [
  { id: "schedule", label: "移行スケジュール（確定済みの日付）" },
  { id: "steps", label: "移行準備の6ステップ" },
  { id: "awasete", label: "あわせて読む" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const TIMELINE_ROWS = [
  {
    date: "2026年4月15日",
    event: "監理支援機関の許可の施行日前申請 受付開始（受付中）",
    note: "申請先は外国人技能実習機構（OTIT）",
  },
  {
    date: "2026年9月1日",
    event: "育成就労計画の認定申請（施行日前申請）受付開始",
    note: "施行日から育成就労を開始するための計画認定",
  },
  {
    date: "2026年9月30日",
    event: "技能実習法に基づく監理団体の新規許可申請の受付期限",
    note: "この日以降、監理団体の新規許可申請は不可",
  },
  {
    date: "2027年4月1日",
    event: "育成就労制度 施行・監理支援機関の許可の効力発生",
    note: "施行日（政令で確定済み）",
  },
] as const;

const TODO_ROWS = [
  {
    step: "1. 移行方針の決定",
    detail:
      "育成就労制度でも監理支援事業を続けるかを理事会等で決定します。監理団体の許可は監理支援機関に引き継がれないため、継続するには新規の許可申請が必要です。",
  },
  {
    step: "2. 外部監査人の確保",
    detail:
      "監理支援機関では外部監査人の設置が義務化されます（監理団体では外部役員との選択制でした）。要件を満たす外部監査人の候補選定と契約準備を早めに進めます。",
  },
  {
    step: "3. 役職員体制の点検",
    detail:
      "受入れ機関（企業）と密接な関係にある役職員が監理支援業務に関与することが制限されます。現在の役員構成・出向関係を点検し、必要な体制変更を行います。",
  },
  {
    step: "4. 財政基盤・人員体制の確認",
    detail:
      "許可基準として財政基盤や監理支援の人員体制が求められます。決算書類の整備、監理責任者等の配置計画を確認します。",
  },
  {
    step: "5. 施行日前申請の提出",
    detail:
      "2026年4月15日から外国人技能実習機構（OTIT）で受付中の施行日前申請を活用します。許可の効力は2027年4月1日から発生するため、施行日から切れ目なく事業を行うには施行日前申請が実質的な前提になります。",
  },
  {
    step: "6. 受入れ企業・送出機関への説明",
    detail:
      "移行スケジュール・転籍支援を含む新業務・費用の変更点を、受入れ企業と送出機関に事前に説明します。特定技能への移行を見据える企業には、登録支援機関との役割分担も整理して伝えます。",
  },
] as const;

const FAQS = [
  {
    q: "監理団体の許可はそのまま監理支援機関に引き継がれますか？",
    a: "引き継がれません。育成就労制度で監理支援事業を行うには、あらためて主務大臣から監理支援機関の許可を受ける必要があります。施行日（2027年4月1日）から切れ目なく事業を行うためには、2026年4月15日から受付中の施行日前申請の活用が推奨されています。",
  },
  {
    q: "2026年9月30日の期限を過ぎるとどうなりますか？",
    a: "2026年9月30日は技能実習法に基づく監理団体の新規許可申請の受付期限です。この日以降は監理団体の新規許可申請ができなくなり、以後の新規参入は育成就労法に基づく監理支援機関の許可申請に一本化されます。既存の監理団体の移行申請（施行日前申請）は引き続き可能です。",
  },
  {
    q: "監理支援機関の許可申請はどこに提出しますか？",
    a: "外国人技能実習機構（OTIT)が受付窓口です。施行日前申請は2026年4月15日から受付が始まっており、申請書類・手数料・提出方法の詳細は外国人技能実習機構の案内ページで確認できます。",
  },
  {
    q: "監理支援機関になると業務内容はどう変わりますか？",
    a: "従来の実施監理に加えて、雇用関係のあっせん（転籍の支援を含む）が業務として明確に位置づけられます。また、外部監査人の設置義務化、受入れ機関と密接な関係にある役職員の関与制限など、中立性に関する要件が強化されます。",
  },
  {
    q: "移行後、特定技能の登録支援機関との関係はどうなりますか？",
    a: "育成就労から特定技能1号への移行が制度上想定されているため、育成就労期間は監理支援機関が、特定技能移行後は登録支援機関（または受入れ企業の自社支援）が支援を担う分担になります。両方の機能を持つ団体は、それぞれの許可・登録を維持する必要があります。",
  },
] as const;

export default function ColumnIkouGuide() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "監理団体から監理支援機関への移行ガイド｜2026年9月の期限までにやること - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "監理団体の許可は監理支援機関に引き継がれません。施行日前申請は2026年4月15日からOTITで受付中、技能実習法に基づく監理団体の新規許可申請は2026年9月30日まで。移行スケジュールと準備6ステップを一次情報に基づき解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "監理団体から監理支援機関への移行ガイド：2026年9月の期限までにやること",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/columns/kanri-dantai-ikou-guide",
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
    script.id = "column-ikou-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("column-ikou-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <ReadingProgressBar targetSelector="#article-main" />
      <FloatingToc items={TOC_SECTIONS} />
      {/* ヒーロー：結論先頭 */}
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="監理団体から監理支援機関への移行ガイド：2026年9月の期限までにやること"
            articlePath="/columns/kanri-dantai-ikou-guide"
            shortTitle="監理支援機関への移行ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <Milestone className="h-8 w-8 text-amber-accent shrink-0" />
            監理団体から監理支援機関への移行ガイド：2026年9月の期限までにやること
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            「いまの許可があるのだから、新制度でもそのままやれるはずだ」——監理団体の現場ではこう考えたくなるはずです。ところが
            <strong>
              監理団体の許可は育成就労制度（2027年4月1日施行）の監理支援機関に引き継がれません。新たに許可を受ける必要があり、施行日前申請は2026年4月15日から外国人技能実習機構（OTIT）で受付中、技能実習法に基づく監理団体の新規許可申請は2026年9月30日で受付終了
            </strong>
            です。では、施行日から切れ目なく事業を続けるには、いつまでに何を終えておく必要があるのか。
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
              出典：出入国在留管理庁・外国人技能実習機構
            </Badge>
            <Badge variant="outline" className="text-brand-foreground/70 border-brand-foreground/30">
              約5分で読めます
            </Badge>
          </div>
        </div>
      </div>

      <div id="article-main" className="container py-10 max-w-4xl space-y-10">
        {/* 目次 */}
        <ArticleToc sections={TOC_SECTIONS} />

        {/* スケジュール */}
        <section id="schedule" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            移行スケジュール（確定済みの日付）
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">期日</th>
                    <th className="py-2.5 px-4 font-semibold">できごと</th>
                    <th className="py-2.5 px-4 font-semibold">補足</th>
                  </tr>
                </thead>
                <tbody>
                  {TIMELINE_ROWS.map((r) => (
                    <tr key={r.date} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 whitespace-nowrap font-medium">{r.date}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.event}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-base leading-[1.9] text-foreground/90">
            表の中で2027年4月より先に来る日付が一つあります。
            <strong className="text-foreground">
              2026年9月30日、「技能実習法に基づく監理団体の新規許可申請」の最終受付日
            </strong>
            です。以後の新規参入は監理支援機関の許可申請に一本化されます。「施行は2027年4月だからまだ先」と見えていた方にとって、実質の締め切りは半年以上手前にあることになります。既存の監理団体の施行日前申請はすでに受付が始まっているので、この夏〜秋が申請準備の実質的な山場になります。
          </p>
        </section>

        {/* やることリスト */}
        <section id="steps" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand" />
            移行準備の6ステップ
          </h2>
          <div className="space-y-3">
            {TODO_ROWS.map((t) => (
              <Card key={t.step}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.step}</CardTitle>
                </CardHeader>
                <CardContent className="text-base text-foreground/90 leading-[1.9]">
                  {t.detail}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 制度の変更点への内部リンク */}
        <section id="awasete" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-brand" />
            あわせて読む
          </h2>
          <div className="space-y-4 text-base leading-[1.9] text-foreground/90">
            <p>
              6ステップを見て「要は名前が変わるだけではないのか」と感じた方ほど、要件の差分を先に確かめてください。監理団体と監理支援機関の要件の違い（外部監査人の義務化・役職員の関与制限・業務範囲）は
              <Link href="/guide/kanri-shien-kikan">
                <span className="text-brand hover:underline cursor-pointer">監理支援機関ガイド</span>
              </Link>
              で、育成就労制度の全体像（技能実習との違い・転籍ルール・特定技能への接続）は
              <Link href="/guide/ikusei-shuro">
                <span className="text-brand hover:underline cursor-pointer">育成就労制度ガイド</span>
              </Link>
              で詳しく解説しています。
            </p>
            <p>
              また、育成就労で受け入れた人材が特定技能1号へ移行した後の支援は、登録支援機関（または受入れ企業の自社支援）が担います。特定技能側の支援体制を先に把握しておきたい場合は、
              <Link href="/columns/shien-kikan-erabikata">
                <span className="text-brand hover:underline cursor-pointer">登録支援機関の選び方（料金相場・確認7項目）</span>
              </Link>
              をご覧ください。
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">よくある質問</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Card key={f.q}>
                <CardHeader className="pb-2">
                  <h3 className="text-base leading-none font-semibold">{f.q}</h3>
                </CardHeader>
                <CardContent className="text-base text-foreground/90 leading-[1.9]">
                  {f.a}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 出典 */}
        <section id="shutten" className="scroll-mt-20">
          <h2 className="article-h2 text-[22px] md:text-2xl font-bold mb-4">出典（一次情報）</h2>
          <Card>
            <CardContent className="p-5 space-y-2 text-sm">
              <a
                href="https://www.otit.go.jp/employment_for_skill_development/03/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                外国人技能実習機構「監理支援機関許可施行日前申請」
              </a>
              <a
                href="https://www.moj.go.jp/isa/applications/faq/ikusei_qa_00002.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「育成就労制度Q＆A」
              </a>
              <a
                href="https://www.moj.go.jp/isa/ikuseishuro_00001.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「育成就労制度」
              </a>
              <p className="text-xs text-muted-foreground pt-2">
                本記事の内容は{CONTENT_BASE_DATE}時点の一次情報に基づきます。申請要件・書類の詳細は必ず上記の公式情報をご確認ください。個別の許可要件の判断は行政書士等の専門家または外国人技能実習機構にご相談ください。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <RelatedArticles
          currentSlug="kanri-dantai-ikou-guide"
          tags={["育成就労", "監理支援機関", "移行"]}
        />

        <Card className="bg-brand text-brand-foreground">
          <CardContent className="p-6 md:flex items-center justify-between gap-6">
            <div className="mb-4 md:mb-0">
              <h3 className="font-bold text-lg mb-1">特定技能側の支援体制も今のうちに</h3>
              <p className="text-sm text-brand-foreground/70 leading-relaxed">
                育成就労から特定技能への移行を見据えるなら、登録支援機関の把握は早いほうが有利です。全国11,000件超から地域・言語・分野で比較できます。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                className="bg-amber-accent text-brand hover:bg-amber-accent/90"
                onClick={() => setLocation("/search")}
              >
                <Search className="h-4 w-4 mr-1" />
                登録支援機関を比較する
              </Button>
              <Button
                variant="outline"
                className="border-brand-foreground/30 text-brand-foreground hover:bg-brand-foreground/10"
                onClick={() => setLocation("/guide/kanri-shien-kikan")}
              >
                監理支援機関ガイドを読む
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
