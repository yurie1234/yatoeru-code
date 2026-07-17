import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { HEADCOUNT_OPTIONS, TOKUTEI_FIELDS } from "@shared/tokutei";
import { ArrowRight, Check, Copy, FileText, Loader2, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation, useSearch } from "wouter";

/** フィルター・入力の強調スタイル（サイト共通：ネイビー×ゴールドの世界観を保った目立たせ方） */
export const FILTER_ACCENT_CLASS =
  "border-brand/40 bg-brand/5 hover:bg-brand/10 font-medium text-foreground shadow-sm";

export default function Proposal() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const diagnosisIdParam = params.get("diagnosisId");
  const diagnosisId = diagnosisIdParam ? parseInt(diagnosisIdParam, 10) : NaN;

  const [companyName, setCompanyName] = useState(params.get("companyName") ?? "");
  const [field, setField] = useState(params.get("field") || TOKUTEI_FIELDS[0]);
  // 受入予定人数は必ずユーザー自身に選択してもらう（選択と同時に生成開始するため初期値は未選択）
  const [headcount, setHeadcount] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = trpc.orgs.generateProposal.useMutation({
    onError: () => toast.error("提案書の生成に失敗しました。再度お試しください。"),
  });

  /** 人数を選択した時点で自動的に生成を開始する */
  const handleHeadcountSelect = (value: string) => {
    setHeadcount(value);
    if (generate.isPending) return;
    if (isNaN(diagnosisId)) {
      toast.error("先に準備度チェックを実施してください。チェック結果から提案書を作成できます。");
      return;
    }
    if (!companyName.trim()) {
      toast.error("会社名を入力してから人数を選択してください。");
      return;
    }
    generate.mutate({ diagnosisId, companyName, field, headcount: value });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(diagnosisId)) {
      toast.error("先に準備度チェックを実施してください。チェック結果から提案書を作成できます。");
      return;
    }
    if (!headcount) {
      toast.error("受入予定人数を選択してください。選択すると作成が始まります。");
      return;
    }
    generate.mutate({ diagnosisId, companyName, field, headcount });
  };

  const handleCopy = async () => {
    if (!generate.data?.content) return;
    await navigator.clipboard.writeText(generate.data.content);
    setCopied(true);
    toast.success("提案書をコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1 text-sm font-medium mb-4">
            <FileText className="h-4 w-4 text-amber-accent" />
            社内稟議用ドキュメント（無料）
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">特定技能導入提案書をAIが自動作成</h1>
          <p className="text-brand-foreground/70">
            「上司にどう説明すればいいか分からない」を解決。準備度チェックの結果をもとに、7〜8割完成した稟議用の草案を生成します。
          </p>
        </div>
      </div>

      <div className="container max-w-3xl py-10">
        {/* 入力フォーム */}
        {!generate.data && (
          <Card className="mb-8">
            <CardContent className="p-6">
              {isNaN(diagnosisId) && (
                <div className="rounded-lg bg-muted/50 border border-dashed p-4 mb-6 text-sm text-muted-foreground">
                  提案書の作成には、先に
                  <Button variant="link" className="px-1 h-auto" onClick={() => setLocation("/diagnose")}>
                    準備度チェック
                  </Button>
                  の実施が必要です。チェック結果ページから遷移すると、内容が自動入力されます。
                </div>
              )}
              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="companyName">会社名</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="株式会社〇〇"
                    disabled={generate.isPending}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>受入予定の特定技能分野</Label>
                    <Select value={field} onValueChange={setField} disabled={generate.isPending}>
                      <SelectTrigger className={FILTER_ACCENT_CLASS}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOKUTEI_FIELDS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-700 font-semibold flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      受入予定人数（選択すると作成開始）
                    </Label>
                    <Select value={headcount} onValueChange={handleHeadcountSelect} disabled={generate.isPending}>
                      <SelectTrigger
                        className={
                          headcount
                            ? "border-2 border-amber-accent bg-amber-accent/15 font-semibold shadow-sm"
                            : "border-2 border-amber-accent bg-amber-accent/25 font-semibold shadow-md ring-2 ring-amber-accent/30 animate-pulse-subtle"
                        }
                      >
                        <SelectValue placeholder="人数を選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {HEADCOUNT_OPTIONS.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                  disabled={generate.isPending || isNaN(diagnosisId) || !headcount}
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      AIが提案書を作成中…（30秒ほどかかります）
                    </>
                  ) : !headcount ? (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      受入予定人数を選択すると自動で作成が始まります
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      提案書を生成する（無料）
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 生成中 */}
        {generate.isPending && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-brand mx-auto mb-4" />
              <p className="font-medium mb-1">AIが提案書を作成しています…</p>
              <p className="text-sm text-muted-foreground">御社の情報をもとに、稟議に使える構成で執筆中です。</p>
            </CardContent>
          </Card>
        )}

        {/* 生成結果 */}
        {generate.data && !generate.isPending && (
          <div className="space-y-6 fade-up">
            <Card className="border-2 border-brand/20">
              <div className="bg-brand text-brand-foreground px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold">特定技能導入提案書（草案）</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "コピー済み" : "全文コピー"}
                </Button>
              </div>
              <CardContent className="p-6 md:p-8 prose prose-sm max-w-none dark:prose-invert">
                <Streamdown>{generate.data.content}</Streamdown>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              ※本提案書はAIによる草案です。数値・制度情報は必ず最新の公式情報をご確認のうえ、貴社の状況に合わせて修正してご利用ください。
            </p>

            {/* コピー後のCTA：一括相談へ */}
            <Card className="border-amber-accent border-2 bg-amber-accent/5">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold mb-1">提案が通ったら、次は支援機関選びです</h3>
                  <p className="text-sm text-muted-foreground">
                    御社の条件に合う支援機関に、最大5社まで無料で一括相談できます。
                  </p>
                </div>
                <Button
                  className="bg-amber-accent text-brand font-bold hover:bg-amber-accent/90 shrink-0"
                  onClick={() =>
                    setLocation(
                      `/search?field=${encodeURIComponent(field)}`
                    )
                  }
                >
                  支援機関を探す
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
