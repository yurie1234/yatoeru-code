import fs from "fs";
import mysql from "mysql2/promise";
import "dotenv/config";

const records = JSON.parse(fs.readFileSync("/home/ubuntu/data/rso_records.json", "utf8"));
console.log(`Loaded ${records.length} records`);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Clear existing
await conn.query("DELETE FROM support_orgs");

const BATCH = 500;
let inserted = 0;
for (let i = 0; i < records.length; i += BATCH) {
  const chunk = records.slice(i, i + BATCH);
  const values = [];
  const placeholders = [];
  for (const r of chunk) {
    placeholders.push("(?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    values.push(
      r.regNo || null,
      r.regDate || null,
      (r.name || "").slice(0, 255),
      r.postal ? String(r.postal).slice(0, 16) : null,
      r.address || null,
      r.prefecture ? String(r.prefecture).slice(0, 16) : null,
      r.phone ? String(r.phone).slice(0, 32) : null,
      r.representative ? String(r.representative).slice(0, 255) : null,
      r.officeName ? String(r.officeName).slice(0, 255) : null,
      r.optionalSupport ? 1 : 0,
      r.startDate || null,
      JSON.stringify(r.languages || []),
      r.languagesRaw || null,
      r.note || null
    );
  }
  await conn.query(
    `INSERT IGNORE INTO support_orgs (regNo, regDate, name, postal, address, prefecture, phone, representative, officeName, optionalSupport, startDate, languages, languagesRaw, note) VALUES ${placeholders.join(",")}`,
    values
  );
  inserted += chunk.length;
  if (inserted % 2000 === 0 || inserted >= records.length) console.log(`Inserted ${inserted}`);
}

const [rows] = await conn.query("SELECT COUNT(*) as c FROM support_orgs");
console.log(`Total in DB: ${rows[0].c}`);
await conn.end();
