import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { estimateOrgFields } from "../../shared/affinity";
import { TOKUTEI_FIELDS } from "../../shared/tokutei";
import { supportOrgs } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, router } from "../_core/trpc";

/** 都道府県×分野（推定）集計のキャッシュ（1日。登録簿は週次更新のため十分） */
const fieldStatsCache = new Map<string, { at: number; data: { field: string; count: number }[] }>();
const FIELD_STATS_TTL = 24 * 3600 * 1000;

export const statsRouter = router({
  // トップページ・SEOページ用のグローバル統計
  overview: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(supportOrgs);

    // 実確認済み・新規相談受付中の実数（トップページの事実ベース表示用）
    const [verifiedStats] = await db
      .select({
        verifiedCount: sql<number>`count(case when \`verifiedAt\` is not null then 1 end)`,
        acceptingCount: sql<number>`count(case when \`consultStatus\` in ('open','open_active') then 1 end)`,
        lastVerifiedAt: sql<string | null>`max(\`verifiedAt\`)`,
      })
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
      verifiedCount: Number(verifiedStats.verifiedCount),
      acceptingCount: Number(verifiedStats.acceptingCount),
      lastVerifiedAt: verifiedStats.lastVerifiedAt
        ? new Date(verifiedStats.lastVerifiedAt).toISOString()
        : null,
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

  // 都道府県×分野（機関名からの推定）の統計。地域ページの分野別表に使用。
  // 入管庁登録簿に分野情報は存在しないため、機関名キーワードによる推定である旨をUIで必ず明示する。
  byPrefectureFields: publicProcedure
    .input(z.object({ prefecture: z.string() }))
    .query(async ({ input }) => {
      const cached = fieldStatsCache.get(input.prefecture);
      if (cached && Date.now() - cached.at < FIELD_STATS_TTL) {
        return { fields: cached.data, estimated: true };
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const orgs = await db
        .select({ name: supportOrgs.name, fields: supportOrgs.fields })
        .from(supportOrgs)
        .where(eq(supportOrgs.prefecture, input.prefecture));

      const counts: Record<string, number> = {};
      for (const o of orgs) {
        // 確認済み分野（DB登録）を優先し、なければ機関名から推定
        const fields = o.fields && o.fields.length > 0 ? o.fields : estimateOrgFields(o.name);
        for (const f of fields) {
          if ((TOKUTEI_FIELDS as readonly string[]).includes(f)) {
            counts[f] = (counts[f] ?? 0) + 1;
          }
        }
      }

      const data = TOKUTEI_FIELDS.map((field) => ({
        field: field as string,
        count: counts[field] ?? 0,
      })).filter((f) => f.count > 0)
        .sort((a, b) => b.count - a.count);

      fieldStatsCache.set(input.prefecture, { at: Date.now(), data });
      return { fields: data, estimated: true };
    }),
});
