import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const FIELDS = [
  "介護", "ビルクリーニング", "リネンサプライ", "工業製品製造業", "建設",
  "造船・舶用工業", "自動車整備", "航空", "宿泊", "自動車運送業", "鉄道",
  "物流倉庫", "農業", "漁業", "飲食料品製造業", "外食業", "林業", "木材産業", "資源循環",
];
const out = {};
for (const f of FIELDS) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM support_orgs WHERE JSON_CONTAINS(fields, ?)`,
    [JSON.stringify(f)]
  );
  out[f] = rows[0].cnt;
}
const [total] = await conn.execute(`SELECT COUNT(*) AS cnt FROM support_orgs`);
out["_total"] = total[0].cnt;
console.log(JSON.stringify(out, null, 2));
await conn.end();
