import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
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
import { invokeLLM, LlmInvokeError } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";
import { ADJACENT_PREFECTURES, PREFECTURES, TOKUTEI_FIELDS, UPCOMING_FIELDS } from "../../shared/tokutei";
import {
  calcAffinity,
  estimateOrgFields,
  FIELD_NAME_KEYWORDS,
  hasAffinityCondition,
} from "../../shared/affinity";
import type { TokuteiField } from "../../shared/tokutei";

/**
 * 分野に対応する「確認済み分野一致 or 機関名キーワード一致」のSQL条件を生成する。
 * 全件をアプリ側に転送してフィルタする方式はDB転送量が大きくタイムアウトの原因になるため、
 * DB側で絞り込む（機関名LIKEは FIELD_NAME_KEYWORDS と同一のキーワード群を使用）。
 */
/**
 * 公開レスポンス用サニタイズ：内部メモ（internalMemo）と送客優先度（referral*）は
 * 送客窓口・担当者名・価格反応・紹介料の意向等の完全非公開情報であり、
 * 公開ページ・API・構造化データのいずれにも絶対に出力しない。
 * すべてのpublicレスポンスは必ずこの関数を経由させること。
 *
 * referral* は現時点では drizzle/schema.ts に載せていないため公開クエリの結果には
 * 現れないが、将来スキーマへ取り込んだ瞬間に漏れるのを防ぐため先に除去しておく。
 */
function sanitizeOrg<T extends Record<string, unknown>>(org: T) {
  const {
    internalMemo: _internalMemo,
    referralIntent: _referralIntent,
    referralNote: _referralNote,
    referralUpdatedAt: _referralUpdatedAt,
    ...publicOrg
  } = org;
  return publicOrg as Omit<
    T,
    "internalMemo" | "referralIntent" | "referralNote" | "referralUpdatedAt"
  >;
}

/** regDateの古い順比較（同点時の最終タイブレーク：登録年月日の古い順。nullは最後尾） */
function compareRegDateAsc(a: { regDate: unknown }, b: { regDate: unknown }): number {
  const ta = a.regDate ? new Date(String(a.regDate)).getTime() : Number.POSITIVE_INFINITY;
  const tb = b.regDate ? new Date(String(b.regDate)).getTime() : Number.POSITIVE_INFINITY;
  return ta - tb;
}

function fieldBoostCondition(field: string) {
  const keywords = FIELD_NAME_KEYWORDS[field as TokuteiField] ?? [];
  const likes = keywords.map((kw) => like(supportOrgs.name, `%${kw}%`));
  return or(
    sql`JSON_CONTAINS(${supportOrgs.fields}, ${JSON.stringify(field)})`,
    ...likes
  );
}

type DiagnosisDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * 診断結果に適合する支援機関の上位5件を返す。
 * diagnoseUrl（初回のAI解析）と applyDiagnosisAnswers（ウィザード回答の反映）の
 * 両方から使う。回答の反映でAIを呼び直さないための共通化。
 */
async function findRecommendedOrgs(
  db: DiagnosisDb,
  { field, prefecture }: { field: string | null; prefecture: string | null }
) {
  // 適合する支援機関を検索し、親和性スコア順（分野40・地域30・言語20・信頼性10；検索ページと同一ロジック）に上位5件を返す
  const conditions = [];
  if (field) {
    // fields未登録（NULL）の機関も候補に含める（登録簿に分野情報がないため）
    conditions.push(
      sql`(${supportOrgs.fields} IS NULL OR JSON_CONTAINS(${supportOrgs.fields}, ${JSON.stringify(field)}))`
    );
  }

  // 候補取得順はレビュー数→登録日の古い順（検索と同様、Capバイアス防止）
  const candidates = await db
    .select()
    .from(supportOrgs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(supportOrgs.reviewCount), supportOrgs.regDate, supportOrgs.id)
    .limit(500);

  // 候補Cap外の「確認済み分野一致」「機関名推定一致」機関をマージ（推奨精度向上）。
  // DB側で分野キーワード条件により絞り込む（全件転送はタイムアウトの原因となるため行わない）。
  if (field) {
    const boosted = await db
      .select()
      .from(supportOrgs)
      .where(
        and(
          conditions.length > 0 ? and(...conditions) : undefined,
          fieldBoostCondition(field)
        )
      )
      .orderBy(desc(supportOrgs.reviewCount), supportOrgs.regDate, supportOrgs.id)
      .limit(1000)
      .then((rows) =>
        rows.filter(
          (o) =>
            (o.fields as string[] | null)?.includes(field) ||
            estimateOrgFields(o.name).includes(field as never)
        )
      );
    const seen = new Set(candidates.map((c) => c.id));
    for (const b of boosted) {
      if (!seen.has(b.id)) {
        candidates.push(b);
        seen.add(b.id);
      }
    }
  }

  // 地域適合候補のマージ：支援業務は定期面談・訪問を伴うため、企業所在県・隣接県の機関を
  // 候補Cap（500件）の外からも必ず取り込む。
  // （これがないと、京都の企業に千葉・福岡の機関ばかり提示される――地域スコア30点が死ぬ）
  if (prefecture) {
    const nearbyPrefs = [prefecture, ...(ADJACENT_PREFECTURES[prefecture] ?? [])];
    const nearby = await db
      .select()
      .from(supportOrgs)
      .where(
        and(
          conditions.length > 0 ? and(...conditions) : undefined,
          or(
            inArray(supportOrgs.prefecture, nearbyPrefs),
            // 希望する相談条件（受けたい地域：都道府県粒度・"全国"）に企業所在県が含まれる機関も取り込む
            sql`JSON_CONTAINS(${supportOrgs.preferredRegions}, ${JSON.stringify(prefecture)})`,
            sql`JSON_CONTAINS(${supportOrgs.preferredRegions}, ${JSON.stringify("全国")})`
          )
        )
      )
      .orderBy(desc(supportOrgs.reviewCount), supportOrgs.regDate, supportOrgs.id)
      .limit(500);
    const seen = new Set(candidates.map((c) => c.id));
    for (const n of nearby) {
      if (!seen.has(n.id)) {
        candidates.push(n);
        seen.add(n.id);
      }
    }
  }

  return candidates
    .map((org) => ({
      ...sanitizeOrg(org),
      affinity: calcAffinity(
        { targetField: field, targetPrefecture: prefecture, targetLanguage: null },
        {
          name: org.name,
          prefecture: org.prefecture,
          fields: org.fields as string[] | null,
          languages: org.languages as string[] | null,
          hasPenalty: org.hasPenalty,
          registeredDate: org.regDate ? String(org.regDate) : null,
          verifiedAt: org.verifiedAt,
          preferredFields: org.preferredFields as string[] | null,
          preferredRegions: org.preferredRegions as string[] | null,
          consultStatus: org.consultStatus,
        }
      ),
    }))
    // 同点時の最終タイブレークは登録年月日の古い順
    .sort(
      (a, b) =>
        b.affinity.score - a.affinity.score ||
        compareRegDateAsc(a, b)
    )
    .slice(0, 5);

}

/** 診断結果のうち、保存・表示・機関推奨で参照する項目 */
type DiagnosisResultData = Record<string, unknown> & {
  companyName: string;
  industry: string;
  field: string | null;
  prefecture: string | null;
  score: number;
};

/**
 * ウィザード回答を診断結果へ反映する（分野・都道府県・人数は回答をAI推測より優先）。
 * AIの再実行を伴わない純粋な上書き処理。
 */
function applyAnswersToResult(
  result: Record<string, unknown>,
  answers: {
    field?: string | null;
    prefecture?: string | null;
    headcount?: string | null;
    timing?: string | null;
    jisshuExperience?: boolean | null;
  } | null | undefined
): DiagnosisResultData {
  const answeredField =
    typeof answers?.field === "string" && (TOKUTEI_FIELDS as readonly string[]).includes(answers.field)
      ? answers.field
      : null;
  const answeredPref =
    typeof answers?.prefecture === "string" && (PREFECTURES as readonly string[]).includes(answers.prefecture)
      ? answers.prefecture
      : null;
  return {
    ...result,
    ...(answeredField ? { field: answeredField } : {}),
    ...(answeredPref ? { prefecture: answeredPref } : {}),
    ...(answers?.headcount ? { headcount: answers.headcount } : {}),
    answers: answers ?? null,
  } as unknown as DiagnosisResultData;
}

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
        /** affinity=親和性スコア順（既定） / default=従来順 */
        sort: z.enum(["affinity", "default"]).default("affinity"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [];
      if (input.keyword) {
        // エイリアス（通称・サービス名）も検索対象に含める（JSON配列を文字列としてLIKE検索）
        conditions.push(
          or(
            like(supportOrgs.name, `%${input.keyword}%`),
            like(supportOrgs.address, `%${input.keyword}%`),
            sql`CAST(${supportOrgs.aliases} AS CHAR) LIKE ${`%${input.keyword}%`}`
          )
        );
      }
      if (input.prefecture) {
        // 所在県一致に加え、希望する相談条件（受けたい地域：都道府県粒度で登録・"全国"を含む）に
        // 指定県が含まれる機関も候補に含める（事業者に直接確認済みの対応地域）。
        conditions.push(
          or(
            eq(supportOrgs.prefecture, input.prefecture),
            sql`JSON_CONTAINS(${supportOrgs.preferredRegions}, ${JSON.stringify(input.prefecture)})`,
            sql`JSON_CONTAINS(${supportOrgs.preferredRegions}, ${JSON.stringify("全国")})`
          )
        );
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

      // 親和性スコアは分野・地域・言語の指定があって初めて算定できる。
      // キーワードだけの検索や条件なしの一覧では算定根拠が無いため、スコアを付けず
      // 標準順（登録年月日順）で返す。以前は条件なしでも全機関に同じ点数（分野配点の
      // 半分＋処分歴なし＝25点）が付き、根拠のないスコアが並んでいた。
      const affinityInput = {
        targetField: input.field ?? null,
        targetPrefecture: input.prefecture ?? null,
        targetLanguage: input.language ?? null,
      };

      // 親和性スコア順ソートの場合は、条件に合致する候補を広めに取得して
      // アプリ側でスコア算出・並べ替え・ページングする。
      // 注：将来、有料掲載を同点内で優先表示する場合は、景品表示法（ステマ規制）対応のためPRラベルの明示が必須。
      if (input.sort === "affinity" && hasAffinityCondition(affinityInput)) {
        // 候補Capの取得順はレビュー数→登録日の古い順。
        // id降順だと新規登録（登録年数加点0点）ばかりがCapを占め、古参機関（+3点）が候補外に
        // 落ちてスコア分解能が死ぬ（全件同点の原因）。
        const candidateCap = 1000;
        const candidates = await db
          .select()
          .from(supportOrgs)
          .where(whereClause)
          .orderBy(desc(supportOrgs.reviewCount), supportOrgs.regDate, supportOrgs.id)
          .limit(candidateCap);

        // 分野指定時：候補Capの外にいる「確認済み分野一致」「機関名推定一致」の機関を取りこぼさないよう、
        // DB側で分野キーワード条件により絞り込んで追加取得しマージする（全件転送はタイムアウトの原因となるため行わない）。
        if (input.field) {
          const boosted = await db
            .select()
            .from(supportOrgs)
            .where(and(whereClause, fieldBoostCondition(input.field)))
            .orderBy(desc(supportOrgs.reviewCount), supportOrgs.regDate, supportOrgs.id)
            .limit(1000)
            .then((rows) =>
              rows.filter(
                (o) =>
                  (o.fields as string[] | null)?.includes(input.field!) ||
                  estimateOrgFields(o.name).includes(input.field as never)
              )
            );
          const seen = new Set(candidates.map((c) => c.id));
          for (const b of boosted) {
            if (!seen.has(b.id)) {
              candidates.push(b);
              seen.add(b.id);
            }
          }
        }

        const scored = candidates
          .map((org) => {
            const affinity = calcAffinity(affinityInput, {
              name: org.name,
              prefecture: org.prefecture,
              fields: org.fields as string[] | null,
              languages: org.languages as string[] | null,
              hasPenalty: org.hasPenalty,
              registeredDate: org.regDate ? String(org.regDate) : null,
              verifiedAt: org.verifiedAt,
              preferredFields: org.preferredFields as string[] | null,
              preferredRegions: org.preferredRegions as string[] | null,
              consultStatus: org.consultStatus,
            });
            return { ...sanitizeOrg(org), affinity };
          })
          // 同点時の最終タイブレークは登録年月日の古い順
          .sort(
            (a, b) =>
              b.affinity.score - a.affinity.score ||
              compareRegDateAsc(a, b)
          );

        const start = (input.page - 1) * input.limit;
        return {
          items: scored.slice(start, start + input.limit),
          total: Number(totalResult.count),
          page: input.page,
          totalPages: Math.ceil(Number(totalResult.count) / input.limit),
        };
      }

      const items = await db
        .select()
        .from(supportOrgs)
        .where(whereClause)
        // 標準順＝登録年月日の古い順（中立な並び順。有料プランは並び順に影響させない）
        .orderBy(supportOrgs.regDate, supportOrgs.id)
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);

      return {
        items: items.map((org) => ({ ...sanitizeOrg(org), affinity: undefined })),
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
    if (!org || org.isDeleted) throw new TRPCError({ code: "NOT_FOUND" });

    const orgReviews = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.orgId, input), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt));

    // 内部メモは完全非公開：公開ページ・API・構造化データのいずれにも出力しない
    return { org: sanitizeOrg(org), reviews: orgReviews };
  }),

  // 3. URL・会社名診断機能（AI業種解析）
  // 後方互換：従来の { url } 単独入力も引き続き動作する。
  // 新フロー：会社名のみの入力や、ウィザード回答（answers）による上書きに対応。
  diagnoseUrl: publicProcedure
    .input(
      z
        .object({
          url: z.string().url().optional(),
          companyName: z.string().min(1).max(120).optional(),
          answers: z
            .object({
              field: z.string().nullable().optional(),
              prefecture: z.string().nullable().optional(),
              headcount: z.string().nullable().optional(),
              timing: z.string().nullable().optional(),
              jisshuExperience: z.boolean().nullable().optional(),
            })
            .optional(),
        })
        .refine((v) => v.url || v.companyName, {
          message: "urlまたはcompanyNameのいずれかが必要です",
        })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. URL先の実ページ本文を取得（失敗しても診断は続行し、本文なしでの推測であることをAIに明示）
      let pageText = "";
      if (input.url) try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(input.url as string, {
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

      const subjectLine = input.url
        ? `URL: ${input.url}`
        : `企業名: ${input.companyName}`;
      const noPageNote = input.url
        ? "\n※ ページ内容を取得できなかったため、URLの文字列（ドメイン名・パス）のみから推測してください。推測の不確実性はスコアとreasonに反映してください。\n"
        : "\n※ 企業名のみからの推測です。社名に含まれる業種キーワード（例：○○建設、○○介護、○○食堂）や一般的に知られている企業情報から判断し、推測の不確実性はスコア（特にscoreInfo）とreasonに反映してください。\n";
      const prompt = `
あなたは特定技能制度の受入れ適合性を評価する専門家です。以下の企業について、特定技能制度を活用して外国人材を受け入れる場合の診断を行ってください。

${subjectLine}
${pageText ? `\n【実際に取得したページ内容】\n${pageText}\n` : noPageNote}
以下のJSONスキーマに厳密に従って出力してください。
- companyName: 推測される企業名（不明な場合は"不明"）
- industry: 推測される業種
- field: 特定技能19分野（${TOKUTEI_FIELDS.join("、")}）のうち、最も該当する可能性が高いもの。分野名は上記の表記を一字一句そのまま使うこと。該当なしの場合はnull。※鉄道事業者→「鉄道」、トラック・タクシー・バス→「自動車運送業」、製造業全般→「工業製品製造業」。なお「${UPCOMING_FIELDS.join("」「")}」の3分野は2026年1月に追加が閣議決定され受入れは2027年度開始見込み（評価試験等整備中）だが、該当する場合は分野名を返し、reasonでその旨に触れること
- headcount: 企業規模から推測される受入可能枠（例: "1ー5名", "10名以上"）
- cost: 概算コスト（初期費用＋月額支援委託費の目安。範囲は必ず「〜」で表記する。例: "初期10〜30万円＋月額2〜4万円/人"。相場：登録支援機関への委託時、初期費用（事前ガイダンス・住居確保・生活オリエンテーション・申請書類作成等）は10〜30万円、月額支援委託費は1人あたり2〜4万円（業界平均約2.8万円、約7割が1.5〜3万円）が一般的。海外在住者の新規受入は渡航費・送出機関費用で初期費用が30〜60万円に増える場合がある）
- scoreField: (a) 分野該当性（0-40の整数）: 事業内容が特定技能19分野の対象業務に直接該当=35-40、隣接・一部該当=20-34、間接的=5-19、該当なし=0-4
- scoreLabor: (b) 人手不足度（0-30の整数）: 当該業界の人手不足の深刻度と現場職の比重（現場作業中心=高、オフィスワーク中心=低）
- scoreInfo: (c) 情報の確からしさ（0-30の整数）: ページ内容から事業内容・規模が具体的に確認できた=20-30、一部確認=10-19、URLのみからの推測=0-9
  同じ点数帯に収束させず、根拠に応じて差をつけること。
- prefecture: 企業の本社・主たる事業所の所在都道府県（例: "京都府"。必ず「都道府県」付きの正式名称で返す。ページ内の住所・会社概要・電話の市外局番等から判断し、判別できない場合はnull）
- reason: 診断理由（採点内訳 a/b/c の点数に触れながら150文字程度。合計点には触れないこと）
`;

      let llmResult;
      try {
        llmResult = await invokeLLM({
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
                  scoreField: { type: "integer" },
                  scoreLabor: { type: "integer" },
                  scoreInfo: { type: "integer" },
                  prefecture: { type: ["string", "null"] },
                  reason: { type: "string" },
                },
                required: ["companyName", "industry", "field", "headcount", "cost", "scoreField", "scoreLabor", "scoreInfo", "prefecture", "reason"],
                additionalProperties: false,
              },
            },
          },
        });
      } catch (e) {
        // 失敗理由だけを利用者に伝える（キー等の値は含めない。原因は下位でログ済み）
        const reason = e instanceof LlmInvokeError ? e.reason : "unknown";
        console.error("[diagnose] LLM invoke failed", { reason, error: e });
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message:
            reason === "rate-limited"
              ? "AIの利用が混み合っています。少し時間をおいて再度お試しください。"
              : reason === "network" || reason === "upstream-error"
                ? "AI解析に一時的に接続できませんでした。時間をおいて再度お試しください。"
                : `AI解析を実行できませんでした（${reason}）。運営にお問い合わせください。`,
        });
      }

      const rawContent = llmResult.choices[0].message.content;
      const contentStr = typeof rawContent === "string" ? rawContent : "{}";
      const parsed = JSON.parse(contentStr);

      // スコアは内訳（a/b/c）からサーバー側で合計を算出して確定する（LLMの合計計算ミスによる
      // 「内訳と合計の不整合」を構造的に防止）。各項目はルーブリックの上限でクランプする。
      const clamp = (v: unknown, max: number) =>
        Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
      const scoreField = clamp(parsed.scoreField, 40);
      const scoreLabor = clamp(parsed.scoreLabor, 30);
      const scoreInfo = clamp(parsed.scoreInfo, 30);
      const totalScore = scoreField + scoreLabor + scoreInfo;
      // コスト表記の揺れ（長音符・ハイフンによる範囲表記）を「〜」に正規化。
      // 相場根拠（2026-07確認）：月額支援委託費の業界平均は約28,000円、約7割が15,000〜30,000円のレンジ
      // （出典例：meikoglobal.jp支援委託費調査、jac-skill.or.jp「2〜3万円/月/人が目安」、samurai-law.com「1.5〜3万円/月」）。
      // 初期費用（国内在留者・委託支援）は10〜30万円程度、海外新規受入は30〜60万円程度まで幅がある。
      const normalizedCost = String(parsed.cost ?? "").replace(/(\d)\s*[ー‐-―−-]\s*(?=\d|＋|\+|万)/g, "$1〜");
      // 所在都道府県はPREFECTURESに含まれる正式名称のみ採用（LLMの表記揺れ・幻覚を防止）
      // ウィザード回答（answers）がある場合は回答をAI推測より優先する
      const answeredPref =
        typeof input.answers?.prefecture === "string" &&
        (PREFECTURES as readonly string[]).includes(input.answers.prefecture)
          ? input.answers.prefecture
          : null;
      const companyPrefecture: string | null =
        answeredPref ??
        (typeof parsed.prefecture === "string" && (PREFECTURES as readonly string[]).includes(parsed.prefecture)
          ? parsed.prefecture
          : null);
      // 分野・人数もウィザード回答を優先（applyAnswersToResult に集約）
      const resultData = applyAnswersToResult(
        {
          ...parsed,
          prefecture: companyPrefecture,
          cost: normalizedCost,
          score: totalScore,
          scoreBreakdown: { field: scoreField, labor: scoreLabor, info: scoreInfo },
          // 採点内訳を含むコメントはサーバー側で生成（内訳と合計の整合を保証）
          reason: `a)分野該当性${scoreField}点、b)人手不足度${scoreLabor}点、c)情報の確からしさ${scoreInfo}点、合計${totalScore}点。${String(parsed.reason ?? "")}`,
        },
        input.answers
      );

      // 診断履歴を保存（会社名のみの場合は company: プレフィックスで記録）
      const [insertResult] = await db.insert(diagnoses).values({
        inputUrl: input.url ?? `company:${input.companyName}`,
        companyName: resultData.companyName,
        industry: resultData.industry,
        result: resultData,
        matchScore: resultData.score,
        userId: ctx.user?.id,
      });

      const recommendedOrgs = await findRecommendedOrgs(db, {
        field: resultData.field,
        prefecture: resultData.prefecture,
      });

      return {
        diagnosisId: insertResult.insertId,
        result: resultData,
        recommendedOrgs,
      };
    }),

  /**
   * 3-2. ウィザード回答の反映（AIを呼び直さない）
   *
   * 以前はウィザードの回答後に diagnoseUrl をもう一度呼んでいたため、1回の診断で
   * LLM呼び出し2回・企業サイト取得2回・diagnoses行2件が発生し、利用者は同じ
   * 5段階のローディングを2度待たされていた。さらに2回目のAI出力が1回目と変わり、
   * 質問中に見えていた推定業種・スコアが結果画面で別の値になることがあった。
   *
   * 回答の反映に必要な処理は「分野・都道府県・人数の上書き」と「候補機関の再検索」
   * だけでAIを必要としないため、保存済みの診断結果を読み出して上書きし、同じ行を
   * 更新する（新しい行は作らない＝診断件数の二重計上も止まる）。
   */
  applyDiagnosisAnswers: publicProcedure
    .input(
      z.object({
        diagnosisId: z.number().int().positive(),
        answers: z.object({
          field: z.string().nullable().optional(),
          prefecture: z.string().nullable().optional(),
          headcount: z.string().nullable().optional(),
          timing: z.string().nullable().optional(),
          jisshuExperience: z.boolean().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select({ id: diagnoses.id, result: diagnoses.result })
        .from(diagnoses)
        .where(eq(diagnoses.id, input.diagnosisId))
        .limit(1);
      if (rows.length === 0 || !rows[0].result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "診断結果が見つかりません" });
      }

      const stored = rows[0].result as Record<string, unknown>;
      const resultData = applyAnswersToResult(stored, input.answers);

      await db
        .update(diagnoses)
        .set({ result: resultData })
        .where(eq(diagnoses.id, input.diagnosisId));

      const recommendedOrgs = await findRecommendedOrgs(db, {
        field: resultData.field,
        prefecture: resultData.prefecture,
      });

      return { diagnosisId: input.diagnosisId, result: resultData, recommendedOrgs };
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
