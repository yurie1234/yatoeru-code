import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Factory, Search, Users } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

/**
 * 育成就労 施行スケジュール完全ガイド（/ikusei-shuro/schedule）。
 * 「2026年9月1日の計画認定申請開始」を軸に、在籍企業/初受入企業の
 * 2つのタイムラインで実務準備を時系列整理する。
 */

const CONTENT_BASE_DATE = "2026年7月30日";

const SCHEDULE_ROWS = [
  {
    date: "2024年6月",
    event: "育成就労制度を創設する改正法が成立・公布",
    status: "done",
  },
  {
    date: "2025年9月26日",
    event: "施行日を2027年4月1日とする政令を閣議決定（施行日確定）",
    status: "done",
  },
  {
    date: "2026年4月15日",
    event: "監理支援機関の許可の施行日前申請 受付開始（外国人技能実習機構）",
    status: "done",
  },
  {
    date: "2026年9月1日",
    event: "育成就労計画の認定の施行日前申請 受付開始",
    status: "next",
  },
  {
    date: "2026年9月30日",
    event: "技能実習制度に基づく監理団体の新規許可申請の受付期限",
    status: "upcoming",
  },
  {
    date: "2026年度内",
    event: "分野別運用方針・上乗せ基準など詳細ルールの整備が順次進む見込み",
    status: "upcoming",
  },
  {
    date: "2027年4月1日",
    event: "育成就労制度の施行（監理支援機関の許可証交付はこれ以降）・特定技能制度の適正化等も同時施行",
    status: "upcoming",
  },
  {
    date: "施行後",
    event: "経過措置：施行日時点で在籍する技能実習生は技能実習を継続可能（監理団体の許可有効期間内は監理事業も継続可）",
    status: "upcoming",
  },
] as const;

const EXISTING_TIMELINE = [
  {
    period: "今すぐ",
    action:
      "現在の監理団体に「監理支援機関の許可を申請済みか」を確認する。移行しない場合、在籍実習生の監理が許可有効期間内に限られるため、後任の監理支援機関の検討時期も合わせて確認する。",
  },
  {
    period: "〜2026年9月",
    action:
      "在籍実習生の実習満了時期を一覧化し、満了後に育成就労で新規受入する場合は育成就労計画の認定申請（2026年9月1日受付開始）の準備を進める。",
  },
  {
    period: "〜2027年3月",
    action:
      "委託先を切り替える場合は候補比較・監理費見積もりを完了。就業規則・賃金規程など受入体制の書類も育成就労の要件（昇給・転籍ルール等）に合わせて整備する。",
  },
  {
    period: "2027年4月〜",
    action:
      "新規の受入は育成就労制度で実施。在籍実習生は経過措置で継続しつつ、特定技能1号への移行（試験合格）を見据えた育成計画を進める。",
  },
] as const;

const NEW_TIMELINE = [
  {
    period: "今すぐ",
    action:
      "自社の業務が育成就労の対象分野に含まれるかを確認する。対象分野は特定技能の分野との連続性を基本に設定されるため、特定技能の対象業務かどうかが最初の目安になる。",
  },
  {
    period: "〜2026年9月",
    action:
      "委託する監理支援機関の候補を選定する。まだ許可済み一覧が存在しないため、現行の監理団体のうち移行を予定している団体（移行状況トラッカーで確認可能）から候補を絞る。",
  },
  {
    period: "2026年9月〜2027年3月",
    action:
      "育成就労計画の認定申請（施行日前申請）を行い、送り出し国・人材の選定、雇用条件の設計（日本語教育支援・転籍制限期間の確認を含む）を進める。",
  },
  {
    period: "2027年4月〜",
    action: "施行と同時に受入開始。入国時の日本語要件（A1相当）や講習の実施状況を確認する。",
  },
] as const;

export default function IkuseiSchedule() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "育成就労はいつから？施行スケジュール完全ガイド【2026年9月に計画認定申請開始】 - ヤトエル";
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
            <span>施行スケジュール</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-amber-accent shrink-0" />
            育成就労はいつから？施行スケジュール完全ガイド
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong className="text-brand-foreground">
              育成就労制度は2027年4月1日に施行されます（政令で確定済み）。
            </strong>
            ただし準備は施行日より前に始まっており、監理支援機関の許可申請は2026年4月15日に受付開始済み、
            <strong className="text-brand-foreground">
              育成就労計画の認定申請は2026年9月1日に受付が始まります
            </strong>
            。受入企業が「待ち」でよいのは制度の詳細ルールだけで、委託先の確認と計画準備は今から動く必要があります。
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

      <div className="container py-10 max-w-4xl space-y-12">
        {/* 全体スケジュール */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand" />
            施行までの全体スケジュール
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">時期</th>
                    <th className="py-2.5 px-4 font-semibold">内容</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">状況</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE_ROWS.map((r) => (
                    <tr key={r.date} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 whitespace-nowrap font-medium">{r.date}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.event}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {r.status === "done" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            済
                          </Badge>
                        ) : r.status === "next" ? (
                          <Badge className="bg-amber-accent text-brand hover:bg-amber-accent text-xs">
                            次の節目
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            予定
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* 2026年9月1日が重要な理由 */}
        <section>
          <h2 className="text-xl font-bold mb-4">なぜ「2026年9月1日」が重要なのか</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              育成就労で外国人材を受け入れるには、受入企業ごとに
              <strong className="text-foreground">育成就労計画の認定</strong>
              が必要です。この認定の施行日前申請が2026年9月1日に受付開始されます。施行と同時（2027年4月）に受入を始めたい企業は、この申請を施行前に済ませておく必要があり、
              <strong className="text-foreground">
                実質的な準備期限は2026年夏〜秋
              </strong>
              に前倒しされます。
            </p>
            <p>
              また、計画認定の申請には委託する監理支援機関が事実上決まっている必要があります。監理支援機関の許可申請（2026年4月15日受付開始）が先行しているのはこのためで、「委託先の確認→計画認定の準備」という順番で進めるのが基本です。
            </p>
          </div>
        </section>

        {/* 2つのタイムライン */}
        <section>
          <h2 className="text-xl font-bold mb-4">立場別の準備タイムライン</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand" />
                  技能実習生が在籍している企業
                </h3>
                <div className="space-y-3">
                  {EXISTING_TIMELINE.map((t) => (
                    <div key={t.period} className="text-sm">
                      <div className="font-semibold text-brand text-xs mb-0.5">{t.period}</div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{t.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Factory className="h-4 w-4 text-brand" />
                  育成就労で初めて受け入れる企業
                </h3>
                <div className="space-y-3">
                  {NEW_TIMELINE.map((t) => (
                    <div key={t.period} className="text-sm">
                      <div className="font-semibold text-brand text-xs mb-0.5">{t.period}</div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{t.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <Card className="border-brand/30 bg-brand/5">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">委託先・候補の移行状況を確認：</span>
              <span className="text-muted-foreground">
                全国3,733の監理団体の監理支援機関への移行状況を検索できます
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
                href: "/ikusei-shuro/checklist",
                title: "受入企業の準備チェックリスト",
                desc: "現委託先の確認から切り替え判断まで10項目",
              },
              {
                href: "/guide/ikusei-shuro-schedule",
                title: "経過措置と企業の準備の詳細",
                desc: "在籍実習生の扱い・処遇設計のチェックポイント",
              },
              {
                href: "/guide/kanri-shien-kikan",
                title: "監理支援機関とは",
                desc: "許可要件・監理団体との違いを解説",
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
              育成就労制度関連情報（施行日前申請の案内）
            </a>
            」
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
