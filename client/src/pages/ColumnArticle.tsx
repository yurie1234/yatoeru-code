import { useMemo } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ListOrdered,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import NotFound from "./NotFound";

/**
 * DB保存の動的コラム記事ページ（/columns/:slug）。
 * 週2回のAGENT cronが投稿する記事をMarkdownで描画する。
 * 既存の静的4本はApp.tsxで先にマッチするため、ここには来ない。
 *
 * 可読性の工夫:
 * - 冒頭「この記事のポイント」ボックス（keyPoints）
 * - h2見出しから自動生成する目次
 * - 本文17〜18px・行間1.9の article-body スタイル（index.css）
 * - strongに琥珀色のマーカー下線、h2に藍紺の帯＋琥珀ボーダー
 */

/** Markdown本文からh2見出しを抽出（目次用） */
function extractH2(bodyMd: string): string[] {
  return bodyMd
    .split("\n")
    .filter((line) => /^## /.test(line))
    .map((line) => line.replace(/^## /, "").trim());
}

/** 見出しテキスト→アンカーID（Streamdownのheading id生成と揃える簡易版） */
export function headingId(text: string): string {
  return `h-${encodeURIComponent(text.replace(/\s+/g, "-").toLowerCase())}`;
}

export default function ColumnArticle() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: article, isLoading } = trpc.articles.bySlug.useQuery(
    { slug },
    { enabled: slug.length > 0 }
  );

  const toc = useMemo(
    () => (article ? extractH2(article.bodyMd) : []),
    [article]
  );

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-10 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!article) {
    return <NotFound />;
  }

  const keyPoints = (article.keyPoints ?? []) as string[];

  return (
    <div className="container max-w-3xl py-10">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link
          href="/columns"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          コラム一覧に戻る
        </Link>
      </nav>

      <article>
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            {(article.tags ?? []).map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
          <h1 className="text-[26px] md:text-[32px] font-bold leading-snug mb-3">
            {article.title}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            内容確認基準日：{article.baseDate}
          </p>
        </header>

        {keyPoints.length > 0 && (
          <section
            aria-label="この記事のポイント"
            className="mb-8 rounded-xl border-2 border-amber-accent/50 bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 md:p-6 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-base md:text-lg font-bold text-primary mb-3">
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
              この記事のポイント
            </h2>
            <ul className="space-y-2.5">
              {keyPoints.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2.5 text-[15px] md:text-base leading-relaxed font-medium text-foreground"
                >
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {toc.length >= 3 && (
          <nav
            aria-label="目次"
            className="mb-10 rounded-xl border bg-secondary/60 p-5"
          >
            <h2 className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-3">
              <ListOrdered className="h-4 w-4" />
              目次
            </h2>
            <ol className="space-y-1.5 list-none">
              {toc.map((h, i) => (
                <li key={h} className="text-[15px] leading-relaxed">
                  <span className="inline-block w-6 font-bold text-amber-600">
                    {i + 1}.
                  </span>
                  <span className="text-foreground/90">{h}</span>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="article-body">
          <Streamdown>{article.bodyMd}</Streamdown>
        </div>

        {(article.sources ?? []).length > 0 && (
          <section className="mt-10 rounded-lg border bg-muted/40 p-5">
            <h2 className="text-sm font-semibold mb-3">出典・参考（一次情報）</h2>
            <ul className="space-y-1.5 text-sm">
              {(article.sources ?? []).map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {s.name}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Card className="mt-10 border-primary/30 bg-primary/5">
          <CardContent className="pt-6 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="font-semibold mb-1">
                自社の場合の費用・助成金・支援機関を知りたい方へ
              </p>
              <p className="text-sm text-muted-foreground">
                会社名かURLを入れるだけ。30秒でまとめて無料診断できます。
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/diagnose">
                無料診断をはじめる
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
