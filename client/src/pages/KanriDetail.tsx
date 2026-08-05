import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { KANRI_PERMIT_LABEL, KANRI_STATUS_LABEL, parseKanriId } from "@shared/kanri";
import { AlertTriangle, ArrowLeft, ExternalLink, MapPin, Phone } from "lucide-react";
import { Link, useParams } from "wouter";

/**
 * 監理団体（監理支援機関）の詳細ページ。
 *
 * 2026-08-05 に ikusei.yatoeru.jp（Astroの静的スナップショット）から本体へ寄せた。
 * 寄せた理由は速さではなく**1つの真実**にすること。移行状況の回答はこのサイトのDBに
 * 入るのに、公開ページは別サイトの静的スナップショットだったため、
 * 団体が回答しても画面は「未確認」のままだった（CSVを手で更新して再ビルドするまで）。
 * 経緯は my-scripts の `ops/22-kanri-yoseru.md`。
 */

const STATUS_CLASS: Record<string, string> = {
  permitted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  applying: "bg-blue-100 text-blue-800 border-blue-300",
  preparing: "bg-amber-100 text-amber-800 border-amber-300",
  planned: "bg-amber-100 text-amber-800 border-amber-300",
  undecided: "bg-muted text-muted-foreground border-border",
  not_migrating: "bg-red-100 text-red-800 border-red-300",
  unconfirmed: "bg-muted text-muted-foreground border-border",
};

export default function KanriDetail() {
  const params = useParams<{ managementId: string }>();
  const managementId = parseKanriId(params.managementId ?? "");
  const query = trpc.kanri.byId.useQuery(
    { managementId: managementId ?? "" },
    { enabled: Boolean(managementId) }
  );

  const org = query.data;

  if (!managementId || (query.isError && !org)) {
    return (
      <SiteLayout>
        <div className="container max-w-3xl py-16 text-center">
          <h1 className="text-2xl font-bold mb-3">この監理団体の掲載が見つかりません</h1>
          <p className="text-muted-foreground mb-6">
            URLが変わった、または掲載が終了した可能性があります。一覧からお探しください。
          </p>
          <Button asChild>
            <Link href="/ikusei-shuro/kanri-shien-kikan/list">監理団体の一覧・移行状況トラッカーへ</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  if (!org) {
    return (
      <SiteLayout>
        <div className="container max-w-4xl py-10 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </SiteLayout>
    );
  }

  const permit = KANRI_PERMIT_LABEL[org.permitType] ?? "監理事業";
  const statusLabel = KANRI_STATUS_LABEL[org.migrationStatus] ?? "未確認";
  const jobCodes = (org.jobCodes ?? []) as string[];
  const countries = (org.receiveCountries ?? "")
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <SiteLayout>
      <div className="container max-w-4xl py-8 space-y-6">
        <Link
          href="/ikusei-shuro/kanri-shien-kikan/list"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          一覧・移行状況トラッカーに戻る
        </Link>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline">{permit}</Badge>
            <Badge variant="outline" className={STATUS_CLASS[org.migrationStatus] ?? ""}>
              監理支援機関への移行：{statusLabel}
            </Badge>
            {org.isVerified && <Badge className="bg-brand text-brand-foreground">運営確認済み</Badge>}
            {org.hasPenalty && (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                処分公表あり
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{org.name}</h1>
          {org.nameKana && <p className="text-sm text-muted-foreground mt-1">{org.nameKana}</p>}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-base leading-none font-semibold">基本情報</h2>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <dt className="text-muted-foreground">管理ID</dt>
                <dd className="font-medium">{org.managementId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">許可区分</dt>
                <dd className="font-medium">{permit}</dd>
              </div>
              {org.address && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">所在地</dt>
                  <dd className="font-medium inline-flex items-start gap-1">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    {org.address}
                  </dd>
                </div>
              )}
              {org.phone && (
                <div>
                  <dt className="text-muted-foreground">電話番号</dt>
                  <dd className="font-medium">
                    <a href={`tel:${org.phone}`} className="inline-flex items-center gap-1 text-brand underline">
                      <Phone className="h-4 w-4" />
                      {org.phone}
                    </a>
                  </dd>
                </div>
              )}
              {org.permitDate && (
                <div>
                  <dt className="text-muted-foreground">許可年月日</dt>
                  <dd className="font-medium">{org.permitDate}</dd>
                </div>
              )}
              {org.permitExpiry && (
                <div>
                  <dt className="text-muted-foreground">許可の有効期限</dt>
                  <dd className="font-medium">{org.permitExpiry}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {(countries.length > 0 || jobCodes.length > 0 || org.kaigoSupport) && (
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-base leading-none font-semibold">受入れ国・技能実習の対象職種</h2>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              {countries.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1">受入れ国</div>
                  <div className="flex flex-wrap gap-1.5">
                    {countries.map((c) => (
                      <Badge key={c} variant="secondary">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {org.kaigoSupport && (
                <div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">介護職種に対応</Badge>
                </div>
              )}
              {jobCodes.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1">2号移行対象職種コード</div>
                  <p className="leading-relaxed">{jobCodes.join(", ")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    コードの職種名は外国人技能実習機構が公表する凡例をご確認ください。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-brand/20">
          <CardHeader className="pb-2">
            <h2 className="text-base leading-none font-semibold">監理支援機関への移行状況</h2>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              現在の掲載：<strong>{statusLabel}</strong>
              {org.statusConfirmedAt && `（${org.statusConfirmedAt} 確認）`}
            </p>
            {org.statusNote && <p className="text-muted-foreground leading-relaxed">{org.statusNote}</p>}
            <p className="text-muted-foreground leading-relaxed">
              2027年4月1日の育成就労制度の施行に伴い、監理団体は「監理支援機関」の許可を新たに取得する必要があります。
              施行日前の許可申請は2026年4月15日に受付が開始されています。
              公的な許可済み一覧はまだ公表されていないため、当サイトでは各団体への確認により状況を掲載しています。
            </p>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="font-medium mb-1">この団体のご担当者様へ</p>
              <p className="text-muted-foreground leading-relaxed mb-3">
                移行状況のご連絡は無料で、ご回答いただいた内容はこのページに反映します。掲載の順番が費用で変わることはありません。
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/ikusei-shuro/for-kanri-dantai">移行状況を知らせる（無料）</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-base leading-none font-semibold">出典</h2>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <p>
              基本情報は外国人技能実習機構（OTIT）が公表する「監理団体一覧（一般監理事業・特定監理事業）」に基づいています
              {org.sourceDate && `（取得日：${org.sourceDate}）`}。
            </p>
            <p>
              <a
                href="https://www.otit.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline inline-flex items-center gap-0.5"
              >
                外国人技能実習機構の公式サイト
                <ExternalLink className="h-3 w-3" />
              </a>
              で最新の許可状況をご確認いただけます。
            </p>
            <p>
              移行状況は当サイトの独自確認によるもので、許可の有無を証明するものではありません。
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/ikusei-shuro/kanri-shien-kikan/list">同じ地域の他の団体を見る</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/guide/kanri-shien-kikan">監理支援機関とは（制度の解説）</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
