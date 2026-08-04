import { useAuth } from "@/_core/hooks/useAuth";
import AdminOrgListingEditor from "@/components/AdminOrgListingEditor";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BadgeJapaneseYen,
  Building2,
  Download,
  LayoutDashboard,
  MailOpen,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateJa } from "@/lib/utils";

function formatYen(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}億円`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}万円`;
  return `${n.toLocaleString()}円`;
}

const EVENT_LABELS: Record<string, string> = {
  org_detail_view: "詳細閲覧",
  consult_submit: "個別相談送信",
  bulk_consult_submit: "一括相談送信",
  phone_tap: "電話タップ",
  website_click: "外部サイトクリック",
  diagnose_start: "診断開始",
  diagnose_complete: "診断完了",
  proposal_generate: "提案書生成",
};

const STATUS_LABELS: Record<string, string> = {
  new: "新規",
  sent: "送客済",
  closed: "成約",
  active: "契約中",
  cancelled: "解約",
};

export default function Admin() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: kpi, isLoading: kpiLoading } = trpc.admin.kpi.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: consultationList } = trpc.admin.consultationList.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: planList } = trpc.admin.planApplicationList.useQuery(undefined, {
    enabled: isAdmin,
  });

  // GA4運営者除外フラグ（localStorage.yt_exclude）
  const [gaExcluded, setGaExcluded] = useState(() => {
    try {
      return localStorage.getItem("yt_exclude") === "1";
    } catch {
      return false;
    }
  });
  const toggleGaExclude = () => {
    try {
      if (gaExcluded) {
        localStorage.removeItem("yt_exclude");
        (window as unknown as Record<string, unknown>)["ga-disable-G-64NQW74LWS"] = false;
        setGaExcluded(false);
      } else {
        localStorage.setItem("yt_exclude", "1");
        (window as unknown as Record<string, unknown>)["ga-disable-G-64NQW74LWS"] = true;
        setGaExcluded(true);
      }
    } catch {
      // localStorage不可環境では何もしない
    }
  };

  // 月次レポート：対象年月（JST）
  const now = new Date();
  const [reportYm, setReportYm] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [reportYear, reportMonth] = reportYm.split("-").map(Number);
  const { data: report, isLoading: reportLoading } = trpc.events.monthlyReport.useQuery(
    { year: reportYear, month: reportMonth },
    { enabled: isAdmin },
  );

  // 直近12ヶ月の候補
  const ymOptions = useMemo(() => {
    const opts: string[] = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  // 機関別にピボット（行＝機関、列＝イベント種別）
  const orgPivot = useMemo(() => {
    if (!report) return [];
    const map = new Map<number, { orgName: string; regNo: string; counts: Record<string, number>; total: number }>();
    for (const r of report.orgRows) {
      if (r.orgId == null) continue;
      const cur = map.get(r.orgId) ?? { orgName: r.orgName ?? `#${r.orgId}`, regNo: r.regNo ?? "", counts: {}, total: 0 };
      cur.counts[r.eventType] = (cur.counts[r.eventType] ?? 0) + Number(r.count);
      cur.total += Number(r.count);
      map.set(r.orgId, cur);
    }
    return Array.from(map.entries())
      .map(([orgId, v]) => ({ orgId, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [report]);

  // 個社別営業サマリー（掲載確認メール差し込み用）
  const [summaryOrgIdInput, setSummaryOrgIdInput] = useState("");
  const [summaryOrgId, setSummaryOrgId] = useState<number | null>(null);
  const { data: orgSummary, isLoading: summaryLoading } = trpc.events.orgSummary.useQuery(
    { orgId: summaryOrgId ?? 0, months: 6 },
    { enabled: isAdmin && summaryOrgId != null && summaryOrgId > 0 },
  );
  const summaryText = useMemo(() => {
    if (!orgSummary?.org) return "";
    const totalMap: Record<string, number> = {};
    for (const t of orgSummary.totals) totalMap[t.eventType] = Number(t.count);
    const monthlyViews = new Map<string, number>();
    for (const m of orgSummary.monthly) {
      if (m.eventType === "org_detail_view") {
        monthlyViews.set(m.ym, (monthlyViews.get(m.ym) ?? 0) + Number(m.count));
      }
    }
    const lines = [
      `【${orgSummary.org.name}】（${orgSummary.org.regNo}）のヤトエル掲載ページ実績`,
      `・詳細ページ閲覧（累計）: ${(totalMap["org_detail_view"] ?? 0).toLocaleString()}回`,
      `・相談送信（累計）: ${((totalMap["consult_submit"] ?? 0) + (totalMap["bulk_consult_submit"] ?? 0)).toLocaleString()}件`,
      `・電話タップ（累計）: ${(totalMap["phone_tap"] ?? 0).toLocaleString()}回 / サイトクリック（累計）: ${(totalMap["website_click"] ?? 0).toLocaleString()}回`,
      `・月別閲覧: ${Array.from(monthlyViews.entries()).map(([ym, c]) => `${ym.replace("-", "年")}月 ${c}回`).join(" / ") || "まだありません"}`,
      `＊bot・クローラー・運営者アクセスを除外したファーストパーティ計測値です。`,
    ];
    return lines.join("\n");
  }, [orgSummary]);

  const downloadCsv = () => {
    const evCols = ["org_detail_view", "consult_submit", "bulk_consult_submit", "phone_tap", "website_click"];
    const header = ["機関ID", "機関名", "登録番号", ...evCols.map((c) => EVENT_LABELS[c] ?? c), "合計"];
    const lines = [header.join(",")];
    for (const row of orgPivot) {
      lines.push([
        row.orgId,
        `"${row.orgName.replace(/"/g, '""')}"`,
        row.regNo,
        ...evCols.map((c) => row.counts[c] ?? 0),
        row.total,
      ].join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `yatoeru_org_report_${reportYm}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!loading && user && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">
          このページは管理者専用です。
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-brand" />
            KPIダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            リード獲得・売上・Exit指標をモニタリングします。
          </p>
          <div className="mt-3 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 w-fit">
            <div className="text-sm">
              <span className="font-medium">このブラウザを計測から除外（GA4）</span>
              <span className="text-xs text-muted-foreground ml-2">
                現在: {gaExcluded ? "除外中（カウントされません）" : "計測対象"}
              </span>
            </div>
            <Button
              size="sm"
              variant={gaExcluded ? "secondary" : "outline"}
              onClick={toggleGaExclude}
            >
              {gaExcluded ? "除外を解除" : "除外する"}
            </Button>
          </div>
        </div>

        {kpiLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : kpi ? (
          <>
            {/* 主要KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <MailOpen className="h-4 w-4" />月間相談件数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpi.monthlyConsultations}</div>
                  <p className="text-xs text-muted-foreground mt-1">累計 {kpi.totalConsultations}件</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />月間チェック数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpi.monthlyDiagnoses}</div>
                  <p className="text-xs text-muted-foreground mt-1">累計 {kpi.totalDiagnoses}件</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Target className="h-4 w-4" />チェック→相談CVR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpi.cvr.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">目標 20%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />掲載機関数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpi.totalOrgs.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">うち有料 {kpi.paidOrgs}件</p>
                </CardContent>
              </Card>
            </div>

            {/* 売上・Exit指標 */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-brand/20 border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <BadgeJapaneseYen className="h-4 w-4 text-brand" />月間想定売上
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-3">{formatYen(kpi.monthlyRevenue)}</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>リード想定売上（{kpi.monthlyConsultations}件 × {formatYen(kpi.assumedLeadPrice)}）</span>
                      <span className="font-medium text-foreground">{formatYen(kpi.monthlyLeadRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>有料プランMRR</span>
                      <span className="font-medium text-foreground">{formatYen(kpi.mrrFromPlans)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-accent/40 border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-amber-accent" />Exit想定バリュエーション
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-3">
                    {formatYen(kpi.exitBase)}
                    <span className="text-base font-medium text-muted-foreground"> 〜 {formatYen(kpi.exitBull)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    想定年間営業利益（月間売上×12×利益率70%）× マルチプル6〜12倍で算出。
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* リード一覧 */}
            <Tabs defaultValue="consultations">
              <TabsList>
                <TabsTrigger value="consultations">相談リード</TabsTrigger>
                <TabsTrigger value="plans">有料プラン申込</TabsTrigger>
                <TabsTrigger value="report">月次レポート</TabsTrigger>
                <TabsTrigger value="listing">掲載確認の反映</TabsTrigger>
              </TabsList>
              <TabsContent value="listing">
                <AdminOrgListingEditor />
              </TabsContent>
              <TabsContent value="consultations">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>受付日</TableHead>
                          <TableHead>会社名</TableHead>
                          <TableHead>分野</TableHead>
                          <TableHead>相談先数</TableHead>
                          <TableHead>ステータス</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consultationList && consultationList.length > 0 ? (
                          consultationList.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs">
                                {formatDateJa(c.createdAt, { month: "2-digit" })}
                              </TableCell>
                              <TableCell className="font-medium">{c.companyName}</TableCell>
                              <TableCell>{c.field ?? "-"}</TableCell>
                              <TableCell>{Array.isArray(c.orgIds) ? c.orgIds.length : "-"}社</TableCell>
                              <TableCell>
                                <Badge variant={c.status === "new" ? "default" : "secondary"}>
                                  {STATUS_LABELS[c.status] ?? c.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                              相談リードはまだありません
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="plans">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>申込日</TableHead>
                          <TableHead>機関名</TableHead>
                          <TableHead>プラン</TableHead>
                          <TableHead>連絡先</TableHead>
                          <TableHead>ステータス</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planList && planList.length > 0 ? (
                          planList.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-xs">
                                {formatDateJa(p.createdAt, { month: "2-digit" })}
                              </TableCell>
                              <TableCell className="font-medium">{p.orgName}</TableCell>
                              <TableCell>
                                <Badge variant={p.plan === "premium" ? "default" : "secondary"}>
                                  {p.plan === "premium" ? "プレミアム" : "スタンダード"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{p.email}</TableCell>
                              <TableCell>
                                <Badge variant={p.status === "new" ? "default" : "secondary"}>
                                  {STATUS_LABELS[p.status] ?? p.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                              申込はまだありません
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="report">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base">機関別問い合わせレポート（ファーストパーティ計測）</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={reportYm} onValueChange={setReportYm}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ymOptions.map((ym) => (
                            <SelectItem key={ym} value={ym}>{ym.replace("-", "年")}月</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={downloadCsv} disabled={orgPivot.length === 0}>
                        <Download className="h-4 w-4 mr-1" /> CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {reportLoading ? (
                      <div className="p-6"><Skeleton className="h-24 w-full" /></div>
                    ) : (
                      <>
                        {report && report.siteRows.length > 0 && (
                          <div className="px-6 pb-2 flex flex-wrap gap-2">
                            {report.siteRows.map((s) => (
                              <Badge key={s.eventType} variant="secondary" className="font-normal">
                                {EVENT_LABELS[s.eventType] ?? s.eventType}：{Number(s.count).toLocaleString()}件
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>機関名</TableHead>
                              <TableHead className="text-right">詳細閲覧</TableHead>
                              <TableHead className="text-right">相談送信</TableHead>
                              <TableHead className="text-right">一括相談</TableHead>
                              <TableHead className="text-right">合計</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orgPivot.length > 0 ? (
                              orgPivot.map((row) => (
                                <TableRow key={row.orgId}>
                                  <TableCell className="font-medium">
                                    {row.orgName}
                                    <span className="block text-[10px] text-muted-foreground">{row.regNo}</span>
                                  </TableCell>
                                  <TableCell className="text-right">{row.counts["org_detail_view"] ?? 0}</TableCell>
                                  <TableCell className="text-right">{row.counts["consult_submit"] ?? 0}</TableCell>
                                  <TableCell className="text-right">{row.counts["bulk_consult_submit"] ?? 0}</TableCell>
                                  <TableCell className="text-right font-medium">{row.total}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                  この月の計測データはまだありません
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base">個社別営業サマリー（掲載確認メール・月次レポート差し込み用）</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-40"
                        placeholder="機関ID（例: 30001）"
                        value={summaryOrgIdInput}
                        onChange={(e) => setSummaryOrgIdInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = Number(summaryOrgIdInput);
                            if (Number.isInteger(v) && v > 0) setSummaryOrgId(v);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const v = Number(summaryOrgIdInput);
                          if (Number.isInteger(v) && v > 0) setSummaryOrgId(v);
                        }}
                      >
                        集計を表示
                      </Button>
                      {summaryText && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard.writeText(summaryText).then(() => {
                              toast.success("サマリーをコピーしました");
                            });
                          }}
                        >
                          テキストをコピー
                        </Button>
                      )}
                    </div>
                    {summaryLoading && summaryOrgId ? (
                      <Skeleton className="h-24 w-full" />
                    ) : summaryOrgId && orgSummary && !orgSummary.org ? (
                      <p className="text-sm text-muted-foreground">機関ID {summaryOrgId} は見つかりませんでした。</p>
                    ) : summaryText ? (
                      <pre className="text-sm bg-muted/40 rounded-lg p-4 whitespace-pre-wrap font-sans">{summaryText}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        機関IDを入力すると、その機関の閲覧・問い合わせ実績（bot・運営者除外済み）をメール差し込み用テキストで出力します。機関IDは各機関詳細ページのURL（/org/○○）の番号です。
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
