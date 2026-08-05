import type { Express, Request, Response, NextFunction } from "express";
import { kanriPath, parseKanriId } from "../shared/kanri";
import { eq } from "drizzle-orm";
import { supportOrgs } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * 登録番号から機関ページのURLを組み立てられるようにする。
 *
 * **なぜ必要か（実務で詰まっていたこと）**
 * 機関ページの正本URLは `/org/35173` で、この数字はDBの連番（内部ID）。
 * 登録簿にも機関名にも現れないため、営業メールを書くときに
 * 「この機関のページはどこか」を毎回サイト内検索して探す手作業が発生していた。
 * AIに文面を作らせてもURLだけは埋められない。
 *
 * そこで **登録番号から機械的に組み立てられる別名URL** を用意する。
 * 登録番号は登録簿・当方の名簿・送信済みメールのすべてに載っており、
 * 照会なしでURLが決まる。
 *
 *   登録番号 22登-007304  →  https://yatoeru.jp/org/22to-007304
 *   （規則: 「登」を to に置き換える。ほかは変えない）
 *
 * 別名は 301 で正本 `/org/<id>` へ送る。正本を変えないので、
 * **すでに送ったメールに書いた `/org/35173` はそのまま生き続ける**し、
 * 検索エンジンに登録済みの11,448ページのURLも動かない（重複も作らない）。
 *
 * 受け付ける書き方は幅を持たせる（人が手で書くときの揺れを吸収する）:
 *   22to-007304 / 22TO-007304 / 22to007304 / 22登-007304（日本語のまま）/ 22-007304
 */

/** 登録番号の正規形（DBの `support_orgs.regNo` と同じ形）に直す。判定できなければ null */
export function normalizeRegNo(raw: string): string | null {
  const s = raw.trim();
  // 全角の英数字・ハイフンを半角に寄せる
  const half = s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[－−–—ー―]/g, "-");
  // 年度2桁 + 「登」相当（to / t / 登）またはハイフン + 連番。
  // 区切りも「登」も無い純粋な数字（例: 35173）は受け付けない。
  // 受け付けてしまうと、内部IDの `/org/35173` を `35登-000173` と誤解釈する
  const m = half.match(/^(\d{2})\s*(?:(?:to|t|登)\s*-?|-)\s*(\d{1,6})$/i);
  if (!m) return null;
  return `${m[1]}登-${m[2].padStart(6, "0")}`;
}

/** 登録番号から別名URLのパスを作る（メール文面・資料で使う正式な書き方） */
export function orgAliasPath(regNo: string): string | null {
  const normalized = normalizeRegNo(regNo);
  if (!normalized) return null;
  return `/org/${normalized.replace("登", "to")}`;
}

/**
 * `/org/<登録番号>` を正本 `/org/<id>` へ301で送る。
 *
 * 既存の数値ID（`/org/35173`）はここで触らず、SSRの描画にそのまま渡す。
 * 見つからない登録番号も SSR に渡して、サイトの404表示に任せる
 * （このミドルウェアが独自のエラー画面を出すと表示が二重になる）。
 */
export function registerOrgUrlAlias(app: Express): void {
  app.get(/^\/org\/([^/]+)\/?$/, async (req: Request, res: Response, next: NextFunction) => {
    const raw = decodeURIComponent((req.params as unknown as string[])[0] ?? "");
    // 数値だけなら従来のIDなので何もしない
    if (/^\d+$/.test(raw)) return next();

    const regNo = normalizeRegNo(raw);
    if (!regNo) return next();

    try {
      const db = await getDb();
      if (!db) return next();
      const [org] = await db
        .select({ id: supportOrgs.id })
        .from(supportOrgs)
        .where(eq(supportOrgs.regNo, regNo))
        .limit(1);
      if (!org) return next();
      const query = req.originalUrl.slice(req.path.length);
      return res.redirect(301, `/org/${org.id}${query}`);
    } catch (e) {
      // DBが落ちているときに別名URLだけ500にしない。SSR側へ流す
      console.error("[orgUrlAlias] lookup failed:", e instanceof Error ? e.message : String(e));
      return next();
    }
  });
}

/**
 * 監理団体の詳細ページのURLを正本（小文字の管理ID）へ寄せる。
 *
 *   /kanri/I-0001 → 301 → /kanri/i-0001
 *   /kanri/i0001  → 301 → /kanri/i-0001
 *
 * 正本を1つに保つのは、同じ内容のページが複数のURLで開けると検索側で
 * 重複と扱われるため。営業文面では管理IDをそのまま小文字にすれば当たる。
 */
export function registerKanriUrlAlias(app: Express): void {
  app.get(/^\/kanri\/([^/]+)\/?$/, (req: Request, res: Response, next: NextFunction) => {
    const raw = decodeURIComponent((req.params as unknown as string[])[0] ?? "");
    const managementId = parseKanriId(raw);
    if (!managementId) return next(); // 管理IDでなければSSRに任せる（404表示）
    const canonical = kanriPath(managementId);
    if (`/kanri/${raw}` === canonical) return next(); // すでに正本
    const query = req.originalUrl.slice(req.path.length);
    return res.redirect(301, `${canonical}${query}`);
  });
}
