import type { Request, Response } from "express";
import { desc, sql } from "drizzle-orm";
import { registryChanges, registrySnapshots } from "../drizzle/schema";
import { getDb } from "./db";

const SITE_URL = "https://yatoeru.jp";
const SITE_TITLE = "ヤトエル｜外国人雇用ナビ";

/** XML特殊文字のエスケープ */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 手動記事（コラム）のフィード項目。新規公開時はここに追記する（新しい順） */
const COLUMN_ITEMS: Array<{
  slug: string;
  title: string;
  description: string;
  pubDate: string; // YYYY-MM-DD
}> = [
  {
    slug: "shokai-vs-shien",
    title: "人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由",
    description:
      "人材紹介会社（有料職業紹介事業者）と登録支援機関は別制度・別登録です。特定技能の支援委託前に入管庁の登録簿で登録番号を確認すべき理由と確認手順を解説します。",
    pubDate: "2026-07-16",
  },
  {
    slug: "kanri-dantai-ikou-guide",
    title: "監理団体から監理支援機関への移行ガイド：2026年9月までにやること",
    description:
      "2027年4月1日の育成就労制度施行に向け、監理団体の許可は引き継がれず、監理支援機関の許可を新たに受ける必要があります。施行日前申請（2026年4月15日受付開始）のスケジュールと準備事項を一次情報に基づき整理します。",
    pubDate: "2026-07-16",
  },
  {
    slug: "shien-kikan-erabikata",
    title: "登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法",
    description:
      "特定技能外国人の支援委託先を選ぶ際の料金相場（月額の目安と内訳）、契約前に確認すべき7項目、入管庁登録簿での登録番号の確認方法を解説します。",
    pubDate: "2026-07-16",
  },
];

/**
 * RSS 2.0 フィード（/rss.xml）。
 * 登録簿の週次差分記事（/updates/:baseDate）とコラム記事（/columns/:slug）を配信する。
 * AI・メディアの巡回導線として、結論を要約したdescriptionを含める。
 */
export async function rssHandler(_req: Request, res: Response) {
  try {
    const db = await getDb();

    type FeedItem = {
      title: string;
      link: string;
      description: string;
      pubDate: Date;
      guid: string;
    };
    const items: FeedItem[] = [];

    if (db) {
      const snapshots = await db
        .select()
        .from(registrySnapshots)
        .orderBy(desc(registrySnapshots.baseDate))
        .limit(20);

      const counts = await db
        .select({
          snapshotId: registryChanges.snapshotId,
          changeType: registryChanges.changeType,
          count: sql<number>`count(*)`,
        })
        .from(registryChanges)
        .groupBy(registryChanges.snapshotId, registryChanges.changeType);

      const countMap = new Map<number, { added: number; removed: number }>();
      for (const c of counts) {
        const entry = countMap.get(c.snapshotId) ?? { added: 0, removed: 0 };
        if (c.changeType === "added") entry.added = Number(c.count);
        else entry.removed = Number(c.count);
        countMap.set(c.snapshotId, entry);
      }

      for (const s of snapshots) {
        const cnt = countMap.get(s.id) ?? { added: 0, removed: 0 };
        const isInitial = cnt.added === 0 && cnt.removed === 0;
        const description = isInitial
          ? `${s.baseDate}時点の登録支援機関は全国${s.totalCount.toLocaleString()}件です（出入国在留管理庁 登録支援機関登録簿より）。`
          : `${s.baseDate}時点の登録支援機関は全国${s.totalCount.toLocaleString()}件。前回比で新規${cnt.added}件・抹消${cnt.removed}件の変動がありました（出入国在留管理庁 登録支援機関登録簿の差分より）。`;
        items.push({
          title: `登録支援機関登録簿 更新情報（${s.baseDate}基準）新規${cnt.added}件・抹消${cnt.removed}件`,
          link: `${SITE_URL}/updates/${s.baseDate}`,
          description,
          pubDate: s.createdAt ?? new Date(`${s.baseDate}T03:00:00Z`),
          guid: `${SITE_URL}/updates/${s.baseDate}`,
        });
      }
    }

    for (const c of COLUMN_ITEMS) {
      items.push({
        title: c.title,
        link: `${SITE_URL}/columns/${c.slug}`,
        description: c.description,
        pubDate: new Date(`${c.pubDate}T03:00:00Z`),
        guid: `${SITE_URL}/columns/${c.slug}`,
      });
    }

    items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

    const lastBuildDate = items[0]?.pubDate ?? new Date();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(SITE_TITLE)}</title>
<link>${SITE_URL}/</link>
<description>${esc(
      "登録支援機関の比較・検索サイト「ヤトエル」の更新情報。出入国在留管理庁の登録支援機関登録簿の差分（新規・抹消）と、特定技能・育成就労制度の解説記事を配信します。"
    )}</description>
<language>ja</language>
<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .map(
    (i) => `<item>
<title>${esc(i.title)}</title>
<link>${esc(i.link)}</link>
<description>${esc(i.description)}</description>
<pubDate>${i.pubDate.toUTCString()}</pubDate>
<guid isPermaLink="true">${esc(i.guid)}</guid>
</item>`
  )
  .join("\n")}
</channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    console.error("[rss] failed to build feed", err);
    res.status(500).send("Internal Server Error");
  }
}
