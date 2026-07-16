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
        // 入管庁登録簿には分野情報がなく、fieldsは大半が未登録（NULL）。
        // 未登録の機関は「分野非限定（対応可能性あり）」として扱い、除外しない。
        conditions.push(
          sql`(${supportOrgs.fields} IS NULL OR JSON_CONTAINS(${supportOrgs.fields}, ${JSON.stringify(input.field)}))`
        );
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

      // 1. URL先の実ページ本文を取得（失敗しても診断は続行し、本文なしでの推測であることをAIに明示）
      let pageText = "";
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(input.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; YatoeruBot/1.0; +https://yatoeru.jp)",
            Accept: "text/html,application/xhtml+xml",
          },
          redirect: "follow",
        });
        clearTimeout(timer);
        if (res.ok) {
          const html = await res.text();
          // タグ・スクリプト・スタイルを除去してテキスト化
          const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
          const metaDesc =
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ??
            /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html)?.[1] ??
            "";
          const body = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&[a-z#0-9]+;/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
          pageText = `ページタイトル: ${title}\nメタ説明: ${metaDesc}\n本文抜粋: ${body.slice(0, 3000)}`;
        }
      } catch {
        // 取得失敗時はpageTextなしで続行
      }

      const prompt = `
あなたは特定技能制度の受入れ適合性を評価する専門家です。以下の企業について、特定技能制度を活用して外国人材を受け入れる場合の診断を行ってください。

URL: ${input.url}
${pageText ? `\n【実際に取得したページ内容】\n${pageText}\n` : "\n※ ページ内容を取得できなかったため、URLの文字列（ドメイン名・パス）のみから推測してください。推測の不確実性はスコアとreasonに反映してください。\n"}
以下のJSONスキーマに厳密に従って出力してください。
- companyName: 推測される企業名（不明な場合は"不明"）
- industry: 推測される業種
- field: 特定技能12分野（介護、ビルクリーニング、素形材・産業機械・電気電子情報関連製造業、建設、造船・舶用工業、自動車整備、航空、宿泊、農業、漁業、飲食料品製造業、外食業）のうち、最も該当する可能性が高いもの。該当なしの場合はnull
- headcount: 企業規模から推測される受入可能枠（例: "1ー5名", "10名以上"）
- cost: 概算コスト（初期費用＋月額支援委託費の目安。例: "初期10万円ー＋月額2.5万円/人"）
- score: 適合スコア（0-100の整数）。以下の採点ルーブリックで各項目を個別に採点し、合計する：
  (a) 分野該当性（0-40点）: 事業内容が特定技能12分野の対象業務に直接該当=35-40、隣接・一部該当=20-34、間接的=5-19、該当なし=0-4
  (b) 人手不足度（0-30点）: 当該業界の人手不足の深刻度と現場職の比重（現場作業中心=高、オフィスワーク中心=低）
  (c) 情報の確からしさ（0-30点）: ページ内容から事業内容・規模が具体的に確認できた=20-30、一部確認=10-19、URLのみからの推測=0-9
  同じ点数帯に収束させず、根拠に応じて差をつけること。
- reason: 診断理由（採点内訳 a/b/c に触れながら150文字程度）
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
        // fields未登録（NULL）の機関も候補に含める（登録簿に分野情報がないため）
        conditions.push(
          sql`(${supportOrgs.fields} IS NULL OR JSON_CONTAINS(${supportOrgs.fields}, ${JSON.stringify(resultData.field)}))`
        );
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

出力ルール（厳守）:
- Markdownの表を使う場合は、必ずヘッダー行・区切り行・データ行を揃えた完全な表として出力する（途中で終わらせない）
- 表のセル内で列幅を揃えるための連続スペースによるパディングは絶対に行わない（「| 項目 | 内容 |」のように最小限のスペースのみ）
- 各セクションは簡潔にまとめ、全体で1500字程度に収める
- 最後は必ず「6. 今後のスケジュール案」の表（4フェーズ）を完結させて終了する
`;

      const llmResult = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      });

      const rawContent = llmResult.choices[0].message.content;
      let content = typeof rawContent === "string" ? rawContent : "";

      // モデルが表の列幅揃えのために大量の連続スペースを出力してトークンを浪費するケースがあるため圧縮する
      content = content.replace(/ {4,}/g, " ").replace(/\t{2,}/g, "\t");

      // トークン上限で途切れた場合は続きを追加生成して連結する
      const finishReason = (llmResult.choices[0] as { finish_reason?: string }).finish_reason;
      if (finishReason === "length" && content) {
        try {
          const contResult = await invokeLLM({
            model: "gpt-4o-mini",
            messages: [
              { role: "user", content: prompt },
              { role: "assistant", content },
              {
                role: "user",
                content:
                  "出力が途中で切れています。直前の続きから、同じMarkdown形式で最後まで出力してください。重複は不要です。",
              },
            ],
            max_tokens: 4000,
          });
          const contRaw = contResult.choices[0].message.content;
          if (typeof contRaw === "string") {
            content += "\n" + contRaw.replace(/ {4,}/g, " ").replace(/\t{2,}/g, "\t");
          }
        } catch {
          // 続き生成に失敗しても本体は返す
        }
      }

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
