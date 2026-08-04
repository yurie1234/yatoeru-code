/**
 * 既存DBを drizzle のマイグレーション管理に載せる（ベースライン設定）。
 *
 * Railwayのairy-prosperityサービス「Console」タブで実行する:
 *   node scripts/baseline-drizzle-migrations.mjs           … 確認のみ
 *   node scripts/baseline-drizzle-migrations.mjs --apply   … 記録する
 *
 * なぜ必要か:
 *   本番DBは旧環境のダンプを復元して作ったため、`__drizzle_migrations` テーブルが
 *   存在しない。この状態で `drizzle-kit migrate` を実行すると、0000から順に
 *   適用しようとして「Table 'users' already exists」で必ず失敗する。
 *   つまり本番は一度もマイグレーション管理下に入っていなかった。
 *
 * このスクリプトは**DDLを一切実行しない**。既にスキーマが揃っていることを
 * 確認した上で、drizzle/meta/_journal.json のエントリを「適用済み」として
 * 記録するだけ。これで以降の `drizzle-kit migrate` は差分だけを流せるようになる。
 *
 * 記録するハッシュは drizzle と同じ「マイグレーションSQLファイルのsha256」。
 */
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL が未設定です。Railwayのairy-prosperityのConsoleで実行してください。");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "drizzle");
const journal = JSON.parse(
  fs.readFileSync(path.join(migrationsDir, "meta", "_journal.json"), "utf8")
);

/** スキーマが揃っているかの確認項目。揃っていなければ記録せず中断する */
const EXPECTED_TABLES = [
  "users", "support_orgs", "reviews", "diagnoses", "consultations", "proposals",
  "plan_applications", "articles", "org_events", "registry_snapshots",
  "registry_changes", "sheet_sync_logs", "kanri_orgs", "kanri_status_submissions",
];
/** 最新マイグレーション（0010）が入れた列。ここが無いなら手動適用が済んでいない */
const EXPECTED_COLUMNS = [
  ["support_orgs", "referralIntent"],
  ["support_orgs", "referralNote"],
  ["support_orgs", "referralUpdatedAt"],
];

const conn = await mysql.createConnection(url);

const [tableRows] = await conn.query(
  "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()"
);
const existingTables = new Set(tableRows.map((r) => String(r.t)));
const missingTables = EXPECTED_TABLES.filter((t) => !existingTables.has(t));

const [colRows] = await conn.query(
  `SELECT table_name AS t, column_name AS c FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name IN (?)`,
  [[...new Set(EXPECTED_COLUMNS.map(([t]) => t))]]
);
const existingCols = new Set(colRows.map((r) => `${r.t}.${r.c}`));
const missingCols = EXPECTED_COLUMNS.filter(([t, c]) => !existingCols.has(`${t}.${c}`));

console.log("=== スキーマの確認 ===");
console.log(`テーブル: ${EXPECTED_TABLES.length - missingTables.length}/${EXPECTED_TABLES.length} 存在`);
if (missingTables.length) console.log("  不足:", missingTables.join(", "));
console.log(`列      : ${EXPECTED_COLUMNS.length - missingCols.length}/${EXPECTED_COLUMNS.length} 存在`);
if (missingCols.length) console.log("  不足:", missingCols.map(([t, c]) => `${t}.${c}`).join(", "));
console.log("");

if (missingTables.length || missingCols.length) {
  console.error("スキーマが揃っていません。ベースライン設定は中止します。");
  console.error("不足している列は scripts/apply-referral-intent-columns.mjs で追加してください。");
  await conn.end();
  process.exit(1);
}

const hasMigrationsTable = existingTables.has("__drizzle_migrations");
let recorded = new Set();
if (hasMigrationsTable) {
  const [rows] = await conn.query("SELECT hash FROM __drizzle_migrations");
  recorded = new Set(rows.map((r) => String(r.hash)));
}
console.log(
  `__drizzle_migrations: ${hasMigrationsTable ? `あり（${recorded.size}件記録済み）` : "なし（作成します）"}`
);

const pending = [];
for (const entry of journal.entries) {
  const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");
  if (recorded.has(hash)) continue;
  pending.push({ tag: entry.tag, hash, when: entry.when });
}

console.log(`\n=== 適用済みとして記録するマイグレーション: ${pending.length}件 ===`);
for (const p of pending) console.log(`  ${p.tag}`);
if (pending.length === 0) console.log("  （なし。既にすべて記録済みです）");
console.log("");

if (!APPLY) {
  console.log("※ 確認のみ（DBは変更していません）。記録するには --apply を付けてください。");
  await conn.end();
  process.exit(0);
}

if (!hasMigrationsTable) {
  // drizzleのマイグレーターが作るものと同じ定義
  await conn.query(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
       id SERIAL PRIMARY KEY,
       hash text NOT NULL,
       created_at bigint
     )`
  );
  console.log("__drizzle_migrations を作成しました。");
}

for (const p of pending) {
  await conn.execute("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)", [
    p.hash,
    p.when,
  ]);
  console.log(`  記録: ${p.tag}`);
}

console.log(
  `\n完了。以降は npm run db:push（drizzle-kit generate && migrate）で差分だけが流れます。`
);
await conn.end();
