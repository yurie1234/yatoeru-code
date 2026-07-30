import type { Request, Response } from "express";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  kanriOrgs,
  sheetSyncLogs,
  supportOrgs,
  type InsertKanriOrg,
  type InsertSupportOrg,
} from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { PREFECTURES } from "../shared/tokutei";

/**
 * マスターDB同期エンドポイント /api/scheduled/sheet-sync
 *
 * マスターDBはGoogleスプレッドシート「yatoeru_マスターDB」（オーナー: info@tenbouworks.jp）。
 * 月1のAGENT cron（またはManusセッション上の同期スクリプト）がシートを読み取り、
 * ここにPOSTしてサイトDB（写し）へ一方向同期する。サイト側でデータを直接書き換えない。
 *
 * 検証3ルール（異常時は同期を中断しaborted記録＋エラー返却）:
 *  1. 総件数が前回同期から10%以上減っていないか（取得失敗の兆候）
 *  2. 登録番号（管理ID）に重複がないか
 *  3. 必須カラム（法人名・所在地都道府県）の欠損がないか
 *
 * type別の動作:
 *  - shien: 登録支援機関シート → support_orgs 差分更新（新規追加・変更反映・抹消削除）
 *  - kanri: 監理支援機関シート → kanri_orgs 差分更新
 *  - management: 掲載管理シート → support_orgs.plan / consultStatus 等に反映
 */

const shienRowSchema = z.object({
  regNo: z.string().min(1).max(32),
  name: z.string().max(255).default(""),
  prefecture: z.string().max(32).optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  representative: z.string().max(255).optional().nullable(),
  /** 対応可能都道府県（カンマ区切り→配列化済み） */
  preferredRegions: z.array(z.string()).optional().nullable(),
  /** 対応分野スラッグ配列 */
  fields: z.array(z.string()).optional().nullable(),
  regDate: z.string().max(16).optional().nullable(),
});

const kanriRowSchema = z.object({
  managementId: z.string().min(1).max(16),
  name: z.string().max(255).default(""),
  prefecture: z.string().max(32).optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  permitType: z.enum(["general", "specific"]),
  permitDate: z.string().max(16).optional().nullable(),
  permitExpiry: z.string().max(16).optional().nullable(),
  receiveCountries: z.string().optional().nullable(),
  jobCodes: z.array(z.string()).optional().nullable(),
  kaigoSupport: z.boolean().optional(),
  migrationStatus: z
    .enum(["unconfirmed", "preparing", "applying", "permitted", "not_migrating"])
    .optional(),
  statusConfirmedAt: z.string().max(16).optional().nullable(),
  statusNote: z.string().optional().nullable(),
  isVerified: z.boolean().optional(),
  verifiedAt: z.string().max(16).optional().nullable(),
});

const managementRowSchema = z.object({
  /** 機関ID（登録番号 or 管理ID） */
  orgId: z.string().min(1).max(32),
  /** 掲載プラン: 無料/有料 → free/paid */
  plan: z.enum(["free", "paid"]).optional().nullable(),
  /** 相談ステータス */
  consultStatus: z.enum(["unknown", "open", "open_active", "paused"]).optional().nullable(),
});

const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("shien"),
    baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rows: z.array(shienRowSchema).min(1),
  }),
  z.object({
    type: z.literal("kanri"),
    baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rows: z.array(kanriRowSchema).min(1),
  }),
  z.object({
    type: z.literal("management"),
    baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rows: z.array(managementRowSchema).min(1),
  }),
]);

function normalizePref(p: string | null | undefined): string | null {
  if (!p) return null;
  const t = p.trim();
  return (PREFECTURES as readonly string[]).includes(t) ? t : null;
}

async function logSync(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  entry: typeof sheetSyncLogs.$inferInsert
) {
  try {
    await db.insert(sheetSyncLogs).values(entry);
  } catch {
    // ログ記録失敗は同期自体を失敗にしない
  }
}

export async function sheetSyncHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    const isOwnerAdmin = !user.isCron && user.role === "admin";
    if (!user.isCron && !isOwnerAdmin) {
      return res.status(403).json({ error: "cron-or-admin-only" });
    }

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid-payload", detail: parsed.error.flatten() });
    }
    const payload = parsed.data;

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "db-unavailable" });

    // ============ 検証3ルール ============
    const keyOf = (r: { regNo?: string; managementId?: string; orgId?: string }) =>
      ("regNo" in r && r.regNo) || ("managementId" in r && r.managementId) || ("orgId" in r && r.orgId) || "";

    // ルール2: キー重複チェック
    const keys = payload.rows.map((r) => keyOf(r as never));
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const k of keys) {
      if (seen.has(k)) dups.push(k);
      seen.add(k);
    }
    if (dups.length > 0) {
      await logSync(db, {
        target: payload.type,
        baseDate: payload.baseDate,
        status: "aborted",
        totalCount: payload.rows.length,
        detail: `検証ルール違反: キー重複 ${dups.length}件 (${dups.slice(0, 5).join(", ")}${dups.length > 5 ? " ほか" : ""})`,
      });
      return res.status(400).json({ error: "duplicate-keys", duplicates: dups.slice(0, 20) });
    }

    // ルール3: 必須カラム欠損チェック（法人名・所在地都道府県）— shien/kanriのみ
    if (payload.type === "shien" || payload.type === "kanri") {
      const missing = (payload.rows as Array<{ name: string; prefecture?: string | null }>).filter(
        (r) => !r.name || !r.name.trim() || !normalizePref(r.prefecture)
      );
      if (missing.length > 0) {
        const missKeys = (missing as never[]).map((r) => keyOf(r)).slice(0, 20);
        await logSync(db, {
          target: payload.type,
          baseDate: payload.baseDate,
          status: "aborted",
          totalCount: payload.rows.length,
          detail: `検証ルール違反: 必須カラム（法人名・所在地都道府県）欠損 ${missing.length}件 (${missKeys.slice(0, 5).join(", ")}${missing.length > 5 ? " ほか" : ""})`,
        });
        return res.status(400).json({
          error: "missing-required-columns",
          count: missing.length,
          keys: missKeys,
        });
      }
    }

    // ルール1: 総件数10%減チェック — shien/kanriのみ（managementは部分更新のため対象外）
    if (payload.type === "shien" || payload.type === "kanri") {
      const table = payload.type === "shien" ? supportOrgs : kanriOrgs;
      const current = await db.select({ id: table.id }).from(table);
      const prevCount = current.length;
      if (prevCount > 0 && payload.rows.length < prevCount * 0.9) {
        await logSync(db, {
          target: payload.type,
          baseDate: payload.baseDate,
          status: "aborted",
          totalCount: payload.rows.length,
          detail: `検証ルール違反: 総件数が前回${prevCount}件から${payload.rows.length}件へ10%以上減少（取得失敗の兆候）`,
        });
        return res.status(400).json({
          error: "count-drop-over-10-percent",
          previous: prevCount,
          incoming: payload.rows.length,
        });
      }
    }

    // ============ 同期本体 ============
    if (payload.type === "shien") {
      const result = await syncShien(db, payload.rows);
      await logSync(db, {
        target: "shien",
        baseDate: payload.baseDate,
        status: "success",
        totalCount: payload.rows.length,
        ...result,
        detail: "検証3ルール通過。マスターシート→support_orgs同期完了",
      });
      return res.json({ ok: true, type: "shien", total: payload.rows.length, ...result });
    }

    if (payload.type === "kanri") {
      const result = await syncKanri(db, payload.rows);
      await logSync(db, {
        target: "kanri",
        baseDate: payload.baseDate,
        status: "success",
        totalCount: payload.rows.length,
        ...result,
        detail: "検証3ルール通過。マスターシート→kanri_orgs同期完了",
      });
      return res.json({ ok: true, type: "kanri", total: payload.rows.length, ...result });
    }

    // management: 掲載管理シートの手動編集をsupport_orgsへ反映
    const result = await syncManagement(db, payload.rows);
    await logSync(db, {
      target: "management",
      baseDate: payload.baseDate,
      status: "success",
      totalCount: payload.rows.length,
      ...result,
      detail: "掲載管理シート→support_orgs（plan/consultStatus）反映完了",
    });
    return res.json({ ok: true, type: "management", total: payload.rows.length, ...result });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function syncShien(db: Db, rows: z.infer<typeof shienRowSchema>[]) {
  const existing = await db
    .select({
      id: supportOrgs.id,
      regNo: supportOrgs.regNo,
      name: supportOrgs.name,
      prefecture: supportOrgs.prefecture,
      address: supportOrgs.address,
      phone: supportOrgs.phone,
    })
    .from(supportOrgs);
  const existingMap = new Map(existing.map((e) => [e.regNo, e]));
  const incomingSet = new Set(rows.map((r) => r.regNo));

  let added = 0;
  let updated = 0;

  const toInsert: InsertSupportOrg[] = [];
  for (const r of rows) {
    const cur = existingMap.get(r.regNo);
    if (!cur) {
      toInsert.push({
        regNo: r.regNo,
        name: r.name,
        prefecture: normalizePref(r.prefecture),
        address: r.address ?? null,
        phone: r.phone ?? null,
        representative: r.representative ?? null,
        preferredRegions: r.preferredRegions ?? null,
        fields: r.fields ?? null,
        regDate: r.regDate ?? null,
      });
    } else if (
      cur.name !== r.name ||
      cur.prefecture !== normalizePref(r.prefecture) ||
      (r.address != null && cur.address !== r.address) ||
      (r.phone != null && cur.phone !== r.phone)
    ) {
      await db
        .update(supportOrgs)
        .set({
          name: r.name,
          prefecture: normalizePref(r.prefecture),
          ...(r.address != null ? { address: r.address } : {}),
          ...(r.phone != null ? { phone: r.phone } : {}),
          ...(r.representative != null ? { representative: r.representative } : {}),
          ...(r.regDate != null ? { regDate: r.regDate } : {}),
        })
        .where(eq(supportOrgs.regNo, r.regNo));
      updated++;
    }
  }
  for (let i = 0; i < toInsert.length; i += 100) {
    await db.insert(supportOrgs).values(toInsert.slice(i, i + 100));
    added += toInsert.slice(i, i + 100).length;
  }

  // 抹消: マスターシートから消えた機関はサイトからも削除（掲載継続は誤情報）
  const removedRegNos = existing.map((e) => e.regNo).filter((rn) => !incomingSet.has(rn));
  let removed = 0;
  if (removedRegNos.length > 0) {
    for (let i = 0; i < removedRegNos.length; i += 200) {
      const chunk = removedRegNos.slice(i, i + 200);
      await db.delete(supportOrgs).where(inArray(supportOrgs.regNo, chunk));
      removed += chunk.length;
    }
  }
  return { added, updated, removed };
}

async function syncKanri(db: Db, rows: z.infer<typeof kanriRowSchema>[]) {
  const existing = await db
    .select({ id: kanriOrgs.id, managementId: kanriOrgs.managementId })
    .from(kanriOrgs);
  const existingSet = new Set(existing.map((e) => e.managementId));
  const incomingSet = new Set(rows.map((r) => r.managementId));

  let added = 0;
  let updated = 0;

  const toInsert: InsertKanriOrg[] = [];
  for (const r of rows) {
    const values = {
      name: r.name,
      prefecture: normalizePref(r.prefecture),
      address: r.address ?? null,
      phone: r.phone ?? null,
      permitType: r.permitType,
      permitDate: r.permitDate ?? null,
      permitExpiry: r.permitExpiry ?? null,
      receiveCountries: r.receiveCountries ?? null,
      jobCodes: r.jobCodes ?? null,
      kaigoSupport: r.kaigoSupport ?? false,
      migrationStatus: r.migrationStatus ?? ("unconfirmed" as const),
      statusConfirmedAt: r.statusConfirmedAt ?? null,
      statusNote: r.statusNote ?? null,
      isVerified: r.isVerified ?? false,
      verifiedAt: r.verifiedAt ?? null,
    };
    if (!existingSet.has(r.managementId)) {
      toInsert.push({ managementId: r.managementId, ...values });
    } else {
      await db.update(kanriOrgs).set(values).where(eq(kanriOrgs.managementId, r.managementId));
      updated++;
    }
  }
  for (let i = 0; i < toInsert.length; i += 100) {
    await db.insert(kanriOrgs).values(toInsert.slice(i, i + 100));
    added += toInsert.slice(i, i + 100).length;
  }

  const removedIds = existing.map((e) => e.managementId).filter((m) => !incomingSet.has(m));
  let removed = 0;
  if (removedIds.length > 0) {
    for (let i = 0; i < removedIds.length; i += 200) {
      const chunk = removedIds.slice(i, i + 200);
      await db.delete(kanriOrgs).where(inArray(kanriOrgs.managementId, chunk));
      removed += chunk.length;
    }
  }
  return { added, updated, removed };
}

async function syncManagement(db: Db, rows: z.infer<typeof managementRowSchema>[]) {
  let updated = 0;
  for (const r of rows) {
    const patch: Partial<InsertSupportOrg> = {};
    if (r.plan) patch.plan = r.plan;
    if (r.consultStatus) patch.consultStatus = r.consultStatus;
    if (Object.keys(patch).length === 0) continue;
    const result = await db.update(supportOrgs).set(patch).where(eq(supportOrgs.regNo, r.orgId));
    // drizzle mysql2のupdateは[ResultSetHeader]を返す
    const header = (result as unknown as [{ affectedRows?: number }])[0];
    if ((header?.affectedRows ?? 0) > 0) updated++;
  }
  return { added: 0, updated, removed: 0 };
}
