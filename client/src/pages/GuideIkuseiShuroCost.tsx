import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  Coins,
  ExternalLink,
  Search,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";

/**
 * 育成就労ハブ子記事：育成就労・特定技能の受け入れ費用ガイド
 */

const CONTENT_BASE_DATE = "2026年7月18日";
export const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "kouzou", label: "費用の全体構造" },
  { id: "shoki", label: "初期費用の内訳（目安）" },
  { id: "getsugaku", label: "月額費用の内訳（目安）" },
  { id: "sakugen", label: "費用を抑える方法（助成金）" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const SHOKI_ROWS = [
  {
    item: "送出機関への手数料・教育費",
    range: "20〜60万円/人程度",
    note: "国・送出機関により大きく変動。本人負担の過大徴収は制度上問題となるため企業負担化が進む傾向",
  },
  {
    item: "在留資格申請・行政書士費用",
    range: "10〜20万円/人程度",
    note: "自社申請なら実費のみ（数千円）",
  },
  {
    item: "渡航費・国内移動費",
    range: "5〜15万円/人程度",
    note: "航空券・入国時交通費など",
  },
  {
    item: "住居準備（初期）",
    range: "10〜30万円/人程度",
    note: "敷金・礼金・家具家電。社宅があれば圧縮可能",
  },
  {
    item: "監理団体入会金・年会費（団体監理型）",
    range: "5〜20万円程度",
    note: "組合により異なる",
  },
] as const;

const GETSUGAKU_ROWS = [
  {
    item: "監理費（技能実習・育成就労）",
    range: "月2.5〜5万円/人程度",
    note: "当サイト掲載機関の申告データでは平均2.8万円前後",
  },
  {
    item: "支援委託費（特定技能・登録支援機関）",
    range: "月2〜3万円/人程度",
    note: "義務的支援10項目の委託料",
  },
  {
    item: "本人給与",
    range: "地域別最低賃金以上（特定技能は日本人と同等以上）",
    note: "分野・地域の相場により変動",
  },
  {
    item: "社会保険料（会社負担分）",
    range: "給与の約15%",
    note: "日本人従業員と同様",
  },
] as const;

export const FAQS = [
  {
    q: "外国人材の受け入れ費用は日本人採用より高いですか？",
    a: "初期費用（総額50〜145万円/人程度が目安）は日本人の中途採用の紹介手数料（年収の30〜35%）と比べて必ずしも高くありません。ただし監理費・支援委託費という継続コストが発生する点が特徴です。定着率の高さを含めた総合的な比較が重要です。",
  },
  {
    q: "監理費の相場はいくらですか？",
    a: "当サイトに掲載されている機関の申告データでは月額2.5〜5万円/人程度に分布し、平均は2.8万円前後です。監理費は職種・地域・受け入れ人数により変動するため、複数機関からの見積もり比較をおすすめします。",
  },
  {
    q: "費用を本人に負担させることはできますか？",
    a: "送出しに関わる手数料の本人負担の過大徴収は、制度上大きな問題とされています。育成就労制度では本人負担の軽減が明確に方向付けられており、企業側での負担を前提とした資金計画をおすすめします。",
  },
  {
    q: "助成金で費用を抑えられますか？",
    a: "外国人特化の助成金は少ないものの、人材確保等支援助成金（外国人労働者就労環境整備助成コース、上限57〜72万円）や業務改善助成金など、活用できる可能性のある制度があります。詳しくは助成金ガイドをご覧ください。",
  },
] as const;

export default function GuideIkuseiShuroCost() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "育成就労・特定技能の受け入れ費用ガイド：初期費用と月額コストの目安 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "外国人材受け入れの費用構造を解説。初期費用は総額50〜145万円/人程度、月額は監理費2.5〜5万円/人（平均2.8万円前後）・支援委託費2〜3万円/人が目安。助成金による負担軽減策も紹介。掲載機関の申告データに基づく相場感を公開しています。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "育成就労・特定技能の受け入れ費用ガイド：初期費用と月額コストの目安",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/guide/ikusei-shuro-cost",
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
    script.id = "guide-ikusei-shuro-cost-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("guide-ikusei-shuro-cost-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="育成就労・特定技能の受け入れ費用ガイド"
            articlePath="/guide/ikusei-shuro-cost"
            shortTitle="受け入れ費用"
            hubPath="/guide/ikusei-shuro"
            hubLabel="育成就労・制度移行ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-amber-accent shrink-0" />
            育成就労・特定技能の受け入れ費用ガイド：初期費用と月額コストの目安
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              外国人材の受け入れ費用は、初期費用（総額50〜145万円/人程度）と月額費用（監理費または支援委託費＋給与・社会保険）の二層構造です。
            </strong>
            当サイト掲載機関の申告データに基づく相場感と、助成金による負担軽減策を整理しました。金額はいずれも目安であり、機関・分野・地域により異なります。
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Badge className="bg-amber-accent text-brand hover:bg-amber-accent gap-1">
              <CalendarDays className="h-3 w-3" />
              内容確認基準日：{CONTENT_BASE_DATE}
            </Badge>
            <Badge variant="outline" className="text-brand-foreground/70 border-brand-foreground/30">
              執筆：ヤトエル運営チーム
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        <ArticleToc sections={TOC_SECTIONS} />

        <section id="kouzou" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">費用の全体構造</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              外国人材の受け入れ費用は、大きく
              <strong className="text-foreground">「入国・採用時に一度だけかかる初期費用」</strong>と
              <strong className="text-foreground">「雇用期間中ずっとかかる月額費用」</strong>
              に分かれます。技能実習・育成就労では監理団体（監理支援機関）への監理費が、特定技能では登録支援機関への支援委託費（自社支援の場合は不要）が月額費用の中心になります。
            </p>
            <p>
              「見積もりに何が含まれているか」は機関によって差が大きいため、監理費・支援委託費の金額だけでなく、教育費・送迎費・翻訳費などの内訳と別料金の有無を確認することが、実質コストの比較では重要です。
            </p>
          </div>
        </section>

        <section id="shoki" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">初期費用の内訳（目安）</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">目安</th>
                    <th className="py-2.5 px-4 font-semibold">補足</th>
                  </tr>
                </thead>
                <tbody>
                  {SHOKI_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium">{r.item}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground">
                        {r.range}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            合計すると<strong className="text-foreground">1人あたり総額50〜145万円程度</strong>
            が初期費用の目安です。国内在住者（留学生や技能実習からの移行者）を採用する場合は、送出機関費用・渡航費がかからないため大幅に圧縮できます。
          </p>
        </section>

        <section id="getsugaku" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">月額費用の内訳（目安）</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">目安</th>
                    <th className="py-2.5 px-4 font-semibold">補足</th>
                  </tr>
                </thead>
                <tbody>
                  {GETSUGAKU_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium">{r.item}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.range}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            監理費の分布や機関ごとの申告値は
            <Link href="/stats">
              <span className="text-brand hover:underline cursor-pointer">統計データページ</span>
            </Link>
            でも公開しています。機関ごとの詳細は各機関ページで「事業者に直接確認」した情報として掲載しています。
          </p>
        </section>

        <section id="sakugen" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-brand" />
            費用を抑える方法（助成金）
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              外国人雇用に特化した助成金は多くありませんが、
              <strong className="text-foreground">人材確保等支援助成金（外国人労働者就労環境整備助成コース）</strong>
              は就業規則の多言語化や苦情相談体制の整備費用の一部（上限57万円、賃金要件を満たすと72万円）が助成される、外国人雇用企業向けの代表的な制度です。このほか業務改善助成金・キャリアアップ助成金・人材開発支援助成金なども、要件を満たせば外国人材にも適用できる可能性があります。
            </p>
            <p>
              各制度の要件・金額・申請の流れは
              <Link href="/joseikin">
                <span className="text-brand hover:underline cursor-pointer">外国人雇用で使える助成金ガイド</span>
              </Link>
              で詳しく解説しています。支給要件・金額は変更される場合があるため、申請前に必ず公式情報をご確認ください。
            </p>
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
                href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/gaikokujin_shuro.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                厚生労働省 人材確保等支援助成金（外国人労働者就労環境整備助成コース）
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            ※ 本記事の金額は当サイト掲載機関の申告データおよび一般的な相場観に基づく目安です。実際の費用は機関・分野・地域・受け入れ形態により異なります。
          </p>
        </section>

        <Card className="border-amber-accent/50 bg-amber-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold mb-1">貴社の受け入れ費用を無料診断</div>
              <p className="text-sm text-muted-foreground">
                会社名またはURLを入力すると、費用の目安・使える可能性のある助成金・対応できる支援機関をまとめて診断します。
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
