import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { REFERRAL_INTENT_LABELS, type ReferralIntent } from "@shared/referralIntent";

/**
 * 送客先候補の一覧。**運用画面専用**。
 *
 * 相談リードが来たときの手動振り分けと、営業の優先順位づけに使う。
 * 紹介料の意向は公開ページ・API・親和性スコア・並び順には一切出さない
 * （出すならPR表示のある別枠が必要：景品表示法のステマ規制）。
 */

const CONSULT_STATUS_LABELS: Record<string, string> = {
  unknown: "未確認",
  open: "受付中",
  open_active: "受付中（積極受入）",
  paused: "一時停止",
};

export default function AdminReferralTargets() {
  const { data, isLoading } = trpc.admin.referralTargets.useQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          送客先候補
          {data?.rows.length ? (
            <Badge variant="secondary" className="ml-2">
              {data.rows.length}件
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          紹介料の意向が確認できている機関です。相談リードの振り分けと営業の優先順位づけに
          使います。この情報は掲載ページ・API・親和性スコア・並び順には一切出していません。
          紹介料で検索順位を動かす場合は、景品表示法（ステマ規制）対応としてPR表示のある
          別枠が必要です。
        </p>

        {data?.applied === false && (
          <p className="text-xs font-medium text-amber-700">
            DB列が未適用です。Railway Console で node scripts/apply-referral-intent-columns.mjs を実行すると使えるようになります。
          </p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>機関名</TableHead>
              <TableHead>所在地</TableHead>
              <TableHead>紹介料の意向</TableHead>
              <TableHead>相談ステータス</TableHead>
              <TableHead>メモ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  読込中…
                </TableCell>
              </TableRow>
            ) : data && data.rows.length > 0 ? (
              data.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <a href={`/org/${r.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {r.name}
                    </a>
                    <span className="ml-2 text-xs text-muted-foreground">{r.regNo}</span>
                  </TableCell>
                  <TableCell className="text-xs">{r.prefecture ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={r.intent === "agreed" ? "default" : "secondary"}>
                      {REFERRAL_INTENT_LABELS[r.intent as ReferralIntent] ?? r.intent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {CONSULT_STATUS_LABELS[r.consultStatus] ?? r.consultStatus}
                  </TableCell>
                  <TableCell className="text-xs whitespace-pre-wrap">{r.note ?? "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  意向を登録した機関はまだありません（「掲載確認の反映」タブで登録できます）
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
