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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { captureSource, trackEvent } from "@/lib/track";
import { FILTER_ACCENT_CLASS } from "@/pages/Proposal";
import { JOSEIKIN_DISCLAIMER, matchJoseikin } from "@shared/joseikin";
import { normalizedScore } from "@shared/affinity";
import { HEADCOUNT_OPTIONS, PREFECTURES, TOKUTEI_FIELDS } from "@shared/tokutei";
import { languageOptionLabel, useLanguageOptions } from "@/hooks/useLanguageOptions";
import {
  buildQuestionSteps,
  loadingPercent as calcLoadingPercent,
  loadingStepIndex,
  loadingStepSeconds,
  stripScoreIntro,
  type QuestionStep,
} from "@shared/diagnoseWizard";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, CheckCircle2, ChevronDown, Coins, ExternalLink, FileText, Globe2, Languages, Loader2, MapPin, Search as SearchIcon, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useSearch } from "wouter";
import { formatDateJa } from "@/lib/utils";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

const ALL = "__all__";

/** 診断APIが返す推奨支援機関の型（リロード復元の保存内容にも使う） */
type RecommendedOrgs = inferRouterOutputs<AppRouter>["orgs"]["diagnoseUrl"]["recommendedOrgs"];

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
  /** AIの採点結果。AIが使えなかった診断では null */
  score: number | null;
  reason: string;
  prefecture?: string | null;
  /** AIが使えなかった場合の理由コード（正常時は未設定） */
  aiUnavailable?: string;
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
  const autoStarted = useRef(false);

  // ===== ウィザード（1問1ページ） =====
  // phase: idle（入口）→ analyzing（AI解析中）→ questions（質問1〜6）→ done（結果表示）
  const [phase, setPhase] = useState<"idle" | "analyzing" | "questions" | "done">("idle");
  const [qStep, setQStep] = useState(0); // 0=分野 1=都道府県 2=人数 3=時期 4=実習経験 5=連絡先（任意）
  const [answers, setAnswers] = useState<WizardAnswers>({ field: null, prefecture: null, headcount: null, timing: null, jisshuExperience: null });
  const [contactCompany, setContactCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  /** 前回の続きから復元した場合に案内を出す */
  const [restoredNotice, setRestoredNotice] = useState(false);
  /** リロード復元用に保存しておいた結果一式（APIの結果が無い間のフォールバック） */
  const [savedSnapshot, setSavedSnapshot] = useState<{
    result: DiagnosisResult | null;
    recommendedOrgs: RecommendedOrgs | null;
    diagnosisId: number | null;
  } | null>(null);
  /** 助成金候補の開閉。既定は閉（支援機関の候補まで到達させるため） */
  const [joseikinOpen, setJoseikinOpen] = useState(false);
  /** 確認画面で個別の選び直しを開いているか */
  const [editingField, setEditingField] = useState(false);
  const [editingPrefecture, setEditingPrefecture] = useState(false);
  /** 質問の並び。AIが読み取れた項目は個別に聞かず1画面の確認にまとめる */
  const [questionSteps, setQuestionSteps] = useState<QuestionStep[]>([
    "field",
    "prefecture",
    "headcount",
    "timing",
    "experience",
  ]);
  const currentStep = questionSteps[qStep] ?? questionSteps[questionSteps.length - 1];

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
      // 解析で読み取った会社名は、結果表示後の連絡先欄にプリフィルする
      if (r.companyName && r.companyName !== "不明") {
        setContactCompany((prev) => prev || r.companyName);
      }

      // AIが分野・都道府県の両方を読み取れた場合は、個別に2問聞く代わりに
      // 1画面の確認にまとめる（質問数 5問 → 4問）。
      const readField = Boolean(r.field && (TOKUTEI_FIELDS as readonly string[]).includes(r.field));
      const readPref = Boolean(r.prefecture && (PREFECTURES as readonly string[]).includes(r.prefecture));
      setQuestionSteps(buildQuestionSteps(readField, readPref));
      setQStep(0);

      // diagnoseUrl は初回解析でのみ呼ぶ（回答の反映は applyDiagnosisAnswers）
      setPhase("questions");
    },
  });

  const applyAnswers = trpc.orgs.applyDiagnosisAnswers.useMutation({
    onError: (err) => {
      // 反映に失敗しても初回解析の結果は表示できるため、結果画面は出したまま知らせる
      toast.error("回答の反映に失敗しました。表示中の内容はAI解析時点のものです。");
      console.error(err);
    },
    onSuccess: () => {
      trackEvent("diagnose_complete");
    },
  });

  // ローディング表示は実際の経過時間で進める。
  // 以前は1.8秒×5ステップの固定進行だったため、APIが速く返ればステップが飛び、
  // 遅ければ最後のステップで止まったまま「動いていない」ように見えていた。
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!diagnose.isPending) {
      setElapsedMs(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
    return () => clearInterval(timer);
  }, [diagnose.isPending]);

  const STEP_SECONDS = useMemo(() => loadingStepSeconds(Boolean(url && looksLikeUrl(url))), [url]);
  const totalExpectedMs = useMemo(
    () => STEP_SECONDS.reduce((a, b) => a + b, 0) * 1000,
    [STEP_SECONDS]
  );
  const stepIndex = useMemo(() => loadingStepIndex(elapsedMs, STEP_SECONDS), [elapsedMs, STEP_SECONDS]);
  const loadingPercent = calcLoadingPercent(elapsedMs, STEP_SECONDS);
  /** 想定より時間がかかっている（利用者に理由を伝える） */
  const takingLong = elapsedMs > totalExpectedMs;

  const isDemo = params.get("demo") === "1";

  // ===== 途中状態の保存・復元 =====
  // これまでは phase・回答・結果をすべてメモリだけで持っていたため、リロードや
  // 戻る操作で入力が消え、URLの入力と6問の回答をやり直す必要があった。
  const SESSION_KEY = "yatoeru_diagnose_session";
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current || isDemo) return;
    restored.current = true;
    // ?q= / ?url= 付きで来た場合は自動解析が走るので復元しない
    if (params.get("q") || params.get("url")) return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        url?: string;
        phase?: typeof phase;
        qStep?: number;
        questionSteps?: QuestionStep[];
        answers?: WizardAnswers;
        contactCompany?: string;
        contactEmail?: string;
        diagnosisId?: number | null;
        result?: DiagnosisResult | null;
        recommendedOrgs?: RecommendedOrgs | null;
      };
      if (!saved.phase || saved.phase === "idle" || saved.phase === "analyzing") return;
      setUrl(saved.url ?? "");
      setAnswers(saved.answers ?? { field: null, prefecture: null, headcount: null, timing: null, jisshuExperience: null });
      if (saved.questionSteps?.length) setQuestionSteps(saved.questionSteps);
      setQStep(saved.qStep ?? 0);
      setContactCompany(saved.contactCompany ?? "");
      setContactEmail(saved.contactEmail ?? "");
      setPhase(saved.phase);
      setSavedSnapshot({
        result: saved.result ?? null,
        recommendedOrgs: (saved.recommendedOrgs as RecommendedOrgs) ?? null,
        diagnosisId: saved.diagnosisId ?? null,
      });
      setRestoredNotice(true);
    } catch {
      // 壊れた保存内容は無視して通常の入口を出す
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // URL/会社名パラメータ付きで遷移してきた場合は自動で解析開始（?url=は旧リンク互換、?q=は会社名/URL自動判定）
  useEffect(() => {
    if (isDemo) return; // デモモード中は自動診断しない
    const urlParam = params.get("url");
    const qParam = params.get("q");
    if ((urlParam || qParam) && !autoStarted.current) {
      autoStarted.current = true;
      const input = (urlParam || qParam || "").trim();
      setUrl(input);
      captureSource();
      trackEvent("diagnose_start");
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
    captureSource();
    trackEvent("diagnose_start");
    setPhase("analyzing");
    if (looksLikeUrl(url)) {
      let normalized = url.trim();
      if (!/^https?:\/\//.test(normalized)) normalized = `https://${normalized}`;
      diagnose.mutate({ url: normalized });
    } else {
      diagnose.mutate({ companyName: url.trim() });
    }
  };

  /** 次の質問へ。最後の質問なら結果表示へ進む */
  const goNext = () => {
    setEditingField(false);
    setEditingPrefecture(false);
    if (qStep + 1 < questionSteps.length) {
      setQStep((v) => v + 1);
    } else {
      finishQuestions();
    }
  };

  /** 最初からやり直す（保存内容を捨てて入口へ戻す） */
  const restart = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* 削除失敗は無視 */ }
    setSavedSnapshot(null);
    setRestoredNotice(false);
    setAnswers({ field: null, prefecture: null, headcount: null, timing: null, jisshuExperience: null });
    setQStep(0);
    setUrl("");
    setPhase("idle");
    diagnose.reset();
    applyAnswers.reset();
    setLocation("/diagnose");
  };

  // 質問完了：回答を反映する。
  // AIの再実行はしない（分野・都道府県・人数の上書きと候補機関の再検索だけで足りる）。
  // 以前はここで diagnoseUrl を呼び直していたため、同じローディングを2度待たされ、
  // 2回目のAI出力が1回目と変わって推定業種やスコアが結果画面で別の値になっていた。
  const finishQuestions = () => {
    // 連絡先は任意。入力があれば/consultプリフィル用にsessionStorageに保存
    if (contactCompany || contactEmail) {
      try {
        sessionStorage.setItem("yatoeru_contact", JSON.stringify({ company: contactCompany, email: contactEmail }));
      } catch { /* 保存失敗は無視 */ }
    }
    setPhase("done");
    const id = diagnose.data?.diagnosisId ?? savedSnapshot?.diagnosisId;
    if (id) {
      applyAnswers.mutate({ diagnosisId: Number(id), answers });
    }
  };

  // 表示に使う結果の優先順位：回答反映後 → 初回解析 → リロード復元用の保存内容
  const liveResult = (applyAnswers.data?.result ??
    diagnose.data?.result ??
    savedSnapshot?.result ??
    undefined) as DiagnosisResult | undefined;
  const liveOrgs =
    applyAnswers.data?.recommendedOrgs ??
    diagnose.data?.recommendedOrgs ??
    savedSnapshot?.recommendedOrgs ??
    undefined;
  const liveDiagnosisId =
    diagnose.data?.diagnosisId ?? savedSnapshot?.diagnosisId ?? undefined;

  const result = isDemo ? DEMO_RESULT : liveResult;
  /** AI解析が使えなかった診断（業種推定とスコアが無い状態） */
  const aiUnavailable = Boolean(result?.aiUnavailable);
  const recommendedOrgs = isDemo ? undefined : liveOrgs;
  const diagnosisId = isDemo ? undefined : liveDiagnosisId;

  // 回答途中・結果表示中の状態を保存する（AI解析結果そのものは保存せず、復元時は
  // 保存済みの診断IDから作り直す。結果の再取得は下の復元用クエリが担う）
  useEffect(() => {
    if (isDemo) return;
    if (phase === "idle" || phase === "analyzing") return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          url,
          phase,
          qStep,
          questionSteps,
          answers,
          contactCompany,
          contactEmail,
          diagnosisId: liveDiagnosisId ?? null,
          result: liveResult ?? null,
          recommendedOrgs: liveOrgs ?? null,
        })
      );
    } catch {
      // 保存失敗は無視（プライベートブラウズ等）
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, url, phase, qStep, questionSteps, answers, contactCompany, contactEmail, liveResult, liveOrgs, liveDiagnosisId]);

  // 適合スコアの内訳（サーバーが scoreBreakdown を返す。旧データには無いのでその場合は非表示）
  const scoreBreakdown = useMemo(() => {
    const b = (result as unknown as { scoreBreakdown?: { field?: number; labor?: number; info?: number } })
      ?.scoreBreakdown;
    if (!b || typeof b.field !== "number") return null;
    return [
      {
        label: "分野の該当性",
        value: b.field ?? 0,
        max: 40,
        help: "分野の該当性は、事業内容が特定技能19分野にどれだけ当てはまるかです。",
      },
      {
        label: "人手不足の深刻度",
        value: b.labor ?? 0,
        max: 30,
        help: "人手不足の深刻度は、業界の状況と現場職の比重から見た採用ニーズの大きさです。",
      },
      {
        label: "情報の確からしさ",
        value: b.info ?? 0,
        max: 30,
        help: "情報の確からしさは、Webサイトから事業内容をどこまで具体的に確認できたかです（URLのみからの推測だと低くなります）。",
      },
    ];
  }, [result]);

  /** チェックコメントから、内訳を並べた導入部分（「a)…合計N点。」）を外した本文 */
  const reasonNarrative = useMemo(
    () => (scoreBreakdown ? stripScoreIntro(result?.reason) : result?.reason ?? ""),
    [result, scoreBreakdown]
  );

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
  // 対応言語の選択肢は実データから作る（決め打ちの13言語では大半が絞り込めなかった）
  const { options: languageOptions } = useLanguageOptions();

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
  const orgsLoading = (filterTouched && filteredQuery.isLoading) || applyAnswers.isPending;
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
        {restoredNotice && phase !== "idle" && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
            <span className="flex-1">
              前回の続きから表示しています（{url || "入力内容"}）。
            </span>
            <Button variant="outline" size="sm" onClick={restart}>
              最初からやり直す
            </Button>
          </div>
        )}

        {/* 質問ウィザード（1問1画面）。
            AIが読み取れた分野・都道府県は個別に聞き直さず、1画面の確認にまとめる。
            連絡先は結果を見せた後に任意で聞く（ウィザードからは外した）。 */}
        {phase === "questions" && !diagnose.isPending && (
          <Card className="border-2 border-brand/20">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  質問 {qStep + 1} / {questionSteps.length}
                </span>
                {qStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setQStep((s) => s - 1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />戻る
                  </Button>
                )}
              </div>
              <Progress value={((qStep + 1) / questionSteps.length) * 100} className="mb-6" />

              {currentStep === "confirm" && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-1">この内容で合っていますか？</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    <Sparkles className="inline h-3.5 w-3.5 text-amber-accent mr-1" />
                    AIが御社の情報から読み取りました。違っていれば「変更する」から選び直せます。
                  </p>
                  <dl className="rounded-lg border divide-y">
                    <div className="flex items-center gap-3 p-3">
                      <dt className="w-32 shrink-0 text-sm text-muted-foreground">受け入れ分野</dt>
                      <dd className="flex-1 font-medium">{answers.field}</dd>
                      <Button variant="outline" size="sm" onClick={() => setEditingField(true)}>
                        変更する
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 p-3">
                      <dt className="w-32 shrink-0 text-sm text-muted-foreground">勤務地</dt>
                      <dd className="flex-1 font-medium">{answers.prefecture}</dd>
                      <Button variant="outline" size="sm" onClick={() => setEditingPrefecture(true)}>
                        変更する
                      </Button>
                    </div>
                  </dl>

                  {editingField && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">受け入れ分野を選び直す</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {TOKUTEI_FIELDS.map((f) => (
                          <Button
                            key={f}
                            variant={answers.field === f ? "default" : "outline"}
                            className={answers.field === f ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                            onClick={() => { setAnswers((a) => ({ ...a, field: f })); setEditingField(false); }}
                          >
                            {f}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {editingPrefecture && (
                    <div className="mt-4 max-w-sm">
                      <p className="text-sm font-medium mb-2">勤務地を選び直す</p>
                      <Select
                        value={answers.prefecture ?? ""}
                        onValueChange={(v) => { setAnswers((a) => ({ ...a, prefecture: v })); setEditingPrefecture(false); }}
                      >
                        <SelectTrigger className={FILTER_ACCENT_CLASS}>
                          <MapPin className="h-4 w-4 mr-1 text-brand" />
                          <SelectValue placeholder="都道府県を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREFECTURES.map((pref) => (
                            <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90"
                    onClick={goNext}
                  >
                    この内容で次へ
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}

              {currentStep === "field" && (
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
                        onClick={() => { setAnswers((a) => ({ ...a, field: f })); goNext(); }}
                      >
                        {f}
                      </Button>
                    ))}
                    <Button
                      variant={answers.field === null ? "secondary" : "outline"}
                      className="col-span-2 sm:col-span-3"
                      onClick={() => { setAnswers((a) => ({ ...a, field: null })); goNext(); }}
                    >
                      該当なし・わからない（あとで相談で確認）
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === "prefecture" && (
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
                      onValueChange={(v) => { setAnswers((a) => ({ ...a, prefecture: v })); goNext(); }}
                    >
                      <SelectTrigger className={FILTER_ACCENT_CLASS}>
                        <MapPin className="h-4 w-4 mr-1 text-brand" />
                        <SelectValue placeholder="都道府県を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFECTURES.map((pref) => (
                          <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 mt-3">
                      {answers.prefecture && (
                        <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={goNext}>
                          {answers.prefecture}で次へ
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setAnswers((a) => ({ ...a, prefecture: null })); goNext(); }}>
                        未定・スキップする
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "headcount" && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-4">受け入れ予定人数は？</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HEADCOUNT_OPTIONS.map((h) => (
                      <Button
                        key={h}
                        variant={answers.headcount === h ? "default" : "outline"}
                        className={answers.headcount === h ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                        onClick={() => { setAnswers((a) => ({ ...a, headcount: h })); goNext(); }}
                      >
                        {h}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">人数に応じて概算費用を自動計算します。</p>
                </div>
              )}

              {currentStep === "timing" && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-4">受け入れ希望時期は？</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TIMING_OPTIONS.map((t) => (
                      <Button
                        key={t}
                        variant={answers.timing === t ? "default" : "outline"}
                        className={answers.timing === t ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                        onClick={() => { setAnswers((a) => ({ ...a, timing: t })); goNext(); }}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === "experience" && (
                <div className="fade-up">
                  <h2 className="text-xl font-bold mb-1">技能実習生・外国人雇用の受け入れ経験はありますか？</h2>
                  <p className="text-sm text-muted-foreground mb-4">経験の有無で活用できる助成金候補が変わる場合があります。</p>
                  <div className="grid grid-cols-2 gap-2 max-w-sm">
                    <Button
                      variant={answers.jisshuExperience === true ? "default" : "outline"}
                      className={answers.jisshuExperience === true ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                      onClick={() => { setAnswers((a) => ({ ...a, jisshuExperience: true })); goNext(); }}
                    >
                      ある
                    </Button>
                    <Button
                      variant={answers.jisshuExperience === false ? "default" : "outline"}
                      className={answers.jisshuExperience === false ? "bg-brand text-brand-foreground" : "hover:border-brand/50"}
                      onClick={() => { setAnswers((a) => ({ ...a, jisshuExperience: false })); goNext(); }}
                    >
                      ない（初めて）
                    </Button>
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
                <Progress value={loadingPercent} className="max-w-sm mb-2" />
                <p className="text-xs text-muted-foreground mb-6">
                  経過 {Math.floor(elapsedMs / 1000)} 秒
                </p>
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
                {takingLong && (
                  <p className="mt-6 max-w-sm text-xs text-muted-foreground leading-relaxed">
                    通常より時間がかかっています。サイトの読み込みに時間がかかる場合があり、
                    最長で20秒ほどかかることがあります。そのままお待ちください。
                  </p>
                )}
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
            {aiUnavailable && (
              <div className="rounded-lg border-2 border-amber-accent/50 bg-amber-accent/10 p-4 text-sm leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-accent" />
                  AI解析が一時的に利用できません
                </p>
                <p className="text-muted-foreground">
                  業種の推定と適合スコアは表示できませんが、ご回答いただいた分野・地域・人数から
                  <strong className="text-foreground">支援機関の候補・費用の目安・助成金の候補</strong>
                  はそのままご案内できます。業種の推定が必要な場合は、時間をおいて再度お試しください。
                </p>
              </div>
            )}
            <Card className="border-2 border-brand/20 overflow-hidden">
              <div className="bg-brand text-brand-foreground px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold text-lg">診断結果</h2>
                <span className="text-sm text-brand-foreground/70">{result.companyName}</span>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
                  {typeof result.score === "number" && (
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
                  )}
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground mb-1">推定業種</div>
                        <div className="font-bold">{result.industry || "未解析"}</div>
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
                {/* 適合スコアの内訳。これまでは a)b)c) の点数が reason の文章に
                    埋まっていて、なぜその点数なのかが読み取れなかった。 */}
                {scoreBreakdown && (
                  <div className="rounded-lg border bg-background p-4 mb-3">
                    <p className="text-sm font-bold text-brand mb-3">適合スコアの内訳</p>
                    <dl className="space-y-2.5">
                      {scoreBreakdown.map((b) => (
                        <div key={b.label} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3">
                          <dt className="text-sm">{b.label}</dt>
                          <dd>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand"
                                style={{ width: `${(b.value / b.max) * 100}%` }}
                              />
                            </div>
                          </dd>
                          <dd className="text-sm text-right tabular-nums">
                            <span className="font-bold">{b.value}</span>
                            <span className="text-muted-foreground text-xs"> / {b.max}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      {scoreBreakdown.map((b) => b.help).join(" ")}
                    </p>
                  </div>
                )}
                {reasonNarrative && (
                  <div className="rounded-lg border bg-background p-4 text-sm leading-relaxed">
                    <span className="font-bold text-brand">チェックコメント：</span>
                    {reasonNarrative}
                  </div>
                )}
                <div className="rounded-lg border border-amber-accent/40 bg-amber-accent/5 p-4 text-xs text-muted-foreground mt-3 leading-relaxed">
                  <span className="font-bold text-foreground">本診断は情報整理を目的としたもので、在留資格の可否判断ではありません。個別の要件は行政書士または出入国在留管理庁にご確認ください。</span>
                </div>
              </CardContent>
            </Card>

            {/* 表示順は「診断結果 → 支援機関 → 連絡先 → 費用 → 助成金 → 提案書」。
                支援機関の候補が費用・助成金・提案書CTAの下にあった頃は、スコアを見た
                利用者が3ブロック分スクロールしないと候補に到達できず、離脱していた。
                サイトの目的は支援機関の比較なので、結果の直後に候補を置く。 */}
            {/* 推奨支援機関（フィルター付き） */}
            {recommendedOrgs && recommendedOrgs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">あなたの会社に適合する支援機関</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  AIが登録簿約11,000件から、分野・地域（同一都道府県・隣接県を優先）・対応言語等の条件に合う機関を抽出しました。並び順は条件との適合度のみで決定され、有料掲載の有無は影響しません。運営による実確認済みの情報には、情報の確からしさとして最大5点を加点しています（確認日から時間経過で減衰）。受付可能な機関に一括相談できます（候補数により最大5社）。
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
                          {languageOptions.map((o) => (
                            <SelectItem key={o.language} value={o.language}>
                              {languageOptionLabel(o)}
                            </SelectItem>
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
                              <Badge
                                variant="outline"
                                className="font-bold border-brand/40 text-brand bg-brand/5"
                                title={`内訳: ${org.affinity.score} / ${org.affinity.maxScore}点（指定条件での満点）を100点換算`}
                              >
                                親和性 {normalizedScore(org.affinity.score, org.affinity.maxScore)}
                                <span className="font-normal opacity-70">/100</span>
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
                                {formatDateJa(org.verifiedAt)}
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
            {/* 連絡先（任意）。以前は質問6/6としてウィザードの最後に置いていたが、
                結果を見る前に個人情報を求める形になっていた。結果を見たあとに
                「相談フォームへの自動入力」という具体的な用途とともに聞く。 */}
            {!isDemo && (
              <Card>
                <CardContent className="p-5">
                  <p className="font-bold mb-1">相談フォームへの自動入力（任意）</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    入力しておくと、支援機関への相談フォームに会社名とメールアドレスが自動で入ります。
                    入力しなくても診断結果はこのまま閲覧できます。当サイトから営業のご連絡はしません。
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <Input
                      placeholder="会社名"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="メールアドレス"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        try {
                          sessionStorage.setItem(
                            "yatoeru_contact",
                            JSON.stringify({ company: contactCompany, email: contactEmail })
                          );
                          toast.success("相談フォームに自動入力されます");
                        } catch {
                          toast.error("この環境では保存できませんでした");
                        }
                      }}
                    >
                      保存する
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* 助成金候補。既定では閉じておく。
                助成金は「あとで読む」情報で、開いたまま長く置くと支援機関の候補まで
                スクロールされずに離脱するため、見出しだけ見せて任意で開かせる。 */}
            {joseikinCandidates.length > 0 && (
              <Card className="border-2 border-emerald-200">
                <Collapsible open={joseikinOpen} onOpenChange={setJoseikinOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 p-5 text-left hover:bg-emerald-50/60 transition-colors"
                    >
                      <Coins className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-lg flex-1">
                        使える可能性のある助成金候補
                        <Badge variant="secondary" className="ml-2 align-middle">
                          {joseikinCandidates.length}件
                        </Badge>
                      </span>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {joseikinOpen ? "閉じる" : "開いて見る"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${joseikinOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
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

          </div>
        )}

        {/* 初期状態の説明 */}
        {phase === "idle" && !diagnose.isPending && !result && (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Globe2, title: "1. 会社名かURLを入力", desc: "会社名またはWebサイトURLを入力するだけ。会員登録は不要です。" },
              { icon: Sparkles, title: "2. 1問ずつ簡単回答", desc: "AIが読み取った分野・地域を1画面で確認し、人数・時期などに答えるだけ（最短4問）。" },
              { icon: Building2, title: "3. 支援機関・費用・助成金を提示", desc: "条件に合う支援機関を先に提示し、概算費用と助成金候補も続けてご案内します。" },
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
