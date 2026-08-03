/**
 * Manus環境のDBダンプ(CSV group)を新DB(DATABASE_URL)へ復元する。
 * CSVのヘッダ行はDBの実カラム名と1:1で一致している（実DBからのエクスポートのため）。
 * 実行: node scripts/restore-db-dump.mjs [csvディレクトリ=./db-restore-data]
 * 前提: drizzle-kit migrate 済み（テーブルは既に存在すること）
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const csvDir = process.argv[2] ?? path.resolve(process.cwd(), "db-restore-data");
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// FK制約は無し（drizzle/relations.tsは空）。復元順は任意でよい。
const TABLES = [
  "users",
  "support_orgs",
  "kanri_orgs",
  "org_events",
  "proposals",
  "diagnoses",
  "articles",
  "consultations",
  "plan_applications",
  "reviews",
  "registry_snapshots",
  "registry_changes",
  "sheet_sync_logs",
];

/** 簡易CSVパーサ（ダブルクォート対応。scripts/import-kanri-orgs.mjsと同方式） */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

function findCsvFile(table) {
  const files = fs.readdirSync(csvDir).filter((f) => f.startsWith(`${table}_`) && f.endsWith(".csv"));
  return files.length > 0 ? path.join(csvDir, files[0]) : null;
}

const conn = await mysql.createConnection(DATABASE_URL);

for (const table of TABLES) {
  const filePath = findCsvFile(table);
  if (!filePath) {
    console.log(`[skip] ${table}: CSVが見つかりません`);
    continue;
  }
  const text = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(text);
  const header = rows[0];
  const data = rows.slice(1);
  if (data.length === 0) {
    console.log(`[skip] ${table}: 0件`);
    continue;
  }

  await conn.query(`TRUNCATE TABLE \`${table}\``);

  // 空文字列はNULLとして挿入（JSON列に空文字は無効なため必須）
  const values = data.map((r) => r.map((v) => (v === "" ? null : v)));

  const columnList = header.map((c) => `\`${c}\``).join(", ");
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < values.length; i += BATCH) {
    const chunk = values.slice(i, i + BATCH);
    await conn.query(`INSERT INTO \`${table}\` (${columnList}) VALUES ?`, [chunk]);
    inserted += chunk.length;
  }
  console.log(`[done] ${table}: ${inserted}件`);
}

for (const table of TABLES) {
  try {
    const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
    console.log(`${table}: ${cnt}件`);
  } catch {
    /* テーブル未作成等は無視 */
  }
}

await conn.end();
