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

/** サーバー側bot判定（User-Agentベース。クライアント側除外をすり抜けたbotの保険） */
export function isBotUserAgent(ua: string | undefined): boolean {
  if (!ua) return true; // UAなしはプログラムアクセスとみなす
  return /bot|crawl|spider|slurp|headless|lighthouse|prerender|scrapy|python-requests|python-httpx|curl|wget|go-http-client|java\/|okhttp|axios|node-fetch|phantomjs|selenium|puppeteer|playwright/i.test(
    ua,
  );
}

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
  track: publicProcedure.input(trackInput).mutation(async ({ input, ctx }) => {
    try {
      // botのUAは記録しない（営業用閲覧数の信頼性確保）
      if (isBotUserAgent(ctx.req.headers["user-agent"])) {
        return { ok: false } as const;
      }
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

  /**
   * 個社別営業用サマリー（管理者専用）。
   * 機関IDを指定して、月別のイベント集計と累計を返す。
   * 掲載確認メール・月次レポート差し込み用。
   */
  orgSummary: adminProcedure
    .input(
      z.object({
        orgId: z.number().int().positive(),
        months: z.number().int().min(1).max(24).default(6),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { org: null, monthly: [], totals: [] };

      const [org] = await db
        .select({
          id: supportOrgs.id,
          name: supportOrgs.name,
          regNo: supportOrgs.regNo,
          prefecture: supportOrgs.prefecture,
        })
        .from(supportOrgs)
        .where(eq(supportOrgs.id, input.orgId))
        .limit(1);
      if (!org) return { org: null, monthly: [], totals: [] };

      // 直近Nヶ月の開始日（JST月初）
      const nowJst = new Date(Date.now() + 9 * 3600 * 1000);
      const from = new Date(
        Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth() - (input.months - 1), 1, -9),
      );

      // 月別×イベント種別集計（JST基準の年月）
      const ymExpr = sql<string>`DATE_FORMAT(DATE_ADD(${orgEvents.createdAt}, INTERVAL 9 HOUR), '%Y-%m')`;
      const monthly = await db
        .select({
          ym: ymExpr.as("ym"),
          eventType: orgEvents.eventType,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(orgEvents)
        .where(and(eq(orgEvents.orgId, input.orgId), gte(orgEvents.createdAt, from)))
        .groupBy(sql`ym`, orgEvents.eventType)
        .orderBy(sql`ym`);

      // 全期間累計
      const totals = await db
        .select({
          eventType: orgEvents.eventType,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(orgEvents)
        .where(eq(orgEvents.orgId, input.orgId))
        .groupBy(orgEvents.eventType);

      return { org, monthly, totals };
    }),
});
