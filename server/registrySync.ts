import type { Request, Response } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  registryChanges,
  registrySnapshots,
  supportOrgs,
  type InsertSupportOrg,
} from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { PREFECTURES } from "../shared/tokutei";

/**
 * 登録簿同期エンドポイント /api/scheduled/registry-sync
 *
 * 週次のAGENT cronが入管庁の登録支援機関登録簿（Excel）を取得・解析し、
 * 全登録番号のリストと新規機関の詳細をここにPOSTする。
 * サーバー側で前回スナップショットとの差分（新規/抹消）を計算・記録し、
 * support_orgs本体にも反映する（新規は追加、抹消は削除ではなくフラグ的に扱わず削除。
 * ※登録簿から消えた機関＝登録抹消。掲載を続けると誤情報になるため物理削除する。
 * 　削除前にregistry_changesへ記録するため履歴は残る）。
 *
 * 冪等性: baseDateがunique。同じbaseDateのPOSTは2回目以降スキップされる。
 */

const orgSchema = z.object({
  regNo: z.string().min(1).max(32),
  name: z.string().min(1).max(255),
  regDate: z.string().max(16).optional().nullable(),
  postal: z.string().max(16).optional().nullable(),
  address: z.string().optional().nullable(),
  prefecture: z.string().max(16).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  representative: z.string().max(255).optional().nullable(),
  officeName: z.string().max(255).optional().nullable(),
  optionalSupport: z.boolean().optional(),
  startDate: z.string().max(16).optional().nullable(),
  languages: z.array(z.string()).optional().nullable(),
  languagesRaw: z.string().optional().nullable(),
});

const payloadSchema = z.object({
  /** 入管庁ページ記載の基準日 YYYY-MM-DD */
  baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 取得元ExcelのURL（出典明記用） */
  sourceUrl: z.string().url().max(512),
  /** 登録簿に現在掲載されている全登録番号 */
  allRegNos: z.array(z.string().min(1).max(32)).min(1000),
  /** 新規登録機関の詳細（allRegNosのうちDB未登録のもの。cron側で判別不能なら全件でも可） */
  newOrgs: z.array(orgSchema).optional().default([]),
});

export async function registrySyncHandler(req: Request, res: Response) {
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
    const { baseDate, sourceUrl, allRegNos, newOrgs } = parsed.data;

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "db-unavailable" });

    // 冪等性: 同一基準日のスナップショットが既にあればスキップ
    const existing = await db
      .select({ id: registrySnapshots.id })
      .from(registrySnapshots)
      .where(eq(registrySnapshots.baseDate, baseDate))
      .limit(1);
    if (existing.length > 0) {
      return res.json({ ok: true, skipped: "snapshot-exists", baseDate });
    }

    // 現在DBにある全登録番号
    const current = await db.select({ regNo: supportOrgs.regNo }).from(supportOrgs);
    const currentSet = new Set(current.map((r) => r.regNo));
    const incomingSet = new Set(allRegNos);

    const addedRegNos = allRegNos.filter((r) => !currentSet.has(r));
    const removedRegNos = current.map((r) => r.regNo).filter((r) => !incomingSet.has(r));

    // 安全弁: 登録簿は1万件超。取得ミスで大量抹消判定になった場合は中断する
    if (removedRegNos.length > 500) {
      return res.status(400).json({
        error: "too-many-removals",
        detail: `${removedRegNos.length} removals detected (threshold 500). Aborting to prevent accidental mass deletion.`,
      });
    }

    // スナップショット作成（insertIdは既存パターンと同じ分割代入で取得し、保険としてbaseDateで再取得）
    const [snapResult] = await db.insert(registrySnapshots).values({
      baseDate,
      totalCount: allRegNos.length,
      sourceUrl,
    });
    let snapshotId = Number(snapResult?.insertId ?? 0);
    if (!snapshotId) {
      const [created] = await db
        .select({ id: registrySnapshots.id })
        .from(registrySnapshots)
        .where(eq(registrySnapshots.baseDate, baseDate))
        .limit(1);
      if (!created) return res.status(500).json({ error: "snapshot-insert-failed" });
      snapshotId = created.id;
    }

    // 新規機関の追加（詳細が来ているもののみ。prefectureは47都道府県名に正規化検証）
    const newOrgMap = new Map(newOrgs.map((o) => [o.regNo, o]));
    const toInsert: InsertSupportOrg[] = [];
    for (const regNo of addedRegNos) {
      const o = newOrgMap.get(regNo);
      if (!o) continue;
      const pref =
        o.prefecture && (PREFECTURES as readonly string[]).includes(o.prefecture)
          ? o.prefecture
          : null;
      toInsert.push({
        regNo: o.regNo,
        name: o.name,
        regDate: o.regDate ?? null,
        postal: o.postal ?? null,
        address: o.address ?? null,
        prefecture: pref,
        phone: o.phone ?? null,
        representative: o.representative ?? null,
        officeName: o.officeName ?? null,
        optionalSupport: o.optionalSupport ?? false,
        startDate: o.startDate ?? null,
        languages: o.languages ?? null,
        languagesRaw: o.languagesRaw ?? null,
      });
    }
    if (toInsert.length > 0) {
      // 100件ずつ分割挿入
      for (let i = 0; i < toInsert.length; i += 100) {
        await db.insert(supportOrgs).values(toInsert.slice(i, i + 100));
      }
    }

    // 差分記録: 新規
    const addedRows = addedRegNos.map((regNo) => {
      const o = newOrgMap.get(regNo);
      return {
        snapshotId,
        changeType: "added" as const,
        regNo,
        name: o?.name ?? "（詳細未取得）",
        prefecture:
          o?.prefecture && (PREFECTURES as readonly string[]).includes(o.prefecture)
            ? o.prefecture
            : null,
        regDate: o?.regDate ?? null,
      };
    });

    // 差分記録: 抹消（削除前に詳細を退避）
    let removedRows: (typeof registryChanges.$inferInsert)[] = [];
    if (removedRegNos.length > 0) {
      const removedOrgs = await db
        .select({
          regNo: supportOrgs.regNo,
          name: supportOrgs.name,
          prefecture: supportOrgs.prefecture,
          regDate: supportOrgs.regDate,
        })
        .from(supportOrgs)
        .where(inArray(supportOrgs.regNo, removedRegNos));
      removedRows = removedOrgs.map((o) => ({
        snapshotId,
        changeType: "removed" as const,
        regNo: o.regNo,
        name: o.name,
        prefecture: o.prefecture,
        regDate: o.regDate,
      }));
    }

    const allChangeRows = [...addedRows, ...removedRows];
    for (let i = 0; i < allChangeRows.length; i += 100) {
      await db.insert(registryChanges).values(allChangeRows.slice(i, i + 100));
    }

    // 抹消機関をsupport_orgsから削除（登録抹消＝掲載継続は誤情報のため）
    if (removedRegNos.length > 0) {
      await db.delete(supportOrgs).where(inArray(supportOrgs.regNo, removedRegNos));
    }

    return res.json({
      ok: true,
      baseDate,
      snapshotId,
      added: addedRegNos.length,
      addedWithDetail: toInsert.length,
      removed: removedRegNos.length,
      total: allRegNos.length,
    });
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
