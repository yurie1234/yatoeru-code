import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ExternalLink, FileText, Landmark, Search, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

/**
 * 監理支援機関ガイド（2026年秋〜の新語「監理支援機関 許可 申請」群の受け皿ページ）。
 * 引用しやすい構造化ページの原則: 結論先頭・基準日・表・出典明記。
 * 制度記述はすべて入管庁・外国人技能実習機構（OTIT）の一次情報に基づく。
 * 内容更新時は必ず一次情報と突合すること（YMYL隣接領域のため誤りは営業信頼に直結）。
 */

const CONTENT_BASE_DATE = "2026年7月16日"; // 本ページの内容確認基準日

const APPLICATION_ROWS = [
  { item: "申請の名称", detail: "監理支援機関の許可の施行日前申請" },
  { item: "受付開始", detail: "2026年4月15日（受付中）" },
  { item: "申請先", detail: "外国人技能実習機構（OTIT）" },
  { item: "許可の効力発生", detail: "2027年4月1日（育成就労制度の施行日）" },
  { item: "監理団体の新規許可申請の受付期限", detail: "2026年9月30日（技能実習制度に基づく申請はこの日まで）" },
] as const;

const REQUIREMENT_ROWS = [
  {
    item: "外部監査人",
    dantai: "外部監査人の設置または外部役員の確認（選択制）",
    shien: "外部監査人の設置が義務化",
  },
  {
    item: "受入れ機関との関係",
    dantai: "関与制限は限定的",
    shien: "受入れ機関と密接な関係にある役職員の監理業務への関与を制限",
  },
  {
    item: "許可の主体",
    dantai: "主務大臣の許可（技能実習法）",
    shien: "主務大臣の許可を新規に取得（育成就労法。監理団体の許可は引き継がれない）",
  },
  {
    item: "業務内容",
    dantai: "技能実習の実施監理",
    shien: "雇用関係のあっせん＋育成就労の実施監理（転籍支援を含む）",
  },
] as const;

const FAQS = [
  {
    q: "監理支援機関の許可申請はいつから受け付けていますか？",
    a: "施行日前申請が2026年4月15日から外国人技能実習機構（OTIT）で受付開始されています。許可の効力は育成就労制度の施行日である2027年4月1日から発生します。申請書類・手数料・提出方法の詳細は外国人技能実習機構の案内ページで確認できます。",
  },
  {
    q: "現在の監理団体の許可はそのまま監理支援機関に引き継がれますか？",
    a: "引き継がれません。監理団体が育成就労制度で監理支援事業を行うには、あらためて主務大臣から監理支援機関の許可を受ける必要があります。2027年4月1日から切れ目なく事業を行うには、施行日前申請の活用が推奨されています。",
  },
  {
    q: "監理団体と監理支援機関の要件の主な違いは何ですか？",
    a: "主な変更点は、外部監査人の設置義務化、受入れ機関と密接な関係にある役職員の監理業務への関与制限、財政基盤・人員体制の要件強化です。また業務面では、実施監理に加えて雇用関係のあっせん（転籍支援を含む）が明確に位置づけられました。",
  },
  {
    q: "2026年9月30日の期限は何の期限ですか？",
    a: "技能実習制度に基づく監理団体の新規許可申請の受付期限です。この日以降は技能実習法に基づく監理団体の新規許可申請はできなくなり、育成就労制度の監理支援機関の許可申請に一本化されていきます。",
  },
  {
    q: "登録支援機関と監理支援機関はどう違いますか？",
    a: "登録支援機関は特定技能制度において受入れ企業から委託を受けて支援計画の実施を担う登録制の機関です。監理支援機関は育成就労制度において雇用あっせんと実施監理を担う許可制の機関で、対象制度・役割・参入規制（登録制と許可制）が異なります。両制度をまたいで人材を受け入れる企業は、それぞれの機関との契約が必要になる場合があります。",
  },
] as const;

export default function GuideKanriShienKikan() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "監理支援機関とは｜許可申請の受付開始日・監理団体との違いを解説 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "監理支援機関は育成就労制度（2027年4月1日施行）で監理団体に代わる許可制の機関。許可の施行日前申請は2026年4月15日から外国人技能実習機構で受付中。監理団体との要件の違い・申請スケジュールを一次情報に基づき解説します。"
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
    // SSR焼き込み分のJSON-LDを除去してから注入（重複防止）
    document.querySelectorAll("script.ssr-jsonld").forEach((el) => el.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "guide-kanri-jsonld";
    script.textContent = JSON.stringify(faqLd);
    document.head.appendChild(script);
    return () => {
      document.getElementById("guide-kanri-jsonld")?.remove();
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
            <Link href="/guide/ikusei-shuro">
              <span className="hover:text-brand-foreground cursor-pointer">育成就労制度ガイド</span>
            </Link>
            <span>/</span>
            <span>監理支援機関</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-amber-accent shrink-0" />
            監理支援機関とは｜許可申請の受付開始日・監理団体との違い
          </h1>
          {/* 結論先頭のサマリー */}
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>監理支援機関は、育成就労制度（2027年4月1日施行）において雇用関係のあっせんと実施監理を担う許可制の機関で、技能実習制度の監理団体に代わるものです。</strong>
            監理団体の許可は引き継がれず、新たに主務大臣の許可が必要です。許可の施行日前申請は2026年4月15日から外国人技能実習機構（OTIT）で受付が始まっています。
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
        {/* 許可申請の概要 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            許可申請のスケジュール・概要
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {APPLICATION_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0">
                      <td className="py-2.5 px-4 whitespace-nowrap font-medium">{r.item}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* 監理団体との違い */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            監理団体との主な違い
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">項目</th>
                    <th className="py-2.5 px-4 font-semibold">監理団体（技能実習）</th>
                    <th className="py-2.5 px-4 font-semibold">監理支援機関（育成就労）</th>
                  </tr>
                </thead>
                <tbody>
                  {REQUIREMENT_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 whitespace-nowrap font-medium">{r.item}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.dantai}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.shien}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* 登録支援機関との関係 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-brand" />
            登録支援機関との関係
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">登録支援機関</strong>（特定技能・登録制）と
              <strong className="text-foreground">監理支援機関</strong>（育成就労・許可制）は別の制度上の機関です。
              育成就労で受け入れた人材が特定技能1号へ移行する流れが制度上想定されているため、両制度をまたいで人材を受け入れる企業では、育成就労期間は監理支援機関、特定技能移行後は登録支援機関（または自社支援）と、段階に応じた体制が必要になります。
            </p>
            <p>
              特定技能の支援委託先である登録支援機関は現時点で全国11,000件超が登録されており、
              <Link href="/search">
                <span className="text-brand hover:underline cursor-pointer">ヤトエルの検索ページ</span>
              </Link>
              で対応言語・地域・分野から比較できます。
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
                href="https://www.otit.go.jp/employment_for_skill_development/03/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                外国人技能実習機構「監理支援機関許可施行日前申請」
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
              <a
                href="https://www.moj.go.jp/isa/applications/faq/ikusei_qa_00002.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「育成就労制度Q＆A」
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
                className="bg-amber-accent text-brand hover:bg-amber-accent/90"
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
