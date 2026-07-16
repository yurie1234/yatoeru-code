import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2, ChevronRight, Globe2, Search, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const HOME_FAQS = [
  {
    q: "登録支援機関とは何ですか？",
    a: "特定技能1号外国人を雇用する企業に代わって、住居確保・生活オリエンテーション・相談対応などの義務的支援を実施する、出入国在留管理庁登録の機関です。全国に約11,000件以上存在します。",
  },
  {
    q: "支援委託の費用相場はどのくらいですか？",
    a: "目安として、1人あたり月額2万円〜3万円程度の支援委託費に加え、初期費用（登録支援・申請書類作成等）が10万円〜30万円程度かかることが一般的です。機関・地域・分野により差があるため、複数社の相見積もりを推奨します。",
  },
  {
    q: "ヤトエルの利用に費用はかかりますか？",
    a: "企業様のご利用は完全無料です。外国人雇用の準備度チェック、支援機関の検索・比較、最大5社への一括相談、提案書草案の生成まで、仲介手数料は一切発生しません。",
  },
  {
    q: "育成就労制度とは何ですか？",
    a: "技能実習制度に代わり2027年に施行予定の新制度で、原則3年で特定技能1号水準の人材に育成することを目的とします。育成就労から特定技能への移行が前提となるため、支援機関選びの重要性はさらに高まります。",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const { data: stats } = trpc.stats.overview.useQuery();

  const handleDiagnose = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      setLocation(`/diagnose?url=${encodeURIComponent(url)}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword) {
      setLocation(`/search?keyword=${encodeURIComponent(keyword)}`);
    } else {
      setLocation("/search");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="h-6 w-6 text-brand" />
            <span className="text-xl font-bold tracking-tight text-foreground">ヤトエル</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">支援機関を探す</Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">ヤトエルとは</Link>
            <Link href="/diagnose" className="text-muted-foreground hover:text-foreground transition-colors">支援機関マッチ診断</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="hidden sm:flex" onClick={() => setLocation("/search")}>
              条件から探す
            </Button>
            <Button onClick={() => document.getElementById('diagnose-section')?.scrollIntoView({ behavior: 'smooth' })}>
              無料診断
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-brand text-brand-foreground py-20 md:py-32">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-brand/80 to-brand"></div>
          <div className="container relative z-10 flex flex-col items-center text-center fade-up">
            <div className="inline-flex items-center rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1 text-sm font-medium mb-8">
              <span className="flex h-2 w-2 rounded-full bg-amber-accent mr-2"></span>
              特定技能・育成就労の支援機関データベース
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
              外国人雇用の<br className="md:hidden" />「最適解」が見つかる
            </h1>
            <p className="text-lg md:text-xl text-brand-foreground/80 max-w-2xl mb-10 leading-relaxed">
              全国{stats?.total ? stats.total.toLocaleString() : "11,000"}件超の登録支援機関から、<br className="hidden md:block" />
              あなたの会社の業種・地域・予算に合った最適なパートナーを比較・一括相談。
            </p>

            {/* URL Diagnose Form */}
            <div id="diagnose-section" className="w-full max-w-xl bg-background rounded-2xl p-2 shadow-2xl fade-up-1">
              <form onSubmit={handleDiagnose} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    type="url" 
                    placeholder="自社のURLを入力して無料診断をはじめる" 
                    className="pl-10 h-14 text-base border-0 focus-visible:ring-0 bg-transparent text-foreground"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8 bg-amber-accent text-brand font-bold hover:bg-amber-accent/90">
                  無料で診断する
                </Button>
              </form>
            </div>
            <p className="text-sm text-brand-foreground/60 mt-4 fade-up-2">
              ※URLから業種を解析し、特定技能の該当分野の目安・概算コスト・条件に合う支援機関を整理します（在留資格の可否判断ではありません）
            </p>
          </div>
        </section>

        {/* Stats & Trust Section */}
        <section className="py-12 border-b bg-muted/30">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Building2 className="h-8 w-8 text-brand mb-2" />
                <div className="text-3xl font-bold text-foreground">{stats?.total ? stats.total.toLocaleString() : "---"}</div>
                <div className="text-sm text-muted-foreground">掲載支援機関数</div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2">
                <Users className="h-8 w-8 text-brand mb-2" />
                <div className="text-3xl font-bold text-foreground">19</div>
                <div className="text-sm text-muted-foreground">対応特定技能分野</div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2">
                <Globe2 className="h-8 w-8 text-brand mb-2" />
                <div className="text-3xl font-bold text-foreground">47</div>
                <div className="text-sm text-muted-foreground">対応都道府県</div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2">
                <ShieldCheck className="h-8 w-8 text-brand mb-2" />
                <div className="text-3xl font-bold text-foreground">無料</div>
                <div className="text-sm text-muted-foreground">チェック・一括相談</div>
              </div>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="py-20">
          <div className="container max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">条件から支援機関を探す</h2>
              <p className="text-muted-foreground">対応言語、特定技能分野、地域などから最適な支援機関を検索できます。</p>
            </div>

            <Card className="border-2 shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="支援機関名、地域、対応言語などで検索" 
                      className="pl-10 h-12 text-base"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-12 px-8">
                    検索する
                  </Button>
                </form>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setLocation("/search?field=介護")}>
                    <span className="font-medium">介護分野</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setLocation("/search?field=建設")}>
                    <span className="font-medium">建設分野</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setLocation("/search?field=外食業")}>
                    <span className="font-medium">外食業分野</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setLocation("/search?language=ベトナム語")}>
                    <span className="font-medium">ベトナム語対応</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">ヤトエルが選ばれる理由</h2>
              <p className="text-muted-foreground">外国人雇用を検討する企業様を、AIとデータで強力にサポートします。</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-background border-none shadow-md">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                    <Globe2 className="h-6 w-6 text-brand" />
                  </div>
                  <CardTitle className="text-xl">外国人雇用の準備度チェック</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  自社のURLを入力するだけで、AIが業種を解析。特定技能のどの分野に該当しそうか、概算コストはいくらかを整理し、支援機関選びの条件を明確にします。
                </CardContent>
              </Card>

              <Card className="bg-background border-none shadow-md">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-brand" />
                  </div>
                  <CardTitle className="text-xl">網羅的なデータベース</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  出入国在留管理庁の登録簿データをベースに、全国11,000件以上の支援機関を掲載。対応言語や処分歴の有無で検索でき、料金・受付状況は実確認済みの機関から順次公開しています。
                </CardContent>
              </Card>

              <Card className="bg-background border-none shadow-md">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-brand" />
                  </div>
                  <CardTitle className="text-xl">最大5社への一括相談</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  条件に合う支援機関を見つけたら、最大5社まで同時に無料相談が可能。相見積もりを取り、最適なパートナーを選べます。
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20">
          <div className="container max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">よくあるご質問</h2>
              <p className="text-muted-foreground">外国人雇用・特定技能制度について、よくいただくご質問にお答えします。</p>
            </div>
            <div className="space-y-4">
              {HOME_FAQS.map((f) => (
                <Card key={f.q}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                      {f.q}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed pl-13">
                    {f.a}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </main>

      {/* Footer */}
      <footer className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Globe2 className="h-6 w-6 text-amber-accent" />
                <span className="text-xl font-bold tracking-tight">ヤトエル</span>
              </div>
              <p className="text-brand-foreground/70 max-w-sm">
                特定技能・育成就労の支援機関データベース。<br />
                外国人雇用の「最適解」を見つけるためのプラットフォームです。
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">サービス</h3>
              <ul className="space-y-2 text-brand-foreground/70">
                <li><Link href="/search" className="hover:text-amber-accent transition-colors">支援機関を探す</Link></li>
                <li><Link href="/diagnose" className="hover:text-amber-accent transition-colors">支援機関マッチ診断</Link></li>
                
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">運営</h3>
              <ul className="space-y-2 text-brand-foreground/70">
                <li><Link href="/about" className="hover:text-amber-accent transition-colors">運営会社</Link></li>
                <li><Link href="/terms" className="hover:text-amber-accent transition-colors">利用規約</Link></li>
                <li><Link href="/privacy" className="hover:text-amber-accent transition-colors">プライバシーポリシー</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-brand-foreground/20 pt-8 text-center text-brand-foreground/50 text-sm">
            &copy; {new Date().getFullYear()} ヤトエル All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
