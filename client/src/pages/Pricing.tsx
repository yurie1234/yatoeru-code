import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, MailCheck, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const PLANS = [
  {
    key: "free" as const,
    name: "無料掲載",
    price: "0円",
    priceNote: "登録簿ベースの基本情報",
    features: [
      "登録簿情報の掲載（機関名・所在地・対応言語）",
      "検索結果への表示",
      "口コミの受付・表示",
    ],
    cta: null,
  },
  {
    key: "standard" as const,
    name: "スタンダード",
    price: "月額 30,000円",
    priceNote: "リード獲得を始めたい機関向け",
    features: [
      "無料掲載のすべて",
      "検索結果の優先表示（PRバッジ）",
      "相談リードの受領（都度課金なし）",
      "自社紹介文・強み・料金目安の掲載",
      "問い合わせ月次レポート",
    ],
    cta: "スタンダードで申し込む",
    highlight: false,
  },
  {
    key: "premium" as const,
    name: "プレミアム",
    price: "月額 80,000円",
    priceNote: "地域・分野で第一想起を取りたい機関向け",
    features: [
      "スタンダードのすべて",
      "地域×分野ページでの最上位表示",
      "AI診断の推奨機関枠への優先掲載",
      "専用ランディングページ作成",
      "四半期ごとの市場レポート提供",
    ],
    cta: "プレミアムで申し込む",
    highlight: true,
  },
];

export default function Pricing() {
  const [plan, setPlan] = useState<"standard" | "premium">("standard");
  const [orgName, setOrgName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const submit = trpc.orgs.submitPlanApplication.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: () => toast.error("送信に失敗しました。入力内容をご確認ください。"),
  });

  const selectPlan = (key: "standard" | "premium") => {
    setPlan(key);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentPrivacy) {
      toast.error("プライバシーポリシーへの同意が必要です。");
      return;
    }
    submit.mutate({
      orgName,
      regNo: regNo || undefined,
      contactName,
      email,
      phone: phone || undefined,
      plan,
      message: message || undefined,
      consentPrivacy: true,
    });
  };

  if (submitted) {
    return (
      <SiteLayout>
        <div className="container max-w-2xl py-20">
          <Card className="border-2 border-brand/20 text-center">
            <CardContent className="py-16">
              <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6">
                <MailCheck className="h-8 w-8 text-brand" />
              </div>
              <h1 className="text-2xl font-bold mb-4">お申し込みを受け付けました</h1>
              <p className="text-muted-foreground leading-relaxed">
                担当者より2営業日以内に、ご登録のメールアドレスへ掲載開始のご案内をお送りします。
              </p>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-16">
        <div className="container max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1 text-sm font-medium mb-4">
            <TrendingUp className="h-4 w-4 text-amber-accent" />
            登録支援機関・事業者様向け
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            「外国人を雇いたい企業」に、<br className="sm:hidden" />直接出会えるプラットフォーム
          </h1>
          <p className="text-brand-foreground/70 leading-relaxed">
            ヤトエルにはAI受入診断を通じて、受入意欲の高い企業からの相談が集まります。<br />
            貴機関の強みを掲載し、確度の高いリードを獲得しませんか。
          </p>
        </div>
      </div>

      <div className="container py-16">
        {/* プラン比較 */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {PLANS.map((p) => (
            <Card
              key={p.key}
              className={`relative flex flex-col ${p.highlight ? "border-amber-accent border-2 shadow-lg" : ""}`}
            >
              {p.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-accent text-brand hover:bg-amber-accent">
                  おすすめ
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <div className="text-3xl font-black mt-2">{p.price}</div>
                <p className="text-xs text-muted-foreground">{p.priceNote}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2.5 text-sm flex-1 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {p.cta ? (
                  <Button
                    className={p.highlight ? "bg-amber-accent text-brand font-bold hover:bg-amber-accent/90" : ""}
                    variant={p.highlight ? "default" : "outline"}
                    onClick={() => selectPlan(p.key as "standard" | "premium")}
                  >
                    {p.cta}
                  </Button>
                ) : (
                  <Button variant="ghost" disabled>
                    申込不要（自動掲載）
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 申込フォーム */}
        <div ref={formRef} className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">有料プランお申し込み</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>選択プラン</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["standard", "premium"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPlan(key)}
                        className={`rounded-lg border-2 p-4 text-left transition-colors ${
                          plan === key ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"
                        }`}
                      >
                        <div className="font-bold text-sm">{key === "standard" ? "スタンダード" : "プレミアム"}</div>
                        <div className="text-xs text-muted-foreground">
                          {key === "standard" ? "月額30,000円" : "月額80,000円"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="orgName">機関名 <span className="text-destructive">*</span></Label>
                    <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="株式会社〇〇サポート" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regNo">登録番号（任意）</Label>
                    <Input id="regNo" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="19登-000000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">ご担当者名 <span className="text-destructive">*</span></Label>
                    <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required placeholder="山田 太郎" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス <span className="text-destructive">*</span></Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="info@example.co.jp" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">電話番号（任意）</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03-1234-5678" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">ご質問・ご要望（任意）</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="掲載内容や請求方法についてのご質問など" />
                </div>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentPrivacy}
                      onCheckedChange={(v) => setConsentPrivacy(v === true)}
                      className="mt-0.5"
                      aria-label="プライバシーポリシーへの同意"
                    />
                    <span className="text-sm leading-relaxed">
                      <Link href="/privacy">
                        <span className="text-brand underline hover:no-underline">プライバシーポリシー</span>
                      </Link>
                      に同意します。<span className="text-destructive">＊必須</span>
                    </span>
                  </label>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                  disabled={submit.isPending || !consentPrivacy}
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />送信中…
                    </>
                  ) : (
                    "申し込む"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  お申し込み後、担当者より掲載開始のご案内をお送りします。掲載開始まで費用は発生しません。
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
