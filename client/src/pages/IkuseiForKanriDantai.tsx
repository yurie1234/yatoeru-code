import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PREFECTURES } from "@shared/tokutei";
import { BadgeCheck, Building2, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

/**
 * 監理団体の皆さまへ：移行状況の情報提供・掲載案内（/ikusei-shuro/for-kanri-dantai）。
 * トラッカーへの無料掲載（アンケート導線）＋有料プラン・外部監査人紹介枠の案内。
 */

const STATUS_OPTIONS = [
  { value: "preparing", label: "申請準備中（申請予定あり）" },
  { value: "applying", label: "申請中（監理支援機関の許可を申請済み）" },
  { value: "permitted", label: "許可取得（許可通知を受領済み）" },
  { value: "not_migrating", label: "移行しない予定" },
] as const;

const FREE_BENEFITS = [
  "移行状況（申請準備中／申請中／許可取得など）がトラッカーに反映され、「確認済み」バッジ付きで表示されます",
  "確認日が明記されるため、受入企業からの信頼性が上がります",
  "掲載・更新は何度でも無料です（月1回の定期更新とは別に随時反映）",
] as const;

export default function IkuseiForKanriDantai() {
  const [form, setForm] = useState({
    orgName: "",
    managementId: "",
    prefecture: "",
    migrationStatus: "" as string,
    contactName: "",
    email: "",
    phone: "",
    note: "",
    consentPrivacy: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.kanri.submitStatusInfo.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("送信しました。担当者確認のうえトラッカーに反映します。");
    },
    onError: (e) => {
      toast.error(e.message || "送信に失敗しました。時間をおいて再度お試しください。");
    },
  });

  useEffect(() => {
    document.title =
      "監理団体の皆さまへ｜移行状況の情報提供・トラッカー掲載のご案内（無料） - ヤトエル";
  }, []);

  const handleSubmit = () => {
    if (!form.orgName || !form.contactName || !form.email || !form.migrationStatus) {
      toast.error("団体名・移行状況・ご担当者名・メールアドレスは必須です。");
      return;
    }
    if (!form.consentPrivacy) {
      toast.error("プライバシーポリシーへの同意が必要です。");
      return;
    }
    submitMutation.mutate({
      orgName: form.orgName,
      managementId: form.managementId || undefined,
      prefecture: form.prefecture || undefined,
      migrationStatus: form.migrationStatus as
        | "preparing"
        | "applying"
        | "permitted"
        | "not_migrating",
      contactName: form.contactName,
      email: form.email,
      phone: form.phone || undefined,
      note: form.note || undefined,
      consentPrivacy: form.consentPrivacy,
    });
  };

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3 flex-wrap">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <Link href="/ikusei-shuro">
              <span className="hover:text-brand-foreground cursor-pointer">育成就労制度</span>
            </Link>
            <span>/</span>
            <span>監理団体の皆さまへ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-amber-accent shrink-0" />
            監理団体の皆さまへ：移行状況の情報提供のお願い
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            当サイトは、全国3,733の監理団体（OTIT許可一覧掲載）の
            <strong className="text-brand-foreground">
              監理支援機関への移行状況を独自調査し、無料で公開
            </strong>
            しています。貴団体の申請状況をご提供いただくと、
            <strong className="text-brand-foreground">「確認済み」バッジ付きで優先表示</strong>
            され、育成就労への切り替え先を探している受入企業に正確な情報が届きます。掲載・更新は無料です。
          </p>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        {/* 無料掲載のメリット */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-brand" />
            情報提供いただくと（無料）
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {FREE_BENEFITS.map((b) => (
              <Card key={b}>
                <CardContent className="p-4 flex gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{b}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ご提供いただいた情報は、ご担当者への確認（本人性確認）のうえで
            <Link href="/ikusei-shuro/kanri-shien-kikan/list">
              <span className="text-brand hover:underline cursor-pointer">
                移行状況トラッカー
              </span>
            </Link>
            に反映します。連絡先情報が公開されることはありません。
          </p>
        </section>

        {/* フォーム */}
        <section id="form">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-brand" />
            移行状況の情報提供フォーム
          </h2>
          {submitted ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-6 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <p className="font-semibold">送信ありがとうございました</p>
                <p className="text-sm text-muted-foreground">
                  担当者がご記入のメールアドレス宛に確認のご連絡を差し上げたうえで、トラッカーに反映します（通常3営業日以内）。
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="orgName">
                      団体名 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="orgName"
                      placeholder="○○事業協同組合"
                      value={form.orgName}
                      onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="managementId">許可番号（任意）</Label>
                    <Input
                      id="managementId"
                      placeholder="許1234567890 など"
                      value={form.managementId}
                      onChange={(e) => setForm({ ...form, managementId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>所在都道府県（任意）</Label>
                    <Select
                      value={form.prefecture}
                      onValueChange={(v) => setForm({ ...form, prefecture: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFECTURES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      監理支援機関への移行状況 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.migrationStatus}
                      onValueChange={(v) => setForm({ ...form, migrationStatus: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName">
                      ご担当者名 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactName"
                      placeholder="山田 太郎"
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      メールアドレス <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@example.or.jp"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">電話番号（任意）</Label>
                    <Input
                      id="phone"
                      placeholder="03-1234-5678"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">補足（任意）</Label>
                  <Textarea
                    id="note"
                    rows={3}
                    placeholder="申請時期の見込み、対応予定分野、その他伝えたいことなど"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consent"
                    checked={form.consentPrivacy}
                    onCheckedChange={(v) => setForm({ ...form, consentPrivacy: v === true })}
                  />
                  <Label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer">
                    <Link href="/privacy">
                      <span className="text-brand hover:underline">プライバシーポリシー</span>
                    </Link>
                    に同意のうえ送信します。ご提供情報は本人性確認とトラッカー掲載の目的にのみ利用します。
                  </Label>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? "送信中..." : "移行状況を送信する（無料）"}
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* 有料プラン案内 */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            もっと活用したい団体さまへ（有料プラン）
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            無料掲載に加えて、受入企業からの問い合わせ獲得を強化する有料プランをご用意しています。特定技能（登録支援機関）と育成就労（監理支援機関）の
            <strong className="text-foreground">両制度をまたいだセット掲載</strong>
            は当サイトならではのプランです。詳細は掲載事業者向けページをご覧ください。
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold text-sm mb-1">スタンダード</div>
                <div className="text-lg font-bold text-brand mb-1.5">
                  月3万円<span className="text-xs font-normal text-muted-foreground">（税別）</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  検索結果での優先表示・詳細プロフィール掲載（対応分野・国・実績）
                </p>
              </CardContent>
            </Card>
            <Card className="border-brand/40">
              <CardContent className="p-4">
                <div className="font-semibold text-sm mb-1 flex items-center gap-1.5">
                  プレミアム
                  <Badge className="bg-amber-accent/20 text-amber-700 hover:bg-amber-accent/20 text-[10px] px-1.5">
                    人気
                  </Badge>
                </div>
                <div className="text-lg font-bold text-brand mb-1.5">
                  月8万円<span className="text-xs font-normal text-muted-foreground">（税別）</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  スタンダードの内容＋問い合わせフォームでの直接受付・都道府県ページでの上位掲載
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold text-sm mb-1">両制度セット</div>
                <div className="text-lg font-bold text-brand mb-1.5">
                  月15万円<span className="text-xs font-normal text-muted-foreground">（税別）</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  特定技能（登録支援機関）と育成就労（監理支援機関）の両データベースでプレミアム掲載
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            このほか、外部監査人（行政書士・社会保険労務士等）向けの紹介枠のご相談も受け付けています。
          </p>
          <Link href="/for-organizations">
            <Button variant="outline" className="bg-transparent">
              掲載事業者向けページで詳細を見る
            </Button>
          </Link>
        </section>
      </div>
    </SiteLayout>
  );
}
