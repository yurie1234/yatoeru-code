import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/track";
import { formatDateJa } from "@/lib/utils";
import { parseVerifiedNote } from "@shared/verifiedNote";
import { CheckCircle2, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 運営が事業者本人に確認した情報のパネル。
 *
 * 以前は確認内容を1つの段落に詰めて表示していたため、項目の境目が分からず
 * 読めなかった。管理画面の入力フォームと同じく「ラベル＋値」を1項目1行で並べる。
 */

type Props = {
  verifiedAt: string | Date;
  verifiedNote?: string | null;
  consultStatus?: string | null;
  preferredFields?: string[] | null;
  preferredRegions?: string[] | null;
  preferredNote?: string | null;
  websiteUrl?: string | null;
  orgId: number;
};

const CONSULT_STATUS_LABELS: Record<string, string> = {
  open: "受付中",
  open_active: "受付中（積極受入）",
  paused: "一時停止中",
};

function Row({ label, children }: { label: string | null; children: ReactNode }) {
  // ラベルの無い行（旧データの本文）はラベル列を空けず、全幅で表示する
  if (!label) {
    return (
      <div className="border-t border-emerald-600/20 py-2.5 first:border-t-0 first:pt-0">
        <dd className="text-sm leading-relaxed">{children}</dd>
      </div>
    );
  }

  return (
    <div className="grid gap-1 border-t border-emerald-600/20 py-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-emerald-900/80 dark:text-emerald-200/80">{label}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

export default function VerifiedInfoPanel({
  verifiedAt,
  verifiedNote,
  consultStatus,
  preferredFields,
  preferredRegions,
  preferredNote,
  websiteUrl,
  orgId,
}: Props) {
  const { rows, footnotes } = parseVerifiedNote(verifiedNote);

  return (
    <div className="mb-5 rounded-lg border-2 border-emerald-500/40 bg-emerald-50 p-4 md:p-5 dark:bg-emerald-950/30">
      <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        掲載情報 運営確認済み：{formatDateJa(verifiedAt)}
      </div>
      <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
        以下の項目は、運営が事業者に直接確認した情報です（登録簿由来の情報とは区別して表示しています）。
      </p>

      <dl className="mt-4 text-emerald-900 dark:text-emerald-100">
        {consultStatus && consultStatus !== "unknown" && (
          <Row label="新規受入企業の相談">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              {CONSULT_STATUS_LABELS[consultStatus] ?? consultStatus}
            </Badge>
          </Row>
        )}

        {preferredFields && preferredFields.length > 0 && (
          <Row label="相談を希望する業種">
            <div className="flex flex-wrap gap-1">
              {preferredFields.map((f) => (
                <Badge key={f} variant="outline" className="border-emerald-500/50 font-normal">
                  {f}
                </Badge>
              ))}
            </div>
          </Row>
        )}

        {preferredRegions && preferredRegions.length > 0 && (
          <Row label="相談を希望する地域">
            <div className="flex flex-wrap gap-1">
              {preferredRegions.map((r) => (
                <Badge key={r} variant="outline" className="border-emerald-500/50 font-normal">
                  {r}
                </Badge>
              ))}
            </div>
          </Row>
        )}

        {rows.map((row, i) => (
          <Row key={`${row.label ?? "note"}-${i}`} label={row.label}>
            {row.value}
          </Row>
        ))}

        {preferredNote && <Row label="備考">{preferredNote}</Row>}

        {websiteUrl && (
          <Row label="公式サイト">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("website_click", orgId)}
              className="inline-flex items-center gap-1 underline decoration-emerald-600/40 underline-offset-2 hover:decoration-emerald-600"
            >
              {websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Row>
        )}
      </dl>

      {footnotes.length > 0 && (
        <div className="mt-3 border-t border-emerald-600/20 pt-3">
          {footnotes.map((n, i) => (
            <p
              key={i}
              className="text-xs leading-relaxed text-emerald-800/70 dark:text-emerald-300/70"
            >
              ※{n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
