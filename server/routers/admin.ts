import { TRPCError } from "@trpc/server";
import { desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  consultations,
  diagnoses,
  planApplications,
  supportOrgs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { PREFECTURES, TOKUTEI_FIELDS } from "../../shared/tokutei";
import { normalizeLanguageList } from "../../shared/languageNormalize";
import { PENDING_LISTING_UPDATES } from "../pendingListingUpdates";
import {
  listReferralTargets,
  readReferralInfo,
  REFERRAL_INTENTS,
  writeReferralInfo,
} from "../referralIntent";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// リード単価の想定値（円）: 市場相場に基づく管理指標
const ASSUMED_LEAD_PRICE = 15000;
// Exit想定マルチプル
const EXIT_MULTIPLE_BASE = 6;
const EXIT_MULTIPLE_BULL = 12;
// 有料プラン月額（円）。Pricing.tsx の表示価格と必ず揃える
// （ここがずれるとMRRの集計だけ実態と違う数字になる）。
// standard は立ち上げ期の20,000円。値上げ後は契約時点の価格で計算する必要が出るため、
// そのときは orgs 側に契約価格を持たせる（このRecordは新規契約の既定値になる）
const PLAN_PRICES: Record<string, number> = { standard: 20000, premium: 80000 };

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

  /**
   * 反映待ちの下書き一覧（server/pendingListingUpdates.ts にコミットしたもの）。
   * 表示するだけで本番は変わらない。管理画面で内容を確認してから反映する。
   */
  pendingListingUpdates: adminProcedure.query(async () => {
    return PENDING_LISTING_UPDATES;
  }),

  /**
   * 掲載確認の反映用: 登録番号で1機関の編集対象フィールドを引く。
   * これまで掲載確認メールの回答を反映するにはRailway Consoleで直接SQLを流す
   * しかなく、履歴も残らなかったため、管理画面から反映できるようにした。
   */
  orgByRegNo: adminProcedure.input(z.object({ regNo: z.string().min(1).max(32) })).query(
    async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select({
          id: supportOrgs.id,
          regNo: supportOrgs.regNo,
          name: supportOrgs.name,
          prefecture: supportOrgs.prefecture,
          address: supportOrgs.address,
          phone: supportOrgs.phone,
          languages: supportOrgs.languages,
          languagesRaw: supportOrgs.languagesRaw,
          fields: supportOrgs.fields,
          preferredFields: supportOrgs.preferredFields,
          preferredRegions: supportOrgs.preferredRegions,
          preferredNote: supportOrgs.preferredNote,
          consultStatus: supportOrgs.consultStatus,
          websiteUrl: supportOrgs.websiteUrl,
          monthlyFeeMin: supportOrgs.monthlyFeeMin,
          monthlyFeeMax: supportOrgs.monthlyFeeMax,
          verifiedAt: supportOrgs.verifiedAt,
          verifiedNote: supportOrgs.verifiedNote,
          internalMemo: supportOrgs.internalMemo,
        })
        .from(supportOrgs)
        .where(eq(supportOrgs.regNo, input.regNo.trim()))
        .limit(2);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "登録番号が見つかりません" });
      if (rows.length > 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "同一登録番号が複数件あります。手動確認が必要です",
        });
      }
      // 送客優先度（紹介料の意向）は完全非公開の運用情報。この管理者向け
      // クエリでのみ返す（公開APIは sanitizeOrg で除去済み）。
      const referral = await readReferralInfo(db, rows[0].id);
      return { ...rows[0], referral };
    }
  ),

  /**
   * 送客先の候補一覧（紹介料の意向がある機関）。**運用画面専用**。
   * 相談リードの手動振り分けと営業の優先順位づけに使う。
   * 親和性スコア・並び順・公開ページには一切反映しない。
   */
  referralTargets: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return listReferralTargets(db);
  }),

  /** 送客優先度（紹介料の意向）の更新。非公開情報のみを扱う */
  updateReferralIntent: adminProcedure
    .input(
      z.object({
        regNo: z.string().min(1).max(32),
        intent: z.enum(REFERRAL_INTENTS).optional(),
        note: z.string().max(4000).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select({ id: supportOrgs.id })
        .from(supportOrgs)
        .where(eq(supportOrgs.regNo, input.regNo.trim()))
        .limit(2);
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "登録番号が見つかりません" });
      }
      if (rows.length > 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "同一登録番号が複数件あります。手動確認が必要です",
        });
      }
      await writeReferralInfo(db, rows[0].id, {
        intent: input.intent,
        note: input.note,
      });
      return { ok: true as const };
    }),

  /**
   * 掲載確認の反映: 事業者本人の回答に基づく申告情報を更新する。
   * 未指定（undefined）のキーは触らない。null を明示すれば消去できる。
   * 公的名簿由来の項目（name/address/prefecture/phone/regDate）はここでは変更しない
   * ＝登録簿の転記を管理画面から書き換えられないようにするため。
   */
  updateOrgListing: adminProcedure
    .input(
      z.object({
        regNo: z.string().min(1).max(32),
        /** 対応可能言語（正規化済みの言語名） */
        languages: z.array(z.string().min(1).max(32)).max(40).optional(),
        /** 対応分野（TOKUTEI_FIELDSの正式名称のみ） */
        fields: z.array(z.enum(TOKUTEI_FIELDS)).max(TOKUTEI_FIELDS.length).optional(),
        /** 希望分野（"全分野" または TOKUTEI_FIELDS の正式名称） */
        preferredFields: z
          .array(z.union([z.literal("全分野"), z.enum(TOKUTEI_FIELDS)]))
          .max(TOKUTEI_FIELDS.length + 1)
          .optional(),
        /** 希望エリア（"全国" / 都道府県名 / 地方名） */
        preferredRegions: z.array(z.string().min(1).max(32)).max(60).optional(),
        preferredNote: z.string().max(2000).nullable().optional(),
        consultStatus: z.enum(["unknown", "open", "open_active", "paused"]).optional(),
        websiteUrl: z.string().url().max(512).nullable().optional(),
        /** 支援料の目安（円／人・月） */
        monthlyFeeMin: z.number().int().min(0).max(10_000_000).nullable().optional(),
        monthlyFeeMax: z.number().int().min(0).max(10_000_000).nullable().optional(),
        /** 運営確認日（YYYY-MM-DD）。null で確認済み表示を取り下げる */
        verifiedAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        verifiedNote: z.string().max(4000).nullable().optional(),
        /** 非公開の社内メモ（公開ページ・API・構造化データには出力しない） */
        internalMemo: z.string().max(4000).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { regNo, ...rest } = input;

      if (
        rest.monthlyFeeMin != null &&
        rest.monthlyFeeMax != null &&
        rest.monthlyFeeMin > rest.monthlyFeeMax
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "支援料の下限が上限を超えています" });
      }

      const KNOWN_REGIONS = new Set<string>([
        "全国",
        ...PREFECTURES,
        "北海道・東北",
        "関東",
        "甲信越",
        "北陸",
        "東海",
        "近畿",
        "中四国",
        "中国",
        "四国",
        "九州",
        "九州・沖縄",
        "沖縄",
      ]);
      const unknownRegions = (rest.preferredRegions ?? []).filter((r) => !KNOWN_REGIONS.has(r));
      if (unknownRegions.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `未知の地域名: ${unknownRegions.join(", ")}`,
        });
      }

      const existing = await db
        .select({ id: supportOrgs.id })
        .from(supportOrgs)
        .where(eq(supportOrgs.regNo, regNo.trim()))
        .limit(2);
      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "登録番号が見つかりません" });
      }
      if (existing.length > 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "同一登録番号が複数件あります。手動確認が必要です",
        });
      }

      // undefinedのキーは送らない（既存値を保持する）
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value === undefined) continue;
        patch[key] = key === "verifiedAt" && typeof value === "string" ? new Date(value) : value;
      }
      // 言語は別名・表記ゆれを正式名称に寄せる。管理画面で「カンボジア語」と
      // 入力した機関が、検索の「クメール語」で引っかからなくなるのを防ぐ
      if (Array.isArray(patch.languages)) {
        patch.languages = normalizeLanguageList(patch.languages as string[]);
      }
      if (Object.keys(patch).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "更新する項目がありません" });
      }

      await db.update(supportOrgs).set(patch).where(eq(supportOrgs.id, existing[0].id));

      return { ok: true as const, id: existing[0].id, updated: Object.keys(patch) };
    }),
});
