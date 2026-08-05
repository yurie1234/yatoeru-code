import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarClock,
  CalendarDays,
  ExternalLink,
  Search,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";

/**
 * 育成就労ハブ子記事：2027年4月施行までの準備スケジュール
 */

const CONTENT_BASE_DATE = "2026年7月18日";
export const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "zentai", label: "施行スケジュールの全体像" },
  { id: "keika", label: "現在の技能実習生はどうなるか（経過措置）" },
  { id: "junbi", label: "受け入れ企業の準備チェックリスト" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const TIMELINE_ROWS = [
  {
    time: "2024年6月",
    event: "育成就労制度を創設する改正法が成立・公布",
  },
  {
    time: "2026年（現在）",
    event: "政省令・基本方針・分野別運用方針の整備、監理支援機関の許可準備が進行",
  },
  {
    time: "2027年4月1日（予定）",
    event: "育成就労制度の施行。技能実習制度の新規受け入れは終了",
  },
  {
    time: "施行後〜2030年頃",
    event: "経過措置期間。施行日時点の技能実習生は技能実習として在留継続可能",
  },
] as const;

const CHECKLIST = [
  {
    step: "1. 現在の監理団体の移行方針を確認する",
    detail:
      "技能実習の監理団体が育成就労の監理支援機関の許可を取得する予定か、外部監査人の設置などの新要件に対応できるかを確認します。対応しない団体と取引している場合は、切り替え先の検討が必要です。",
  },
  {
    step: "2. 受け入れ計画と人数枠を見直す",
    detail:
      "育成就労では受け入れ人数枠や職種区分（特定技能の分野と整合した産業分類）が変わります。現在の技能実習職種が育成就労のどの分野に対応するかを確認します。",
  },
  {
    step: "3. 処遇・キャリアパスを設計する",
    detail:
      "転籍要件の緩和により、処遇が低い企業からは人材が流出しやすくなります。昇給テーブルや特定技能移行後のキャリアパスを明示できる企業が選ばれる時代になります。",
  },
  {
    step: "4. 日本語教育の体制を整える",
    detail:
      "入国時に日本語能力A1相当（または相当講習の受講）が要件となり、就労開始後も日本語能力向上の機会確保が求められます。人材開発支援助成金などを活用した教育体制の整備を検討します。",
  },
  {
    step: "5. 特定技能への移行を見据えた資金計画を立てる",
    detail:
      "育成就労は原則3年で特定技能1号水準への育成を前提とします。監理費から支援委託費への切り替え、試験対策費用なども含めた中期の資金計画をおすすめします。",
  },
] as const;

export const FAQS = [
  {
    q: "育成就労制度はいつから始まりますか？",
    a: "改正法の公布（2024年6月）から3年以内の施行とされており、2027年4月1日の施行が予定されています。正確な施行日や運用細則は政省令で確定するため、出入国在留管理庁の公式発表をご確認ください。",
  },
  {
    q: "いま受け入れている技能実習生は施行後どうなりますか？",
    a: "施行日時点で在留している技能実習生は、経過措置により技能実習として在留を継続できる見込みです。実習計画の満了まで現行制度が適用され、その後は特定技能への移行などのルートが想定されます。",
  },
  {
    q: "施行を待ってから受け入れを始めた方がよいですか？",
    a: "一概には言えません。技能実習としての新規受け入れは施行まで可能であり、施行直後は監理支援機関の許可手続きなどで受け入れが混雑する可能性も指摘されています。人材が必要な時期から逆算した判断をおすすめします。",
  },
  {
    q: "監理団体は全て監理支援機関になれますか？",
    a: "監理支援機関には外部監査人の設置義務化など現行より厳しい要件が課される予定です。全ての監理団体が移行できるとは限らないため、取引中の団体の対応方針を早めに確認することをおすすめします。",
  },
] as const;

export default function GuideIkuseiShuroSchedule() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "育成就労制度はいつから？2027年4月施行までの準備スケジュールと企業のチェックリスト - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "育成就労制度は2027年4月1日施行予定。施行日時点の技能実習生は経過措置で在留継続可能です。監理団体の移行方針確認・処遇設計・日本語教育体制など、受け入れ企業が施行までに準備すべき5項目をチェックリスト形式で解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "育成就労制度はいつから？2027年4月施行までの準備スケジュールと企業のチェックリスト",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/guide/ikusei-shuro-schedule",
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
    script.id = "guide-ikusei-shuro-schedule-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("guide-ikusei-shuro-schedule-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="育成就労2027年4月施行までの準備スケジュール"
            articlePath="/guide/ikusei-shuro-schedule"
            shortTitle="施行スケジュール"
            hubPath="/guide/ikusei-shuro"
            hubLabel="育成就労・制度移行ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-amber-accent shrink-0" />
            育成就労制度はいつから？2027年4月施行までの準備スケジュールと企業のチェックリスト
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              育成就労制度は2027年4月1日に施行予定で、技能実習制度の新規受け入れは終了します。施行日時点で在留中の技能実習生は経過措置により在留を継続できる見込みです。
            </strong>
            受け入れ企業が施行までに準備すべきことをチェックリスト形式で整理しました。
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
          <h2 className="text-xl font-bold mb-4">施行スケジュールの全体像</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">時期</th>
                    <th className="py-2.5 px-4 font-semibold">できごと</th>
                  </tr>
                </thead>
                <tbody>
                  {TIMELINE_ROWS.map((r) => (
                    <tr key={r.time} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">{r.time}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            施行日・運用細則は今後の政省令で確定します。制度の全体像は
            <Link href="/guide/ikusei-shuro">
              <span className="text-brand hover:underline cursor-pointer">育成就労制度ガイド</span>
            </Link>
            を、技能実習との違いは
            <Link href="/guide/ginou-jisshu-chigai">
              <span className="text-brand hover:underline cursor-pointer">こちらの記事</span>
            </Link>
            をご覧ください。
          </p>
        </section>

        <section id="keika" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">現在の技能実習生はどうなるか（経過措置）</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              施行日時点で在留している技能実習生は、
              <strong className="text-foreground">経過措置により技能実習としての在留を継続できる見込み</strong>
              です。進行中の実習計画は満了まで現行制度の枠組みで運用され、修了後は特定技能1号への移行（
              <Link href="/guide/tokutei-ginou-ikou">
                <span className="text-brand hover:underline cursor-pointer">移行ガイド</span>
              </Link>
              参照）などのルートが想定されます。
            </p>
            <p>
              一方、<strong className="text-foreground">技能実習としての新規の受け入れは施行をもって終了</strong>
              するため、施行前後の採用計画には注意が必要です。「技能実習で今から受け入れて施行をまたぐ」ケースの扱いなど、個別の判断が必要な場合は出入国在留管理庁・外国人技能実習機構の公式情報をご確認ください。
            </p>
          </div>
        </section>

        <section id="junbi" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">受け入れ企業の準備チェックリスト</h2>
          <div className="space-y-3">
            {CHECKLIST.map((t) => (
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
                href="https://www.otit.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                外国人技能実習機構（OTIT）
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </section>

        <Card className="border-amber-accent/50 bg-amber-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold mb-1">制度移行への備えを無料診断</div>
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
