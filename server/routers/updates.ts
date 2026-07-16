import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { registryChanges, registrySnapshots, supportOrgs } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, router } from "../_core/trpc";

/**
 * 登録簿更新情報（週次差分記事）のデータ提供。
 * 引用しやすい構造化ページの原則: 結論先頭・基準日・表・出典。
 */
export const updatesRouter = router({
  // 差分記事の一覧（スナップショットごとに新規/抹消件数を集計）
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const snapshots = await db
      .select()
      .from(registrySnapshots)
      .orderBy(desc(registrySnapshots.baseDate))
      .limit(60);

    const counts = await db
      .select({
        snapshotId: registryChanges.snapshotId,
        changeType: registryChanges.changeType,
        count: sql<number>`count(*)`,
      })
      .from(registryChanges)
      .groupBy(registryChanges.snapshotId, registryChanges.changeType);

    const countMap = new Map<number, { added: number; removed: number }>();
    for (const c of counts) {
      const entry = countMap.get(c.snapshotId) ?? { added: 0, removed: 0 };
      if (c.changeType === "added") entry.added = Number(c.count);
      else entry.removed = Number(c.count);
      countMap.set(c.snapshotId, entry);
    }

    return snapshots.map((s) => ({
      id: s.id,
      baseDate: s.baseDate,
      totalCount: s.totalCount,
      sourceUrl: s.sourceUrl,
      added: countMap.get(s.id)?.added ?? 0,
      removed: countMap.get(s.id)?.removed ?? 0,
      createdAt: s.createdAt,
    }));
  }),

  // 差分記事の詳細（基準日指定。新規/抹消の機関リスト）
  detail: publicProcedure
    .input(z.object({ baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [snapshot] = await db
        .select()
        .from(registrySnapshots)
        .where(eq(registrySnapshots.baseDate, input.baseDate))
        .limit(1);
      if (!snapshot) throw new TRPCError({ code: "NOT_FOUND" });

      // 前回スナップショット（比較元の明示用）
      const [prev] = await db
        .select({ baseDate: registrySnapshots.baseDate, totalCount: registrySnapshots.totalCount })
        .from(registrySnapshots)
        .where(sql`${registrySnapshots.baseDate} < ${input.baseDate}`)
        .orderBy(desc(registrySnapshots.baseDate))
        .limit(1);

      const changes = await db
        .select()
        .from(registryChanges)
        .where(eq(registryChanges.snapshotId, snapshot.id))
        .orderBy(registryChanges.prefecture, registryChanges.regNo);

      return {
        snapshot: {
          baseDate: snapshot.baseDate,
          totalCount: snapshot.totalCount,
          sourceUrl: snapshot.sourceUrl,
        },
        previous: prev ?? null,
        added: changes.filter((c) => c.changeType === "added"),
        removed: changes.filter((c) => c.changeType === "removed"),
      };
    }),

  // 都道府県×言語のクロス統計（統計ページ・地域ページの構造化データ用）
  prefectureMatrix: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [latest] = await db
      .select({ baseDate: registrySnapshots.baseDate })
      .from(registrySnapshots)
      .orderBy(desc(registrySnapshots.baseDate))
      .limit(1);

    const rows = await db
      .select({
        prefecture: supportOrgs.prefecture,
        total: sql<number>`count(*)`,
        noPenalty: sql<number>`sum(case when ${supportOrgs.hasPenalty} = 0 then 1 else 0 end)`,
        multiLang: sql<number>`sum(case when json_length(${supportOrgs.languages}) >= 3 then 1 else 0 end)`,
      })
      .from(supportOrgs)
      .groupBy(supportOrgs.prefecture)
      .orderBy(desc(sql`count(*)`));

    return {
      baseDate: latest?.baseDate ?? null,
      rows: rows
        .filter((r) => r.prefecture)
        .map((r) => ({
          prefecture: r.prefecture!,
          total: Number(r.total),
          noPenalty: Number(r.noPenalty),
          multiLang: Number(r.multiLang),
        })),
    };
  }),
});
