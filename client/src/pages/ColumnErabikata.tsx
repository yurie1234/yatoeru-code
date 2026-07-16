import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  Search,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArticleBreadcrumb, ArticleToc } from "@/components/ArticleToc";

/**
 * コラム①「登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法」
 * 選定意図語の本丸。E-E-A-Tフォーマット：運営者名・内容確認基準日・一次情報リンク・内部導線。
 * 制度記述・数値はすべて出典を明記し、料金は「目安＋相見積推奨」の原則を守る。
 */

const CONTENT_BASE_DATE = "2026年7月16日";
const PUBLISHED_DATE = "2026-07-16";

const TOC_SECTIONS = [
  { id: "zentei", label: "登録支援機関とは（30秒でわかる前提）" },
  { id: "ryokin", label: "料金相場：月額の目安と内訳" },
  { id: "check7", label: "契約前に確認すべき7項目" },
  { id: "kakunin", label: "登録番号の確認方法（3ステップ）" },
  { id: "faq", label: "よくある質問" },
  { id: "shutten", label: "出典（一次情報）" },
] as const;

const FEE_ROWS = [
  {
    item: "月額支援委託料",
    range: "1人あたり月額1.5万〜4万円程度",
    note: "出入国在留管理庁の調査では平均約28,000円/月、約9割が3万円以下。支援10項目の範囲・対応言語で変動",
  },
  {
    item: "初期費用（事前ガイダンス・送迎・生活オリエンテーション等）",
    range: "1人あたり2万〜5万円程度",
    note: "月額に含める機関と別建ての機関がある。見積時に内訳を確認",
  },
  {
    item: "在留諸申請の取次・書類作成",
    range: "1件あたり3万〜10万円程度",
    note: "行政書士報酬として別途発生することが多い。更新時にも発生",
  },
  {
    item: "翻訳・通訳・住居あっせん等の実費",
    range: "実費",
    note: "対応言語のスタッフが社内にいる機関は割安になる傾向",
  },
] as const;

const CHECK_ITEMS = [
  {
    title: "1. 登録番号と登録の有効性",
    body: "出入国在留管理庁の登録支援機関登録簿に掲載されているか、登録番号（「19登-XXXXXX」等の形式）を必ず確認します。登録は5年間の更新制のため、登録年月日もあわせて確認してください。抹消された機関は登録簿に掲載されません。",
  },
  {
    title: "2. 行政処分歴の有無",
    body: "出入国在留管理庁は特定技能制度における行政処分等・改善命令を公表しています。委託候補の機関名が過去の処分事例に含まれていないかを確認します。ヤトエルの検索では処分歴の確認状況をタグで表示しています。",
  },
  {
    title: "3. 外国人本人が十分理解できる言語への対応",
    body: "相談・苦情対応は「外国人が十分に理解することができる言語」で行うことが義務的支援として定められています。雇用予定の人材の母語（ベトナム語・インドネシア語・ミャンマー語等）に、通訳の外部手配ではなく体制として対応できるかを確認してください。",
  },
  {
    title: "4. 受け入れる分野・業務区分の実績",
    body: "介護と外食業では支援の現場ノウハウが大きく異なります。同じ分野での支援実績（支援中の人数・受入れ企業数）を具体的な数字で確認します。分野別の協議会加入手続に慣れているかも重要です。",
  },
  {
    title: "5. 事業所の所在地と訪問・面談の体制",
    body: "義務的支援には3か月に1回以上の定期面談が含まれ、対面での対応が基本です。自社の事業所から通える範囲に拠点があるか、遠方の場合はどのように面談・緊急対応を行うのかを確認してください。",
  },
  {
    title: "6. 料金の内訳と契約条件の透明性",
    body: "月額料金に含まれる支援項目と別料金の項目（在留申請取次・翻訳等）を書面で確認します。支援委託費は受入れ企業が負担すべきもので、外国人本人に負担させることはできません。複数機関からの相見積をおすすめします。",
  },
  {
    title: "7. 再委託の有無と支援の実施体制",
    body: "支援業務の再委託は認められていません。実際に支援を行う担当者が委託先の社員か、担当者1人あたりの支援対象人数は適切か（目安として数十人規模を超えると面談品質に影響）を確認してください。",
  },
] as const;

const FAQS = [
  {
    q: "登録支援機関への委託費用の相場はいくらですか？",
    a: "出入国在留管理庁の調査では、1人あたりの月額支援委託料は平均約28,000円で、約9割が月額3万円以下です。一般的な相場帯は月額1.5万〜4万円程度で、このほか初期費用（2万〜5万円程度）や在留申請の取次費用（1件3万〜10万円程度）が別途発生することがあります。金額はあくまで目安のため、複数機関からの相見積をおすすめします。",
  },
  {
    q: "登録支援機関の登録番号はどこで確認できますか？",
    a: "出入国在留管理庁のウェブサイトに掲載されている「登録支援機関登録簿」で確認できます。登録簿には登録番号・登録年月日・機関名・所在地・対応言語が記載されています。ヤトエルでは同登録簿をもとに全国11,000件超の機関を地域・対応言語・処分歴の確認状況から検索できます。",
  },
  {
    q: "支援費用を外国人本人に負担させることはできますか？",
    a: "できません。1号特定技能外国人支援に要する費用は受入れ企業（所属機関）が負担すべきものとされており、直接的にも間接的にも外国人本人に負担させることは認められていません。",
  },
  {
    q: "登録支援機関に委託せず自社で支援することはできますか？",
    a: "可能です。ただし支援責任者・支援担当者の選任、外国人が十分理解できる言語での支援体制、過去の受入れ実績などの支援体制基準を自社で満たす必要があります。登録支援機関に支援の全部を委託した場合は、この基準を満たしたものとみなされます。",
  },
  {
    q: "登録支援機関の登録に有効期限はありますか？",
    a: "あります。登録の有効期間は5年間で、継続する場合は更新が必要です（新規登録の申請手数料28,400円・更新11,100円）。委託前には登録年月日を確認し、登録が有効な機関かを確かめてください。",
  },
] as const;

export default function ColumnErabikata() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title =
      "登録支援機関の選び方｜料金相場・確認すべき7項目・登録番号の確認方法 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "登録支援機関の委託料金の相場（月額平均約28,000円・約9割が3万円以下）、契約前に確認すべき7項目、入管庁登録簿での登録番号の確認方法を一次情報に基づき解説。全国11,000件超の機関から相見積先を探せます。"
    );
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline:
            "登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法",
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          author: { "@type": "Organization", name: "ヤトエル運営チーム" },
          publisher: { "@type": "Organization", name: "ヤトエル" },
          mainEntityOfPage: "https://yatoeru.jp/columns/shien-kikan-erabikata",
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
    script.id = "column-erabikata-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("column-erabikata-jsonld")?.remove();
      document.title = "ヤトエル｜特定技能・育成就労の登録支援機関データベース";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      {/* ヒーロー：結論先頭 */}
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <ArticleBreadcrumb
            articleTitle="登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法"
            articlePath="/columns/shien-kikan-erabikata"
            shortTitle="登録支援機関の選び方"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-amber-accent shrink-0" />
            登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            <strong>
              登録支援機関の委託料金は1人あたり月額1.5万〜4万円程度が目安（出入国在留管理庁の調査では平均約28,000円・約9割が3万円以下）で、選定時は登録番号の有効性・処分歴・対応言語・分野実績・所在地・料金内訳・再委託の有無の7項目を確認します。
            </strong>
            登録番号は入管庁の登録支援機関登録簿で無料で確認でき、金額は目安のため複数機関からの相見積をおすすめします。
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
        {/* 目次 */}
        <ArticleToc sections={TOC_SECTIONS} />

        {/* 前提：登録支援機関とは */}
        <section id="zentei" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">登録支援機関とは（30秒でわかる前提）</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              登録支援機関は、特定技能1号外国人を受け入れる企業から委託を受けて、
              <strong className="text-foreground">義務的支援10項目</strong>
              （事前ガイダンス、出入国時の送迎、住居確保・生活契約支援、生活オリエンテーション、公的手続等への同行、日本語学習機会の提供、相談・苦情対応、日本人との交流促進、転職支援、3か月に1回以上の定期面談）の実施を担う、出入国在留管理庁長官の登録を受けた機関です。支援の全部を登録支援機関に委託すると、受入れ企業は支援体制基準を満たしたものとみなされます。
            </p>
            <p>
              2026年7月9日時点で全国に11,448件が登録されており、料金・体制・得意分野は機関ごとに大きく異なります。この記事では、はじめて委託先を選ぶ企業の担当者向けに、料金の目安と選定時の確認項目を一次情報に基づいて整理します。
            </p>
          </div>
        </section>

        {/* 料金相場 */}
        <section id="ryokin" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand" />
            料金相場：月額の目安と内訳
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">費用項目</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">目安</th>
                    <th className="py-2.5 px-4 font-semibold">補足</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_ROWS.map((r) => (
                    <tr key={r.item} className="border-b last:border-0 align-top">
                      <td className="py-2.5 px-4 font-medium">{r.item}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground">{r.range}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              重要な原則として、
              <strong className="text-foreground">支援に要する費用は受入れ企業が負担すべきものであり、外国人本人に直接・間接を問わず負担させることはできません</strong>
              。また、上記はあくまで目安です。支援対象人数・対応言語・地域によって適正価格は変わるため、必ず複数の機関から相見積を取り、月額料金に含まれる支援項目の範囲を書面で比較してください。
            </p>
            <p className="text-xs">
              ※ ヤトエルでは料金・受付状況を実確認済みの機関から順次公開しています（確認日表示つき）。掲載の有無・掲載料は検索結果の並び順に影響しません。
            </p>
          </div>
        </section>

        {/* 7項目チェックリスト */}
        <section id="check7" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand" />
            契約前に確認すべき7項目
          </h2>
          <div className="space-y-3">
            {CHECK_ITEMS.map((c) => (
              <Card key={c.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {c.body}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 登録番号の確認方法 */}
        <section id="kakunin" className="scroll-mt-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-brand" />
            登録番号の確認方法（3ステップ）
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">ステップ1：</strong>
              委託候補の機関に登録番号（「19登-XXXXXX」等の形式）と登録年月日を確認します。名刺やウェブサイトに記載がない場合は直接尋ねてください。登録番号を答えられない場合は要注意です。
            </p>
            <p>
              <strong className="text-foreground">ステップ2：</strong>
              出入国在留管理庁の「登録支援機関登録簿」（随時更新）で、その登録番号・機関名が掲載されているかを照合します。登録簿には所在地・対応言語も記載されています。抹消された機関は登録簿から削除されるため、掲載がない場合は登録が失効している可能性があります。
            </p>
            <p>
              <strong className="text-foreground">ステップ3：</strong>
              出入国在留管理庁が公表する行政処分等の一覧に機関名がないかを確認します。
              <Link href="/search">
                <span className="text-brand hover:underline cursor-pointer">ヤトエルの検索ページ</span>
              </Link>
              では、登録簿掲載の全機関を地域・対応言語から絞り込め、処分歴の確認状況もタグで表示しているため、この照合作業を一度に行えます。
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
          <Card>
            <CardContent className="p-5 space-y-2 text-sm">
              <a
                href="https://www.moj.go.jp/isa/policies/ssw/supportssw.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「1号特定技能外国人支援・登録支援機関」
              </a>
              <a
                href="https://www.moj.go.jp/isa/applications/ssw/nyuukokukanri07_00205.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「登録支援機関登録簿」
              </a>
              <a
                href="https://www.moj.go.jp/isa/applications/ssw/surveys.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                出入国在留管理庁「特定技能制度における行政処分等」
              </a>
              <p className="text-xs text-muted-foreground pt-2">
                本記事の内容は{CONTENT_BASE_DATE}時点の一次情報に基づきます。料金は目安であり、個別の見積・契約条件は各機関にご確認ください。本記事は在留資格の可否判断を行うものではありません。個別の要件判断は行政書士等の専門家または出入国在留管理庁にご相談ください。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <Card className="bg-brand text-brand-foreground">
          <CardContent className="p-6 md:flex items-center justify-between gap-6">
            <div className="mb-4 md:mb-0">
              <h3 className="font-bold text-lg mb-1">条件に合う相見積先を今すぐ探せます</h3>
              <p className="text-sm text-brand-foreground/70 leading-relaxed">
                全国11,448件の登録支援機関から、地域・対応言語・分野で絞り込み。最大5機関への一括相談も無料です（営業電話なし・連絡は選んだ機関のみ）。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                className="bg-amber-accent text-brand hover:bg-amber-accent/90"
                onClick={() => setLocation("/search")}
              >
                <Search className="h-4 w-4 mr-1" />
                地域と言語で機関を絞り込む
              </Button>
              <Button
                variant="outline"
                className="border-brand-foreground/30 text-brand-foreground hover:bg-brand-foreground/10"
                onClick={() => setLocation("/diagnose")}
              >
                受入れ準備度をチェックする
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
