import { eq, inArray, sql } from "drizzle-orm";
import { supportOrgs } from "../drizzle/schema";
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
 * 列は drizzle/schema.ts の supportOrgs に載っている
 * （マイグレーション drizzle/0010_solid_war_machine.sql）。
 *
 * 以前は列を drizzle/schema.ts に載せず生SQLで読み書きし、
 * information_schema で列の有無を毎回確かめていた。列追加より先にコードが
 * デプロイされると公開クエリが「Unknown column」で落ちる、という懸念による
 * 暫定措置だったが、列は適用済みでスキーマにも載ったため通常の型付きクエリに戻した。
 * 公開レスポンスからの除去は server/routers/orgs.ts の sanitizeOrg が担い、
 * server/referralIntentPrivacy.test.ts が漏れないことを固定している。
 */

export type ReferralInfo = {
  intent: ReferralIntent;
  note: string | null;
  updatedAt: string | null;
};

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function toIntent(value: unknown): ReferralIntent {
  const v = String(value ?? "unknown");
  return (REFERRAL_INTENTS as readonly string[]).includes(v) ? (v as ReferralIntent) : "unknown";
}

export async function readReferralInfo(db: Db, orgId: number): Promise<ReferralInfo> {
  const [row] = await db
    .select({
      intent: supportOrgs.referralIntent,
      note: supportOrgs.referralNote,
      updatedAt: supportOrgs.referralUpdatedAt,
    })
    .from(supportOrgs)
    .where(eq(supportOrgs.id, orgId))
    .limit(1);
  if (!row) return { intent: "unknown", note: null, updatedAt: null };
  return {
    intent: toIntent(row.intent),
    note: row.note ?? null,
    updatedAt: row.updatedAt == null ? null : String(row.updatedAt),
  };
}

/** 送客優先度を更新する。渡された項目だけを書き換える */
export async function writeReferralInfo(
  db: Db,
  orgId: number,
  input: { intent?: ReferralIntent; note?: string | null }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.intent !== undefined) patch.referralIntent = input.intent;
  if (input.note !== undefined) patch.referralNote = input.note;
  if (Object.keys(patch).length === 0) return;
  patch.referralUpdatedAt = new Date();
  await db.update(supportOrgs).set(patch).where(eq(supportOrgs.id, orgId));
}

const ACTIVE_INTENTS: ReferralIntent[] = ["interested", "negotiating", "agreed"];

/** 送客先の候補一覧（意向ありの機関）。運用画面でのみ使う */
export async function listReferralTargets(db: Db): Promise<{
  rows: Array<{
    id: number;
    regNo: string;
    name: string;
    prefecture: string | null;
    intent: ReferralIntent;
    consultStatus: string;
    note: string | null;
  }>;
}> {
  const rows = await db
    .select({
      id: supportOrgs.id,
      regNo: supportOrgs.regNo,
      name: supportOrgs.name,
      prefecture: supportOrgs.prefecture,
      intent: supportOrgs.referralIntent,
      consultStatus: supportOrgs.consultStatus,
      note: supportOrgs.referralNote,
    })
    .from(supportOrgs)
    .where(inArray(supportOrgs.referralIntent, ACTIVE_INTENTS))
    // 条件合意 → 交渉中 → 意向あり の順（送客判断でこの順に見る）
    .orderBy(sql`FIELD(${supportOrgs.referralIntent},'agreed','negotiating','interested')`, supportOrgs.name)
    .limit(200);

  return {
    rows: rows.map((r) => ({
      id: Number(r.id),
      regNo: String(r.regNo),
      name: String(r.name),
      prefecture: r.prefecture ?? null,
      intent: toIntent(r.intent),
      consultStatus: String(r.consultStatus ?? "unknown"),
      note: r.note ?? null,
    })),
  };
}
