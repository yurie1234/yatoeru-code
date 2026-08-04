import { describe, expect, it } from "vitest";
import { DB_SUFFIX, itWithDb } from "./testDb";
import { z } from "zod";

/**
 * articlePublish.tsのバリデーションスキーマの単体テスト。
 * ハンドラ本体はDB・認証に依存するため、スキーマの受け入れ判定と
 * 静的スラッグ衝突リストの整合性を検証する。
 */

// articlePublish.tsと同一のスキーマ定義（エクスポートせず内部定義のため複製して検証）
const sourceSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(512),
});

const articleSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(10).max(120),
  description: z.string().min(40).max(300),
  bodyMd: z.string().min(1500).max(40000),
  tags: z.array(z.string().min(1).max(24)).min(1).max(5),
  baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sources: z.array(sourceSchema).min(1).max(10),
});

const validArticle = {
  slug: "gaishoku-tokutei-ginou-saiyou",
  title: "外食業で特定技能外国人を採用する手順と費用【2026年版】",
  description:
    "外食業で特定技能1号の外国人を採用する際の手順・試験要件・費用相場・使える助成金を、出入国在留管理庁の一次情報に基づいて解説します。",
  bodyMd: "外食業の人手不足は深刻です。".repeat(120), // 1500字以上
  tags: ["外食業", "特定技能", "採用手順"],
  baseDate: "2026-07-21",
  sources: [
    {
      name: "出入国在留管理庁 特定技能制度",
      url: "https://www.moj.go.jp/isa/policies/ssw/index.html",
    },
  ],
};

describe("articleSchema（記事投稿バリデーション）", () => {
  it("正常な記事を受け入れる", () => {
    expect(articleSchema.safeParse(validArticle).success).toBe(true);
  });

  it("大文字・アンダースコア入りのslugを拒否する", () => {
    for (const slug of ["Bad-Slug", "bad_slug", "-bad", "bad-", "日本語"]) {
      expect(
        articleSchema.safeParse({ ...validArticle, slug }).success,
        `slug "${slug}" should be rejected`
      ).toBe(false);
    }
  });

  it("本文が1500字未満なら拒否する", () => {
    expect(
      articleSchema.safeParse({ ...validArticle, bodyMd: "短い本文" }).success
    ).toBe(false);
  });

  it("出典が空なら拒否する", () => {
    expect(
      articleSchema.safeParse({ ...validArticle, sources: [] }).success
    ).toBe(false);
  });

  it("出典URLが不正なら拒否する", () => {
    expect(
      articleSchema.safeParse({
        ...validArticle,
        sources: [{ name: "テスト", url: "not-a-url" }],
      }).success
    ).toBe(false);
  });

  it("baseDateがYYYY-MM-DD以外なら拒否する", () => {
    expect(
      articleSchema.safeParse({ ...validArticle, baseDate: "2026/07/21" })
        .success
    ).toBe(false);
  });

  it("タグが6個以上なら拒否する", () => {
    expect(
      articleSchema.safeParse({
        ...validArticle,
        tags: ["a", "b", "c", "d", "e", "f"],
      }).success
    ).toBe(false);
  });

  it("descriptionが40字未満なら拒否する", () => {
    expect(
      articleSchema.safeParse({ ...validArticle, description: "短すぎる説明" })
        .success
    ).toBe(false);
  });
});

describe("articlesルーターの公開仕様", () => {
  it("静的コラム4本のスラッグが予約されている（衝突回避リスト）", async () => {
    // articlePublish.tsのSTATIC_COLUMNSに含まれるべきスラッグ
    const reserved = [
      "saiyou-cost-hikaku",
      "shien-kikan-erabikata",
      "kanri-dantai-ikou-guide",
      "shokai-vs-shien",
    ];
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL("./articlePublish.ts", import.meta.url),
      "utf-8"
    );
    for (const slug of reserved) {
      expect(src.includes(`"${slug}"`), `${slug} should be reserved`).toBe(
        true
      );
    }
  });
});

describe("articles.related（関連記事）", () => {
  // 記事テーブルへの読み書きが必要（DBが無い環境ではスキップ）
  itWithDb(`タグ一致記事を優先し、自分自身を除外して返す${DB_SUFFIX}`, async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });
    const result = await caller.articles.related({
      excludeSlug: "gaikokujin-koyou-kanri-shishin-kaisei-2026",
      tags: ["育成就労", "法改正"],
      limit: 3,
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(3);
    for (const a of result) {
      expect(a.slug).not.toBe("gaikokujin-koyou-kanri-shishin-kaisei-2026");
      expect(typeof a.title).toBe("string");
      expect(typeof a.baseDate).toBe("string");
    }
  });

  it("limitの上限（6）を超える指定はバリデーションで拒否する", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });
    await expect(
      caller.articles.related({ tags: ["特定技能"], limit: 10 })
    ).rejects.toThrow();
  });
});
