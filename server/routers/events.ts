import { z } from "zod";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { orgEvents, supportOrgs } from "../../drizzle/schema";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

/** 記録を許可するイベント種別（ホワイトリスト） */
export const EVENT_TYPES = [
  "org_detail_view",
  "consult_submit",
  "bulk_consult_submit",
  "phone_tap",
  "website_click",
  "diagnose_start",
  "diagnose_complete",
  "proposal_generate",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const trackInput = z.object({
  orgId: z.number().int().positive().nullish(),
  eventType: z.enum(EVENT_TYPES),
  source: z.string().max(128).nullish(),
  path: z.string().max(512).nullish(),
  referrer: z.string().max(255).nullish(),
});

/** リファラはドメインのみ保存（プライバシー配慮） */
function referrerDomain(ref: string | null | undefined): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).hostname.slice(0, 255);
  } catch {
    return ref.slice(0, 255);
  }
}

export const eventsRouter = router({
  /** ファーストパーティイベント記録（fire-and-forget、失敗してもUIに影響させない） */
  track: publicProcedure.input(trackInput).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) return { ok: false } as const;
      await db.insert(orgEvents).values({
        orgId: input.orgId ?? null,
        eventType: input.eventType,
        source: input.source ?? null,
        path: input.path ?? null,
        referrer: referrerDomain(input.referrer),
      });
      return { ok: true } as const;
    } catch (e) {
      console.warn("[events.track] failed:", e);
      return { ok: false } as const;
    }
  }),

  /** 月次レポート：機関別×イベント種別の集計（管理者専用） */
  monthlyReport: adminProcedure
    .input(
      z.object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { orgRows: [], siteRows: [], from: null, to: null };
      const from = new Date(Date.UTC(input.year, input.month - 1, 1, -9)); // JST月初
      const to = new Date(Date.UTC(input.year, input.month, 1, -9)); // JST翌月初

      // 機関別集計（機関名join）
      const orgRows = await db
        .select({
          orgId: orgEvents.orgId,
          orgName: supportOrgs.name,
          regNo: supportOrgs.regNo,
          eventType: orgEvents.eventType,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(orgEvents)
        .leftJoin(supportOrgs, eq(orgEvents.orgId, supportOrgs.id))
        .where(
          and(
            gte(orgEvents.createdAt, from),
            lt(orgEvents.createdAt, to),
            sql`${orgEvents.orgId} IS NOT NULL`,
          ),
        )
        .groupBy(orgEvents.orgId, supportOrgs.name, supportOrgs.regNo, orgEvents.eventType);

      // サイト全体イベント集計（orgId null）
      const siteRows = await db
        .select({
          eventType: orgEvents.eventType,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(orgEvents)
        .where(
          and(
            gte(orgEvents.createdAt, from),
            lt(orgEvents.createdAt, to),
            isNull(orgEvents.orgId),
          ),
        )
        .groupBy(orgEvents.eventType);

      return { orgRows, siteRows, from, to };
    }),
});
