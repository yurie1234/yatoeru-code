import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TOKUTEI_FIELDS } from "@shared/tokutei";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * 掲載確認メールの回答を管理画面から本番DBへ反映するフォーム。
 * 以前はRailway ConsoleでSQLを直接流すしかなく、反映漏れが起きていた。
 *
 * 公的名簿由来の項目（機関名・所在地・電話番号）はここでは編集できない。
 * 登録簿の転記を管理画面から書き換えられないようにするため、サーバー側でも弾いている。
 */

const CONSULT_STATUS_OPTIONS = [
  { value: "unknown", label: "未確認" },
  { value: "open", label: "受付中" },
  { value: "open_active", label: "受付中（積極受入）" },
  { value: "paused", label: "一時停止" },
] as const;

type Draft = {
  languages: string;
  fields: string[];
  preferredAllFields: boolean;
  preferredFields: string[];
  preferredRegions: string;
  preferredNote: string;
  consultStatus: string;
  websiteUrl: string;
  monthlyFeeMin: string;
  monthlyFeeMax: string;
  verifiedAt: string;
  verifiedNote: string;
  internalMemo: string;
};

function splitList(s: string): string[] {
  return s
    .split(/[,、\n]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export default function AdminOrgListingEditor() {
  const [regNoInput, setRegNoInput] = useState("");
  const [loadedRegNo, setLoadedRegNo] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  /** 反映待ちの下書きを読み込んだ場合、DB値ではなくその内容でフォームを埋める */
  const [pendingOverride, setPendingOverride] = useState<Partial<Draft> | null>(null);

  const pendingQuery = trpc.admin.pendingListingUpdates.useQuery();

  const orgQuery = trpc.admin.orgByRegNo.useQuery(
    { regNo: loadedRegNo ?? "" },
    { enabled: !!loadedRegNo, retry: false }
  );

  // react-query v5 では useQuery の onSuccess/onError が廃止されているため、
  // 取得結果からフォームの下書きを組み立てるのは useEffect 側で行う。
  const loadedAt = orgQuery.dataUpdatedAt;
  useEffect(() => {
    const org = orgQuery.data;
    if (!org) return;
    const fromDb: Draft = {
      languages: (org.languages ?? []).join("、"),
      fields: (org.fields ?? []) as string[],
      preferredAllFields: ((org.preferredFields ?? []) as string[]).includes("全分野"),
      preferredFields: ((org.preferredFields ?? []) as string[]).filter((f) => f !== "全分野"),
      preferredRegions: (org.preferredRegions ?? []).join("、"),
      preferredNote: org.preferredNote ?? "",
      consultStatus: org.consultStatus ?? "unknown",
      websiteUrl: org.websiteUrl ?? "",
      monthlyFeeMin: org.monthlyFeeMin != null ? String(org.monthlyFeeMin) : "",
      monthlyFeeMax: org.monthlyFeeMax != null ? String(org.monthlyFeeMax) : "",
      verifiedAt: org.verifiedAt ? new Date(org.verifiedAt).toISOString().slice(0, 10) : "",
      verifiedNote: org.verifiedNote ?? "",
      internalMemo: org.internalMemo ?? "",
    };
    // 反映待ちの下書きを読み込んだ場合はそちらを重ねる（指定の無い項目はDB値のまま）
    setDraft(pendingOverride ? { ...fromDb, ...pendingOverride } : fromDb);
    // dataUpdatedAt を見ることで、再読込のたびに下書きを取得値へ戻す
  }, [loadedAt, pendingOverride]);

  useEffect(() => {
    if (!orgQuery.error) return;
    setDraft(null);
    toast.error(orgQuery.error.message);
  }, [orgQuery.error]);

  const utils = trpc.useUtils();
  const save = trpc.admin.updateOrgListing.useMutation({
    onSuccess: (res) => {
      toast.success(`反映しました（${res.updated.length}項目）`);
      utils.admin.orgByRegNo.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const org = orgQuery.data;

  function load() {
    const v = regNoInput.trim();
    if (!v) return;
    setDraft(null);
    setPendingOverride(null);
    setLoadedRegNo(v);
  }

  /** 反映待ちの下書きをフォームに読み込む（この時点では本番は変わらない） */
  function loadPending(entry: NonNullable<typeof pendingQuery.data>[number]) {
    const p = entry.payload;
    const override: Partial<Draft> = {};
    if (p.languages) override.languages = p.languages.join("、");
    if (p.fields) override.fields = [...p.fields];
    if (p.preferredFields) {
      override.preferredAllFields = p.preferredFields.includes("全分野");
      override.preferredFields = p.preferredFields.filter((f) => f !== "全分野");
    }
    if (p.preferredRegions) override.preferredRegions = p.preferredRegions.join("、");
    if (p.preferredNote !== undefined) override.preferredNote = p.preferredNote ?? "";
    if (p.consultStatus) override.consultStatus = p.consultStatus;
    if (p.websiteUrl !== undefined) override.websiteUrl = p.websiteUrl ?? "";
    if (p.monthlyFeeMin !== undefined)
      override.monthlyFeeMin = p.monthlyFeeMin != null ? String(p.monthlyFeeMin) : "";
    if (p.monthlyFeeMax !== undefined)
      override.monthlyFeeMax = p.monthlyFeeMax != null ? String(p.monthlyFeeMax) : "";
    if (p.verifiedAt !== undefined) override.verifiedAt = p.verifiedAt ?? "";
    if (p.verifiedNote !== undefined) override.verifiedNote = p.verifiedNote ?? "";
    if (p.internalMemo !== undefined) override.internalMemo = p.internalMemo ?? "";

    setDraft(null);
    setRegNoInput(entry.regNo);
    setPendingOverride(override);
    setLoadedRegNo(entry.regNo);
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function submit() {
    if (!org || !draft) return;

    const feeMin = draft.monthlyFeeMin.trim();
    const feeMax = draft.monthlyFeeMax.trim();
    const preferredFields = draft.preferredAllFields
      ? ["全分野"]
      : draft.preferredFields;

    save.mutate({
      regNo: org.regNo,
      languages: splitList(draft.languages),
      fields: draft.fields as never,
      preferredFields: preferredFields as never,
      preferredRegions: splitList(draft.preferredRegions),
      preferredNote: draft.preferredNote.trim() || null,
      consultStatus: draft.consultStatus as never,
      websiteUrl: draft.websiteUrl.trim() || null,
      monthlyFeeMin: feeMin ? Number(feeMin) : null,
      monthlyFeeMax: feeMax ? Number(feeMax) : null,
      verifiedAt: draft.verifiedAt.trim() || null,
      verifiedNote: draft.verifiedNote.trim() || null,
      internalMemo: draft.internalMemo.trim() || null,
    });
  }

  const pending = pendingQuery.data ?? [];

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              反映待ちの下書き
              <Badge variant="secondary" className="ml-2">
                {pending.length}件
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              返信内容から用意された下書きです。読み込んでも本番は変わりません。内容を確認して
              「本番に反映する」を押したときだけ更新されます。
            </p>
            {pending.map((entry) => (
              <div key={entry.regNo} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{entry.orgName}</span>
                  <Badge variant="secondary">{entry.regNo}</Badge>
                  <span className="text-xs text-muted-foreground">
                    回答受領 {entry.receivedAt}
                  </span>
                  <Button size="sm" className="ml-auto" onClick={() => loadPending(entry)}>
                    フォームに読み込む
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {entry.sourceNote}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">掲載確認の反映</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            掲載確認メールで事業者本人から回答があった申告情報を反映します。機関名・所在地・
            電話番号など登録簿由来の項目はここでは変更できません（登録簿の転記を保つため）。
          </p>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="regNo">登録番号</Label>
              <Input
                id="regNo"
                value={regNoInput}
                onChange={(e) => setRegNoInput(e.target.value)}
                onKeyDown={(e) => {
                  // IME確定のEnterで誤送信しないようにする
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) load();
                }}
                placeholder="19登-000020"
                className="w-56"
              />
            </div>
            <Button onClick={load} disabled={orgQuery.isFetching}>
              <Search className="size-4" />
              {orgQuery.isFetching ? "読込中…" : "読み込む"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {org && draft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {org.name}
              <Badge variant="secondary">{org.regNo}</Badge>
              {org.verifiedAt && <Badge>確認済み</Badge>}
              {pendingOverride && <Badge variant="outline">下書き読込中（未反映）</Badge>}
              <a
                href={`/org/${org.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-normal underline text-muted-foreground"
              >
                掲載ページを開く
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">
              {org.prefecture} / {org.address} / {org.phone}
            </p>

            <div className="space-y-1.5">
              <Label>対応可能言語（「、」または改行区切り）</Label>
              <Textarea
                rows={2}
                value={draft.languages}
                onChange={(e) => setDraft({ ...draft, languages: e.target.value })}
              />
              {org.languagesRaw && (
                <p className="text-xs text-muted-foreground">
                  登録簿の原文: {org.languagesRaw}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>対応分野</Label>
              <div className="flex flex-wrap gap-1.5">
                {TOKUTEI_FIELDS.map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant={draft.fields.includes(f) ? "default" : "outline"}
                    onClick={() => setDraft({ ...draft, fields: toggle(draft.fields, f) })}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setDraft({ ...draft, fields: [...TOKUTEI_FIELDS] })}
                >
                  全分野を選択
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft({ ...draft, fields: [] })}
                >
                  クリア
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>希望分野（機関からの申告）</Label>
              <div className="flex gap-2 pb-1">
                <Button
                  type="button"
                  size="sm"
                  variant={draft.preferredAllFields ? "default" : "outline"}
                  onClick={() =>
                    setDraft({ ...draft, preferredAllFields: !draft.preferredAllFields })
                  }
                >
                  全分野
                </Button>
              </div>
              {!draft.preferredAllFields && (
                <div className="flex flex-wrap gap-1.5">
                  {TOKUTEI_FIELDS.map((f) => (
                    <Button
                      key={f}
                      type="button"
                      size="sm"
                      variant={draft.preferredFields.includes(f) ? "default" : "outline"}
                      onClick={() =>
                        setDraft({ ...draft, preferredFields: toggle(draft.preferredFields, f) })
                      }
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>希望エリア（「全国」/都道府県名/地方名）</Label>
                <Textarea
                  rows={2}
                  value={draft.preferredRegions}
                  onChange={(e) => setDraft({ ...draft, preferredRegions: e.target.value })}
                  placeholder="全国"
                />
              </div>
              <div className="space-y-1.5">
                <Label>相談ステータス</Label>
                <Select
                  value={draft.consultStatus}
                  onValueChange={(v) => setDraft({ ...draft, consultStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULT_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>希望条件の備考（公開）</Label>
              <Textarea
                rows={2}
                value={draft.preferredNote}
                onChange={(e) => setDraft({ ...draft, preferredNote: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>公式サイトURL</Label>
                <Input
                  value={draft.websiteUrl}
                  onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
                  placeholder="https://example.com/"
                />
              </div>
              <div className="space-y-1.5">
                <Label>支援料 下限（円/人・月）</Label>
                <Input
                  inputMode="numeric"
                  value={draft.monthlyFeeMin}
                  onChange={(e) => setDraft({ ...draft, monthlyFeeMin: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>支援料 上限（円/人・月）</Label>
                <Input
                  inputMode="numeric"
                  value={draft.monthlyFeeMax}
                  onChange={(e) => setDraft({ ...draft, monthlyFeeMax: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>運営確認日（空欄にすると確認済み表示を取り下げます）</Label>
              <Input
                type="date"
                value={draft.verifiedAt}
                onChange={(e) => setDraft({ ...draft, verifiedAt: e.target.value })}
                className="w-48"
              />
            </div>

            <div className="space-y-1.5">
              <Label>確認情報（掲載ページに公開されます）</Label>
              <Textarea
                rows={8}
                value={draft.verifiedNote}
                onChange={(e) => setDraft({ ...draft, verifiedNote: e.target.value })}
                placeholder="対応分野: 全分野。対応地域: 全国。…（出典を末尾に明記する）"
              />
              <p className="text-xs text-muted-foreground">
                事業者本人の申告であることが分かるよう、末尾に出典を書く。
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>社内メモ（非公開）</Label>
              <Textarea
                rows={3}
                value={draft.internalMemo}
                onChange={(e) => setDraft({ ...draft, internalMemo: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                公開ページ・API・構造化データには出力されません。
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={submit} disabled={save.isPending}>
                {save.isPending ? "反映中…" : "本番に反映する"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => orgQuery.refetch()}
                disabled={orgQuery.isFetching}
              >
                入力を破棄して再読込
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
