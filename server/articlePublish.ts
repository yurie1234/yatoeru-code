import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { articles } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";

/**
 * コラム記事投稿エンドポイント /api/scheduled/article-publish
 *
 * 週2回のAGENT cronがホットなテーマを調査・ライティング規範に則って執筆し、
 * ここにPOSTする。GETは既存記事のタイトル・スラッグ・タグ一覧を返し、
 * cron側のテーマ重複回避に使う。
 *
 * 冪等性: slugがunique。同じslugのPOSTは2回目以降409でスキップされる。
 */

const sourceSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(512),
});

const articleSchema = z.object({
  /** URLスラッグ（英小文字・数字・ハイフンのみ、例: "gaishoku-tokutei-ginou-2gou"） */
  slug: z
    .string()
    .min(3)
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  title: z.string().min(10).max(120),
  /** meta description・一覧カード用（80〜160字目安） */
  description: z.string().min(40).max(300),
  /** 記事冒頭の「この記事のポイント」ボックス用3、5個の要点（1文ずつ、各20、90字目安） */
  keyPoints: z.array(z.string().min(10).max(120)).min(3).max(5).optional(),
  /** 本文Markdown（H2見出し・表・箇条書き可。rawHTML不可） */
  bodyMd: z.string().min(1500).max(40000),
  tags: z.array(z.string().min(1).max(24)).min(1).max(5),
  /** 内容確認基準日 YYYY-MM-DD */
  baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 出典（一次情報を1件以上） */
  sources: z.array(sourceSchema).min(1).max(10),
});

/** 既存の静的コラム4本（コード内コンポーネント）。重複回避リストに含める */
const STATIC_COLUMNS = [
  {
    slug: "saiyou-cost-hikaku",
    title:
      "外国人採用のコストは高い？特定技能・育成就労と人材紹介・求人広告・派遣を徹底比較",
    tags: ["採用コスト", "特定技能", "比較"],
  },
  {
    slug: "shien-kikan-erabikata",
    title: "登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法",
    tags: ["特定技能", "登録支援機関", "料金"],
  },
  {
    slug: "kanri-dantai-ikou-guide",
    title: "監理団体から監理支援機関への移行ガイド：2026年9月の期限までにやること",
    tags: ["育成就労", "監理支援機関", "移行"],
  },
  {
    slug: "shokai-vs-shien",
    title: "人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由",
    tags: ["特定技能", "登録確認", "リスク回避"],
  },
] as const;

async function authorize(req: Request, res: Response): Promise<boolean> {
  try {
    const user = await sdk.authenticateRequest(req);
    const isOwnerAdmin = !user.isCron && user.role === "admin";
    if (!user.isCron && !isOwnerAdmin) {
      res.status(403).json({ error: "cron-or-admin-only" });
      return false;
    }
    return true;
  } catch {
    res.status(403).json({ error: "unauthorized" });
    return false;
  }
}

/** GET: 既存記事の一覧（重複回避用） */
export async function articleListHandler(req: Request, res: Response) {
  try {
    if (!(await authorize(req, res))) return;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "db-unavailable" });
    const rows = await db
      .select({
        slug: articles.slug,
        title: articles.title,
        tags: articles.tags,
        baseDate: articles.baseDate,
      })
      .from(articles)
      .orderBy(desc(articles.baseDate));
    res.json({
      ok: true,
      articles: [
        ...STATIC_COLUMNS.map((c) => ({ ...c, baseDate: "2026-07-17" })),
        ...rows,
      ],
    });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}

/** POST: 新規記事の投稿 */
export async function articlePublishHandler(req: Request, res: Response) {
  try {
    if (!(await authorize(req, res))) return;

    const parsed = articleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation-failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    const input = parsed.data;

    // 静的コラムとのスラッグ衝突を防止
    if (STATIC_COLUMNS.some((c) => c.slug === input.slug)) {
      return res.status(409).json({ error: "slug-conflicts-with-static-column" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "db-unavailable" });

    // 冪等性: 同slugの再POSTはスキップ（2xxを返してリトライを止める）
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, input.slug))
      .limit(1);
    if (existing.length > 0) {
      return res.json({ ok: true, skipped: "duplicate-slug", slug: input.slug });
    }

    await db.insert(articles).values({
      slug: input.slug,
      title: input.title,
      description: input.description,
      keyPoints: input.keyPoints ?? null,
      bodyMd: input.bodyMd,
      tags: input.tags,
      baseDate: input.baseDate,
      sources: input.sources,
      status: "published",
    });

    res.json({ ok: true, slug: input.slug, url: `https://yatoeru.jp/columns/${input.slug}` });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
