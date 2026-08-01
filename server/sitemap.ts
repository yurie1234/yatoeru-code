import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { getDb } from "./db";
import { articles, supportOrgs } from "../drizzle/schema";
import { PREFECTURES, TOKUTEI_FIELDS, UPCOMING_FIELDS } from "../shared/tokutei";
import { ALL_BUNYA_PAGES } from "../shared/bunya";

const SITE_URL = "https://yatoeru.jp";

// 機関sitemapの1ファイルあたりURL数（Googleの上限5万・50MBに対し十分小さく分割し、
// 1レスポンスを軽くしてSearch Console/Googlebotのfetchタイムアウトを回避する）
const ORGS_PER_SITEMAP = 5000;

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
  "/columns/saiyou-cost-hikaku",
  "/updates",
  "/ikusei-shuro",
  "/ikusei-shuro/kanri-shien-kikan/list",
  "/ikusei-shuro/schedule",
  "/ikusei-shuro/checklist",
  "/ikusei-shuro/for-kanri-dantai",
  // /bunya/全分野（19分野）はshared/bunya.tsの定義から自動展開
  ...ALL_BUNYA_PAGES.map((p) => `/bunya/${p.slug}`),
  "/area/aichi",
  "/area/osaka",
  "/area/tokyo",
  "/area/saitama",
  "/area/chiba",
  "/area/kanagawa",
  "/area/fukuoka",
  "/area/hokkaido",
  "/area/hiroshima",
  "/area/shizuoka",
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
  "/neutrality-policy",
];

// ---------------------------------------------------------------------------
// キャッシュ（インスタンスローカル）。子sitemap単位でキャッシュし、
// 生成コスト（DB全件クエリ＋XML構築）を毎リクエスト払わない。
// Autoscale環境ではインスタンスごとに独立したキャッシュになるが、
// 分割により1レスポンスが小さいため cold でも数秒で応答できる。
// ---------------------------------------------------------------------------
const CACHE_MS = 6 * 60 * 60 * 1000; // 6時間
const cache = new Map<string, { xml: string; at: number }>();

function getCache(key: string): string | null {
  const c = cache.get(key);
  if (c && Date.now() - c.at < CACHE_MS) return c.xml;
  return null;
}

function setCache(key: string, xml: string): string {
  cache.set(key, { xml, at: Date.now() });
  return xml;
}

function sendXml(res: Response, xml: string) {
  res
    .set("Content-Type", "application/xml; charset=utf-8")
    .set("Cache-Control", "public, max-age=3600")
    .send(xml);
}

function wrapUrlset(urls: string[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`
  );
}

// ---------------------------------------------------------------------------
// 子sitemap生成
// ---------------------------------------------------------------------------

/** core: 静的ページ・県ページ・分野ページ */
function buildCoreSitemap(): string {
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
  return wrapUrlset(urls);
}

/** articles: DB保存の動的コラム記事（公開済みのみ、lastmodはupdatedAt優先） */
async function buildArticlesSitemap(): Promise<string> {
  const db = await getDb();
  const dbArticles = !db
    ? []
    : await db
        .select({
          slug: articles.slug,
          baseDate: articles.baseDate,
          updatedAt: articles.updatedAt,
          status: articles.status,
        })
        .from(articles);
  const urls: string[] = [];
  for (const a of dbArticles) {
    if (a.status !== "published") continue;
    const updated = a.updatedAt?.toISOString().slice(0, 10);
    const lastmod = updated && updated > a.baseDate ? updated : a.baseDate;
    urls.push(
      `<url><loc>${esc(`${SITE_URL}/columns/${a.slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    );
  }
  return wrapUrlset(urls);
}

/** 機関ページの総数（indexの分割数算出用。5分キャッシュ） */
let orgCountCache: { count: number; at: number } | null = null;
async function getOrgCount(): Promise<number> {
  if (orgCountCache && Date.now() - orgCountCache.at < 5 * 60 * 1000) {
    return orgCountCache.count;
  }
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(supportOrgs);
  const count = Number(rows[0]?.count ?? 0);
  orgCountCache = { count, at: Date.now() };
  return count;
}

/** orgs-N: 機関詳細ページ（5,000件ずつ分割、運営確認済みを先頭に） */
async function buildOrgsSitemap(page: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return wrapUrlset([]);
  const offset = (page - 1) * ORGS_PER_SITEMAP;
  const orgs = await db
    .select({
      id: supportOrgs.id,
      verifiedAt: supportOrgs.verifiedAt,
      updatedAt: supportOrgs.updatedAt,
    })
    .from(supportOrgs)
    .where(eq(supportOrgs.isDeleted, false))
    .orderBy(sql`${supportOrgs.verifiedAt} IS NULL, ${supportOrgs.id}`)
    .limit(ORGS_PER_SITEMAP)
    .offset(offset);
  if (orgs.length === 0 && page > 1) return null; // 範囲外は404
  const urls: string[] = [];
  for (const o of orgs) {
    const lastmod = (o.verifiedAt ?? o.updatedAt)?.toISOString().slice(0, 10);
    // 運営確認済み機関はpriorityを上げてクロールを促す
    const priority = o.verifiedAt ? "0.8" : "0.5";
    urls.push(
      `<url><loc>${SITE_URL}/org/${o.id}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>monthly</changefreq><priority>${priority}</priority></url>`
    );
  }
  return wrapUrlset(urls);
}

// ---------------------------------------------------------------------------
// ハンドラ
// ---------------------------------------------------------------------------

/**
 * /sitemap.xml — sitemap index。
 * 従来は全11,000超URLを1ファイルで返しており、非圧縮1.5MB超・生成/転送に
 * 数十秒かかってSearch Consoleの取得がタイムアウトしていた。
 * indexは数百バイトで即応答し、実URLは子sitemapに分割して返す。
 */
export async function sitemapHandler(_req: Request, res: Response) {
  try {
    const cached = getCache("index");
    if (cached) {
      sendXml(res, cached);
      return;
    }
    const orgCount = await getOrgCount();
    const orgPages = Math.max(1, Math.ceil(orgCount / ORGS_PER_SITEMAP));
    const today = new Date().toISOString().slice(0, 10);
    const entries = [
      `<sitemap><loc>${SITE_URL}/sitemaps/core.xml</loc><lastmod>${today}</lastmod></sitemap>`,
      `<sitemap><loc>${SITE_URL}/sitemaps/articles.xml</loc><lastmod>${today}</lastmod></sitemap>`,
      ...Array.from(
        { length: orgPages },
        (_, i) =>
          `<sitemap><loc>${SITE_URL}/sitemaps/orgs-${i + 1}.xml</loc><lastmod>${today}</lastmod></sitemap>`
      ),
    ];
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      entries.join("\n") +
      `\n</sitemapindex>\n`;
    sendXml(res, setCache("index", xml));
  } catch (e) {
    console.error("[sitemap] index generation failed:", e);
    res.status(500).send("sitemap generation failed");
  }
}

/** /sitemaps/:name — 子sitemap（core.xml / articles.xml / orgs-N.xml） */
export async function sitemapChildHandler(req: Request, res: Response) {
  try {
    const name = String(req.params.name || "");
    const cached = getCache(name);
    if (cached) {
      sendXml(res, cached);
      return;
    }
    if (name === "core.xml") {
      sendXml(res, setCache(name, buildCoreSitemap()));
      return;
    }
    if (name === "articles.xml") {
      sendXml(res, setCache(name, await buildArticlesSitemap()));
      return;
    }
    const orgsMatch = name.match(/^orgs-(\d+)\.xml$/);
    if (orgsMatch) {
      const page = parseInt(orgsMatch[1], 10);
      if (page >= 1 && page <= 100) {
        const xml = await buildOrgsSitemap(page);
        if (xml !== null) {
          sendXml(res, setCache(name, xml));
          return;
        }
      }
    }
    res.status(404).send("not found");
  } catch (e) {
    console.error("[sitemap] child generation failed:", e);
    res.status(500).send("sitemap generation failed");
  }
}
