import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  consultations,
  diagnoses,
  planApplications,
  proposals,
  reviews,
  supportOrgs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";

export const orgsRouter = router({
  // 1. 登録支援機関 検索・比較機能
  search: publicProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        prefecture: z.string().optional(),
        language: z.string().optional(),
        field: z.string().optional(),
        hasPenalty: z.boolean().optional(),
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
            like(supportOrgs.name, `%${input.keyword}%`),
            like(supportOrgs.address, `%${input.keyword}%`)
          )
        );
      }
      if (input.prefecture) {
        conditions.push(eq(supportOrgs.prefecture, input.prefecture));
      }
      if (input.language) {
        // JSON array search in MySQL
        conditions.push(sql`JSON_CONTAINS(${supportOrgs.languages}, ${JSON.stringify(input.language)})`);
      }
      if (input.field) {
        conditions.push(sql`JSON_CONTAINS(${supportOrgs.fields}, ${JSON.stringify(input.field)})`);
      }
      if (input.hasPenalty !== undefined) {
        conditions.push(eq(supportOrgs.hasPenalty, input.hasPenalty));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportOrgs)
        .where(whereClause);

      const items = await db
        .select()
        .from(supportOrgs)
        .where(whereClause)
        // 有料プラン優先、次にレビュー数、最後にID
        .orderBy(desc(supportOrgs.plan), desc(supportOrgs.reviewCount), desc(supportOrgs.id))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);

      return {
        items,
        total: Number(totalResult.count),
        page: input.page,
        totalPages: Math.ceil(Number(totalResult.count) / input.limit),
      };
    }),

  // 2. 登録支援機関 詳細取得
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [org] = await db.select().from(supportOrgs).where(eq(supportOrgs.id, input));
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    const orgReviews = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.orgId, input), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt));

    return { org, reviews: orgReviews };
  }),

  // 3. URL診断機能（AI業種解析）
  diagnoseUrl: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. URLから情報を取得（簡易的にLLMにURLを渡して推測させる、実運用ではスクレイピングを挟む）
      const prompt = `
以下のURLの企業について、特定技能制度を活用して外国人材を受け入れる場合の診断を行ってください。
URL: ${input.url}

以下のJSONスキーマに厳密に従って出力してください。
- companyName: 推測される企業名（不明な場合は"不明"）
- industry: 推測される業種
- field: 特定技能12分野（介護、ビルクリーニング、素形材・産業機械・電気電子情報関連製造業、建設、造船・舶用工業、自動車整備、航空、宿泊、農業、漁業、飲食料品製造業、外食業）のうち、最も該当する可能性が高いもの。該当なしの場合はnull
- headcount: 企業規模から推測される受入可能枠（例: "1〜5名", "10名以上"）
- cost: 概算コスト（初期費用＋月額支援委託費の目安。例: "初期10万円〜＋月額2.5万円/人"）
- score: 適合スコア（0-100の整数。特定技能の活用余地が高いほど高得点）
- reason: 診断理由（100文字程度）
`;

      const llmResult = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "diagnosis_result",
            strict: true,
            schema: {
              type: "object",
              properties: {
                companyName: { type: "string" },
                industry: { type: "string" },
                field: { type: ["string", "null"] },
                headcount: { type: "string" },
                cost: { type: "string" },
                score: { type: "integer" },
                reason: { type: "string" },
              },
              required: ["companyName", "industry", "field", "headcount", "cost", "score", "reason"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = llmResult.choices[0].message.content;
      const contentStr = typeof rawContent === "string" ? rawContent : "{}";
      const resultData = JSON.parse(contentStr);

      // 診断履歴を保存
      const [insertResult] = await db.insert(diagnoses).values({
        inputUrl: input.url,
        companyName: resultData.companyName,
        industry: resultData.industry,
        result: resultData,
        matchScore: resultData.score,
        userId: ctx.user?.id,
      });

      // 適合する支援機関を検索（分野が一致、または全国対応の大手）
      const conditions = [];
      if (resultData.field) {
        conditions.push(sql`JSON_CONTAINS(${supportOrgs.fields}, ${JSON.stringify(resultData.field)})`);
      }
      
      const recommendedOrgs = await db
        .select()
        .from(supportOrgs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(supportOrgs.plan), desc(supportOrgs.reviewCount))
        .limit(5);

      return {
        diagnosisId: insertResult.insertId,
        result: resultData,
        recommendedOrgs,
      };
    }),

  // 4. 一括相談送信
  submitConsultation: publicProcedure
    .input(
      z.object({
        orgIds: z.array(z.number()).min(1).max(5),
        companyName: z.string().min(1),
        contactName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        prefecture: z.string().optional(),
        industry: z.string().optional(),
        field: z.string().optional(),
        headcount: z.string().optional(),
        message: z.string().optional(),
        diagnosisId: z.number().optional(),
        /** 選択した支援機関（最大5社）への個人データ提供同意（必須） */
        consentThirdParty: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      // 第三者提供同意のサーバー側検証（個人情報保護法27条対応）
      if (!input.consentThirdParty) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "支援機関への情報提供に同意いただく必要があります。",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(consultations).values({
        orgIds: input.orgIds,
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        prefecture: input.prefecture,
        industry: input.industry,
        field: input.field,
        headcount: input.headcount,
        message: input.message,
        diagnosisId: input.diagnosisId,
        consentedAt: new Date(),
        status: "new",
      });

      return { success: true, consultationId: result.insertId };
    }),

  // 5. AI自動草案生成（特定技能導入提案書）
  generateProposal: publicProcedure
    .input(
      z.object({
        diagnosisId: z.number(),
        companyName: z.string(),
        field: z.string(),
        headcount: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const prompt = `
あなたは外国人材活用の専門コンサルタントです。
以下の企業情報に基づき、社内稟議用の「特定技能導入提案書」の草案（Markdown形式）を作成してください。
ゼロから書く手間を省くための7〜8割完成したテンプレートとして出力してください。

企業名: ${input.companyName}
想定分野: ${input.field}
想定受入人数: ${input.headcount}

構成案:
1. 導入の目的と背景（人手不足解消、生産性向上など）
2. 特定技能制度の概要とメリット
3. 想定される業務内容（${input.field}に基づく）
4. 概算費用（初期費用、月額支援委託費、給与水準）
5. 登録支援機関の活用方針（自社支援ではなく委託する理由）
6. 今後のスケジュール案
`;

      const llmResult = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const rawContent = llmResult.choices[0].message.content;
      const content = typeof rawContent === "string" ? rawContent : "";

      const [result] = await db.insert(proposals).values({
        diagnosisId: input.diagnosisId,
        companyName: input.companyName,
        content,
        userId: ctx.user?.id,
      });

      return { success: true, proposalId: result.insertId, content };
    }),

  // 6. 有料プラン申込み
  submitPlanApplication: publicProcedure
    .input(
      z.object({
        orgName: z.string().min(1),
        regNo: z.string().optional(),
        contactName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        plan: z.enum(["standard", "premium"]),
        message: z.string().optional(),
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

      await db.insert(planApplications).values({
        orgName: input.orgName,
        regNo: input.regNo,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        plan: input.plan,
        message: input.message,
        consentedAt: new Date(),
        status: "new",
      });

      return { success: true };
    }),
});
