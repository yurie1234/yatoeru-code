/**
 * registry-sync ハンドラの統合検証スクリプト（開発時のみ使用）。
 * adminセッショントークンを署名して dev サーバーにテストPOSTし、
 * snapshot / changes / support_orgs への反映を確認後、テストデータを削除する。
 *
 * 実行: node scripts/verify-registry-sync.mjs
 */
import { SignJWT } from "jose";
import mysql from "mysql2/promise";

const ADMIN_OPEN_ID = "htNfWEo8ANXLjB5Lun8yrN";
const TEST_BASE_DATE = "2026-07-10"; // 検証専用の基準日（終了後に削除）
const BASE_URL = "http://localhost:3000";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const token = await new SignJWT({
  openId: ADMIN_OPEN_ID,
  appId: process.env.VITE_APP_ID,
  name: "verify-script",
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(Math.floor(Date.now() / 1000) + 600)
  .sign(secret);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 現在の全登録番号を取得（= 変化なしベース）
const [rows] = await conn.query("SELECT regNo FROM support_orgs");
const allRegNos = rows.map((r) => r.regNo);
console.log(`current orgs: ${allRegNos.length}`);

// テストケース: 架空の新規1件を追加、既存の実在1件を抹消扱いにする
const fakeNew = {
  regNo: "99登999999",
  name: "検証用テスト機関（削除予定）",
  regDate: "2026-07-10",
  prefecture: "東京都",
  languages: ["英語"],
};
const removedTarget = allRegNos[allRegNos.length - 1]; // 1件を意図的に除外→抹消判定
const incoming = allRegNos.filter((r) => r !== removedTarget).concat([fakeNew.regNo]);

// 抹消対象の全カラムを事前バックアップ（検証後に完全復元するため）
const [backupRows] = await conn.query("SELECT * FROM support_orgs WHERE regNo = ?", [
  removedTarget,
]);
if (backupRows.length !== 1) {
  console.error("FAIL: could not back up removal target");
  await conn.end();
  process.exit(1);
}
const backup = backupRows[0];
console.log(`backup taken for removal target: ${backup.regNo} (${backup.name})`);

const res = await fetch(`${BASE_URL}/api/scheduled/registry-sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    baseDate: TEST_BASE_DATE,
    sourceUrl: "https://www.moj.go.jp/isa/content/test-verify.xlsx",
    allRegNos: incoming,
    newOrgs: [fakeNew],
  }),
});
const json = await res.json();
console.log("POST status:", res.status, JSON.stringify(json));
if (res.status !== 200 || !json.ok) {
  console.error("FAIL: handler did not succeed");
  await conn.end();
  process.exit(1);
}

// 反映確認
const [snap] = await conn.query(
  "SELECT id, baseDate, totalCount FROM registry_snapshots WHERE baseDate = ?",
  [TEST_BASE_DATE]
);
const [changes] = await conn.query(
  "SELECT changeType, regNo, name FROM registry_changes WHERE snapshotId = ?",
  [snap[0]?.id]
);
const [insertedOrg] = await conn.query(
  "SELECT regNo, name, prefecture FROM support_orgs WHERE regNo = ?",
  [fakeNew.regNo]
);
const [removedOrg] = await conn.query(
  "SELECT regNo FROM support_orgs WHERE regNo = ?",
  [removedTarget]
);
console.log("snapshot:", JSON.stringify(snap));
console.log("changes:", JSON.stringify(changes));
console.log("inserted fake org present:", insertedOrg.length === 1);
console.log("removed org deleted:", removedOrg.length === 0);

// 冪等性確認: 同じbaseDateで再POST → skipped
const res2 = await fetch(`${BASE_URL}/api/scheduled/registry-sync`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    baseDate: TEST_BASE_DATE,
    sourceUrl: "https://www.moj.go.jp/isa/content/test-verify.xlsx",
    allRegNos: incoming,
    newOrgs: [],
  }),
});
const json2 = await res2.json();
console.log("idempotency:", res2.status, JSON.stringify(json2));

// ---- ロールバック（テストデータ全削除・抹消した実在機関を全カラム復元） ----
delete backup.id; // AUTO_INCREMENTは新採番
const cols = Object.keys(backup);
await conn.query(
  `INSERT INTO support_orgs (${cols.map((c) => `\`${c}\``).join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
  cols.map((c) =>
    backup[c] !== null && typeof backup[c] === "object" && !(backup[c] instanceof Date)
      ? JSON.stringify(backup[c])
      : backup[c]
  )
);
await conn.query("DELETE FROM support_orgs WHERE regNo = ?", [fakeNew.regNo]);
await conn.query("DELETE FROM registry_changes WHERE snapshotId = ?", [snap[0]?.id]);
await conn.query("DELETE FROM registry_snapshots WHERE baseDate = ?", [TEST_BASE_DATE]);

// 復元確認
const [restored] = await conn.query("SELECT regNo, name FROM support_orgs WHERE regNo = ?", [
  removedTarget,
]);
const [fakeCheck] = await conn.query("SELECT regNo FROM support_orgs WHERE regNo = ?", [
  fakeNew.regNo,
]);
const [snapCheck] = await conn.query(
  "SELECT id FROM registry_snapshots WHERE baseDate = ?",
  [TEST_BASE_DATE]
);
console.log("restored removed org:", restored.length === 1);
console.log("fake org cleaned:", fakeCheck.length === 0);
console.log("test snapshot cleaned:", snapCheck.length === 0);
await conn.end();

const pass =
  restored.length === 1 && fakeCheck.length === 0 && snapCheck.length === 0;
console.log(pass ? "VERIFY: ALL PASS" : "VERIFY: ROLLBACK INCOMPLETE");
process.exit(pass ? 0 : 1);
