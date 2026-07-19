import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Calendar, ExternalLink } from "lucide-react";
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
 */
export default function ColumnArticle() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: article, isLoading } = trpc.articles.bySlug.useQuery(
    { slug },
    { enabled: slug.length > 0 }
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

  return (
    <div className="container max-w-3xl py-10">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/columns" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
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
          <h1 className="text-2xl md:text-3xl font-bold leading-snug mb-3">
            {article.title}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            内容確認基準日：{article.baseDate}
          </p>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-table:text-sm prose-a:text-primary">
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
