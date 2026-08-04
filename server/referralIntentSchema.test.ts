import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { supportOrgs } from "../drizzle/schema";

// 送客優先度の列は、当初 drizzle/schema.ts に載せず生SQLで扱っていた。
// 列追加より先にコードがデプロイされると公開クエリが落ちる懸念による暫定措置だった。
// 列を適用しスキーマに取り込んだ今、守るべき不変条件は次の2つになる:
//   1. スキーマ・マイグレーション・スナップショットが食い違わないこと
//   2. スキーマに載せたことで全列取得が値を返すようになったため、
//      公開経路に漏れないこと（server/referralIntentPrivacy.test.ts が担保）

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATION_TAG = "0010_solid_war_machine";
const REFERRAL_COLUMNS = ["referralIntent", "referralNote", "referralUpdatedAt"] as const;

describe("drizzleスキーマに載っている", () => {
  it("3つの列が supportOrgs に定義されている", () => {
    for (const c of REFERRAL_COLUMNS) {
      expect(supportOrgs, `${c} がスキーマに無い`).toHaveProperty(c);
    }
  });

  it("referralIntent は5つの意向を持つenumで、既定値は unknown", () => {
    const col = supportOrgs.referralIntent;
    expect(col.enumValues).toEqual([
      "unknown",
      "interested",
      "negotiating",
      "agreed",
      "declined",
    ]);
    expect(col.default).toBe("unknown");
    expect(col.notNull).toBe(true);
  });

  it("メモと更新日時はNULL許容（未確認の機関を既定値で埋めない）", () => {
    expect(supportOrgs.referralNote.notNull).toBe(false);
    expect(supportOrgs.referralUpdatedAt.notNull).toBe(false);
  });
});

describe("マイグレーションとスナップショットが一致している", () => {
  const sqlPath = path.join(ROOT, "drizzle", `${MIGRATION_TAG}.sql`);

  it("マイグレーションSQLが3列を追加している", () => {
    const sql = fs.readFileSync(sqlPath, "utf8");
    for (const c of REFERRAL_COLUMNS) {
      expect(sql, `${c} のALTERが無い`).toContain(`ADD \`${c}\``);
    }
  });

  it("journalに登録されている", () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(ROOT, "drizzle", "meta", "_journal.json"), "utf8")
    );
    expect(journal.entries.map((e: { tag: string }) => e.tag)).toContain(MIGRATION_TAG);
  });

  it("スナップショットに3列が入っている（次回のgenerateが同じ列を作り直さない）", () => {
    const snapshot = JSON.parse(
      fs.readFileSync(path.join(ROOT, "drizzle", "meta", "0010_snapshot.json"), "utf8")
    );
    const cols = snapshot.tables["support_orgs"].columns;
    for (const c of REFERRAL_COLUMNS) {
      expect(cols, `${c} がスナップショットに無い`).toHaveProperty(c);
    }
  });

  // ベースライン用スクリプトが記録するハッシュ方式が drizzle と一致している必要がある。
  // ずれると本番の __drizzle_migrations に誤ったハッシュが入り、
  // 適用済みのマイグレーションを二重に流そうとする
  it("ベースラインスクリプトのハッシュ方式（SQLファイルのsha256）が使える", () => {
    const script = fs.readFileSync(
      path.join(ROOT, "scripts", "baseline-drizzle-migrations.mjs"),
      "utf8"
    );
    expect(script).toContain('createHash("sha256")');
    const sql = fs.readFileSync(sqlPath, "utf8");
    expect(crypto.createHash("sha256").update(sql).digest("hex")).toHaveLength(64);
  });
});

// 読み書きは型付きクエリになった。列探査（information_schema）も
// 「未適用」の分岐も無くなったことを固定する。
vi.mock("./db", () => ({ getDb: vi.fn() }));

import { listReferralTargets, readReferralInfo, writeReferralInfo } from "./referralIntent";

function makeDb(rows: unknown[]) {
  const calls: string[] = [];
  const selectNode: Record<string, unknown> = {
    then: (fn: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(fn, rej),
  };
  for (const k of ["from", "where", "orderBy", "limit", "offset"]) selectNode[k] = () => selectNode;

  let updatePatch: Record<string, unknown> | null = null;
  const db = {
    select: vi.fn(() => {
      calls.push("select");
      return selectNode;
    }),
    update: vi.fn(() => {
      calls.push("update");
      return {
        set: (patch: Record<string, unknown>) => {
          updatePatch = patch;
          return { where: async () => undefined };
        },
      };
    }),
    execute: vi.fn(() => {
      calls.push("execute");
      throw new Error("生SQLは使わない（型付きクエリに移行済み）");
    }),
  };
  return { db: db as never, calls, getPatch: () => updatePatch };
}

beforeEach(() => vi.clearAllMocks());

describe("型付きクエリでの読み書き", () => {
  it("readReferralInfo が値を返す", async () => {
    const { db } = makeDb([{ intent: "interested", note: "メモ", updatedAt: null }]);
    expect(await readReferralInfo(db, 1)).toEqual({
      intent: "interested",
      note: "メモ",
      updatedAt: null,
    });
  });

  it("該当機関が無ければ unknown を返す（例外にしない）", async () => {
    const { db } = makeDb([]);
    expect(await readReferralInfo(db, 999)).toEqual({
      intent: "unknown",
      note: null,
      updatedAt: null,
    });
  });

  it("想定外の意向値は unknown に丸める", async () => {
    const { db } = makeDb([{ intent: "なにか", note: null, updatedAt: null }]);
    expect((await readReferralInfo(db, 1)).intent).toBe("unknown");
  });

  it("information_schema の列探査を行わない", async () => {
    const { db, calls } = makeDb([{ intent: "agreed", note: null, updatedAt: null }]);
    await readReferralInfo(db, 1);
    expect(calls).toEqual(["select"]);
    expect(calls).not.toContain("execute");
  });

  it("writeReferralInfo は渡した項目と更新日時だけを書く", async () => {
    const { db, getPatch } = makeDb([]);
    await writeReferralInfo(db, 1, { intent: "agreed" });
    const patch = getPatch()!;
    expect(patch.referralIntent).toBe("agreed");
    expect(patch.referralUpdatedAt).toBeInstanceOf(Date);
    expect(patch).not.toHaveProperty("referralNote"); // 触っていない項目は消さない
  });

  it("メモだけの更新もできる", async () => {
    const { db, getPatch } = makeDb([]);
    await writeReferralInfo(db, 1, { note: "紹介料20%で合意" });
    expect(getPatch()).toMatchObject({ referralNote: "紹介料20%で合意" });
    expect(getPatch()).not.toHaveProperty("referralIntent");
  });

  it("更新項目が空ならUPDATEを実行しない", async () => {
    const { db, calls } = makeDb([]);
    await writeReferralInfo(db, 1, {});
    expect(calls).toEqual([]);
  });

  it("listReferralTargets は意向のある機関を返す", async () => {
    const { db } = makeDb([
      {
        id: 1,
        regNo: "19登-000001",
        name: "テスト協同組合",
        prefecture: "東京都",
        intent: "agreed",
        consultStatus: "open_active",
        note: "紹介料20%",
      },
    ]);
    const { rows } = await listReferralTargets(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ regNo: "19登-000001", intent: "agreed", note: "紹介料20%" });
  });

  it("listReferralTargets の戻りに applied フラグは残っていない", async () => {
    const { db } = makeDb([]);
    expect(await listReferralTargets(db)).not.toHaveProperty("applied");
  });
});
