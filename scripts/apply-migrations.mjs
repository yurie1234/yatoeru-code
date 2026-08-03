/**
 * drizzle-kit migrate が原因不明にサイレントに何もしない環境向けの代替手段。
 * drizzle/*.sql を番号順にそのまま実行する（drizzle-kitのブックキーピングテーブルは作らない、
 * 一回限りの初期スキーマ投入用）。
 * 実行: node scripts/apply-migrations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const dir = path.resolve(process.cwd(), "drizzle");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

console.log(`適用対象: ${files.length}件`, files);

const conn = await mysql.createConnection(DATABASE_URL);

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  const statements = text
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`[${file}] ${statements.length}文実行`);
  for (const stmt of statements) {
    await conn.query(stmt);
  }
}

const [tables] = await conn.query("SHOW TABLES");
console.log("SHOW TABLES:", tables);

await conn.end();
console.log("完了");
