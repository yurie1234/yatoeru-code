import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { supportOrgs } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const statsRouter = router({
  // トップページ・SEOページ用のグローバル統計
  overview: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(supportOrgs);

    // 都道府県別件数
    const byPrefecture = await db
      .select({
        prefecture: supportOrgs.prefecture,
        count: sql<number>`count(*)`,
      })
      .from(supportOrgs)
      .groupBy(supportOrgs.prefecture)
      .orderBy(desc(sql`count(*)`));

    return {
      total: Number(total.count),
      byPrefecture: byPrefecture
        .filter((p) => p.prefecture)
        .map((p) => ({ prefecture: p.prefecture!, count: Number(p.count) })),
    };
  }),

  // 都道府県別統計（地域ページ用）
  byPrefecture: publicProcedure
    .input(z.object({ prefecture: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [total] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportOrgs)
        .where(eq(supportOrgs.prefecture, input.prefecture));

      // 言語対応統計（都道府県内）
      const orgs = await db
        .select({ languages: supportOrgs.languages })
        .from(supportOrgs)
        .where(eq(supportOrgs.prefecture, input.prefecture));

      const langCount: Record<string, number> = {};
      for (const o of orgs) {
        for (const lang of o.languages ?? []) {
          langCount[lang] = (langCount[lang] ?? 0) + 1;
        }
      }
      const topLanguages = Object.entries(langCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([language, count]) => ({ language, count }));

      return { total: Number(total.count), topLanguages };
    }),
});
