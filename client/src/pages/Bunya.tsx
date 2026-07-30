import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc";
import { getBunyaPage } from "@shared/bunya";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FileText,
  ListChecks,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "wouter";

function OrgCard({
  org,
}: {
  org: {
    id: number;
    name: string;
    prefecture: string | null;
    regNo: string;
    languages: unknown;
    verifiedAt?: Date | string | null;
  };
}) {
  const langs = Array.isArray(org.languages) ? (org.languages as string[]) : [];
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/org/${org.id}`}
              className="font-semibold text-foreground hover:text-primary hover:underline"
            >
              {org.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {org.prefecture ?? "所在地情報なし"}
              {org.regNo ? `｜登録番号 ${org.regNo}` : ""}
            </p>
            {langs.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                対応言語：{langs.join("・")}
              </p>
            ) : null}
          </div>
          {org.verifiedAt ? (
            <Badge className="shrink-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <BadgeCheck className="mr-1 h-3 w-3" />
              確認済み
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Bunya() {
  const params = useParams<{ slug: string }>();
  const page = getBunyaPage(params.slug ?? "");

  const { data: orgData, isLoading } = trpc.orgs.search.useQuery(
    { field: page?.field ?? "", page: 1, limit: 10 },
    { enabled: !!page }
  );
  const fieldCount = orgData?.total ?? 0;
  const needFallback = !isLoading && (orgData?.items.length ?? 0) === 0;
  const { data: fallbackData, isLoading: fallbackLoading } =
    trpc.orgs.search.useQuery(
      { page: 1, limit: 6 },
      { enabled: !!page && needFallback }
    );

  useEffect(() => {
    if (!page) return;
    document.title = `${page.title} - ヤトエル`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", page.description);
    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "bunya-faq-jsonld";
    script.textContent = JSON.stringify(faq);
    document.getElementById("bunya-faq-jsonld")?.remove();
    document.head.appendChild(script);
    return () => {
      document.getElementById("bunya-faq-jsonld")?.remove();
    };
  }, [page]);

  if (!page) {
    return (
      <SiteLayout>
        <div className="container py-16 text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-bold">ページが見つかりません</h1>
          <p className="mt-2 text-muted-foreground">
            分野特化ページのURLをご確認ください。
          </p>
          <Button asChild className="mt-6">
            <Link href="/search">支援機関を探す</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      {/* ヒーロー */}
      <section className="bg-primary text-primary-foreground">
        <div className="container py-10 md:py-14">
          <nav className="mb-4 text-sm text-primary-foreground/70">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span className="mx-2">/</span>
            <Link href="/search" className="hover:underline">
              支援機関を探す
            </Link>
            <span className="mx-2">/</span>
            <span>{page.field}</span>
          </nav>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-400 text-amber-950 hover:bg-amber-400">
              {page.badge ?? "2024年3月新設分野"}
            </Badge>
            <Badge
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground"
            >
              所管：{page.basicTable.rows.find((r) => r[0] === "所管省庁")?.[1]?.split("（")[0] ?? ""}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-snug md:text-3xl">
            {page.h1}
          </h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-primary-foreground/85">
            {page.lead}
          </p>
        </div>
      </section>

      <div className="container max-w-5xl py-10 md:py-14">
        {/* ブロック1: 制度解説 */}
        <section>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <FileText className="h-5 w-5 text-primary" />
            制度解説：特定技能「{page.field}」とは
          </h2>
          <Card className="mt-4">
            <CardContent className="overflow-x-auto pt-5">
              <p className="mb-3 text-sm font-semibold text-muted-foreground">
                {page.basicTable.caption}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {page.basicTable.headers.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.basicTable.rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {row[0]}
                      </TableCell>
                      <TableCell className="leading-relaxed">{row[1]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="mt-6 space-y-6">
            {page.seido.map((sec) => (
              <div key={sec.heading}>
                <h3 className="text-lg font-semibold">{sec.heading}</h3>
                {sec.paragraphs.map((p, i) => (
                  <p key={i} className="mt-2 leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ブロック2: 対応支援機関一覧 */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="h-5 w-5 text-primary" />
            {page.field}分野に対応する登録支援機関
          </h2>
          <Card className="mt-4 border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-5 text-sm leading-relaxed text-emerald-900">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>「確認済み」バッジ</strong>
                  は、当サイトがメール・電話等で対応実績・受付状況を直接確認した機関のみに付与し、確認日を表示しています。
                  {page.isEstablished ? (
                    <>
                      登録支援機関の登録簿には対応分野が原則記載されないため、下記は
                      {page.field}
                      分野への対応を公開情報・取材情報から確認・推定できた機関です。実際の受付可否は各機関に直接ご確認ください。
                    </>
                  ) : (
                    <>
                      {page.field}
                      は新設分野のため、対応を明示する機関は現在
                      {isLoading ? "確認中" : `${fieldCount}件`}
                      です。件数が少ない場合も水増しせず、そのまま表示しています。
                    </>
                  )}
                </span>
              </p>
            </CardContent>
          </Card>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : (orgData?.items.length ?? 0) > 0 ? (
              orgData!.items.map((org: any) => <OrgCard key={org.id} org={org} />)
            ) : (
              <Card>
                <CardContent className="pt-5 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    {page.field}
                    分野への対応を登録簿・取材情報から確認できた機関は現在ありません。
                    {page.isEstablished
                      ? "登録簿には対応分野が原則記載されないため、実際には全国の多くの機関が対応しています。以下は全国の登録支援機関の一部です。"
                      : "分野が新しいため、対応実績のある機関はまだ限られます。以下は全国の登録支援機関の一部です。"}
                    分野対応の可否は各機関に直接ご確認いただくか、一括相談をご利用ください。
                  </p>
                </CardContent>
              </Card>
            )}
            {needFallback &&
              (fallbackLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                fallbackData?.items
                  .slice(0, 6)
                  .map((org: any) => <OrgCard key={org.id} org={org} />)
              ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/search?field=${encodeURIComponent(page.field)}`}>
                <Search className="mr-2 h-4 w-4" />
                {page.field}対応の機関を検索
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/field/${encodeURIComponent(page.field)}`}>
                {page.field}分野ページ（一覧版）
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ブロック3: 選び方 */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ListChecks className="h-5 w-5 text-primary" />
            支援機関の選び方：{page.field}分野特有の論点
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {page.erabikata.map((e, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-2 text-base">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    {e.point}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {e.detail}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ブロック4: 費用相場 */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            費用相場
          </h2>
          <Card className="mt-4">
            <CardContent className="overflow-x-auto pt-5">
              <p className="mb-3 text-sm font-semibold text-muted-foreground">
                {page.costTable.caption}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {page.costTable.headers.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.costTable.rows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell
                          key={j}
                          className={j === 0 ? "whitespace-nowrap font-medium" : "leading-relaxed"}
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {page.costNote}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ClipboardList className="h-5 w-5 text-primary" />
            よくある質問
          </h2>
          <div className="mt-4 space-y-4">
            {page.faqs.map((f, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Q. {f.q}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  A. {f.a}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 関連リンク・出典 */}
        <section className="mt-12">
          <h2 className="text-lg font-bold">関連ページ</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {page.related.map((r) => (
              <Button key={r.slug} asChild variant="outline" size="sm">
                <Link href={`/bunya/${r.slug}`}>
                  {r.label}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            ))}
            <Button asChild variant="outline" size="sm">
              <Link href="/ikusei-shuro">育成就労制度まとめ</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/consult">一括相談（無料）</Link>
            </Button>
          </div>
          <div className="mt-8 border-t pt-5">
            <p className="text-sm font-semibold text-muted-foreground">出典（一次情報）</p>
            <ul className="mt-2 space-y-1 text-sm">
              {page.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="mt-1 h-3 w-3 shrink-0" />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              内容確認基準日：2026年7月30日。試験名称・業務区分等の詳細は分野別運用方針・運用要領の最新版をご確認ください。
            </p>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
