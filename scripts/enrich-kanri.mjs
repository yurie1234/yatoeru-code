import "dotenv/config";
import mysql from "mysql2/promise";

// 住所から市区町村を機械分解して city 列に投入し、
// 名簿取得日（sourceDate）を sheet_sync_logs の最新完了日から一括設定する。
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 最新のkanri同期完了日時を取得（なければ今日の日付は使わずnullのまま）
const [logs] = await conn.query(
  "SELECT DATE_FORMAT(MAX(createdAt), '%Y-%m-%d') AS d FROM sheet_sync_logs WHERE status='success'"
);
const sourceDate = logs[0]?.d ?? null;
console.log("sourceDate:", sourceDate);

const [rows] = await conn.query(
  "SELECT id, prefecture, address FROM kanri_orgs WHERE address IS NOT NULL AND address != ''"
);
console.log("rows:", rows.length);

// 市区町村抽出: 政令市の「◯◯市◯◯区」/郡部「◯◯郡◯◯町(村)」/市/特別区/町/村
function extractCity(pref, address) {
  if (!address) return null;
  let a = address.replace(/^\s+/, "");
  if (pref && a.startsWith(pref)) a = a.slice(pref.length);
  // 郡部: ◯◯郡◯◯町・◯◯郡◯◯村
  let m = a.match(/^([^\s]{1,8}?郡[^\s]{1,8}?[町村])/);
  if (m) return m[1];
  // 政令市の区まで: ◯◯市◯◯区
  m = a.match(/^([^\s]{1,8}?市[^\s]{1,6}?区)/);
  if (m) return m[1];
  // 市・特別区・町・村
  m = a.match(/^([^\s]{1,10}?[市区町村])/);
  if (m) return m[1];
  return null;
}

let updated = 0;
const batch = [];
for (const r of rows) {
  const city = extractCity(r.prefecture, r.address);
  if (city) {
    batch.push([city, r.id]);
  }
}
console.log("extracted:", batch.length);

// バルク更新（CASE式で500件ずつ）
for (let i = 0; i < batch.length; i += 500) {
  const chunk = batch.slice(i, i + 500);
  const cases = chunk.map(() => "WHEN ? THEN ?").join(" ");
  const ids = chunk.map(([, id]) => id);
  const params = chunk.flatMap(([city, id]) => [id, city]);
  await conn.query(
    `UPDATE kanri_orgs SET city = CASE id ${cases} END WHERE id IN (${ids.map(() => "?").join(",")})`,
    [...params, ...ids]
  );
  updated += chunk.length;
}
console.log("city updated:", updated);

if (sourceDate) {
  const [res] = await conn.query("UPDATE kanri_orgs SET sourceDate = ? WHERE sourceDate IS NULL", [sourceDate]);
  console.log("sourceDate updated:", res.affectedRows);
}

// 検証サンプル
const [sample] = await conn.query(
  "SELECT managementId, prefecture, city, LEFT(address, 30) AS addr FROM kanri_orgs ORDER BY RAND() LIMIT 8"
);
console.log(JSON.stringify(sample, null, 2));
const [nullCity] = await conn.query("SELECT COUNT(*) AS c FROM kanri_orgs WHERE city IS NULL");
console.log("city null remain:", nullCity[0].c);
await conn.end();
