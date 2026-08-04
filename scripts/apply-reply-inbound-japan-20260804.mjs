/**
 * 株式会社インバウンドジャパン（19登-000020 / support_orgs id=30018）の
 * 掲載確認返信（2026-08-04受領）を本番DBへ反映する。
 *
 * Railwayのairy-prosperityサービス「Console」タブで実行する想定
 * （DATABASE_URLがそのコンテナ内に既に設定されているため）。
 *
 * 実行: node scripts/apply-reply-inbound-japan-20260804.mjs
 *
 * 反映内容の出典:
 *  (a) 事業者本人からのメール返信（2026-08-04）
 *      … 対応言語11言語 / 対応分野=全分野 / 対応地域=全国 / 支援料 月額9,800円（税別）/
 *        住居環境のトータルサポート / 経験者人材の紹介 / 初めての外国人雇用のサポート
 *  (b) 同社公式サイト https://ij-tokuteiginou.com/ （2026-08-04閲覧）
 *      … 支援料 月額9,800円・別プランあり / 言語対応10ヶ国語（ヒンディー語・ウズベキスタン語を明記）/
 *        母国語チューター制度 / 支援業務100%内製化 / 2014年創業・関東名古屋で生活サポート付き住宅約100か所 /
 *        人材紹介料30万円〜・国内500校・国外18ヶ国35校と提携
 *
 * 補足: 返信原文の「インド語」は同社サイトが「ヒンディー語」と明記しているため
 *       ヒンディー語として正規化。「ウズベキスタン語」も同様に「ウズベク語」へ統一。
 *       なお登録簿由来の languagesRaw には既に11言語が入っており、
 *       正規化済み languages が9言語に減っていた（インド語・ウズベキスタン語の取りこぼし）。
 *
 * 月次シート同期（syncShien）は既存行に対して name/prefecture/address/phone/
 * representative/regDate のみ更新するため、ここで入れる languages/fields/
 * preferredFields/preferredRegions/verifiedAt/verifiedNote/websiteUrl/料金は
 * 上書きされない（sheetSync.ts syncShien を確認済み）。
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const REG_NO = "19登-000020";

const LANGUAGES = [
  "英語",
  "中国語",
  "ベトナム語",
  "インドネシア語",
  "ミャンマー語",
  "ネパール語",
  "モンゴル語",
  "フランス語",
  "ロシア語",
  "ヒンディー語",
  "ウズベク語",
];

/** 対応分野=全分野の申告のため、TOKUTEI_FIELDS(19分野)の全件を設定 */
const FIELDS = [
  "介護",
  "ビルクリーニング",
  "リネンサプライ",
  "工業製品製造業",
  "建設",
  "造船・舶用工業",
  "自動車整備",
  "航空",
  "宿泊",
  "自動車運送業",
  "鉄道",
  "物流倉庫",
  "農業",
  "漁業",
  "飲食料品製造業",
  "外食業",
  "林業",
  "木材産業",
  "資源循環",
];

const VERIFIED_NOTE = [
  "対応分野: 全分野。対応地域: 全国。支援料 月額9,800円（税別）※別の料金プランもあり。",
  "11言語対応（英語・中国語・ベトナム語・インドネシア語・ミャンマー語・ネパール語・モンゴル語・フランス語・ロシア語・ヒンディー語・ウズベク語）。自社の外国人スタッフが母国語で相談に応じるチューター制度を導入し、支援業務は100%内製化。",
  "2014年創業。関東・名古屋地区で外国人向け生活サポート付き住宅を約100か所運営管理しており、アパート・シェアハウスの紹介から社員寮の準備・手配まで住居環境をトータルでサポート。初めて外国人を雇用する企業への入管法令・労務面の支援も行う。",
  "有料職業紹介事業（13-ユ-308980）として経験者人材の紹介も可能（人材紹介料30万円〜、国内500校・国外18ヶ国35校の教育機関と提携）。宅地建物取引業（東京都知事(2)第99910号）も併有。",
  "※対応分野・対応地域・料金・強みは事業者本人からの回答および同社公式サイト（https://ij-tokuteiginou.com/）の記載に基づく。",
].join("\n");

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  const SELECT_COLS =
    "id, regNo, name, languages, languagesRaw, fields, preferredFields, preferredRegions, consultStatus, verifiedAt, verifiedNote, websiteUrl, monthlyFeeMin, monthlyFeeMax";

  console.log(`=== ${REG_NO} 反映前 ===`);
  const [before] = await conn.query(
    `SELECT ${SELECT_COLS} FROM support_orgs WHERE regNo = ?`,
    [REG_NO]
  );
  console.log(JSON.stringify(before, null, 1));

  if (before.length === 0) {
    console.log(`→ regNo=${REG_NO} が見つかりませんでした（更新スキップ）`);
    await conn.end();
    return;
  }
  if (before.length > 1) {
    console.log("→ 同一登録番号が複数件ヒットしました。手動確認が必要なため中止します");
    await conn.end();
    process.exit(1);
  }

  const [res] = await conn.query(
    `UPDATE support_orgs SET
       languages = ?,
       fields = ?,
       preferredFields = ?,
       preferredRegions = ?,
       consultStatus = 'open',
       websiteUrl = ?,
       monthlyFeeMin = 9800,
       monthlyFeeMax = 9800,
       verifiedAt = ?,
       verifiedNote = ?
     WHERE regNo = ?`,
    [
      JSON.stringify(LANGUAGES),
      JSON.stringify(FIELDS),
      JSON.stringify(["全分野"]),
      JSON.stringify(["全国"]),
      "https://ij-tokuteiginou.com/",
      "2026-08-04",
      VERIFIED_NOTE,
      REG_NO,
    ]
  );
  console.log(`\n→ 更新しました（affectedRows=${res.affectedRows}）`);

  console.log(`\n=== ${REG_NO} 反映後 ===`);
  const [after] = await conn.query(
    `SELECT ${SELECT_COLS} FROM support_orgs WHERE regNo = ?`,
    [REG_NO]
  );
  console.log(JSON.stringify(after, null, 1));

  await conn.end();
  console.log("\n完了");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
