import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CalendarDays,
  Coins,
  ExternalLink,
  HandCoins,
  ListChecks,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleToc } from "@/components/ArticleToc";
import { JOSEIKIN_DISCLAIMER } from "@shared/joseikin";

/**
 * 助成金ハブページ（/joseikin）
 * 外国人雇用で検討できる助成金・支援制度の一覧と比較テーブル、子記事へのリンク集。
 * 「もらえる」と断定しない編集方針。金額・要件は公式リンク併記で最新確認を促す。
 */

const CONTENT_BASE_DATE = "2026年7月18日";
const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "ichiran", label: "外国人雇用で検討できる助成金 一覧比較" },
  { id: "kiji", label: "制度別の詳細解説記事" },
  { id: "nagare", label: "申請までの基本の流れ" },
  { id: "chui", label: "よくあるつまずきと注意点" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const JOSEIKIN_ROWS = [
  {
    slug: "/joseikin/jinzai-kakuho",
    name: "人材確保等支援助成金（外国人労働者就労環境整備助成コース）",
    target: "外国人労働者を雇用する事業主",
    amount: "経費の1/2（上限57万円）、賃金要件充足で2/3（上限72万円）",
    point: "就業規則の多言語化・苦情相談体制の整備など「受け入れ環境づくり」の費用が対象",
  },
  {
    slug: "/joseikin/gyomu-kaizen",
    name: "業務改善助成金",
    target: "事業場内最低賃金を引き上げる中小企業",
    amount: "上限30万〜600万円（引上げ額・人数で変動）",
    point: "賃金引上げ＋設備投資のセット。受け入れと同時の現場整備で検討しやすい",
  },
  {
    slug: "/joseikin/career-up",
    name: "キャリアアップ助成金（正社員化コース等）",
    target: "有期雇用労働者を正社員化する事業主",
    amount: "1人あたり最大80万円（中小企業・重点支援対象者）",
    point: "外国人労働者も在留資格の範囲内で対象になりうる。計画の事前提出が必須",
  },
  {
    slug: "/joseikin/trial-koyou",
    name: "トライアル雇用助成金（一般トライアルコース）",
    target: "ハローワーク等の紹介で試行雇用する事業主",
    amount: "1人あたり月額最大4万円（最長3か月）",
    point: "国内在住の外国人求職者を初めて採用するケースで検討できる",
  },
  {
    slug: "/joseikin/jinzai-kaihatsu",
    name: "人材開発支援助成金（人材育成支援コース等）",
    target: "計画的な職業訓練・日本語教育を行う事業主",
    amount: "訓練経費の45〜75%＋賃金助成（1人1時間760円等）",
    point: "受け入れ後の日本語研修・技能研修の費用に充てられる可能性がある",
  },
] as const;

const CHILD_ARTICLES = [
  {
    slug: "/joseikin/jinzai-kakuho",
    title: "人材確保等支援助成金（外国人労働者就労環境整備助成コース）の要件と申請の流れ",
    desc: "外国人雇用の中核となる助成コース。対象となる整備内容・離職率要件・上限額の考え方を整理します。",
  },
  {
    slug: "/joseikin/gyomu-kaizen",
    title: "業務改善助成金を外国人材の受け入れと同時に活用する方法",
    desc: "賃金引上げと設備投資のセットで使う制度。特例事業者の拡充内容と事業完了期限に注意。",
  },
  {
    slug: "/joseikin/career-up",
    title: "キャリアアップ助成金は外国人労働者にも使える？正社員化コースの適用条件",
    desc: "特定技能・育成就労の雇用形態別に、適用の考え方と事前準備を解説します。",
  },
  {
    slug: "/joseikin/trial-koyou",
    title: "トライアル雇用助成金と外国人採用：対象になるケース・ならないケース",
    desc: "ハローワーク紹介が前提の制度。国内在住外国人の採用でどう使えるかを整理します。",
  },
  {
    slug: "/joseikin/jinzai-kaihatsu",
    title: "人材開発支援助成金で外国人材の日本語教育・技能研修費をまかなう",
    desc: "訓練計画の事前届出から支給申請までの流れと、日本語教育を対象にする際のポイント。",
  },
] as const;

const FAQS = [
  {
    q: "外国人を雇用したら必ず助成金がもらえますか？",
    a: "必ずもらえるわけではありません。各制度には計画の事前提出・離職率・賃金などの要件があり、支給の可否は労働局・ハローワーク等の審査で決定されます。本ページは該当する可能性のある制度を整理した参考情報であり、受給を保証するものではありません。",
  },
  {
    q: "特定技能外国人の受け入れに特化した助成金はありますか？",
    a: "「特定技能だから受け取れる」専用の国の助成金は基本的にありません。実務では、外国人労働者全般を対象とする人材確保等支援助成金（外国人労働者就労環境整備助成コース）や、雇用形態・賃金に着目したキャリアアップ助成金・業務改善助成金などを、受け入れに伴う取り組みに合わせて検討するのが一般的です。",
  },
  {
    q: "複数の助成金を併用できますか？",
    a: "同一の経費・同一の取り組みに対する重複受給は原則できませんが、対象となる取り組みが異なれば複数制度を併用できる場合があります。また自治体独自の支援制度は国の助成金と併用できる場合があります。併用可否は各制度の支給要領と申請窓口での確認が必要です。",
  },
  {
    q: "申請はいつ行えばよいですか？",
    a: "多くの制度は「取り組みの実施前」に計画の提出・認定が必要です（キャリアアップ計画、就労環境整備計画、訓練計画届など）。雇入れや設備投資を済ませた後では対象外になる場合があるため、受け入れ準備の段階で並行して検討を始めることをおすすめします。",
  },
  {
    q: "助成金の申請を支援機関に頼めますか？",
    a: "助成金の申請代行は社会保険労務士の独占業務のため、登録支援機関が代行できるわけではありません。ただし提携の社労士を紹介してくれる支援機関はあります。支援機関を選ぶ段階で、助成金への対応体制を確認しておくとスムーズです。",
  },
] as const;

export default function Joseikin() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "外国人雇用で使える助成金一覧【2026年版】要件・金額・申請の流れ - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "外国人雇用で検討できる助成金を一覧比較。人材確保等支援助成金（上限72万円）・業務改善助成金・キャリアアップ助成金・トライアル雇用助成金・人材開発支援助成金の要件と金額の目安、申請までの流れを一次情報に基づき解説します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: "外国人雇用で使える助成金一覧【2026年版】要件・金額・申請の流れ",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/joseikin",
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
        {
          "@type": "ItemList",
          name: "外国人雇用で検討できる助成金・支援制度",
          itemListElement: JOSEIKIN_ROWS.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: r.name,
            url: `https://yatoeru.jp${r.slug}`,
          })),
        },
      ],
    };
    document.querySelectorAll("script.ssr-jsonld").forEach((el) => el.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "joseikin-hub-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("joseikin-hub-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      {/* ヒーロー */}
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <nav
            aria-label="パンくずリスト"
            className="flex flex-wrap items-center gap-2 text-sm text-brand-foreground/60 mb-3"
          >
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-brand-foreground/80" aria-current="page">
              助成金ガイド
            </span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-amber-accent shrink-0" />
            外国人雇用で使える助成金一覧【2026年版】
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              外国人材の受け入れでは、人材確保等支援助成金（上限72万円）を中心に、業務改善助成金・キャリアアップ助成金など複数の制度が検討できます。
            </strong>
            多くの制度は取り組みの実施「前」に計画提出が必要です。要件・金額の目安・申請の流れを、厚生労働省の一次情報に基づいて整理しました。
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
          <div className="mt-6">
            <Button
              size="lg"
              className="bg-amber-accent text-brand hover:bg-amber-accent/90 font-bold"
              onClick={() => setLocation("/diagnose")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              自社が該当しそうな助成金を無料診断する
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        <ArticleToc sections={TOC_SECTIONS} />

        {/* 一覧比較 */}
        <section id="ichiran" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-brand" />
            外国人雇用で検討できる助成金 一覧比較
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold">制度名</th>
                    <th className="py-2.5 px-4 font-semibold">主な対象</th>
                    <th className="py-2.5 px-4 font-semibold">金額の目安</th>
                    <th className="py-2.5 px-4 font-semibold">ポイント</th>
                  </tr>
                </thead>
                <tbody>
                  {JOSEIKIN_ROWS.map((r) => (
                    <tr key={r.slug} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium min-w-[12rem]">
                        <Link href={r.slug}>
                          <span className="text-brand hover:underline cursor-pointer">{r.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.target}</td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{r.amount}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{JOSEIKIN_DISCLAIMER}</p>
        </section>

        {/* 子記事リンク */}
        <section id="kiji" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-brand" />
            制度別の詳細解説記事
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CHILD_ARTICLES.map((a) => (
              <Link key={a.slug} href={a.slug}>
                <Card className="h-full cursor-pointer transition-colors hover:border-brand/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base leading-snug text-brand">{a.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    {a.desc}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* 申請の流れ */}
        <section id="nagare" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            申請までの基本の流れ
          </h2>
          <div className="space-y-3">
            {[
              {
                step: "1. 受け入れ計画と同時に制度を洗い出す",
                detail:
                  "多くの助成金は取り組み実施前の計画提出が必須です。外国人材の受け入れを決めた段階で、就労環境整備・賃金引上げ・研修など自社で予定している取り組みに対応する制度を洗い出します。",
              },
              {
                step: "2. 支給要領で要件を確認する",
                detail:
                  "各制度の支給要領（厚生労働省・労働局のPDF）で、対象事業主・対象労働者・対象経費・離職率などの要件を確認します。年度ごとに改定されるため、必ず最新版を参照してください。",
              },
              {
                step: "3. 計画書を提出し、認定・確認を受ける",
                detail:
                  "キャリアアップ計画・就労環境整備計画・訓練計画届など、制度ごとの計画書を労働局・ハローワークへ提出します。認定前に開始した取り組みは対象外になるのが原則です。",
              },
              {
                step: "4. 取り組みを実施し、記録を残す",
                detail:
                  "就業規則の改定・設備の導入・研修の実施など、計画に沿って取り組みを実施し、領収書・出勤簿・賃金台帳などの証憑を保管します。",
              },
              {
                step: "5. 支給申請を行う",
                detail:
                  "取り組み完了後、定められた期間内（多くは完了日や賃金支払日から2か月以内）に支給申請を行います。申請代行は社会保険労務士の独占業務のため、外部に依頼する場合は社労士へ相談します。",
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

        {/* 注意点 */}
        <section id="chui" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">よくあるつまずきと注意点</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              最も多いのは、
              <strong className="text-foreground">計画提出前に取り組みを始めてしまい対象外になる</strong>
              ケースです。雇用契約の締結・設備の発注・研修の開始などは、計画の認定・確認を受けてから行うのが原則です。また、
              <strong className="text-foreground">解雇や離職率の要件</strong>
              により、直近で会社都合の離職がある場合は支給されないことがあります。
            </p>
            <p>
              「外国人を雇えば助成金がもらえる」という営業トークには注意が必要です。助成金は外国人雇用そのものではなく、
              <strong className="text-foreground">就労環境整備・賃金引上げ・訓練といった取り組み</strong>
              に対して支給されるものです。受給ありきではなく、自社に必要な取り組みに制度を合わせる順番で検討することをおすすめします。制度ごとの詳しい注意点は上記の詳細解説記事をご覧ください。
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
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              {
                label: "厚生労働省 人材確保等支援助成金（外国人労働者就労環境整備助成コース）",
                url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/gaikokujin_shuro.html",
              },
              {
                label: "厚生労働省 業務改善助成金",
                url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html",
              },
              {
                label: "厚生労働省 キャリアアップ助成金",
                url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/kyariaappu.html",
              },
              {
                label: "厚生労働省 トライアル雇用助成金（一般トライアルコース）",
                url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/trial_koyou.html",
              },
              {
                label: "厚生労働省 人材開発支援助成金",
                url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/d01-1.html",
              },
            ].map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  {s.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <Card className="border-amber-accent/50 bg-amber-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold mb-1">自社が該当しそうな制度を60秒で整理</div>
              <p className="text-sm text-muted-foreground">
                会社名またはURLを入力すると、分野・地域・人数に応じた助成金候補と費用目安、対応できる支援機関の候補をまとめて無料診断します。
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
