import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  CheckSquare,
  FileText,
  Landmark,
  ListChecks,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

/**
 * 育成就労制度ハブTOP（/ikusei-shuro）。
 * リードで「現行の監理団体は自動的には監理支援機関にならない」に即答し、
 * トラッカー・スケジュール・チェックリスト・既存guide群への内部リンクハブとして機能する。
 */

const CONTENT_BASE_DATE = "2026年7月30日";

const DIFF_ROWS = [
  {
    item: "制度目的",
    ginou: "国際貢献（技能移転）",
    ikusei: "人材確保と人材育成（特定技能1号水準への育成）",
  },
  {
    item: "在籍期間",
    ginou: "1号〜3号で最長5年",
    ikusei: "原則3年（特定技能1号への移行を想定）",
  },
  {
    item: "転籍（受入れ機関の変更）",
    ginou: "原則不可（やむを得ない事情がある場合のみ）",
    ikusei: "一定要件下で本人意向の転籍が可能（分野ごとに1〜2年の転籍制限期間）",
  },
  {
    item: "日本語能力",
    ginou: "入国時の要件なし",
    ikusei: "入国時にA1相当（JLPT N5等）の試験合格または相当講習の受講",
  },
  {
    item: "監理・支援",
    ginou: "監理団体（許可制）",
    ikusei: "監理支援機関（許可制・要件厳格化、外部監査人の設置義務化等）",
  },
] as const;

const HUB_LINKS = [
  {
    href: "/ikusei-shuro/kanri-shien-kikan/list",
    icon: Search,
    title: "監理団体の移行状況トラッカー",
    desc: "全国3,733団体の監理支援機関への移行状況を独自調査・毎月更新",
    badge: "当サイト独自",
  },
  {
    href: "/guide/kanri-shien-kikan",
    icon: Landmark,
    title: "監理支援機関とは",
    desc: "許可要件・監理団体との違い・外部監査人の設置義務化を解説",
    badge: null,
  },
  {
    href: "/ikusei-shuro/schedule",
    icon: CalendarDays,
    title: "施行スケジュール完全ガイド",
    desc: "2026年9月1日の計画認定申請開始など、時系列で全体像を整理",
    badge: null,
  },
  {
    href: "/ikusei-shuro/checklist",
    icon: ListChecks,
    title: "受入企業の準備チェックリスト",
    desc: "現在の委託先の確認から切り替え判断まで10項目",
    badge: "保存版",
  },
  {
    href: "/ikusei-shuro/for-kanri-dantai",
    icon: ShieldCheck,
    title: "監理団体の皆さまへ（移行状況の情報提供）",
    desc: "トラッカーへの掲載・移行状況の更新は無料です",
    badge: "無料掲載",
  },
] as const;

const FAQS = [
  {
    q: "いま契約している監理団体は、育成就労でもそのまま使えますか？",
    a: "自動的には使えません。監理団体が育成就労制度で監理支援機関になるには、あらためて主務大臣の許可を受ける必要があります。許可基準は外部監査人の設置義務化などで厳格化されており、すべての監理団体が移行するとは限りません。委託先が申請済みかどうかの確認が受入企業の最初の準備です。",
  },
  {
    q: "育成就労制度はいつから始まりますか？",
    a: "2027年4月1日に施行されます（2025年9月26日の閣議決定で施行日が政令として確定済み）。監理支援機関の許可の施行日前申請は2026年4月15日から、育成就労計画の認定の施行日前申請は2026年9月1日から受付が始まります。",
  },
  {
    q: "監理支援機関の許可済み一覧はどこで見られますか？",
    a: "許可証の交付は2027年4月の施行以降のため、公的な許可済み一覧はまだ存在しません。当サイトでは現行の監理団体3,733団体について、移行の意向・申請状況を独自調査した移行状況トラッカーを公開し、毎月更新しています。",
  },
  {
    q: "施行日時点で在籍している技能実習生はどうなりますか？",
    a: "経過措置の対象となり、引き続き技能実習を継続できます。監理団体の許可の有効期間が残っていれば監理事業も継続可能です。新規の技能実習生の受入れは制度移行に伴い段階的に終了します。",
  },
] as const;

export default function IkuseiHub() {
  const [, setLocation] = useLocation();
  const { data: summary } = trpc.kanri.summary.useQuery();

  useEffect(() => {
    document.title =
      "育成就労制度まとめ｜監理支援機関の移行状況・スケジュール・受入企業の準備 - ヤトエル";
  }, []);

  return (
    <SiteLayout>
      {/* ヒーロー：結論先頭 */}
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <span>育成就労制度</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <Landmark className="h-8 w-8 text-amber-accent shrink-0" />
            育成就労制度まとめ｜監理支援機関・スケジュール・受入準備
          </h1>
          <div className="max-w-3xl space-y-3 text-brand-foreground/80 leading-relaxed">
            <p>
              <strong className="text-brand-foreground">
                「いま契約している技能実習の監理団体は、育成就労でもそのまま使えるのか？」——答えは「自動的には使えません」。
              </strong>
            </p>
            <p>
              2027年4月1日に施行される育成就労制度では、現行の監理団体に代わって
              <strong className="text-brand-foreground">監理支援機関</strong>
              が雇用あっせんと実施監理を担います。すべての監理団体は新規に許可を取り直す必要があり、外部監査人の設置義務化など要件も厳格化されるため、
              <strong className="text-brand-foreground">移行しない団体も出てきます</strong>
              。当サイトは全国の監理団体{summary ? summary.total.toLocaleString() : "3,733"}
              団体の移行状況を独自調査し、無料で公開しています。
            </p>
          </div>
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
          <div className="flex flex-wrap gap-3 mt-6">
            <Button
              className="bg-amber-accent text-brand hover:bg-amber-accent/90"
              onClick={() => setLocation("/ikusei-shuro/kanri-shien-kikan/list")}
            >
              <Search className="h-4 w-4 mr-2" />
              移行状況トラッカーを見る
            </Button>
            <Button
              variant="outline"
              className="border-brand-foreground/30 text-brand-foreground hover:bg-brand-foreground/10"
              onClick={() => setLocation("/ikusei-shuro/checklist")}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              準備チェックリスト
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-12">
        {/* このハブの構成 */}
        <section>
          <h2 className="text-xl font-bold mb-4">このページ群でわかること</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {HUB_LINKS.map((g) => (
              <Link key={g.href} href={g.href}>
                <Card className="h-full cursor-pointer transition-colors hover:border-brand/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <g.icon className="h-4 w-4 text-brand shrink-0" />
                      <span className="font-semibold text-sm text-brand">{g.title}</span>
                      {g.badge && (
                        <Badge className="bg-amber-accent/20 text-amber-700 hover:bg-amber-accent/20 text-[10px] px-1.5">
                          {g.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* 育成就労とは（技能実習との違い） */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            育成就労制度とは（技能実習との違い）
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            育成就労制度は、技能実習制度に代わる新しい外国人材受入れ制度です。「国際貢献」を目的とした技能実習と異なり、
            <strong className="text-foreground">人材確保と人材育成</strong>
            を正面から掲げ、原則3年間で特定技能1号の水準まで育成することを目的とします。受入企業の実務に影響が大きい変更点は次のとおりです。
          </p>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold">技能実習（現行）</th>
                    <th className="py-2.5 px-4 font-semibold">育成就労（2027年4月〜）</th>
                  </tr>
                </thead>
                <tbody>
                  {DIFF_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 whitespace-nowrap font-medium">{r.item}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.ginou}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.ikusei}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-3">
            制度全体の詳しい解説は
            <Link href="/guide/ikusei-shuro">
              <span className="text-brand hover:underline cursor-pointer">育成就労制度ガイド</span>
            </Link>
            、技能実習との違いの詳細は
            <Link href="/guide/ginou-jisshu-chigai">
              <span className="text-brand hover:underline cursor-pointer">比較解説ページ</span>
            </Link>
            をご覧ください。
          </p>
        </section>

        {/* 監理団体と監理支援機関の違い */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-brand" />
            監理団体と監理支援機関の違い——「自動移行」はない
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              技能実習制度の<strong className="text-foreground">監理団体</strong>
              は、育成就労制度でそのまま
              <strong className="text-foreground">監理支援機関</strong>
              になることはできません。監理支援事業を行うには、あらためて主務大臣の許可が必要です（施行日前申請：2026年4月15日〜、申請先は外国人技能実習機構）。
            </p>
            <p>
              許可基準は監理団体より厳格化されており、
              <strong className="text-foreground">外部監査人の設置義務化</strong>、
              受入企業と密接な関係にある役職員の監理業務への関与制限、財政基盤・人員体制の要件強化などが加わりました。このため、現行の監理団体の中には
              <strong className="text-foreground">移行を見送る団体も出てくる</strong>
              と見込まれます。受入企業にとっては「いまの委託先が移行するのか」を早期に確認することが、2027年4月以降の受入継続の前提になります。
            </p>
          </div>
          <Card className="mt-4 border-brand/30 bg-brand/5">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-semibold">委託先の移行状況を確認する：</span>
                <span className="text-muted-foreground">
                  全国{summary ? summary.total.toLocaleString() : "3,733"}団体を団体名で検索できます
                </span>
              </div>
              <Button size="sm" onClick={() => setLocation("/ikusei-shuro/kanri-shien-kikan/list")}>
                <Search className="h-4 w-4 mr-1.5" />
                トラッカーで検索
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* 受入企業が今やるべきこと */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-brand" />
            受入企業が今やるべきこと（時期別）
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">時期</th>
                    <th className="py-2.5 px-4 font-semibold">やること</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b align-top">
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium">今すぐ</td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      現在の監理団体に「監理支援機関の許可を申請済みか・申請予定か」を確認。移行しない場合の在籍実習生の扱い（経過措置）も確認する。
                    </td>
                  </tr>
                  <tr className="border-b align-top">
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium">〜2026年9月</td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      自社の職種が育成就労の対象分野かを確認し、施行直後から受け入れる場合は育成就労計画の認定申請（2026年9月1日受付開始）の準備を進める。
                    </td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium">〜2027年3月</td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      委託先を切り替える場合は候補の比較・見積もりを完了し、特定技能1号への接続（登録支援機関の兼務状況）まで見据えて選定する。
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-3">
            全10項目の詳細チェックリストは
            <Link href="/ikusei-shuro/checklist">
              <span className="text-brand hover:underline cursor-pointer">こちら</span>
            </Link>
            、施行までの全日程は
            <Link href="/ikusei-shuro/schedule">
              <span className="text-brand hover:underline cursor-pointer">スケジュール完全ガイド</span>
            </Link>
            をご覧ください。
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold mb-4">よくある質問</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-4 md:p-5">
                  <h3 className="font-semibold text-sm mb-2">Q. {f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">A. {f.a}</p>
                </CardContent>
              </Card>
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
            」・「
            <a
              href="https://www.otit.go.jp/implementer/basic/search_supervisor/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              監理団体の検索
            </a>
            」
          </p>
          <p>
            ・法務省「
            <a
              href="https://www.moj.go.jp/isa/applications/ssw/nyuukokukanri07_00205.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              登録支援機関登録簿
            </a>
            」
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
