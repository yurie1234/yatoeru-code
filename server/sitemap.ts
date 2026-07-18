import { sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { getDb } from "./db";
import { supportOrgs } from "../drizzle/schema";
import { PREFECTURES, TOKUTEI_FIELDS, UPCOMING_FIELDS } from "../shared/tokutei";

const SITE_URL = "https://yatoeru.jp";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 静的ページ（インデックス対象の公開ルートのみ） */
const STATIC_PATHS = [
  "/",
  "/search",
  "/diagnose",
  "/consult",
  "/stats",
  "/columns",
  "/columns/shien-kikan-erabikata",
  "/columns/kanri-dantai-ikou-guide",
  "/columns/shokai-vs-shien",
  "/updates",
  "/guide/ikusei-shuro",
  "/guide/ikusei-shuro-cost",
  "/guide/ikusei-shuro-schedule",
  "/guide/ginou-jisshu-chigai",
  "/guide/tokutei-ginou-ikou",
  "/guide/kanri-shien-kikan",
  "/joseikin",
  "/joseikin/jinzai-kakuho",
  "/joseikin/gyomu-kaizen",
  "/joseikin/career-up",
  "/joseikin/trial-koyou",
  "/joseikin/jinzai-kaihatsu",
  "/for-organizations",
  "/about",
  "/terms",
  "/privacy",
];

// 生成コスト（1万URL超）を毎リクエスト払わないよう10分キャッシュ
let cached: { xml: string; at: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function sitemapHandler(_req: Request, res: Response) {
  try {
    if (cached && Date.now() - cached.at < CACHE_MS) {
      res.set("Content-Type", "application/xml; charset=utf-8").send(cached.xml);
      return;
    }
    const db = await getDb();
    // 全機関のid・lastmod（運営確認日を優先、なければ登録簿更新日時）
    const orgs = !db
      ? []
      : await db
      .select({
        id: supportOrgs.id,
        verifiedAt: supportOrgs.verifiedAt,
        updatedAt: supportOrgs.updatedAt,
      })
      .from(supportOrgs)
      .orderBy(sql`${supportOrgs.verifiedAt} IS NULL, ${supportOrgs.id}`);

    const today = new Date().toISOString().slice(0, 10);
    const urls: string[] = [];

    for (const p of STATIC_PATHS) {
      urls.push(
        `<url><loc>${esc(SITE_URL + p)}</loc>${p === "/" || p === "/updates" ? `<lastmod>${today}</lastmod>` : ""}<changefreq>${p === "/" ? "daily" : "weekly"}</changefreq><priority>${p === "/" ? "1.0" : "0.7"}</priority></url>`
      );
    }
    for (const pref of PREFECTURES) {
      urls.push(
        `<url><loc>${esc(`${SITE_URL}/region/${encodeURIComponent(pref)}`)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`
      );
    }
    for (const f of [...TOKUTEI_FIELDS, ...UPCOMING_FIELDS]) {
      urls.push(
        `<url><loc>${esc(`${SITE_URL}/field/${encodeURIComponent(f)}`)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`
      );
    }
    for (const o of orgs) {
      const lastmod = (o.verifiedAt ?? o.updatedAt)?.toISOString().slice(0, 10);
      // 運営確認済み機関はpriorityを上げてクロールを促す
      const priority = o.verifiedAt ? "0.8" : "0.5";
      urls.push(
        `<url><loc>${SITE_URL}/org/${o.id}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>monthly</changefreq><priority>${priority}</priority></url>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.join("\n") +
      `\n</urlset>\n`;
    cached = { xml, at: Date.now() };
    res.set("Content-Type", "application/xml; charset=utf-8").send(xml);
  } catch (e) {
    console.error("[sitemap] generation failed:", e);
    res.status(500).send("sitemap generation failed");
  }
}
