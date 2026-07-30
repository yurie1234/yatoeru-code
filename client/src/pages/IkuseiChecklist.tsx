import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CheckSquare, ListChecks, Search } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

/**
 * 育成就労への切り替えチェックリスト10項目（/ikusei-shuro/checklist）。
 * A. 現委託先の確認（今すぐ）/ B. 制度対応（〜2026年9月）/ C. 切り替え判断（〜2027年3月）
 * の3ブロック構成。各項目200-400字の実務解説。
 */

const CONTENT_BASE_DATE = "2026年7月30日";

const BLOCKS = [
  {
    key: "A",
    title: "A. 現在の委託先の確認（今すぐ）",
    deadline: "推奨時期：今すぐ〜1か月以内",
    items: [
      {
        no: 1,
        title: "現在の監理団体が監理支援機関の許可を申請済みか確認する",
        body: "監理団体は育成就労制度に自動移行できず、監理支援機関の許可を新たに取得する必要があります。施行日前申請は2026年4月15日から受付が始まっているため、「申請済みか・いつ申請予定か」を書面またはメールで確認しましょう。回答を記録に残しておくと、移行しない場合の切り替え判断を早く始められます。当サイトの移行状況トラッカーでは、全国3,733団体の確認状況を公開しています。",
      },
      {
        no: 2,
        title: "移行しない場合の在籍実習生の扱い（経過措置）を確認する",
        body: "委託先が監理支援機関に移行しない場合でも、施行日時点で在籍する技能実習生は経過措置により実習を継続できます。ただし監理事業を継続できるのは監理団体の許可の有効期間内に限られます。許可の有効期限と在籍実習生の実習満了時期を突き合わせ、期間中に監理が途切れないか、途切れる場合は後任の監理支援機関をいつまでに決める必要があるかを確認しましょう。",
      },
      {
        no: 3,
        title: "育成就労での監理費（監理支援費）の見積もりを取る",
        body: "育成就労では外部監査人の設置義務化など監理支援機関側のコストが増える構造にあり、現行の監理費（実習生1人あたり月3〜6万円が一般的な目安）から変動する可能性があります。移行予定の委託先には育成就労での費用体系を早めに確認し、複数の候補から見積もりを取って比較できる状態にしておくと、切り替え判断の材料になります。",
      },
    ],
  },
  {
    key: "B",
    title: "B. 制度対応の準備（〜2026年9月）",
    deadline: "推奨時期：2026年9月1日の計画認定申請開始まで",
    items: [
      {
        no: 4,
        title: "自社の業務が育成就労の対象分野かを確認する",
        body: "育成就労の受入対象分野は、特定技能制度の分野との連続性を基本に設定されます。現在技能実習で受け入れている職種が育成就労の対象分野に含まれるか、分野別運用方針の公表状況を確認しましょう。対象外となる職種の場合は、特定技能など別の在留資格での受入や業務範囲の見直しの検討が必要になります。",
      },
      {
        no: 5,
        title: "育成就労計画の認定申請を行うか判断する",
        body: "施行（2027年4月）と同時に育成就労で受け入れるには、育成就労計画の認定が必要です。施行日前申請は2026年9月1日に受付が始まるため、受入開始時期から逆算して申請するかを判断しましょう。計画には育成目標・日本語教育・昇給などの処遇設計を含める必要があり、準備には数か月かかると見込むのが安全です。",
      },
      {
        no: 6,
        title: "日本語教育の支援体制を設計する",
        body: "育成就労では入国時にA1相当（JLPT N5等）の日本語能力または相当講習の受講が求められ、就労開始後も特定技能1号への移行（A2相当以上）を見据えた日本語学習の支援が受入企業の重要な役割になります。社内での学習時間の確保、教材・eラーニングの提供、地域の日本語教室との連携など、自社で無理なく続けられる支援体制を設計しておきましょう。",
      },
      {
        no: 7,
        title: "転籍ルールへの備えを整える",
        body: "育成就労では一定要件下で本人意向の転籍が認められます（分野ごとに1〜2年の転籍制限期間）。転籍リスクを下げる本質的な対策は、賃金水準・昇給の明確化、生活支援、キャリアパスの提示といった「選ばれ続ける職場づくり」です。同業他社との処遇比較を行い、転籍制限期間が明ける時期までに処遇改善計画を用意しておくことをおすすめします。",
      },
    ],
  },
  {
    key: "C",
    title: "C. 委託先を切り替える場合（〜2027年3月）",
    deadline: "推奨時期：2027年4月の施行まで",
    items: [
      {
        no: 8,
        title: "切り替え候補を比較する（許可状況・対応分野・対応国）",
        body: "監理支援機関の公的な許可済み一覧は施行後まで存在しないため、現時点では「移行を予定している監理団体」から候補を絞るのが現実的です。比較の観点は、監理支援機関の許可申請状況、自社の分野・職種への対応実績、送り出し国の対応範囲、外部監査人の体制、監理費の水準です。当サイトの移行状況トラッカーで都道府県・許可区分から検索できます。",
      },
      {
        no: 9,
        title: "特定技能1号への接続まで見据えて選ぶ",
        body: "育成就労は3年で特定技能1号水準への育成を目的とするため、育成期間終了後は特定技能への移行が標準ルートになります。特定技能では登録支援機関（または自社支援）による支援が必要になるため、監理支援機関の候補が登録支援機関を兼務しているか、特定技能への移行支援の実績があるかを確認しておくと、3年後の切り替えコストを大きく減らせます。",
      },
      {
        no: 10,
        title: "送り出し国の状況と手数料の負担ルールを確認する",
        body: "育成就労では、来日時の手数料などの本人負担を減らすため、受入企業側が送り出しにかかる費用の一部を負担する方向で制度設計が進んでいます。送り出し国ごとの二国間取決めの状況、送出機関の手数料水準、受入企業の負担額の目安を候補の監理支援機関に確認し、受入1人あたりの総コスト（初期費用＋月額）で比較しましょう。",
      },
    ],
  },
] as const;

export default function IkuseiChecklist() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "【保存版】育成就労への切り替えチェックリスト10項目｜監理支援機関の選び方 - ヤトエル";
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3 flex-wrap">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <Link href="/ikusei-shuro">
              <span className="hover:text-brand-foreground cursor-pointer">育成就労制度</span>
            </Link>
            <span>/</span>
            <span>準備チェックリスト</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-amber-accent shrink-0" />
            育成就労への切り替えチェックリスト10項目
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            技能実習で外国人材を受け入れている企業・これから育成就労で受け入れる企業向けに、
            <strong className="text-brand-foreground">
              2027年4月の施行までにやるべき準備を10項目
            </strong>
            に整理しました。「A. 現委託先の確認（今すぐ）」「B. 制度対応（〜2026年9月）」「C. 切り替え判断（〜2027年3月）」の3ブロックで、上から順に進められる構成です。
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Badge className="bg-amber-accent text-brand hover:bg-amber-accent gap-1">
              <CalendarDays className="h-3 w-3" />
              内容確認基準日：{CONTENT_BASE_DATE}
            </Badge>
            <Badge
              variant="outline"
              className="text-brand-foreground/70 border-brand-foreground/30"
            >
              出典：出入国在留管理庁・外国人技能実習機構
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        {BLOCKS.map((block) => (
          <section key={block.key}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-xl font-bold">{block.title}</h2>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {block.deadline}
              </Badge>
            </div>
            <div className="space-y-4">
              {block.items.map((item) => (
                <Card key={item.no}>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-2 flex items-start gap-2.5">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-brand text-brand-foreground text-xs font-bold shrink-0">
                        {item.no}
                      </span>
                      <span className="pt-0.5">{item.title}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-[34px]">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <Card className="border-brand/30 bg-brand/5">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                <CheckSquare className="h-4 w-4 text-brand" />
                チェック1・8はトラッカーで今すぐ確認できます
              </div>
              <span className="text-muted-foreground">
                全国3,733の監理団体の移行状況を団体名・都道府県で検索
              </span>
            </div>
            <Button size="sm" onClick={() => setLocation("/ikusei-shuro/kanri-shien-kikan/list")}>
              <Search className="h-4 w-4 mr-1.5" />
              移行状況トラッカー
            </Button>
          </CardContent>
        </Card>

        {/* 関連リンク */}
        <section>
          <h2 className="text-xl font-bold mb-4">関連ガイド</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                href: "/ikusei-shuro/schedule",
                title: "施行スケジュール完全ガイド",
                desc: "2026年9月の計画認定申請開始など全日程を時系列で整理",
              },
              {
                href: "/guide/ikusei-shuro-cost",
                title: "受け入れ費用ガイド",
                desc: "初期費用・月額監理費の相場と助成金による負担軽減",
              },
              {
                href: "/joseikin",
                title: "外国人雇用で使える助成金",
                desc: "人材確保等支援助成金など主要5制度を解説",
              },
            ].map((g) => (
              <Link key={g.href} href={g.href}>
                <Card className="h-full cursor-pointer transition-colors hover:border-brand/50">
                  <CardContent className="p-4">
                    <div className="font-semibold text-sm mb-1 text-brand">{g.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* 出典 */}
        <section className="text-xs text-muted-foreground leading-relaxed space-y-1">
          <p className="font-semibold text-sm text-foreground">出典（一次情報）</p>
          <p>
            ・出入国在留管理庁「
            <a
              href="https://www.moj.go.jp/isa/applications/faq/ikusei_qa_00002.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              育成就労制度に関するQ&A
            </a>
            」
          </p>
          <p>
            ・外国人技能実習機構「
            <a
              href="https://www.otit.go.jp/employment_for_skill_development/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              育成就労制度関連情報
            </a>
            」
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
