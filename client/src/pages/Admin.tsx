import { useAuth } from "@/_core/hooks/useAuth";
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
import {
  BadgeJapaneseYen,
  Building2,
  LayoutDashboard,
  MailOpen,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

function formatYen(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}億円`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}万円`;
  return `${n.toLocaleString()}円`;
}

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
                    <Sparkles className="h-4 w-4" />月間AI診断数
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
                    <Target className="h-4 w-4" />診断→相談CVR
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
              </TabsList>
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
                                {new Date(c.createdAt).toLocaleDateString("ja-JP")}
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
                                {new Date(p.createdAt).toLocaleDateString("ja-JP")}
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
            </Tabs>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
