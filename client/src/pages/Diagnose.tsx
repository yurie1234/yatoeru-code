import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, FileText, Globe2, Loader2, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useSearch } from "wouter";

const LOADING_STEPS = [
  "Webサイトの内容を取得しています…",
  "AIが業種・事業内容を解析しています…",
  "特定技能12分野との適合を判定しています…",
  "受入可能枠と概算コストを算出しています…",
  "適合する支援機関を検索しています…",
];

type DiagnosisResult = {
  companyName: string;
  industry: string;
  field: string | null;
  headcount: string;
  cost: string;
  score: number;
  reason: string;
};

export default function Diagnose() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const [url, setUrl] = useState(params.get("url") ?? "");
  const [stepIndex, setStepIndex] = useState(0);
  const autoStarted = useRef(false);

  const diagnose = trpc.orgs.diagnoseUrl.useMutation({
    onError: (err) => {
      toast.error("診断に失敗しました。URLをご確認のうえ再度お試しください。");
      console.error(err);
    },
  });

  // ローディング演出のステップ進行
  useEffect(() => {
    if (!diagnose.isPending) return;
    setStepIndex(0);
    const timer = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(timer);
  }, [diagnose.isPending]);

  // URLパラメータ付きで遷移してきた場合は自動診断
  useEffect(() => {
    const urlParam = params.get("url");
    if (urlParam && !autoStarted.current) {
      autoStarted.current = true;
      diagnose.mutate({ url: urlParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    let normalized = url.trim();
    if (!/^https?:\/\//.test(normalized)) normalized = `https://${normalized}`;
    diagnose.mutate({ url: normalized });
  };

  const result = diagnose.data?.result as DiagnosisResult | undefined;
  const recommendedOrgs = diagnose.data?.recommendedOrgs;
  const diagnosisId = diagnose.data?.diagnosisId;

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4 text-amber-accent" />
            AI受入可能性診断（無料）
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">会社URLを入れるだけ。<br className="sm:hidden" />30秒で受入可能性がわかる</h1>
          <p className="text-brand-foreground/70 mb-8">
            AIが業種を解析し、特定技能の該当分野・受入可能枠・概算コスト・適合スコアを即時判定します。
          </p>
          <form onSubmit={handleSubmit} className="bg-background rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="例：example.co.jp"
                className="pl-10 h-13 text-base border-0 focus-visible:ring-0 bg-transparent text-foreground"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" disabled={diagnose.isPending} className="h-13 px-8 bg-amber-accent text-brand font-bold hover:bg-amber-accent/90">
              {diagnose.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "診断する"}
            </Button>
          </form>
        </div>
      </div>

      <div className="container max-w-3xl py-12">
        {/* ローディング演出 */}
        {diagnose.isPending && (
          <Card className="border-2">
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-brand animate-pulse" />
                  </div>
                </div>
                <Progress value={((stepIndex + 1) / LOADING_STEPS.length) * 100} className="max-w-sm mb-6" />
                <div className="space-y-2">
                  {LOADING_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`flex items-center gap-2 text-sm transition-opacity ${
                        i < stepIndex ? "text-muted-foreground opacity-60" : i === stepIndex ? "text-foreground font-medium" : "opacity-30"
                      }`}
                    >
                      {i < stepIndex ? (
                        <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                      ) : i === stepIndex ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border shrink-0" />
                      )}
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 診断結果 */}
        {result && !diagnose.isPending && (
          <div className="space-y-8 fade-up">
            <Card className="border-2 border-brand/20 overflow-hidden">
              <div className="bg-brand text-brand-foreground px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold text-lg">診断結果</h2>
                <span className="text-sm text-brand-foreground/70">{result.companyName}</span>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
                  <div className="relative flex items-center justify-center h-36 w-36 shrink-0">
                    <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" strokeWidth="12" />
                      <circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke={result.score >= 70 ? "var(--amber-accent)" : result.score >= 40 ? "var(--brand)" : "var(--muted-foreground)"}
                        strokeWidth="12"
                        strokeDasharray={`${(result.score / 100) * 326.7} 326.7`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black">{result.score}</span>
                      <span className="text-xs text-muted-foreground">適合スコア</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground mb-1">推定業種</div>
                        <div className="font-bold">{result.industry}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground mb-1">該当する特定技能分野</div>
                        <div className="font-bold">{result.field ?? "該当分野なし"}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground mb-1">想定受入可能枠</div>
                        <div className="font-bold">{result.headcount}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground mb-1">概算コスト</div>
                        <div className="font-bold">{result.cost}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4 text-sm leading-relaxed">
                  <span className="font-bold text-brand">診断コメント：</span>
                  {result.reason}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  ※本診断はWebサイトの公開情報に基づくAIによる推定であり、受入可否を保証するものではありません。正確な判断は支援機関・行政書士等の専門家にご確認ください。
                </p>
              </CardContent>
            </Card>

            {/* 提案書生成CTA */}
            {result.field && diagnosisId && (
              <Card className="border-dashed border-2">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-8 w-8 text-brand shrink-0" />
                    <div>
                      <h3 className="font-bold">社内稟議用「特定技能導入提案書」をAIが自動作成</h3>
                      <p className="text-sm text-muted-foreground">診断結果をもとに、上司への説明に使える提案書草案を無料生成します。</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0"
                    onClick={() =>
                      setLocation(
                        `/proposal?diagnosisId=${diagnosisId}&companyName=${encodeURIComponent(result.companyName)}&field=${encodeURIComponent(result.field ?? "")}&headcount=${encodeURIComponent(result.headcount)}`
                      )
                    }
                  >
                    提案書を作成する
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 推奨支援機関 */}
            {recommendedOrgs && recommendedOrgs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">あなたの会社に適合する支援機関</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  診断結果に基づき、適合度の高い支援機関を表示しています。最大5社に一括相談できます。
                </p>
                <div className="space-y-4">
                  {recommendedOrgs.map((org) => (
                    <Card key={org.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 md:p-6 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {org.plan === "paid" && <Badge className="bg-amber-accent text-brand hover:bg-amber-accent">PR</Badge>}
                            {org.hasPenalty && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />処分歴あり
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{org.regNo}</span>
                          </div>
                          <Link href={`/org/${org.id}`}>
                            <h3 className="font-bold hover:text-brand hover:underline truncate">{org.name}</h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{org.address ?? "住所情報なし"}</span>
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setLocation(`/org/${org.id}`)}>
                          詳細
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button
                    size="lg"
                    className="bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                    onClick={() =>
                      setLocation(
                        `/consult?orgIds=${recommendedOrgs.slice(0, 5).map((o) => o.id).join(",")}&diagnosisId=${diagnosisId ?? ""}&companyName=${encodeURIComponent(result.companyName)}&field=${encodeURIComponent(result.field ?? "")}&headcount=${encodeURIComponent(result.headcount)}`
                      )
                    }
                  >
                    表示中の支援機関に一括相談する（無料）
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 初期状態の説明 */}
        {!diagnose.isPending && !result && (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Globe2, title: "1. URLを入力", desc: "自社WebサイトのURLを入力するだけ。会員登録は不要です。" },
              { icon: Sparkles, title: "2. AIが解析", desc: "業種・事業内容から特定技能12分野との適合をAIが判定します。" },
              { icon: Building2, title: "3. 支援機関を紹介", desc: "適合スコアと概算コストと合わせて、最適な支援機関を提示します。" },
            ].map((item, i) => (
              <Card key={item.title} className={`fade-up-${i + 1} fade-up`}>
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center mb-2">
                    <item.icon className="h-5 w-5 text-brand" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.desc}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
