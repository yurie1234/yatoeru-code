import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { kanriOrgs, kanriStatusSubmissions, sheetSyncLogs } from "../../drizzle/schema";
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { publicProcedure, router } from "../_core/trpc";
import { PREFECTURES } from "../../shared/tokutei";
import { calcKanriAffinity, hasKanriAffinityCondition, splitCountries } from "../../shared/kanriAffinity";

let countryFacetsCache: { at: number; data: Array<{ country: string; count: number }> } | null = null;
const COUNTRY_FACETS_TTL = 10 * 60 * 1000;

/** テスト用：受入国の選択肢キャッシュを空にする */
export function resetCountryFacetsCache() {
  countryFacetsCache = null;
}

/**
 * 監理団体（技能実習）→ 監理支援機関（育成就労）移行トラッカーのAPI。
 * データはOTIT「監理団体の許可一覧」（マスターDB: Googleスプレッドシート）由来。
 * 移行ステータスは独自アンケート・電話ヒアリングによる確認値であり、
 * 「監理支援機関の公的な許可一覧はまだ存在しない」ことをUI側で明示する。
 */

export const kanriRouter = router({
  /** トラッカー一覧検索（一覧・都道府県・区分・移行ステータス・キーワード） */
  search: publicProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        prefecture: z.string().optional(),
        permitType: z.enum(["general", "specific"]).optional(),
        migrationStatus: z
          .enum(["unconfirmed", "preparing", "applying", "permitted", "not_migrating"])
          .optional(),
        verifiedOnly: z.boolean().optional(),
        // 親和性スコア（shared/kanriAffinity.ts）の条件。指定しなければ標準順のまま返す
        targetCountry: z.string().optional(),
        wantsCare: z.boolean().optional(),
        sort: z.enum(["default", "affinity"]).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [];
      if (input.keyword) {
        conditions.push(
          or(
            like(kanriOrgs.name, `%${input.keyword}%`),
            like(kanriOrgs.address, `%${input.keyword}%`),
            like(kanriOrgs.managementId, `%${input.keyword}%`)
          )
        );
      }
      if (input.prefecture && (PREFECTURES as readonly string[]).includes(input.prefecture)) {
        conditions.push(eq(kanriOrgs.prefecture, input.prefecture));
      }
      if (input.permitType) conditions.push(eq(kanriOrgs.permitType, input.permitType));
      if (input.migrationStatus) conditions.push(eq(kanriOrgs.migrationStatus, input.migrationStatus));
      if (input.verifiedOnly) conditions.push(eq(kanriOrgs.isVerified, true));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(kanriOrgs)
        .where(where);
      const total = Number(countRow?.count ?? 0);

      // 親和性スコアは地域・受入国・介護分野の指定があって初めて算定できる
      // （分野・言語は監理団体データに存在しないため、無い項目を装って点数を付けない）。
      // 対象は3,700件台なので、登録支援機関（11,448件）のような候補Cap付き取得は不要で、
      // 条件に合う全件を取ってからアプリ側でスコア算出・並べ替えする。
      const affinityInput = {
        targetPrefecture: input.prefecture ?? null,
        targetCountry: input.targetCountry ?? null,
        wantsCare: input.wantsCare ?? false,
      };
      if (input.sort === "affinity" && hasKanriAffinityCondition(affinityInput)) {
        const candidates = await db.select().from(kanriOrgs).where(where);
        const scored = candidates
          .map((org) => ({
            ...org,
            affinity: calcKanriAffinity(affinityInput, {
              prefecture: org.prefecture,
              receiveCountries: org.receiveCountries,
              kaigoSupport: org.kaigoSupport,
              migrationStatus: org.migrationStatus,
              hasPenalty: org.hasPenalty,
            }),
          }))
          // 同点タイブレークは管理ID順（標準順と揃える）
          .sort((a, b) => b.affinity.score - a.affinity.score || a.managementId.localeCompare(b.managementId));

        const start = (input.page - 1) * input.limit;
        return {
          orgs: scored.slice(start, start + input.limit),
          total,
          page: input.page,
          limit: input.limit,
        };
      }

      const rows = await db
        .select()
        .from(kanriOrgs)
        .where(where)
        .orderBy(
          // 確認済みステータス（許可取得→申請中→準備中）を先頭に、次いで実績確認バッジ、管理ID順
          sql`FIELD(${kanriOrgs.migrationStatus}, 'permitted', 'applying', 'preparing', 'unconfirmed', 'not_migrating')`,
          desc(kanriOrgs.isVerified),
          kanriOrgs.managementId
        )
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);

      return {
        orgs: rows.map((org) => ({ ...org, affinity: undefined })),
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * 受入国の選択肢（親和性スコアの「受入国一致」で使う都道府県セレクトと同じ役割）。
   * `receiveCountries` はJSON配列ではなくカンマ・読点区切りの原文テキストなので、
   * 登録支援機関の言語集計（JSON_TABLE）と同じSQL集計はできない。
   * 監理団体は3,700件台と小さいため、全件取得してアプリ側で splitCountries と
   * 同じ関数で分割・集計する（DBとアプリで解釈がずれないようにするため）。
   */
  countryFacets: publicProcedure.query(async () => {
    const cached = countryFacetsCache;
    if (cached && Date.now() - cached.at < COUNTRY_FACETS_TTL) {
      return { countries: cached.data };
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const rows = await db
      .select({ receiveCountries: kanriOrgs.receiveCountries })
      .from(kanriOrgs);

    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const country of splitCountries(row.receiveCountries)) {
        counts.set(country, (counts.get(country) ?? 0) + 1);
      }
    }
    const countries = Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));

    countryFacetsCache = { at: Date.now(), data: countries };
    return { countries };
  }),

  /** 移行ステータスの集計サマリー（トラッカー上部に表示） */
  summary: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const byStatus = await db
      .select({
        migrationStatus: kanriOrgs.migrationStatus,
        count: sql<number>`COUNT(*)`,
      })
      .from(kanriOrgs)
      .groupBy(kanriOrgs.migrationStatus);

    const byPermitType = await db
      .select({ permitType: kanriOrgs.permitType, count: sql<number>`COUNT(*)` })
      .from(kanriOrgs)
      .groupBy(kanriOrgs.permitType);

    const [verifiedRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(kanriOrgs)
      .where(eq(kanriOrgs.isVerified, true));

    const [totalRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(kanriOrgs);

    // 最終同期日（更新ログの最新kanri同期）
    const [lastSync] = await db
      .select({ baseDate: sheetSyncLogs.baseDate, createdAt: sheetSyncLogs.createdAt })
      .from(sheetSyncLogs)
      .where(and(eq(sheetSyncLogs.target, "kanri"), eq(sheetSyncLogs.status, "success")))
      .orderBy(desc(sheetSyncLogs.createdAt))
      .limit(1);

    return {
      total: Number(totalRow?.count ?? 0),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.migrationStatus, Number(r.count)])),
      byPermitType: Object.fromEntries(byPermitType.map((r) => [r.permitType, Number(r.count)])),
      verifiedCount: Number(verifiedRow?.count ?? 0),
      lastSyncDate: lastSync?.baseDate ?? null,
    };
  }),

  /** 都道府県別の件数（都道府県ページ・フィルタUI用） */
  byPrefecture: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({ prefecture: kanriOrgs.prefecture, count: sql<number>`COUNT(*)` })
      .from(kanriOrgs)
      .groupBy(kanriOrgs.prefecture);
    return rows
      .filter((r) => r.prefecture)
      .map((r) => ({ prefecture: r.prefecture as string, count: Number(r.count) }));
  }),

  /** 監理団体からの移行状況の情報提供（/ikusei-shuro/for-kanri-dantai のフォーム） */
  submitStatusInfo: publicProcedure
    .input(
      z.object({
        orgName: z.string().min(1).max(255),
        managementId: z.string().max(16).optional(),
        prefecture: z.string().max(16).optional(),
        migrationStatus: z.enum([
          "preparing",
          "applying",
          "permitted",
          "not_migrating",
        ]),
        contactName: z.string().min(1).max(128),
        email: z.string().email().max(320),
        phone: z.string().max(32).optional(),
        note: z.string().max(2000).optional(),
        /** プライバシーポリシー同意（必須） */
        consentPrivacy: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.consentPrivacy) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "プライバシーポリシーへの同意が必要です。",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(kanriStatusSubmissions).values({
        orgName: input.orgName,
        managementId: input.managementId,
        prefecture: input.prefecture,
        migrationStatus: input.migrationStatus,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        note: input.note,
        consentedAt: new Date(),
        status: "new",
      });
      // 掲載作業（本人性確認→マスターシート反映）はオーナーが手動で行うため通知する
      try {
        await notifyOwner({
          title: `【移行状況の情報提供】${input.orgName}`,
          content: `監理団体から移行状況の情報提供がありました。\n団体名: ${input.orgName}\n管理ID: ${input.managementId ?? "未記入"}\n移行状況: ${input.migrationStatus}\n担当者: ${input.contactName} (${input.email})\n※本人性確認のうえマスターシートに反映してください。`,
        });
      } catch {
        // 通知失敗は登録自体の失敗にしない
      }
      return { success: true };
    }),

  /** 個別取得（管理ID） */
  byId: publicProcedure
    .input(z.object({ managementId: z.string().min(1).max(16) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [org] = await db
        .select()
        .from(kanriOrgs)
        .where(eq(kanriOrgs.managementId, input.managementId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),
});
