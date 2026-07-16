// sitemap.xml 再生成スクリプト（静的ページ + 47都道府県 + 特定技能19分野）
import { writeFileSync } from "node:fs";

const BASE = "https://gaikokujin-koyo-navi.manus.space";

const STATIC_PAGES = [
  { path: "/", priority: "1.0" },
  { path: "/diagnose", priority: "0.9" },
  { path: "/search", priority: "0.9" },
  { path: "/proposal", priority: "0.7" },
  { path: "/pricing", priority: "0.7" },
  { path: "/stats", priority: "0.7" },
  { path: "/about", priority: "0.7" },
  { path: "/terms", priority: "0.7" },
  { path: "/privacy", priority: "0.7" },
];

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

const TOKUTEI_FIELDS = [
  "介護","ビルクリーニング","リネンサプライ","工業製品製造業","建設",
  "造船・舶用工業","自動車整備","航空","宿泊","自動車運送業","鉄道",
  "物流倉庫","農業","漁業","飲食料品製造業","外食業","林業","木材産業","資源循環",
];

const urls = [
  ...STATIC_PAGES.map((p) => ({ loc: `${BASE}${p.path}`, priority: p.priority })),
  ...PREFECTURES.map((p) => ({ loc: `${BASE}/region/${encodeURIComponent(p)}`, priority: "0.7" })),
  ...TOKUTEI_FIELDS.map((f) => ({ loc: `${BASE}/field/${encodeURIComponent(f)}`, priority: "0.7" })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`;

writeFileSync(new URL("../client/public/sitemap.xml", import.meta.url), xml);
console.log(`sitemap.xml generated: ${urls.length} URLs`);
