// 手動実行用: adminセッションを自己署名してローカルAPIに記事を投稿する
// 使い方: cd /home/ubuntu/gaikokujin-koyo-navi && npx tsx scripts/publish-article.mjs /home/ubuntu/article.json
import { SignJWT } from "jose";
import { readFileSync } from "fs";

const JWT_SECRET = process.env.JWT_SECRET;
const APP_ID = process.env.VITE_APP_ID;
if (!JWT_SECRET || !APP_ID) {
  console.error("JWT_SECRET / VITE_APP_ID not set");
  process.exit(1);
}

const OPEN_ID = "htNfWEo8ANXLjB5Lun8yrN"; // admin (owner)
const articlePath = process.argv[2] || "/home/ubuntu/article.json";
const article = JSON.parse(readFileSync(articlePath, "utf8"));

const secretKey = new TextEncoder().encode(JWT_SECRET);
const token = await new SignJWT({ openId: OPEN_ID, appId: APP_ID, name: "owner" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
  .sign(secretKey);

const base = process.env.TARGET_BASE || "http://localhost:3000";

// GET一覧で認証確認
const listRes = await fetch(`${base}/api/scheduled/article-publish`, {
  headers: { Cookie: `app_session_id=${token}` },
});
console.log("GET status:", listRes.status);
const list = await listRes.json();
console.log("existing slugs:", (list.articles || []).map((a) => a.slug).join(", "));

// POST投稿
const postRes = await fetch(`${base}/api/scheduled/article-publish`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: `app_session_id=${token}`,
  },
  body: JSON.stringify(article),
});
console.log("POST status:", postRes.status);
console.log(await postRes.text());
