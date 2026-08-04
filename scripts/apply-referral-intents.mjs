/**
 * 送客優先度（紹介料の意向）の初期入力。
 *
 * Railwayのairy-prosperityサービス「Console」タブで実行する:
 *   node scripts/apply-referral-intents.mjs           … 確認のみ（DBは変更しない）
 *   node scripts/apply-referral-intents.mjs --apply   … 記録する
 *
 * 何度実行しても安全（同じ値なら書き込まない）。
 *
 * **完全非公開の運用情報**。用途は「相談リードが来たときの手動振り分け」と
 * 「営業の優先順位づけ」だけで、親和性スコア・並び順・公開ページ・API・
 * 構造化データには一切出さない（server/routers/orgs.ts の sanitizeOrg で除去、
 * server/referralIntentPrivacy.test.ts で固定）。
 *
 * ここに入れるのは sales/12-partner-pipeline.md と ops/10-verified-org-replies.md に
 * **実際に記録されている事実だけ**。「たぶん前向きだろう」といった推測は入れない。
 * 意向が確認できていない先は unknown のまま（既定値）にしておく——
 * 送客先の判断材料に推測が混ざると、根拠のない優先順位で企業を紹介することになる。
 */
import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL が未設定です。Railwayのairy-prosperityのConsoleで実行してください。");
  process.exit(1);
}

/**
 * 区分の意味（shared/referralIntent.ts と対応）:
 *   interested  … 紹介料の意向あり・金額は未確定
 *   negotiating … 条件を提示済み／提示を受けており、金額の話が始まっている
 *   agreed      … 条件合意（書面・メールで確定）
 *   declined    … 意向なし
 */
const ENTRIES = [
  {
    regNo: "24登-010244",
    name: "株式会社フィールドマーケティングシステムズ（FMS）",
    intent: "negotiating",
    note:
      "受託時成果報酬 5〜10万円/人を先方から自発的に提示（10万=先方基本単価で成約の場合）。" +
      "商談実施 2026-07-23。実案件発生時に企業情報＋採用希望条件を送付して正式条件を相談する段取り。" +
      "出典: sales/12-partner-pipeline.md パートナー一覧",
  },
  {
    regNo: "24登-009849",
    name: "トリニティウイング協同組合",
    intent: "negotiating",
    note:
      "当方からハイブリッド条件を提示済み・回答待ち（2026-08-03最終版）: " +
      "A=月額20,000円（表示優遇のみ・リード対価は含まない）＋B=成果報酬80,000円/人（掲載プランと無関係に共通）。両立可。" +
      "初の有料契約候補。A成約なら初MRR、B成約なら紹介条件確認書を交わす。" +
      "出典: sales/12-partner-pipeline.md / ops/10-verified-org-replies.md",
  },
  {
    regNo: "25登-011385",
    name: "行政書士法人Ｔｒｅｅ",
    intent: "interested",
    note:
      "実案件ベースで有料紹介を検討可（金額は未提示）。窓口: 櫻井氏。" +
      "業種・地域・受入予定人数・導入希望時期を確認した相談を優先案内する約束。" +
      "出典: sales/12-partner-pipeline.md パートナー一覧",
  },
  {
    regNo: "25登-011916",
    name: "合同会社エドミール",
    intent: "interested",
    note:
      "単価が合えば有料紹介を検討可（金額は未提示）。介護×東京都。窓口はメールのみ（k.nakazawa@）。" +
      "案件発生時に規模等をヒアリングする段取り。出典: sales/12-partner-pipeline.md パートナー一覧",
  },
  {
    regNo: "19登-000464",
    name: "船津 元（メディナケア社会保険労務士事務所）",
    intent: "interested",
    note:
      "価格選好アンケートで B（成果報酬型）と回答（2026-07-31）。介護特化×全国・実績138名。" +
      "当方への成功報酬は施設向け価格に転嫁されうる旨の言及があり、" +
      "「成約時のみ・施設の費用感に影響しない水準」と回答済み。金額は具体案件時に交渉。" +
      "出典: sales/12-partner-pipeline.md パートナー一覧",
  },
  // ALBATZ株式会社（23登-008642）と株式会社インバウンドジャパン（19登-000020）は
  // 連絡が取れており商談・掲載確認も済んでいるが、**紹介料の意向は未確認**。
  // 前向きだろうという推測で interested にはしない（unknown のままにする）。
  //   ALBATZ           : 商談済み 2026-07-22・価格シグナルは未提示
  //   インバウンドジャパン: A/B/C の価格選好質問を送付済み・未回答
  //
  // まごころ協同組合は価格選好 C（いずれも不要）＝declined 相当だが、
  // 監理団体として kanri_orgs にあり support_orgs には無いため、ここでは扱わない。
];

const VALID = new Set(["unknown", "interested", "negotiating", "agreed", "declined"]);
for (const e of ENTRIES) {
  if (!VALID.has(e.intent)) {
    console.error(`区分が不正です: ${e.regNo} ${e.intent}`);
    process.exit(1);
  }
}

const conn = await mysql.createConnection(url);

const [rows] = await conn.query(
  "SELECT id, regNo, name, referralIntent, referralNote FROM support_orgs WHERE regNo IN (?)",
  [ENTRIES.map((e) => e.regNo)]
);
const byRegNo = new Map(rows.map((r) => [String(r.regNo), r]));

const missing = ENTRIES.filter((e) => !byRegNo.has(e.regNo));
const changes = [];
const unchanged = [];

for (const e of ENTRIES) {
  const row = byRegNo.get(e.regNo);
  if (!row) continue;
  const same = String(row.referralIntent ?? "unknown") === e.intent && (row.referralNote ?? "") === e.note;
  if (same) unchanged.push(e);
  else changes.push({ ...e, id: row.id, dbName: row.name, before: String(row.referralIntent ?? "unknown") });
}

console.log(`=== 対象: ${ENTRIES.length}件（DBで見つかった: ${ENTRIES.length - missing.length}件） ===\n`);

if (missing.length > 0) {
  console.log("登録番号が見つかりません（要確認）:");
  for (const m of missing) console.log(`  ${m.regNo} ${m.name}`);
  console.log("");
}

console.log(`=== 記録する変更: ${changes.length}件 ===`);
for (const c of changes) {
  console.log(`  ${c.regNo} ${c.dbName}`);
  console.log(`    ${c.before} → ${c.intent}`);
  console.log(`    ${c.note.slice(0, 110)}…`);
}
if (changes.length === 0) console.log("  （なし）");
console.log("");

if (unchanged.length > 0) {
  console.log(`=== 既に同じ内容: ${unchanged.length}件 ===`);
  for (const u of unchanged) console.log(`  ${u.regNo} ${u.name}（${u.intent}）`);
  console.log("");
}

if (!APPLY) {
  console.log("※ 確認のみ（DBは変更していません）。記録するには --apply を付けてください。");
  await conn.end();
  process.exit(0);
}

for (const c of changes) {
  await conn.execute(
    "UPDATE support_orgs SET referralIntent = ?, referralNote = ?, referralUpdatedAt = CURRENT_TIMESTAMP WHERE id = ?",
    [c.intent, c.note, c.id]
  );
  console.log(`  記録: ${c.regNo} ${c.dbName} → ${c.intent}`);
}

console.log(
  `\n完了。yatoeru.jp/admin の「送客先の候補」で確認してください（公開ページには出ません）。`
);
await conn.end();
