import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { FILTER_ACCENT_CLASS } from "@/pages/Proposal";
import { JOSEIKIN_DISCLAIMER, matchJoseikin } from "@shared/joseikin";
import { HEADCOUNT_OPTIONS, MAJOR_LANGUAGES, PREFECTURES, TOKUTEI_FIELDS } from "@shared/tokutei";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, CheckCircle2, Coins, ExternalLink, FileText, Globe2, Languages, Loader2, MapPin, Search as SearchIcon, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useSearch } from "wouter";

const ALL = "__all__";

/** 受入れ時期の選択肢 */
const TIMING_OPTIONS = ["できるだけ早く", "3ヶ月以内", "半年以内", "1年以内", "情報収集中"] as const;

/** ウィザードの回答状態 */
type WizardAnswers = {
  field: string | null;
  prefecture: string | null;
  headcount: string | null;
  timing: string | null;
  jisshuExperience: boolean | null;
};

const LOADING_STEPS = [
  "Webサイトの内容を取得しています…",
  "AIが業種・事業内容を解析しています…",
  "特定技能19分野との適合の目安を整理しています…",
  "想定人数と概算コストを算出しています…",
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
  prefecture?: string | null;
};

/**
 * デモ用の架空企業サンプル結果（/diagnose?demo=1 で表示）。
 * 運用ルール：実在企業の診断結果はマーケ素材・デモ・SNSに使わない。
 * デモ・スクショ撮影には必ずこの架空企業サンプルを使うこと。
 */
const DEMO_RESULT: DiagnosisResult = {
  companyName: "桜川食堂（架空のサンプル企業）",
  industry: "飲食店（和食レストラン運営）",
  field: "外食業",
  headcount: "2〜3名",
  cost: "初年度 約60〜100万円/名（登録支援機関委託費・在留諸手続含む目安）",
  score: 85,
  reason:
    "これは架空企業によるデモ用サンプルです。飲食店運営は特定技能「外食業」分野の対象となり得ます。接客・調理補助の人手確保に特定技能制度の活用余地が大きく、受入れ体制の整備（雇用条件の明確化・支援体制の確保）から始めるのが良いでしょう。※本診断は情報整理目的であり在留資格の可否判断ではありません。",
  prefecture: "京都府",
};

/** 入力文字列がURLらしいか（ドットを含み空白なし） */
function looksLikeUrl(v: string): boolean {
  const t = v.trim();
  return /^https?:\/\//.test(t) || (t.includes(".") && !/\s/.test(t) && /[a-zA-Z]/.test(t));
}

export default function Diagnose() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const [url, setUrl] = useState(params.get("url") ?? "");
  const [stepIndex, setStepIndex] = useState(0);
  const autoStarted = useRef(false);

  // ===== ウィザード（1問1ページ） =====
  // phase: idle（入口）→ analyzing（AI解析中）→ questions（質問1〜6）→ done（結果表示）
  const [phase, setPhase] = useState<"idle" | "analyzing" | "questions" | "done">("idle");
  const [qStep, setQStep] = useState(0); // 0=分野 1=都道府県 2=人数 3=時期 4=実習経験 5=連絡先（任意）
  const [answers, setAnswers] = useState<WizardAnswers>({ field: null, prefecture: null, headcount: null, timing: null, jisshuExperience: null });
  const [contactCompany, setContactCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const QUESTION_COUNT = 6;

  const diagnose = trpc.orgs.diagnoseUrl.useMutation({
    onError: (err) => {
      toast.error("診断に失敗しました。入力内容をご確認のうえ再度お試しください。");
      console.error(err);
      setPhase("idle");
    },
    onSuccess: (data) => {
      // 解析完了→読み取った内容をプリフィルして質問フェーズへ
      const r = data.result as DiagnosisResult;
      setAnswers((prev) => ({
        ...prev,
        field: prev.field ?? (r.field && (TOKUTEI_FIELDS as readonly string[]).includes(r.field) ? r.field : null),
        prefecture: prev.prefecture ?? (r.prefecture && (PREFECTURES as readonly string[]).includes(r.prefecture) ? r.prefecture : null),
      }));
      setPhase((p) => (p === "analyzing" ? "questions" : "done"));
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

  const isDemo = params.get("demo") === "1";

  // URL/会社名パラメータ付きで遷移してきた場合は自動で解析開始（?url=は旧リンク互換、?q=は会社名/URL自動判定）
  useEffect(() => {
    if (isDemo) return; // デモモード中は自動診断しない
    const urlParam = params.get("url");
    const qParam = params.get("q");
    if ((urlParam || qParam) && !autoStarted.current) {
      autoStarted.current = true;
      const input = (urlParam || qParam || "").trim();
      setUrl(input);
      setPhase("analyzing");
      if (urlParam || looksLikeUrl(input)) {
        let normalized = input;
        if (!/^https?:\/\//.test(normalized)) normalized = `https://${normalized}`;
        diagnose.mutate({ url: normalized });
      } else {
        diagnose.mutate({ companyName: input });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // 入口：URLまたは会社名を1項目で受け付け、AI解析へ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setPhase("analyzing");
    if (looksLikeUrl(url)) {
      let normalized = url.trim();
      if (!/^https?:\/\//.test(normalized)) normalized = `https://${normalized}`;
      diagnose.mutate({ url: normalized });
    } else {
      diagnose.mutate({ companyName: url.trim() });
    }
  };

  // 質問完了：回答を反映した最終診断を再実行（answers付きで再診断し、機関候補も回答条件で取得）
  const finishQuestions = () => {
    // 連絡先は任意。入力があれば/consultプリフィル用にsessionStorageに保存
    if (contactCompany || contactEmail) {
      try {
        sessionStorage.setItem("yatoeru_contact", JSON.stringify({ company: contactCompany, email: contactEmail }));
      } catch { /* 保存失敗は無視 */ }
    }
    setPhase("done");
    const base = looksLikeUrl(url)
      ? { url: /^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}` }
      : { companyName: url.trim() || (diagnose.data?.result as DiagnosisResult | undefined)?.companyName || "不明" };
    diagnose.mutate({ ...base, answers });
  };

  const result = isDemo ? DEMO_RESULT : (diagnose.data?.result as DiagnosisResult | undefined);
  const recommendedOrgs = isDemo ? undefined : diagnose.data?.recommendedOrgs;
  const diagnosisId = isDemo ? undefined : diagnose.data?.diagnosisId;

  // 助成金候補（クライアント側で共有ロジックを実行）
  const joseikinCandidates = useMemo(() => {
    if (!result || phase !== "done") return [];
    return matchJoseikin({
      field: answers.field ?? result.field,
      prefecture: answers.prefecture ?? result.prefecture ?? null,
      headcount: answers.headcount ?? result.headcount ?? null,
      hasJisshuExperience: answers.jisshuExperience,
    });
  }, [result, phase, answers]);

  // 人数連動の費用レンジ（初期10〜30万円＋月額2〜4万円/人×人数）
  const costRange = useMemo(() => {
    const hc = answers.headcount;
    const mid: Record<string, number> = { "1〜2名": 2, "3〜5名": 4, "6〜10名": 8, "11名以上": 11, 未定: 1 };
    const n = hc && mid[hc] ? mid[hc] : null;
    if (!n) return null;
    return {
      headcount: hc,
      initial: "10〜30万円",
      monthly: `${(n * 2).toLocaleString()}〜${(n * 4).toLocaleString()}万円/月（${n}名換算）`,
      yearly: `年間目安 ${(10 + n * 2 * 12).toLocaleString()}〜${(30 + n * 4 * 12).toLocaleString()}万円`,
    };
  }, [answers.headcount]);

  // ===== 適合支援機関のフィルター =====
  // 初期値：分野＝診断で読み取った分野、都道府県＝会社URLから読み取った本社所在地、言語＝英語
  // キーワード検索欄はユーザー要望により削除済み（都道府県・言語・分野のみ）
  const [orgPrefecture, setOrgPrefecture] = useState<string>(ALL);
  const [orgLanguage, setOrgLanguage] = useState<string>("英語");
  const [orgField, setOrgField] = useState<string>(ALL);
  const [filterTouched, setFilterTouched] = useState(false);

  // 診断完了時にフィルター初期値を診断結果から設定
  const resultKey = result ? `${result.companyName}|${result.field}|${result.prefecture}` : null;
  useEffect(() => {
    if (!result) return;
    setOrgField(result.field && (TOKUTEI_FIELDS as readonly string[]).includes(result.field) ? result.field : ALL);
    setOrgPrefecture(result.prefecture && (PREFECTURES as readonly string[]).includes(result.prefecture) ? result.prefecture : ALL);
    setOrgLanguage("英語");
    setFilterTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey]);

  // フィルター操作後は検索APIで再取得（親和性スコア順）。初期表示は診断APIの推奨5件をそのまま使用。
  const filteredQuery = trpc.orgs.search.useQuery(
    {

      prefecture: orgPrefecture !== ALL ? orgPrefecture : undefined,
      language: orgLanguage !== ALL ? orgLanguage : undefined,
      field: orgField !== ALL ? orgField : undefined,
      page: 1,
      limit: 5,
      sort: "affinity",
    },
    { enabled: Boolean(result) && !isDemo && filterTouched }
  );

  const displayOrgs = filterTouched ? filteredQuery.data?.items : recommendedOrgs;
  const orgsLoading = filterTouched && filteredQuery.isLoading;
  const touch = () => setFilterTouched(true);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4 text-amber-accent" />
            会社名かURLを入れるだけ。1問ずつ簡単回答
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">外国人採用の費用・助成金・<br className="sm:hidden" />支援機関をまとめて無料診断</h1>
          <p className="text-brand-foreground/70 mb-8">
            業種を解析し、特定技能の該当分野の目安・概算費用・使える可能性のある助成金候補を整理し、条件に合う支援機関をご案内します。※在留資格の可否判断ではありません
          </p>
          {phase === "idle" && (
            <form onSubmit={handleSubmit} className="bg-background rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="会社名またはURL（例：example.co.jp）"
                  className="pl-10 h-13 text-base border-0 focus-visible:ring-0 bg-transparent text-foreground"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" size="lg" disabled={diagnose.isPending} className="h-13 px-8 bg-amber-accent text-brand font-bold hover:bg-amber-accent/90">
                {diagnose.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "無料で診断する"}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="container max-w-3xl py-12">
        {/* 質問ウィザード（1問1ページ） */}
        {phase === "questions" && !diagnose.isPending && (
          <Card className="border-2 border-brand/20">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">質問 {qStep + 1} / {QUESTION_COUNT}</span>
                {qStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setQStep((s) => s - 1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />戻る
                  </Button>
                )}
              </div>
              <Progress value={((qStep + 1) / QUESTION_COUNT) * 100} className="mb-6" />

              {qStep === 0 && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-1">受け入れを検討している分野はどれですか？</h2>
                  {answers.field && (
                    <p className="text-sm text-muted-foreground mb-3">
                      <Sparkles className="inline h-3.5 w-3.5 text-amber-accent mr-1" />
                      AIが御社の情報から「{answers.field}」と読み取りました。違う場合は選び直してください。
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    {TOKUTEI_FIELDS.map((f) => (
                      <Button
                        key={f}
                        variant={answers.field === f ? "default" : "outline"}
                        className={answers.field === f ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                        onClick={() => { setAnswers((a) => ({ ...a, field: f })); setQStep(1); }}
                      >
                        {f}
                      </Button>
                    ))}
                    <Button
                      variant={answers.field === null ? "secondary" : "outline"}
                      className="col-span-2 sm:col-span-3"
                      onClick={() => { setAnswers((a) => ({ ...a, field: null })); setQStep(1); }}
                    >
                      該当なし・わからない（あとで相談で確認）
                    </Button>
                  </div>
                </div>
              )}

              {qStep === 1 && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-1">受け入れ予定の勤務地（都道府県）は？</h2>
                  {answers.prefecture && (
                    <p className="text-sm text-muted-foreground mb-3">
                      <Sparkles className="inline h-3.5 w-3.5 text-amber-accent mr-1" />
                      AIが「{answers.prefecture}」と読み取りました。違う場合は選び直してください。
                    </p>
                  )}
                  <div className="mt-4 max-w-sm">
                    <Select
                      value={answers.prefecture ?? ""}
                      onValueChange={(v) => { setAnswers((a) => ({ ...a, prefecture: v })); setQStep(2); }}
                    >
                      <SelectTrigger className={FILTER_ACCENT_CLASS}>
                        <MapPin className="h-4 w-4 mr-1 text-brand" />
                        <SelectValue placeholder="都道府県を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFECTURES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 mt-3">
                      {answers.prefecture && (
                        <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setQStep(2)}>
                          {answers.prefecture}で次へ
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setAnswers((a) => ({ ...a, prefecture: null })); setQStep(2); }}>
                        未定・スキップする
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {qStep === 2 && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-4">受け入れ予定人数は？</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HEADCOUNT_OPTIONS.map((h) => (
                      <Button
                        key={h}
                        variant={answers.headcount === h ? "default" : "outline"}
                        className={answers.headcount === h ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                        onClick={() => { setAnswers((a) => ({ ...a, headcount: h })); setQStep(3); }}
                      >
                        {h}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">人数に応じて概算費用を自動計算します。</p>
                </div>
              )}

              {qStep === 3 && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-4">受け入れ希望時期は？</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TIMING_OPTIONS.map((t) => (
                      <Button
                        key={t}
                        variant={answers.timing === t ? "default" : "outline"}
                        className={answers.timing === t ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                        onClick={() => { setAnswers((a) => ({ ...a, timing: t })); setQStep(4); }}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {qStep === 4 && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-1">技能実習生・外国人雇用の受け入れ経験はありますか？</h2>
                  <p className="text-sm text-muted-foreground mb-4">経験の有無で活用できる助成金候補が変わる場合があります。</p>
                  <div className="grid grid-cols-2 gap-2 max-w-sm">
                    <Button
                      variant={answers.jisshuExperience === true ? "default" : "outline"}
                      className={answers.jisshuExperience === true ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                      onClick={() => { setAnswers((a) => ({ ...a, jisshuExperience: true })); setQStep(5); }}
                    >
                      ある
                    </Button>
                    <Button
                      variant={answers.jisshuExperience === false ? "default" : "outline"}
                      className={answers.jisshuExperience === false ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                      onClick={() => { setAnswers((a) => ({ ...a, jisshuExperience: false })); setQStep(5); }}
                    >
                      ない（初めて）
                    </Button>
                  </div>
                </div>
              )}

              {qStep === 5 && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-1">ご連絡先（任意）</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    入力しておくと、診断後の支援機関への相談フォームに自動で反映されます。スキップしても診断結果はご覧いただけます。
                  </p>
                  <div className="space-y-3 max-w-md">
                    <Input
                      placeholder="会社名（任意）"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="メールアドレス（任意）"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                    <div className="flex gap-2 pt-2">
                      <Button className="bg-amber-accent text-brand font-bold hover:bg-amber-accent/90 flex-1" onClick={finishQuestions}>
                        診断結果を見る
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button variant="outline" onClick={finishQuestions}>スキップして結果を見る</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
        {result && !diagnose.isPending && (isDemo || phase === "done") && (
          <div className="space-y-8 fade-up">
            {isDemo && (
              <div className="rounded-lg border-2 border-dashed border-brand/40 bg-brand/5 p-4 text-sm text-muted-foreground">
                <span className="font-bold text-foreground">これは架空企業「桜川食堂」によるデモ用サンプル表示です。</span>
                実際の診断ではご自社のWebサイトURLを入力してください。
              </div>
            )}
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
                        {result.prefecture && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />所在地（推定）：{result.prefecture}
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground mb-1">該当しうる特定技能分野（目安）</div>
                        <div className="font-bold">{result.field ?? "該当分野なし"}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground mb-1">想定人数（目安）</div>
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
                  <span className="font-bold text-brand">チェックコメント：</span>
                  {result.reason}
                </div>
                <div className="rounded-lg border border-amber-accent/40 bg-amber-accent/5 p-4 text-xs text-muted-foreground mt-3 leading-relaxed">
                  <span className="font-bold text-foreground">本診断は情報整理を目的としたもので、在留資格の可否判断ではありません。個別の要件は行政書士または出入国在留管理庁にご確認ください。</span>
                </div>
              </CardContent>
            </Card>

            {/* 人数連動の概算費用レンジ */}
            {costRange && (
              <Card className="border-2 border-brand/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-accent" />
                    受入れ費用の目安（{costRange.headcount}の場合）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="text-xs text-muted-foreground mb-1">初期費用（国内在留者・目安）</div>
                      <div className="font-bold">{costRange.initial}</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="text-xs text-muted-foreground mb-1">月額支援委託費（目安）</div>
                      <div className="font-bold">{costRange.monthly}</div>
                    </div>
                    <div className="rounded-lg bg-amber-accent/10 border border-amber-accent/30 p-4">
                      <div className="text-xs text-muted-foreground mb-1">年間合計（目安）</div>
                      <div className="font-bold">{costRange.yearly}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    ※ 登録支援機関への支援委託費の業界相場（月額約2〜3万円/人）をもとにした概算です。海外からの新規受入れは初期費用30〜60万円程度まで幅があります。実際の費用は各機関に直接ご確認ください。
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 助成金候補 */}
            {joseikinCandidates.length > 0 && (
              <Card className="border-2 border-emerald-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Coins className="h-5 w-5 text-emerald-600" />
                    使える可能性のある助成金候補（{joseikinCandidates.length}件）
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {joseikinCandidates.map((j) => (
                    <div key={j.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={j.relevance === "high" ? "bg-emerald-600 text-white hover:bg-emerald-600" : "bg-muted text-muted-foreground hover:bg-muted"}>
                          {j.relevance === "high" ? "該当可能性あり" : "条件次第"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{j.agency}</span>
                      </div>
                      <h3 className="font-bold text-sm">{j.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{j.summary}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="rounded bg-muted/50 px-2.5 py-1.5"><span className="font-semibold">金額目安：</span>{j.amountHint}</div>
                        <div className="rounded bg-muted/50 px-2.5 py-1.5"><span className="font-semibold">主な条件：</span>{j.conditionHint}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <p className="text-xs text-emerald-800">{j.relevanceReason}</p>
                        <a href={j.officialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand underline inline-flex items-center gap-0.5">
                          公式情報を見る<ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground leading-relaxed">{JOSEIKIN_DISCLAIMER}</p>
                  <div className="text-center pt-1">
                    <Link href="/joseikin" className="text-sm text-brand underline">助成金の詳しい解説記事を見る</Link>
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* 推奨支援機関（フィルター付き） */}
            {recommendedOrgs && recommendedOrgs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">あなたの会社に適合する支援機関</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  AIが登録簿約11,000件から、分野・地域（同一都道府県・隣接県を優先）・対応言語等の条件に合う機関を抽出しました。並び順は条件との適合度のみで決定され、有料掲載の有無は影響しません。運営による実確認済みの情報には、情報の確からしさとして最大5点を加点しています（確認日から時間経過で減衰）。最大5社に一括相談できます。
                </p>

                {/* フィルター（初期値：診断で読み取った分野・本社所在地・英語） */}
                <Card className="mb-6">
                  <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Select value={orgPrefecture} onValueChange={(v) => { setOrgPrefecture(v); touch(); }}>
                        <SelectTrigger className={FILTER_ACCENT_CLASS}>
                          <MapPin className="h-4 w-4 mr-1 text-brand" />
                          <SelectValue placeholder="都道府県" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>すべての都道府県</SelectItem>
                          {PREFECTURES.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={orgLanguage} onValueChange={(v) => { setOrgLanguage(v); touch(); }}>
                        <SelectTrigger className={FILTER_ACCENT_CLASS}>
                          <Languages className="h-4 w-4 mr-1 text-brand" />
                          <SelectValue placeholder="対応言語" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>すべての言語</SelectItem>
                          {MAJOR_LANGUAGES.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={orgField} onValueChange={(v) => { setOrgField(v); touch(); }}>
                        <SelectTrigger className={FILTER_ACCENT_CLASS}>
                          <Building2 className="h-4 w-4 mr-1 text-brand" />
                          <SelectValue placeholder="特定技能分野" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>すべての分野</SelectItem>
                          {TOKUTEI_FIELDS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {orgField !== ALL && (
                      <p className="text-xs text-muted-foreground mt-3">
                        ※ 入管庁の登録簿には対応分野の情報が含まれないため、分野情報が未登録の機関（対応可能性あり）も含めて表示しています。詳細は各機関へ直接ご確認ください。
                      </p>
                    )}
                  </CardContent>
                </Card>

                {orgsLoading && (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                  </div>
                )}
                {/* 一括相談ボタン（リスト上部） */}
                {displayOrgs && displayOrgs.length > 0 && !orgsLoading && (
                  <div className="mb-4 text-center">
                    <Button
                      size="lg"
                      className="bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                      onClick={() =>
                        setLocation(
                          `/consult?orgIds=${displayOrgs.slice(0, 5).map((o) => o.id).join(",")}&diagnosisId=${diagnosisId ?? ""}&companyName=${encodeURIComponent(result.companyName)}&field=${encodeURIComponent(result.field ?? "")}&headcount=${encodeURIComponent(result.headcount)}`
                        )
                      }
                    >
                      表示中の支援機関に一括相談する（無料）
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                )}
                {!orgsLoading && filterTouched && (!displayOrgs || displayOrgs.length === 0) && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <SearchIcon className="h-8 w-8 mx-auto mb-3 opacity-40" />
                      <p className="font-medium mb-1">条件に一致する支援機関が見つかりませんでした</p>
                      <p className="text-sm">フィルター条件を変更してお試しください。</p>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-4">
                  {!orgsLoading && (displayOrgs ?? []).map((org) => (
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
                            {org.verifiedAt && (
                              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">運営確認済み</Badge>
                            )}
                            {(org.consultStatus === "open" || org.consultStatus === "open_active") && (
                              <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                新規相談受付中{org.consultStatus === "open_active" ? "（積極受入）" : ""}
                              </Badge>
                            )}
                            {org.affinity && (
                              <Badge variant="outline" className="font-bold border-brand/40 text-brand bg-brand/5">
                                親和性 {org.affinity.score}
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
                          {org.verifiedAt && (
                            <div className="mt-2 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-900 space-y-0.5">
                              {(org.preferredFields?.length || org.preferredRegions?.length) ? (
                                <p>
                                  <span className="font-semibold">希望条件：</span>
                                  {[org.preferredRegions?.join("・"), org.preferredFields?.join("・")].filter(Boolean).join("／")}
                                </p>
                              ) : null}
                              <p>
                                <span className="font-semibold">事業者確認日：</span>
                                {new Date(org.verifiedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                              </p>
                            </div>
                          )}
                          {org.affinity && org.affinity.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {org.affinity.reasons.map((r) => (
                                <Badge key={r.label} variant="secondary" className="text-[11px] font-normal">
                                  {r.label} +{r.points}
                                  {r.estimated ? "（推定）" : ""}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setLocation(`/org/${org.id}`)}>
                          詳細
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {displayOrgs && displayOrgs.length > 0 && !orgsLoading && (
                  <div className="mt-6 text-center">
                    <Button
                      size="lg"
                      className="bg-amber-accent text-brand font-bold hover:bg-amber-accent/90"
                      onClick={() =>
                        setLocation(
                          `/consult?orgIds=${displayOrgs.slice(0, 5).map((o) => o.id).join(",")}&diagnosisId=${diagnosisId ?? ""}&companyName=${encodeURIComponent(result.companyName)}&field=${encodeURIComponent(result.field ?? "")}&headcount=${encodeURIComponent(result.headcount)}`
                        )
                      }
                    >
                      表示中の支援機関に一括相談する（無料）
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 初期状態の説明 */}
        {phase === "idle" && !diagnose.isPending && !result && (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Globe2, title: "1. 会社名かURLを入力", desc: "会社名またはWebサイトURLを入力するだけ。会員登録は不要です。" },
              { icon: Sparkles, title: "2. 1問ずつ簡単回答", desc: "AIが読み取った分野・地域を確認しながら、人数・時期など6問に答えるだけ。" },
              { icon: Building2, title: "3. 費用・助成金・機関を提示", desc: "概算費用と助成金候補、条件に合う支援機関をまとめてご案内します。" },
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
