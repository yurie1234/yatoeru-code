import { sql } from "drizzle-orm";
import type { getDb } from "./db";
import { REFERRAL_INTENTS, type ReferralIntent } from "../shared/referralIntent";

export { REFERRAL_INTENTS, type ReferralIntent };

/**
 * 送客優先度（紹介料の意向）の読み書き。**完全非公開の運用情報**。
 *
 * 用途は「相談リードが来たときの手動振り分け」と「営業の優先順位づけ」だけ。
 * 親和性スコア・並び順・公開ページ・API・構造化データには一切出さない。
 * 紹介料で順位が動くならそれは広告であり、ラベルなしで検索結果に混ぜると
 * 景品表示法（ステマ規制）に触れる。表示に反映するときは必ずPR表示を伴う
 * 別枠として実装する。
 *
 * 列は scripts/apply-referral-intent-columns.mjs で追加する
 * （内容の記録は drizzle/manual/2026-08-04-referral-intent.sql）。
 * drizzle/schema.ts には載せていない（載せると公開クエリが列を要求するため、
 * 列追加前にコードがデプロイされた瞬間にサイト全体が落ちる）。そのため
 * ここでは生SQLで読み書きし、列が無い場合は applied=false を返して
 * 管理画面に「未適用」と出す。
 */

export type ReferralInfo = {
  /** 列が未適用の環境では false（管理画面に「未適用」と表示する） */
  applied: boolean;
  intent: ReferralIntent;
  note: string | null;
  updatedAt: string | null;
};

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * 列の有無を information_schema で判定する。
 *
 * 当初は「Unknown column」というエラーメッセージで判定していたが、drizzleが例外を
 * `Failed query: SELECT ...` で包むため元のメッセージが message に現れず、判定を
 * すり抜けて管理画面にエラーが出た。文言に依存しない方法に変える。
 *
 * 適用済み（true）だけキャッシュする。未適用のうちは毎回問い合わせるが、
 * 管理者操作時のみ呼ばれるうえ information_schema の1行取得なので負荷は無視できる。
 */
let referralColumnsApplied = false;

async function hasReferralColumns(db: Db): Promise<boolean> {
  if (referralColumnsApplied) return true;
  const res = await db.execute(
    sql`SELECT COUNT(*) AS c FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'support_orgs'
          AND column_name IN ('referralIntent', 'referralNote', 'referralUpdatedAt')`
  );
  const row = unwrapRows(res)[0];
  const applied = Number(row?.c ?? 0) >= 3;
  if (applied) referralColumnsApplied = true;
  return applied;
}

/** テスト用：キャッシュを戻す */
export function resetReferralColumnCache() {
  referralColumnsApplied = false;
}

function unwrapRows(result: unknown): Array<Record<string, unknown>> {
  // mysql2 は [rows, fields] を返す。drizzleのexecuteはドライバの戻りをそのまま渡す
  if (Array.isArray(result)) {
    const first = result[0];
    if (Array.isArray(first)) return first as Array<Record<string, unknown>>;
    return result as Array<Record<string, unknown>>;
  }
  return [];
}

export async function readReferralInfo(db: Db, orgId: number): Promise<ReferralInfo> {
  if (!(await hasReferralColumns(db))) {
    return { applied: false, intent: "unknown", note: null, updatedAt: null };
  }
  const res = await db.execute(
    sql`SELECT referralIntent, referralNote, referralUpdatedAt FROM support_orgs WHERE id = ${orgId} LIMIT 1`
  );
  const row = unwrapRows(res)[0];
  if (!row) return { applied: true, intent: "unknown", note: null, updatedAt: null };
  const intent = String(row.referralIntent ?? "unknown");
  return {
    applied: true,
    intent: (REFERRAL_INTENTS as readonly string[]).includes(intent)
      ? (intent as ReferralIntent)
      : "unknown",
    note: row.referralNote == null ? null : String(row.referralNote),
    updatedAt: row.referralUpdatedAt == null ? null : String(row.referralUpdatedAt),
  };
}

/**
 * 送客優先度を更新する。列が未適用なら false を返し、呼び出し側で
 * 「マイグレーション未適用」として扱う（無言で捨てない）。
 */
export async function writeReferralInfo(
  db: Db,
  orgId: number,
  input: { intent?: ReferralIntent; note?: string | null }
): Promise<boolean> {
  if (input.intent === undefined && input.note === undefined) return true;
  if (!(await hasReferralColumns(db))) return false;

  if (input.intent !== undefined && input.note !== undefined) {
    await db.execute(
      sql`UPDATE support_orgs SET referralIntent = ${input.intent}, referralNote = ${input.note}, referralUpdatedAt = CURRENT_TIMESTAMP WHERE id = ${orgId}`
    );
  } else if (input.intent !== undefined) {
    await db.execute(
      sql`UPDATE support_orgs SET referralIntent = ${input.intent}, referralUpdatedAt = CURRENT_TIMESTAMP WHERE id = ${orgId}`
    );
  } else {
    await db.execute(
      sql`UPDATE support_orgs SET referralNote = ${input.note ?? null}, referralUpdatedAt = CURRENT_TIMESTAMP WHERE id = ${orgId}`
    );
  }
  return true;
}

/** 送客先の候補一覧（意向ありの機関）。運用画面でのみ使う */
export async function listReferralTargets(db: Db): Promise<{
  applied: boolean;
  rows: Array<{ id: number; regNo: string; name: string; prefecture: string | null; intent: ReferralIntent; consultStatus: string; note: string | null }>;
}> {
  if (!(await hasReferralColumns(db))) return { applied: false, rows: [] };

  const res = await db.execute(
    sql`SELECT id, regNo, name, prefecture, referralIntent, consultStatus, referralNote
        FROM support_orgs
        WHERE referralIntent IN ('interested','negotiating','agreed')
        ORDER BY FIELD(referralIntent,'agreed','negotiating','interested'), name
        LIMIT 200`
  );
  return {
    applied: true,
    rows: unwrapRows(res).map((r) => ({
      id: Number(r.id),
      regNo: String(r.regNo),
      name: String(r.name),
      prefecture: r.prefecture == null ? null : String(r.prefecture),
      intent: String(r.referralIntent) as ReferralIntent,
      consultStatus: String(r.consultStatus ?? "unknown"),
      note: r.referralNote == null ? null : String(r.referralNote),
    })),
  };
}
