#!/usr/bin/env node
/**
 * OTIT許可一覧に載っているのにDBに無い監理団体9件を追加する。
 *
 * 背景: 監理団体の個別ページを ikusei.yatoeru.jp から yatoeru.jp へ寄せる前に、
 * 旧URL 3,733本すべてに転送先があるかを突き合わせたところ、9件がDBに無かった。
 * この9件はOTITの許可一覧に載っている実在の団体で、マスター（スプレッドシート）の
 * 取りこぼし。移行状況トラッカーの件数も9件少なく出ていた。
 * 詳細と根拠は my-scripts の `ops/22-kanri-yoseru.md`。
 *
 * 値の出典: OTIT公表「監理団体一覧（一般監理事業／特定監理事業）」PDF
 * （令和8年7月27日現在）を ikusei/otit_pdf_kanri_dantai.py がパースしたもの。
 *
 * 使い方（Railway の Console タブ）:
 *   node scripts/add-missing-kanri-orgs.mjs           # 何をするか表示するだけ
 *   node scripts/add-missing-kanri-orgs.mjs --apply   # 実際に追加する
 *
 * 注意: マスターのスプレッドシートにも同じ9件を足しておくこと。
 * `sheet-sync` はシートに無い管理IDを削除するため、足さないと次の同期で消える。
 * 貼り付け用の行は my-scripts の `data/kanri/add-9-rows.tsv`。
 */
import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");
const SOURCE_DATE = "2026-07-27"; // OTIT公表PDFの現在日

/** 追加する9件。managementId は既存の最大値の続き（I-2243〜 / T-1494〜） */
const ROWS = [
  {"managementId": "I-2243", "name": "栃木県木造住宅協同組合", "prefecture": "栃木県", "address": "栃木県佐野市仙波町137-10", "phone": "0283859432", "permitType": "general", "permitDate": "2020-03-13", "permitExpiry": "2032-03-12", "receiveCountries": "中国、ベトナム", "jobCodes": ["3-4", "3-5", "3-6", "7-21"], "kaigoSupport": false},
  {"managementId": "I-2244", "name": "魚沼衣料産業協同組合", "prefecture": "新潟県", "address": "新潟県魚沼市和長島523-4", "phone": "0257945608", "permitType": "general", "permitDate": "2018-01-31", "permitExpiry": "2030-01-30", "receiveCountries": "中国", "jobCodes": ["5-6"], "kaigoSupport": false},
  {"managementId": "I-2245", "name": "広島県外壁補修工事業協同組合", "prefecture": "広島県", "address": "広島県広島市中区八丁堀1-12", "phone": "0822271224", "permitType": "general", "permitDate": "2017-12-20", "permitExpiry": "2029-12-19", "receiveCountries": "スリランカ、ベトナム", "jobCodes": ["3-8", "3-17", "6-12", "7-5", "7-6", "7-7"], "kaigoSupport": false},
  {"managementId": "I-2246", "name": "熊本繊維工業協同組合", "prefecture": "熊本県", "address": "熊本県熊本市西区城山下代4-10-18", "phone": "0963114745", "permitType": "general", "permitDate": "2019-12-25", "permitExpiry": "2031-12-24", "receiveCountries": "中国、ミャンマー、ベトナム", "jobCodes": ["5-6", "5-8"], "kaigoSupport": false},
  {"managementId": "T-1494", "name": "函館市漁業協同組合(事業休止中)", "prefecture": "北海道", "address": "北海道函館市豊川町27-6", "phone": "0138233195", "permitType": "specific", "permitDate": "2018-11-09", "permitExpiry": "2026-11-08", "receiveCountries": "インドネシア", "jobCodes": ["2-1", "2-2"], "kaigoSupport": false},
  {"managementId": "T-1495", "name": "協同組合ブリッジ", "prefecture": "秋田県", "address": "秋田県秋田市八橋字下八橋191-11", "phone": "08057348518", "permitType": "specific", "permitDate": "2021-05-10", "permitExpiry": "2029-05-09", "receiveCountries": "フィリピン", "jobCodes": ["7-13", "7-14", "7-21"], "kaigoSupport": true},
  {"managementId": "T-1496", "name": "M&J協同組合", "prefecture": "埼玉県", "address": "埼玉県さいたま市大宮区宮町3-1-6 明秀ビル203", "phone": "0487111918", "permitType": "specific", "permitDate": "2019-09-26", "permitExpiry": "2027-09-25", "receiveCountries": "ミャンマー", "jobCodes": ["7-12"], "kaigoSupport": false},
  {"managementId": "T-1497", "name": "公益財団法人国際人材交流支援機構", "prefecture": "東京都", "address": "東京都千代田区永田町2-17-17 アイ オス永田町505", "phone": "0365508811", "permitType": "specific", "permitDate": "2025-06-12", "permitExpiry": "2028-06-11", "receiveCountries": "ネパール、ベトナム", "jobCodes": ["7-13", "7-16"], "kaigoSupport": true},
  {"managementId": "T-1498", "name": "協同組合リンク・ジャパン", "prefecture": "岡山県", "address": "岡山県岡山市中区雄町235-10", "phone": "0862063080", "permitType": "specific", "permitDate": "2019-03-29", "permitExpiry": "2027-03-28", "receiveCountries": "インドネシア、スリランカ、フィリピン、ベトナム", "jobCodes": ["3-5", "3-6", "3-8", "3-12", "3-13", "3-15", "3-20", "3-21", "4-11", "6-5", "6-6", "6-10", "6-13", "6-14", "7-3", "7-6", "7-8", "7-12", "7-13", "7-16"], "kaigoSupport": true}
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL が無い。Railway の Console で実行すること");
  process.exit(1);
}
const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [[{ total }]] = await conn.query("SELECT COUNT(*) AS total FROM kanri_orgs");
console.log(`追加前の件数: ${total}`);

let added = 0;
let skipped = 0;
for (const r of ROWS) {
  // 名称の重複で二重登録しない（管理IDが違っても同じ団体なら入れない）
  const [dup] = await conn.query(
    "SELECT managementId, name FROM kanri_orgs WHERE managementId = ? OR name = ? LIMIT 1",
    [r.managementId, r.name]
  );
  if (dup.length > 0) {
    console.log(`  スキップ ${r.name}（既に ${dup[0].managementId} として存在）`);
    skipped++;
    continue;
  }
  console.log(`  追加 ${r.managementId} ${r.name}（${r.prefecture}・${r.permitType === "general" ? "一般" : "特定"}）`);
  if (APPLY) {
    await conn.query(
      `INSERT INTO kanri_orgs
       (managementId, name, prefecture, address, phone, permitType, permitDate, permitExpiry,
        receiveCountries, jobCodes, migrationStatus, sourceDate)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'unconfirmed', ?)`,
      [
        r.managementId,
        r.name,
        r.prefecture,
        r.address || null,
        r.phone || null,
        r.permitType,
        r.permitDate || null,
        r.permitExpiry || null,
        r.receiveCountries || null,
        JSON.stringify(r.jobCodes),
        SOURCE_DATE,
      ]
    );
  }
  added++;
}

const [[{ total: after }]] = await conn.query("SELECT COUNT(*) AS total FROM kanri_orgs");
console.log(
  APPLY
    ? `\n追加 ${added}件 / スキップ ${skipped}件 → 件数 ${total} → ${after}`
    : `\n追加予定 ${added}件 / スキップ ${skipped}件（--apply を付けると実行。件数は ${total} のまま）`
);
if (APPLY && after !== total + added) {
  console.error("件数が想定と合わない。確認すること");
  process.exitCode = 1;
}
await conn.end();
