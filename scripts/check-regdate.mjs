import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query(
  "SELECT regDate, DATE_FORMAT(DATE_ADD('1899-12-30', INTERVAL CAST(regDate AS UNSIGNED) DAY), '%Y-%m-%d') AS converted, COUNT(*) AS cnt FROM support_orgs WHERE regDate REGEXP '^[0-9]{5}$' GROUP BY regDate"
);
console.log(JSON.stringify(rows, null, 2));
// 周辺の正常regDateの分布（同時期に登録された機関のregNoプレフィックスと比較するため数件サンプル）
const [samples] = await conn.query(
  "SELECT id, regNo, regDate, name FROM support_orgs WHERE regDate REGEXP '^[0-9]{5}$' ORDER BY regNo LIMIT 10"
);
console.log(JSON.stringify(samples, null, 2));
// 正常データでregNoプレフィックスが同じ機関のregDate範囲を確認
const [ctx] = await conn.query(
  "SELECT SUBSTRING(regNo,1,3) AS pfx, MIN(regDate) AS minD, MAX(regDate) AS maxD, COUNT(*) AS c FROM support_orgs WHERE regDate LIKE '20%' GROUP BY SUBSTRING(regNo,1,3) ORDER BY pfx"
);
console.log(JSON.stringify(ctx, null, 2));
await conn.end();
