/**
 * OTIT監理団体CSV（マスターシートと同内容の kanri_kikan.csv）を kanri_orgs テーブルへ初回投入する。
 * マスターDB＝Googleスプレッドシート「監理支援機関」シート。サイトDBは写し。
 * 実行: node scripts/import-kanri-orgs.mjs /home/ubuntu/masterdb-export/kanri_kikan.csv
 */
import fs from "node:fs";
import mysql from "mysql2/promise";

const csvPath = process.argv[2] ?? "/home/ubuntu/masterdb-export/kanri_kikan.csv";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

/** 簡易CSVパーサ（ダブルクォート対応） */
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

const text = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(text);
const header = rows[0];
console.log("header:", header.join(" | "));
const data = rows.slice(1);
console.log("data rows:", data.length);

// カラム: 管理ID,法人名,所在地都道府県,住所,連絡先,許可区分,許可年月日,許可有効期限,受入国,取扱職種コード,介護対応,監理支援機関 移行ステータス,確認日,確認方法・メモ
const STATUS_MAP = {
  未確認: "unconfirmed",
  申請準備中: "preparing",
  申請中: "applying",
  許可取得: "permitted",
  移行しない: "not_migrating",
};

const conn = await mysql.createConnection(DATABASE_URL);
const [[{ cnt }]] = await conn.query("SELECT COUNT(*) AS cnt FROM kanri_orgs");
if (Number(cnt) > 0) {
  console.log(`kanri_orgs already has ${cnt} rows. Truncating for clean re-import...`);
  await conn.query("TRUNCATE TABLE kanri_orgs");
}

const values = data.map((r) => {
  const [
    managementId,
    name,
    prefecture,
    address,
    phone,
    permitTypeRaw,
    permitDate,
    permitExpiry,
    receiveCountries,
    jobCodesRaw,
    kaigoRaw,
    statusRaw,
    confirmedAt,
    note,
  ] = r;
  const jobCodes = (jobCodesRaw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    managementId,
    name,
    prefecture || null,
    address || null,
    phone || null,
    permitTypeRaw === "一般" ? "general" : "specific",
    permitDate || null,
    permitExpiry || null,
    receiveCountries || null,
    JSON.stringify(jobCodes),
    kaigoRaw === "有" ? 1 : 0,
    STATUS_MAP[statusRaw] ?? "unconfirmed",
    confirmedAt || null,
    note || null,
  ];
});

const BATCH = 200;
let inserted = 0;
for (let i = 0; i < values.length; i += BATCH) {
  const chunk = values.slice(i, i + BATCH);
  await conn.query(
    `INSERT INTO kanri_orgs
     (managementId, name, prefecture, address, phone, permitType, permitDate, permitExpiry,
      receiveCountries, jobCodes, kaigoSupport, migrationStatus, statusConfirmedAt, statusNote)
     VALUES ?`,
    [chunk]
  );
  inserted += chunk.length;
  if (inserted % 1000 === 0 || inserted === values.length) console.log(`inserted ${inserted}/${values.length}`);
}

const [[{ cnt: finalCnt }]] = await conn.query("SELECT COUNT(*) AS cnt FROM kanri_orgs");
const [[{ g }]] = await conn.query("SELECT COUNT(*) AS g FROM kanri_orgs WHERE permitType='general'");
const [[{ s }]] = await conn.query("SELECT COUNT(*) AS s FROM kanri_orgs WHERE permitType='specific'");
console.log(`DONE. total=${finalCnt} general=${g} specific=${s}`);
await conn.end();
