import 'dotenv/config';
import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query('SELECT COUNT(*) AS c FROM support_orgs');
console.log('support_orgs count:', rows[0].c);
const [snap] = await conn.query('SELECT id, takenAt, sourceDate FROM registry_snapshots ORDER BY id DESC LIMIT 3').catch(() => [[]]);
console.log('snapshots:', JSON.stringify(snap));
await conn.end();
