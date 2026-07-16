import { TRPCError } from "@trpc/server";
import { desc, eq, gte, sql } from "drizzle-orm";
import {
  consultations,
  diagnoses,
  planApplications,
  supportOrgs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// リード単価の想定値（円）: 市場相場に基づく管理指標
const ASSUMED_LEAD_PRICE = 15000;
// Exit想定マルチプル
const EXIT_MULTIPLE_BASE = 6;
const EXIT_MULTIPLE_BULL = 12;
// 有料プラン月額（円）
const PLAN_PRICES: Record<string, number> = { standard: 30000, premium: 80000 };

export const adminRouter = router({
  // KPIダッシュボード: 月間相談件数・掲載機関数・CVR・リード単価・Exit指標
  kpi: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 月間相談件数
    const [monthlyConsultations] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations)
      .where(gte(consultations.createdAt, monthStart));

    // 累計相談件数
    const [totalConsultations] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations);

    // 掲載機関数（全体・有料）
    const [totalOrgs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(supportOrgs);
    const [paidOrgs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(supportOrgs)
      .where(eq(supportOrgs.plan, "paid"));

    // 月間診断件数（CVR算出用）
    const [monthlyDiagnoses] = await db
      .select({ count: sql<number>`count(*)` })
      .from(diagnoses)
      .where(gte(diagnoses.createdAt, monthStart));

    const [totalDiagnoses] = await db
      .select({ count: sql<number>`count(*)` })
      .from(diagnoses);

    // 有料プラン申込み（activeのみでMRR推定）
    const activePlans = await db
      .select()
      .from(planApplications)
      .where(eq(planApplications.status, "active"));

    const mrrFromPlans = activePlans.reduce(
      (sum, p) => sum + (PLAN_PRICES[p.plan] ?? 0),
      0
    );

    const mCons = Number(monthlyConsultations.count);
    const mDiag = Number(monthlyDiagnoses.count);

    // CVR: 診断→相談の転換率
    const cvr = mDiag > 0 ? (mCons / mDiag) * 100 : 0;

    // 月間リード想定売上 + プランMRR
    const monthlyLeadRevenue = mCons * ASSUMED_LEAD_PRICE;
    const monthlyRevenue = monthlyLeadRevenue + mrrFromPlans;

    // Exit指標: 想定年間営業利益（売上×利益率70%と仮置き）×マルチプル
    const annualProfit = monthlyRevenue * 12 * 0.7;
    const exitBase = annualProfit * EXIT_MULTIPLE_BASE;
    const exitBull = annualProfit * EXIT_MULTIPLE_BULL;

    return {
      monthlyConsultations: mCons,
      totalConsultations: Number(totalConsultations.count),
      totalOrgs: Number(totalOrgs.count),
      paidOrgs: Number(paidOrgs.count),
      monthlyDiagnoses: mDiag,
      totalDiagnoses: Number(totalDiagnoses.count),
      cvr,
      assumedLeadPrice: ASSUMED_LEAD_PRICE,
      monthlyLeadRevenue,
      mrrFromPlans,
      monthlyRevenue,
      exitBase,
      exitBull,
    };
  }),

  // 相談リード一覧
  consultationList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(consultations)
      .orderBy(desc(consultations.createdAt))
      .limit(100);
  }),

  // 有料プラン申込み一覧
  planApplicationList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(planApplications)
      .orderBy(desc(planApplications.createdAt))
      .limit(100);
  }),
});
