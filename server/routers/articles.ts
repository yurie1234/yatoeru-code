import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { articles } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

/**
 * コラム記事（DB保存の動的記事）の公開API。
 * 既存の静的4本はコード内コンポーネントのままで、このルーターの対象外。
 */
export const articlesRouter = router({
  /** 公開記事一覧（新しい順）。本文は返さない（一覧カード用） */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select({
        slug: articles.slug,
        title: articles.title,
        description: articles.description,
        tags: articles.tags,
        baseDate: articles.baseDate,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.baseDate), desc(articles.id));
  }),

  /** スラッグで記事詳細を取得 */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select()
        .from(articles)
        .where(eq(articles.slug, input.slug))
        .limit(1);
      const article = rows[0];
      if (!article || article.status !== "published") return null;
      return article;
    }),
});
