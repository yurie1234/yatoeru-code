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
 * 助成金子記事：人材確保等支援助成金（外国人労働者就労環境整備助成コース）
 */

const CONTENT_BASE_DATE = "2026年7月18日";
export const PUBLISHED_DATE = "2026-07-18";

const TOC_SECTIONS = [
  { id: "gaiyou", label: "制度の概要と金額" },
  { id: "taisho", label: "対象となる就労環境整備の取り組み" },
  { id: "yoken", label: "主な支給要件" },
  { id: "nagare", label: "申請の流れ" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const TAISHO_ROWS = [
  {
    item: "就業規則等の社内規程の多言語化",
    detail: "就業規則・労働協約・労使協定などを外国人労働者が理解できる言語に翻訳して整備する取り組み",
  },
  {
    item: "苦情・相談体制の整備",
    detail: "母国語等で対応できる相談窓口の設置、通訳者の配置・委託など",
  },
  {
    item: "一時帰国のための休暇制度の整備",
    detail: "外国人労働者の一時帰国を認める休暇制度を就業規則等に規定する取り組み",
  },
  {
    item: "社内マニュアル・標識類等の多言語化",
    detail: "業務マニュアルや職場内の標識・掲示物を多言語対応にする取り組み",
  },
] as const;

export const FAQS = [
  {
    q: "上限57万円と72万円の違いは何ですか？",
    a: "支給額は支給対象経費の1/2（上限57万円）が基本で、賃金要件（賃金の一定以上の引上げ等）を満たす場合に2/3（上限72万円）へ引き上げられる仕組みです。要件の詳細は年度の支給要領で改定されることがあるため、最新の公式資料をご確認ください。",
  },
  {
    q: "1人だけ外国人を雇っている会社でも対象になりますか？",
    a: "外国人労働者を雇用している事業主であることが前提で、雇用人数の多寡そのものは本質ではありません。ただし計画認定・離職率などの要件があるため、就労環境整備計画の認定を受けられるかを労働局へ事前に確認することをおすすめします。",
  },
  {
    q: "翻訳会社への外注費も対象になりますか？",
    a: "就業規則の多言語化などに要した外部委託費用は支給対象経費になりうるとされています。ただし対象経費の範囲・上限は支給要領で細かく定められているため、発注前に対象になるかを確認してから進めるのが安全です。",
  },
  {
    q: "離職率要件とはどのようなものですか？",
    a: "計画期間終了後の一定期間における外国人労働者の離職率が一定以下であること等が求められます。会社都合の離職が発生すると不支給になる場合があるため、雇用管理の安定が前提の制度と考えてください。",
  },
] as const;

export default function JoseikinJinzaiKakuho() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "人材確保等支援助成金（外国人労働者就労環境整備助成コース）の要件と申請の流れ - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "外国人雇用の中核となる人材確保等支援助成金（外国人労働者就労環境整備助成コース）を解説。就業規則の多言語化・相談体制整備などが対象で、経費の1/2（上限57万円）、賃金要件充足で2/3（上限72万円）。要件と申請の流れを一次情報に基づき整理します。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "人材確保等支援助成金（外国人労働者就労環境整備助成コース）の要件と申請の流れ",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/joseikin/jinzai-kakuho",
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
    script.id = "joseikin-jinzai-kakuho-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("joseikin-jinzai-kakuho-jsonld")?.remove();
      document.title = "登録支援機関を条件で比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="人材確保等支援助成金（外国人労働者就労環境整備助成コース）の要件と申請の流れ"
            articlePath="/joseikin/jinzai-kakuho"
            shortTitle="人材確保等支援助成金（外国人コース）"
            hubPath="/joseikin"
            hubLabel="助成金ガイド"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-amber-accent shrink-0" />
            人材確保等支援助成金（外国人労働者就労環境整備助成コース）の要件と申請の流れ
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              外国人労働者を雇用する事業主が、就業規則の多言語化や相談体制の整備など「就労環境の整備」を行った場合に、経費の1/2（上限57万円）、賃金要件を満たす場合は2/3（上限72万円）が助成される可能性がある制度です。
            </strong>
            外国人雇用に最も直接関連する助成コースであり、受け入れ準備と同時に検討する価値があります。
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
                    ["所管", "厚生労働省（申請窓口は都道府県労働局・ハローワーク）"],
                    ["対象事業主", "外国人労働者を雇用する事業主"],
                    [
                      "助成率・上限",
                      "支給対象経費の1/2（上限57万円）。賃金要件等を満たす場合は2/3（上限72万円）",
                    ],
                    [
                      "対象の取り組み",
                      "就労環境整備計画に基づく、就業規則の多言語化・相談体制整備などの就労環境整備措置",
                    ],
                    ["主な前提", "就労環境整備計画の認定を受けてから実施すること、離職率要件を満たすこと"],
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

        <section id="taisho" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">対象となる就労環境整備の取り組み</h2>
          <div className="space-y-3">
            {TAISHO_ROWS.map((t) => (
              <Card key={t.item}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.item}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.detail}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            特定技能外国人を受け入れる場合、登録支援機関への委託とは別に、
            <strong className="text-foreground">自社側の受け入れ環境づくり</strong>
            （社内規程・マニュアルの多言語化、相談窓口など）が必要になります。この自社側の整備費用の一部を本コースでカバーできる可能性があるため、
            <Link href="/diagnose">
              <span className="text-brand hover:underline cursor-pointer">受け入れ費用の無料診断</span>
            </Link>
            とあわせて検討すると全体像がつかみやすくなります。
          </p>
        </section>

        <section id="yoken" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            主な支給要件
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              中心となる要件は次の3点です。第一に、
              <strong className="text-foreground">就労環境整備計画を作成し、労働局の認定を受けてから取り組みを実施する</strong>
              こと。認定前に実施した整備は対象外になるのが原則です。第二に、計画に基づく整備措置を
              <strong className="text-foreground">計画期間内に完了し、証憑（契約書・領収書・翻訳物など）を保管する</strong>
              こと。第三に、計画期間終了後の評価期間において
              <strong className="text-foreground">外国人労働者の離職率が一定以下である</strong>
              ことです。
            </p>
            <p>
              また、雇用保険適用事業所であること、労働関係法令の違反がないことなど、雇用関係助成金に共通の要件も適用されます。年度により要件・様式が改定されるため、着手前に最新の支給要領を必ず確認してください。
            </p>
          </div>
        </section>

        <section id="nagare" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">申請の流れ</h2>
          <div className="space-y-3">
            {[
              {
                step: "1. 就労環境整備計画の作成・提出",
                detail: "実施予定の整備内容・期間・経費を計画書にまとめ、管轄の労働局へ提出して認定を受けます。",
              },
              {
                step: "2. 計画に基づく整備の実施",
                detail: "認定後、計画期間内（原則3か月以上1年以内）に多言語化・相談体制整備などを実施します。",
              },
              {
                step: "3. 評価期間の経過",
                detail: "計画期間終了後の評価期間で、外国人労働者の定着状況（離職率）が確認されます。",
              },
              {
                step: "4. 支給申請",
                detail: "評価期間終了後、定められた期限内に支給申請書と証憑を提出します。審査を経て支給が決定されます。",
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
