import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ExternalLink, FileText, Landmark, Search } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

/**
 * 育成就労制度ガイド（2026年秋〜2027年に検索需要が立ち上がる新語の受け皿ページ）。
 * 引用しやすい構造化ページの原則: 結論先頭・基準日・表・出典明記。
 * 制度記述はすべて入管庁・外国人技能実習機構（OTIT）の一次情報に基づく。
 * 内容更新時は必ず一次情報と突合すること（YMYL隣接領域のため誤りは営業信頼に直結）。
 */

const CONTENT_BASE_DATE = "2026年7月16日"; // 本ページの内容確認基準日

const SCHEDULE_ROWS = [
  { date: "2024年6月", event: "育成就労制度を創設する改正法が成立・公布" },
  { date: "2025年9月26日", event: "施行日を2027年4月1日とする政令を閣議決定" },
  { date: "2026年4月15日", event: "監理支援機関の許可の施行日前申請 受付開始（外国人技能実習機構）" },
  { date: "2026年9月1日", event: "育成就労計画の認定の施行日前申請 受付開始" },
  { date: "2026年9月30日", event: "技能実習制度に基づく監理団体の新規許可申請の受付期限" },
  { date: "2027年4月1日", event: "育成就労制度の運用開始・特定技能制度の適正化等の施行" },
] as const;

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

const FAQS = [
  {
    q: "育成就労制度はいつから始まりますか？",
    a: "2027年4月1日に運用開始です（2025年9月26日の閣議決定で施行日が政令として確定済み）。同日に特定技能制度の適正化等も施行されます。技能実習制度は経過措置を経て廃止されます。",
  },
  {
    q: "監理支援機関とは何ですか？監理団体との違いは？",
    a: "監理支援機関は、育成就労制度において雇用関係のあっせんや育成就労の実施監理を行う許可制の機関で、技能実習制度の監理団体に代わるものです。許可基準は監理団体より厳格化され、外部監査人の設置義務化、受入れ機関と密接な関係を持つ役職員の監理業務への関与制限などが加わりました。監理団体が育成就労制度でそのまま監理支援機関になることはできず、新たに主務大臣の許可が必要です。",
  },
  {
    q: "監理支援機関の許可申請はいつから・どこにすればよいですか？",
    a: "施行日前申請が2026年4月15日から外国人技能実習機構（OTIT）で受付開始されています。申請書類の作成・手数料の納付・郵送先等の詳細は外国人技能実習機構の案内ページで確認できます。",
  },
  {
    q: "今いる技能実習生は2027年4月以降どうなりますか？",
    a: "施行日時点で在籍する技能実習生は経過措置の対象となり、引き続き技能実習を継続できます。監理団体の許可の有効期間が残っていれば技能実習の監理事業も継続可能です。新規の技能実習生の受入れは制度移行に伴い段階的に終了します。",
  },
  {
    q: "育成就労から特定技能への移行はできますか？",
    a: "できます。育成就労制度は3年間の育成期間で特定技能1号の技能水準まで育成することを目的としており、技能試験と日本語試験（A2相当以上）に合格することで特定技能1号へ移行できます。",
  },
] as const;

export default function GuideIkuseiShuro() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "育成就労制度とは｜2027年4月1日施行・監理支援機関への移行を解説 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "育成就労制度は2027年4月1日施行（政令確定済み）。技能実習制度との違い、監理団体から監理支援機関への移行、許可申請スケジュール（2026年4月15日施行日前申請開始）を入管庁一次情報に基づき解説します。"
    );
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "guide-ikusei-jsonld";
    script.textContent = JSON.stringify(faqLd);
    document.head.appendChild(script);
    return () => {
      document.getElementById("guide-ikusei-jsonld")?.remove();
      document.title = "ヤトエル｜特定技能・育成就労の登録支援機関データベース";
      meta?.setAttribute("content", prev);
    };
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
            <span>育成就労制度ガイド</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <Landmark className="h-8 w-8 text-amber-accent shrink-0" />
            育成就労制度とは｜2027年4月1日施行・監理支援機関への移行
          </h1>
          {/* 結論先頭のサマリー */}
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>育成就労制度は技能実習制度に代わる新しい外国人材受入れ制度で、2027年4月1日に運用開始されます（施行日は政令で確定済み）。</strong>
            3年間で特定技能1号水準まで人材を育成することを目的とし、監理団体に代わる「監理支援機関」（許可制・要件厳格化）が雇用あっせんと実施監理を担います。監理支援機関の許可の施行日前申請は2026年4月15日から受付が始まっています。
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Badge className="bg-amber-accent text-brand hover:bg-amber-accent gap-1">
              <CalendarDays className="h-3 w-3" />
              内容確認基準日：{CONTENT_BASE_DATE}
            </Badge>
            <Badge variant="outline" className="text-brand-foreground/70 border-brand-foreground/30">
              出典：出入国在留管理庁・外国人技能実習機構
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        {/* 施行スケジュール表 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            施行スケジュール
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">時期</th>
                    <th className="py-2.5 px-4 font-semibold">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE_ROWS.map((r) => (
                    <tr key={r.date} className="border-b last:border-0">
                      <td className="py-2.5 px-4 whitespace-nowrap font-medium">{r.date}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* 技能実習との違い */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            技能実習制度との主な違い
          </h2>
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
        </section>

        {/* 監理支援機関への移行 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-brand" />
            監理団体から監理支援機関への移行
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              技能実習制度の<strong className="text-foreground">監理団体</strong>は、育成就労制度でそのまま
              <strong className="text-foreground">監理支援機関</strong>になることは
              <strong className="text-foreground">できません</strong>。監理支援事業を行うには、あらためて主務大臣から監理支援機関の許可を受ける必要があります（施行日前申請：2026年4月15日〜、申請先は外国人技能実習機構）。
            </p>
            <p>
              許可基準は監理団体より厳格化されており、主な変更点は
              <strong className="text-foreground">外部監査人の設置義務化</strong>、
              <strong className="text-foreground">受入れ機関と密接な関係にある役職員の監理業務への関与制限</strong>、
              財政基盤・人員体制の要件強化などです。経過措置として、監理団体の許可の有効期間が残っていれば、施行日以降も在籍する技能実習生の監理事業は継続できます。
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section>
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
        <section>
          <h2 className="text-xl font-bold mb-4">出典（一次情報）</h2>
          <Card>
            <CardContent className="p-5 space-y-2 text-sm">
              <a
                href="https://www.moj.go.jp/isa/ikuseishuro_00001.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「育成就労制度」
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
                href="https://www.otit.go.jp/employment_for_skill_development/03/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                外国人技能実習機構「監理支援機関許可施行日前申請」
              </a>
              <p className="text-xs text-muted-foreground pt-2">
                本ページの内容は{CONTENT_BASE_DATE}時点の一次情報に基づきます。制度の詳細・最新情報は必ず上記の公式情報をご確認ください。個別の要件判断は行政書士等の専門家または出入国在留管理庁にご相談ください。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <Card className="bg-brand text-brand-foreground">
          <CardContent className="p-6 md:flex items-center justify-between gap-6">
            <div className="mb-4 md:mb-0">
              <h3 className="font-bold text-lg mb-1">特定技能の受入れは今すぐ始められます</h3>
              <p className="text-sm text-brand-foreground/70 leading-relaxed">
                育成就労の施行を待たずに外国人材を受け入れるなら、特定技能制度が現行の選択肢です。全国11,000件超の登録支援機関から条件に合う機関を探せます。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                className="bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                onClick={() => setLocation("/diagnose")}
              >
                準備度チェックを試す
              </Button>
              <Button
                variant="outline"
                className="border-brand-foreground/30 text-brand-foreground hover:bg-brand-foreground/10"
                onClick={() => setLocation("/search")}
              >
                <Search className="h-4 w-4 mr-1" />
                支援機関を探す
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
