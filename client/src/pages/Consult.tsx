import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FILTER_ACCENT_CLASS } from "@/pages/Proposal";
import { HEADCOUNT_OPTIONS, PREFECTURES, TOKUTEI_FIELDS } from "@shared/tokutei";
import { Building2, CheckCircle2, Loader2, MailCheck, MapPin, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useSearch } from "wouter";

const NONE = "__none__";

export default function Consult() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const initialOrgIds = useMemo(
    () =>
      (params.get("orgIds") ?? "")
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n))
        .slice(0, 5),
    [params]
  );

  // 診断ウィザードで入力された連絡先（任意）をプリフィル
  const storedContact = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("yatoeru_contact");
      return raw ? (JSON.parse(raw) as { company?: string; email?: string }) : null;
    } catch {
      return null;
    }
  }, []);

  const [orgIds, setOrgIds] = useState<number[]>(initialOrgIds);
  const [companyName, setCompanyName] = useState(params.get("companyName") || storedContact?.company || "");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(storedContact?.email || "");
  const [phone, setPhone] = useState("");
  const [prefecture, setPrefecture] = useState(NONE);
  const [field, setField] = useState(params.get("field") || NONE);
  const [headcount, setHeadcount] = useState(params.get("headcount") || NONE);
  const [message, setMessage] = useState("");
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const diagnosisId = params.get("diagnosisId") ? parseInt(params.get("diagnosisId")!, 10) : undefined;

  // 選択された支援機関の情報を取得（検索APIをID指定なしで叩けないため、getByIdを並列に使わずsearchで代替できない。1件ずつ取得）
  const orgQueries = trpc.useQueries((t) => orgIds.map((id) => t.orgs.getById(id)));

  const submitMutation = trpc.orgs.submitConsultation.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: () => {
      toast.error("送信に失敗しました。入力内容をご確認のうえ再度お試しください。");
    },
  });

  const removeOrg = (id: number) => {
    setOrgIds((prev) => prev.filter((x) => x !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orgIds.length === 0) {
      toast.error("相談先の支援機関が選択されていません。");
      return;
    }
    if (!consentThirdParty) {
      toast.error("支援機関への情報提供に同意いただく必要があります。");
      return;
    }
    submitMutation.mutate({
      orgIds,
      companyName,
      contactName,
      email,
      phone: phone || undefined,
      prefecture: prefecture !== NONE ? prefecture : undefined,
      field: field !== NONE ? field : undefined,
      headcount: headcount !== NONE ? headcount : undefined,
      message: message || undefined,
      diagnosisId: diagnosisId && !isNaN(diagnosisId) ? diagnosisId : undefined,
      consentThirdParty: true,
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
              <h1 className="text-2xl font-bold mb-4">相談を受け付けました</h1>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                選択された{orgIds.length}社の支援機関へ相談内容をお送りします。<br />
                通常2〜3営業日以内に、各機関より直接ご連絡いたします。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => setLocation("/search")}>
                  他の支援機関も探す
                </Button>
                <Button onClick={() => setLocation("/")}>トップページへ戻る</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="bg-muted/30 border-b py-8">
        <div className="container max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">支援機関への一括相談（無料）</h1>
          <p className="text-muted-foreground text-sm mb-4">
            1回の入力で最大5社にまとめて相談。各機関から見積もり・提案を受け取り、比較検討できます。
          </p>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
              ヤトエルから営業電話をおかけすることはありません
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
              連絡が届くのはあなたが選んだ支援機関のみです
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
              相談後に契約するかどうかは自由です（断っても費用はかかりません）
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-10">
        {/* 選択中の支援機関 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand" />
              相談先の支援機関（{orgIds.length}/5社）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orgIds.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p className="mb-4">相談先が選択されていません。</p>
                <Button variant="outline" onClick={() => setLocation("/search")}>
                  支援機関を探す
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {orgQueries.map((q, i) =>
                  q.data ? (
                    <div key={orgIds[i]} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {q.data.org.plan === "paid" && (
                            <Badge className="bg-amber-accent text-brand hover:bg-amber-accent shrink-0">PR</Badge>
                          )}
                          <Link href={`/org/${q.data.org.id}`}>
                            <span className="font-medium hover:text-brand hover:underline truncate">
                              {q.data.org.name}
                            </span>
                          </Link>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{q.data.org.address ?? "住所情報なし"}</span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOrg(orgIds[i])}
                        aria-label="削除"
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div key={orgIds[i]} className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      読み込み中…
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 相談フォーム */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-5 w-5 text-brand" />
                相談内容の入力
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="companyName">会社名 <span className="text-destructive">*</span></Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="株式会社〇〇" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">ご担当者名 <span className="text-destructive">*</span></Label>
                  <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required placeholder="山田 太郎" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="taro@example.co.jp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話番号（任意）</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03-1234-5678" />
                </div>
                <div className="space-y-2">
                  <Label>所在地（任意）</Label>
                  <Select value={prefecture} onValueChange={setPrefecture}>
                    <SelectTrigger className={FILTER_ACCENT_CLASS}>
                      <SelectValue placeholder="都道府県を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>未選択</SelectItem>
                      {PREFECTURES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>受入予定の分野（任意）</Label>
                  <Select value={field} onValueChange={setField}>
                    <SelectTrigger className={FILTER_ACCENT_CLASS}>
                      <SelectValue placeholder="特定技能分野を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>未定・わからない</SelectItem>
                      {TOKUTEI_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>受入予定人数（任意）</Label>
                  <Select value={headcount} onValueChange={setHeadcount}>
                    <SelectTrigger className={FILTER_ACCENT_CLASS}>
                      <SelectValue placeholder="人数を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>未定</SelectItem>
                      {HEADCOUNT_OPTIONS.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">相談内容・質問など（任意）</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="例：初めての外国人雇用で、何から始めればよいか相談したい。費用の見積もりも欲しい。"
                />
              </div>
              <div className="rounded-lg border-2 border-brand/20 bg-muted/50 p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={consentThirdParty}
                    onCheckedChange={(v) => setConsentThirdParty(v === true)}
                    className="mt-0.5"
                    aria-label="第三者提供への同意"
                  />
                  <span className="text-sm leading-relaxed">
                    入力した内容（会社名・担当者名・連絡先・相談内容）を、上記で選択した支援機関（最大５社）へ提供することに同意します。
                    <Link href="/privacy">
                      <span className="text-brand underline hover:no-underline">プライバシーポリシー</span>
                    </Link>
                    を確認しました。<span className="text-destructive">＊必須</span>
                  </span>
                </label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  送信内容は選択された支援機関以外の第三者には提供されません。ヤトエルが仲介手数料を企業様に請求することはありません。
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-amber-accent text-brand font-bold hover:bg-amber-accent/90 h-13"
                disabled={submitMutation.isPending || orgIds.length === 0 || !consentThirdParty}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />送信中…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    {orgIds.length}社にまとめて相談する（無料）
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </SiteLayout>
  );
}
